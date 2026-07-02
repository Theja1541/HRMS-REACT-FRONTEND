import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { CalendarClock, Search, UserCheck } from 'lucide-react';
import { employeeApi, departmentApi, probationPolicyApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { useTablePagination } from '../../hooks/useTablePagination';
import StatusBadge, { Avatar } from '../../components/shared/StatusBadge';
import { useAuthStore } from '../../store/auth.store';

const URGENCY_OPTIONS = [
  { value: '', label: 'All employees' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'week', label: 'Due in 7 days' },
  { value: 'month', label: 'Due in 30 days' },
];

function fmtDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(String(value).slice(0, 10)), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

function DaysRemainingBadge({ endDate }) {
  if (!endDate) return <span className="text-slate-400">—</span>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = differenceInCalendarDays(parseISO(String(endDate).slice(0, 10)), today);

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
        {Math.abs(days)}d overdue
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
        {days}d left
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
        {days}d left
      </span>
    );
  }
  return (
    <span className="text-xs text-slate-500">
      {days}d left
    </span>
  );
}

export default function ProbationTrackerPage() {
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [policyFilter, setPolicyFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');

  const { page, limit, setPage, setLimit, paginateClient } = useTablePagination({
    defaultLimit: 20,
    resetDeps: [search, departmentFilter, policyFilter, urgencyFilter, selectedTenantId],
  });

  const { data: empData, isLoading, error } = useQuery({
    queryKey: ['employees-probation', selectedTenantId],
    queryFn: () => employeeApi.list({ status: 'probation', limit: 500, page: 1 }),
    enabled: !tenantRequired,
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments', selectedTenantId],
    queryFn: () => departmentApi.list({ status: 'active' }),
    enabled: !tenantRequired,
  });

  const { data: policyData } = useQuery({
    queryKey: ['probation-policies', selectedTenantId],
    queryFn: () => probationPolicyApi.list(),
    enabled: !tenantRequired,
  });

  const allEmployees = empData?.data?.employees || [];
  const departments = deptData?.data?.departments || [];
  const policies = policyData?.data?.policies || [];

  const policyMap = useMemo(() => {
    const m = {};
    for (const p of policies) m[p.id] = p.policy_name;
    return m;
  }, [policies]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEmployees.filter((emp) => {
      if (q) {
        const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        if (!fullName.includes(q) && !emp.emp_code?.toLowerCase().includes(q) && !emp.email?.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (departmentFilter && String(emp.department_id) !== String(departmentFilter)) return false;
      if (policyFilter && String(emp.probation_policy_id) !== String(policyFilter)) return false;
      if (urgencyFilter && emp.probation_end_date) {
        const days = differenceInCalendarDays(parseISO(String(emp.probation_end_date).slice(0, 10)), today);
        if (urgencyFilter === 'overdue' && days >= 0) return false;
        if (urgencyFilter === 'week' && (days < 0 || days > 7)) return false;
        if (urgencyFilter === 'month' && (days < 0 || days > 30)) return false;
      }
      if (urgencyFilter && !emp.probation_end_date) return false;
      return true;
    });
  }, [allEmployees, search, departmentFilter, policyFilter, urgencyFilter, today]);

  const { items: rows, pagination } = paginateClient(filtered);

  const overdueCnt = useMemo(
    () => allEmployees.filter((e) => e.probation_end_date && differenceInCalendarDays(parseISO(String(e.probation_end_date).slice(0, 10)), today) < 0).length,
    [allEmployees, today]
  );

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to view the probation tracker.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Probation Tracker"
        subtitle={
          filtered.length !== allEmployees.length
            ? `${filtered.length} of ${allEmployees.length} on probation`
            : `${allEmployees.length} employee${allEmployees.length !== 1 ? 's' : ''} on probation`
        }
        actions={
          overdueCnt > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
              <CalendarClock size={13} />
              {overdueCnt} overdue
            </span>
          )
        }
      />

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200 toolbar-row">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex-1 min-w-0 sm:max-w-xs">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, email…"
              className="border-none bg-transparent text-xs outline-none w-full"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 w-full sm:w-auto sm:min-w-[140px]"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={policyFilter}
            onChange={(e) => setPolicyFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 w-full sm:w-auto sm:min-w-[160px]"
          >
            <option value="">All policies</option>
            {policies.filter((p) => p.is_enabled).map((p) => (
              <option key={p.id} value={p.id}>{p.policy_name}</option>
            ))}
          </select>

          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 w-full sm:w-auto sm:min-w-[160px]"
          >
            {URGENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 text-sm">
            {error.response?.data?.error?.message || error.message}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm font-medium">
              {allEmployees.length === 0 ? 'No employees currently on probation' : 'No employees match the current filters'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left border-b border-slate-200">
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Employee</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Department</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Policy</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">Probation Start</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">Probation End</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">Days Remaining</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          to={`/employees/${emp.id}?tab=probation`}
                          className="flex items-center gap-2.5 group"
                        >
                          <Avatar name={`${emp.first_name} ${emp.last_name}`} size="sm" />
                          <div>
                            <p className="font-medium text-slate-900 group-hover:text-brand-600 transition-colors">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">{emp.emp_code}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {emp.department?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {emp.probation_policy_id
                          ? (policyMap[emp.probation_policy_id] || `Policy #${emp.probation_policy_id}`)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {fmtDate(emp.probation_start_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {fmtDate(emp.probation_end_date)}
                      </td>
                      <td className="px-4 py-3">
                        <DaysRemainingBadge endDate={emp.probation_end_date} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={emp.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          </>
        )}
      </div>
    </div>
  );
}
