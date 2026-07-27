import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Info, Calendar, Users, TrendingUp, TrendingDown, PenLine, CheckCircle2 } from 'lucide-react';
import { payrollApi, employeeApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { FEED_TYPES, FEED_TYPE_META, MONTHS } from '../../constants/payroll';
import { cn, formatINR } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';
import { useTablePagination } from '../../hooks/useTablePagination';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

function TypeBadge({ type }) {
  const meta = FEED_TYPE_META[type] || FEED_TYPE_META.other;
  return (
    <span className={cn('inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border', meta.badge)}>
      {meta.label}
    </span>
  );
}

function formatTypeLabel(type) {
  return FEED_TYPE_META[type]?.label || type.replace(/_/g, ' ');
}

export default function SalaryFeedPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [month, year, typeFilter] });

  const [form, setForm] = useState({
    employee_id: '',
    entry_type: 'bonus',
    amount: '',
    description: '',
  });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['salary-feed', selectedTenantId, month, year],
    queryFn: () => payrollApi.listFeed({ month, year }),
    enabled: !tenantRequired,
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-salary-feed', selectedTenantId],
    queryFn: () => employeeApi.list({ limit: 500, status: 'active' }),
    enabled: !tenantRequired,
  });

  const createMutation = useMutation({
    mutationFn: payrollApi.createFeed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-feed'] });
      setShowForm(false);
      setForm({ employee_id: '', entry_type: 'bonus', amount: '', description: '' });
      showToast('success', 'Salary feed entry added — it will be included in the next payroll run for this month');
    },
    onError: (err) => {
      showToast('error', err.response?.data?.error?.message || 'Failed to add entry');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: payrollApi.deleteFeed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-feed'] });
      showToast('success', 'Entry removed');
    },
    onError: (err) => {
      showToast('error', err.response?.data?.error?.message || 'Failed to delete entry');
    },
  });

  const entries = data?.data?.entries || [];
  const employees = empData?.data?.employees || [];

  const filteredEntries = useMemo(() => {
    if (typeFilter === 'all') return entries;
    return entries.filter((e) => e.entry_type === typeFilter);
  }, [entries, typeFilter]);

  const { items: visibleEntries, pagination } = paginateClient(filteredEntries);

  const summary = useMemo(() => {
    let earnings = 0;
    let deductions = 0;
    let manual = 0;
    let system = 0;

    entries.forEach((e) => {
      const amt = parseFloat(e.amount) || 0;
      const meta = FEED_TYPE_META[e.entry_type];
      if (meta?.effect === 'deduction') deductions += amt;
      else earnings += amt;
      if (meta?.system) system += 1;
      else manual += 1;
    });

    return { earnings, deductions, net: earnings - deductions, manual, system, total: entries.length };
  }, [entries]);

  const handleSubmit = () => {
    if (!form.employee_id || !form.amount) {
      showToast('error', 'Please select an employee and enter an amount');
      return;
    }
    createMutation.mutate({
      employee_id: parseInt(form.employee_id, 10),
      entry_type: form.entry_type,
      amount: parseFloat(form.amount),
      description: form.description.trim() || undefined,
      month,
      year,
    });
  };

  const handleDelete = (entry) => {
    if (FEED_TYPE_META[entry.entry_type]?.system) {
      showToast('error', 'System-generated entries (leave encashment) cannot be deleted here');
      return;
    }
    if (window.confirm(`Remove this ${formatTypeLabel(entry.entry_type)} entry for ${entry.employee?.first_name}?`)) {
      deleteMutation.mutate(entry.id);
    }
  };

  const periodLabel = `${MONTHS[month - 1]} ${year}`;
  const selectedTypeMeta = FEED_TYPE_META[form.entry_type];

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to manage salary feed entries.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Payroll · Salary Feed"
        title="Salary Feed"
        subtitle="Add one-time earnings or deductions before processing payroll for a month"
        actions={
          <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={14} /> Add entry
          </button>
        }
      />

      <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 flex gap-3 text-sm text-blue-900">
        <Info size={18} className="shrink-0 mt-0.5 text-blue-600" />
        <div>
          <p className="font-medium">When to use Salary Feed</p>
          <p className="text-blue-800/80 mt-0.5 text-xs leading-relaxed">
            Use this page for <strong>variable pay</strong> that is not part of the fixed salary structure — bonus,
            arrears, overtime, incentives, or one-time deductions. Entries are picked up automatically when you run
            payroll for the selected month. <strong>Leave encashment</strong> entries are created automatically when
            encashment is approved — you do not add those manually.
          </p>
        </div>
      </div>

      {toast && (
        <div
          className={cn(
            'rounded-lg px-4 py-2 text-sm',
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          )}
        >
          {toast.message}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="ds-toolbar">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Calendar size={14} /> Payroll period
            </p>
            <div className="toolbar-row">
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="ds-select sm:min-w-[120px]"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="ds-select sm:min-w-[100px]"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Showing entries for <strong className="text-slate-600">{periodLabel}</strong> payslip run
            </p>
          </div>

          <div className="ds-tabs scroll-tabs flex-wrap" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={typeFilter === 'all'}
              onClick={() => setTypeFilter('all')}
              className={cn(typeFilter === 'all' && 'ds-tab-active')}
            >
              All types
            </button>
            {FEED_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={typeFilter === t}
                onClick={() => setTypeFilter(t)}
                className={cn(typeFilter === t && 'ds-tab-active')}
              >
                {FEED_TYPE_META[t].label}
              </button>
            ))}
          </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total entries" value={String(summary.total)} icon={Users} />
        <StatCard label="Total earnings" value={formatINR(summary.earnings)} icon={TrendingUp} />
        <StatCard label="Total deductions" value={formatINR(summary.deductions)} icon={TrendingDown} />
        <StatCard label="Net adjustment" value={formatINR(summary.net)} icon={PenLine} />
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading salary feed entries…</div>
        ) : error ? (
          <div className="py-16 text-center text-red-500 text-sm">Failed to load salary feed entries</div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center">
            <PenLine size={32} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-400 text-sm">No entries for {periodLabel}</p>
            <p className="text-xs text-slate-400 mt-1">
              {typeFilter === 'all'
                ? 'Click "Add entry" to record bonus, arrears, OT, or other adjustments'
                : `No ${formatTypeLabel(typeFilter)} entries this month`}
            </p>
            {typeFilter === 'all' && (
              <button type="button" onClick={() => setShowForm(true)} className="btn-primary mt-4 text-sm">
                <Plus size={14} /> Add first entry
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Employee</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Type</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Amount</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Description</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Source</th>
                  <th className="px-4 py-2.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleEntries.map((e) => {
                  const meta = FEED_TYPE_META[e.entry_type] || FEED_TYPE_META.other;
                  const isDeduction = meta.effect === 'deduction';
                  return (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-slate-800">
                          {e.employee?.first_name} {e.employee?.last_name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">{e.employee?.emp_code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={e.entry_type} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'font-mono text-xs font-semibold',
                            isDeduction ? 'text-red-600' : 'text-emerald-700'
                          )}
                        >
                          {isDeduction ? '−' : '+'}
                          {formatINR(e.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate" title={e.description || ''}>
                        {e.description || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'text-[10px] font-medium px-2 py-0.5 rounded-full',
                            meta.system ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {meta.system ? 'System' : 'Manual'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {!meta.system && (
                          <button
                            type="button"
                            onClick={() => handleDelete(e)}
                            disabled={deleteMutation.isPending}
                            className="text-slate-400 hover:text-red-500 disabled:opacity-40"
                            title="Remove entry"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h3 className="font-semibold text-slate-900">Add salary feed entry</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                This amount will be included in the <strong>{periodLabel}</strong> payroll run
              </p>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-slate-600">Employee</label>
                <select
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Select employee…</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.emp_code} — {e.first_name} {e.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Entry type</label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Entry type">
                  {FEED_TYPES.map((t) => {
                    const meta = FEED_TYPE_META[t];
                    const selected = form.entry_type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setForm({ ...form, entry_type: t })}
                        className={cn(
                          'relative flex flex-col text-left p-3.5 rounded-xl border transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1',
                          selected
                            ? 'border-brand-500 bg-brand-50/80 shadow-sm ring-1 ring-brand-200'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-sm'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn('font-semibold text-sm', selected ? 'text-brand-900' : 'text-slate-800')}>
                            {meta.label}
                          </span>
                          {selected && <CheckCircle2 size={16} className="text-brand-600" />}
                        </div>
                        <span className={cn('block text-xs leading-relaxed', selected ? 'text-brand-700/80' : 'text-slate-500')}>
                          {meta.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">
                  Amount (₹)
                  {selectedTypeMeta?.effect === 'deduction' && (
                    <span className="text-red-500 ml-1">— will be deducted from net pay</span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  placeholder="e.g. Q4 performance bonus, March OT payout…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end bg-slate-50/50 shrink-0">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
                disabled={createMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={createMutation.isPending}
                onClick={handleSubmit}
                className="btn-primary"
              >
                <Plus size={14} /> Add to {periodLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
