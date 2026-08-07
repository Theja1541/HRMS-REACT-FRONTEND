import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { BookOpen, Eye, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { hrApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import SeparationKtPanel from '../../components/separation/SeparationKtPanel';
import { KT_PLAN_STATUSES, KT_PLAN_STATUS_LABELS } from '../../constants/hr';
import { useTablePagination } from '../../hooks/useTablePagination';
import { useAuthStore } from '../../store/auth.store';
import { resolvePortalRole } from '../../utils/portalContext';
import { cn } from '../../utils/helpers';

function fmtDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

function fmtName(emp) {
  if (!emp) return '—';
  return `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.emp_code || '—';
}

export default function KnowledgeTransferPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const { page, limit, setPage, setLimit, queryParams } = useTablePagination({
    resetDeps: [status, search],
  });

  const { user, workspace, roles, selectedRole, accessToken } = useAuthStore();
  const role = resolvePortalRole({ accessToken, workspace, user, roles, selectedRole });
  const isHr = ['super_admin', 'owner', 'hr', 'admin'].includes(role);

  const { data, isLoading } = useQuery({
    queryKey: ['kt-plans', status, page, limit, role],
    queryFn: () =>
      hrApi.listKtPlans({
        status: status || undefined,
        ...queryParams,
      }),
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['kt-analytics', role],
    queryFn: () => hrApi.getKtAnalytics(),
  });

  const plans = data?.data?.plans || [];
  const pagination = data?.data?.pagination;
  const analytics = analyticsData?.data || {};

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter((p) => {
      const name = `${p.employee?.first_name || ''} ${p.employee?.last_name || ''} ${p.employee?.emp_code || ''} ${p.title || ''}`.toLowerCase();
      return name.includes(q);
    });
  }, [plans, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="People · Exit"
        title="Knowledge Transfer"
        subtitle="Enterprise handover — successors, sessions, documents, repositories, access checklist, manager review"
        actions={
          isHr ? (
            <Link to="/exit-reports" className="btn-secondary text-xs">
              KT Report
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: analytics.total ?? '—' },
          { label: 'In Progress', value: analytics.in_progress ?? '—' },
          { label: 'Pending Manager', value: analytics.pending_manager ?? '—' },
          { label: 'Approved', value: analytics.approved ?? '—' },
          { label: 'Overdue', value: analytics.overdue ?? '—' },
          { label: 'Avg Progress', value: analytics.avg_progress != null ? `${analytics.avg_progress}%` : '—' },
        ].map((card) => (
          <div key={card.label} className="card p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{card.label}</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="ds-toolbar">
          <div className="toolbar-row">
        <div className="relative flex-1 min-w-0 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className="ds-input pl-9 w-full"
            placeholder="Search employee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="ds-select w-full sm:w-auto sm:min-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(KT_PLAN_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {isHr ? (
          <Link to="/separation" className="btn-secondary text-xs sm:ml-auto">
            <BookOpen size={14} /> Separations
          </Link>
        ) : (
          <Link to="/resignations" className="btn-secondary text-xs sm:ml-auto">
            <BookOpen size={14} /> Resignations
          </Link>
        )}
          </div>
        </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <p className="p-8 text-center text-slate-400 text-xs">Loading knowledge transfer plans…</p>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">No knowledge transfer plans</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Plans appear here when you are the manager, successor, or leaving employee.
            </p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Employee</th>
                <th className="text-left px-4 py-3 font-semibold">Successor</th>
                <th className="text-left px-4 py-3 font-semibold">Progress</th>
                <th className="text-left px-4 py-3 font-semibold">Due</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{fmtName(p.employee)}</p>
                    <p className="text-slate-400">{p.employee?.emp_code}</p>
                  </td>
                  <td className="px-4 py-3">{fmtName(p.successor)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            p.progress_percent === 100 ? 'bg-emerald-500' : 'bg-brand-500'
                          )}
                          style={{ width: `${p.progress_percent || 0}%` }}
                        />
                      </div>
                      <span className="font-semibold text-slate-700">{p.progress_percent || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{fmtDate(p.due_date)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                        KT_PLAN_STATUSES[p.status]
                      )}
                    >
                      {KT_PLAN_STATUS_LABELS[p.status] || p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="btn-secondary text-[10px] py-1 px-2"
                      onClick={() => setSelectedPlanId(p.id)}
                    >
                      <Eye size={12} /> Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pagination && (
          <TablePagination
            page={pagination.page || page}
            limit={pagination.limit || limit}
            total={pagination.total}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        )}
      </div>
      </div>

      {selectedPlanId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setSelectedPlanId(null)}
            aria-label="Close"
          />
          <div className="relative bg-white w-full max-w-3xl h-full shadow-xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold">Knowledge Transfer Plan</h2>
              <button type="button" onClick={() => setSelectedPlanId(null)} className="text-slate-400">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <SeparationKtPanel planId={selectedPlanId} enabled />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
