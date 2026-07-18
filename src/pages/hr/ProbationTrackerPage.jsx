import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { CalendarClock, CheckCircle2, Search, UserCheck, XCircle } from 'lucide-react';
import { employeeApi, departmentApi, probationPolicyApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { useTablePagination } from '../../hooks/useTablePagination';
import StatusBadge, { Avatar } from '../../components/shared/StatusBadge';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../utils/helpers';
import { resolvePortalRole } from '../../utils/portalContext';

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
  return <span className="text-xs text-slate-500">{days}d left</span>;
}

export default function ProbationTrackerPage() {
  const { selectedTenantId, user, workspace, roles, selectedRole, accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;
  const portalRole = resolvePortalRole({ accessToken, workspace, user, roles, selectedRole });
  const canAct = ['super_admin', 'owner', 'hr', 'admin'].includes(portalRole);

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [policyFilter, setPolicyFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [actionTarget, setActionTarget] = useState(null); // { emp, mode: 'confirm'|'extend'|'separate' }
  const [actionForm, setActionForm] = useState({ extension_months: 3, remarks: '' });
  const [actionError, setActionError] = useState('');

  const { page, limit, setPage, setLimit, paginateClient } = useTablePagination({
    defaultLimit: 20,
    resetDeps: [search, departmentFilter, policyFilter, urgencyFilter, selectedTenantId],
  });

  const { data: empData, isLoading, error } = useQuery({
    queryKey: ['employees-probation', selectedTenantId],
    queryFn: () =>
      employeeApi.list({ has_probation: true, status: 'probation', limit: 500, page: 1 }),
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
      if (emp.has_probation !== true) return false;
      if (emp.status !== 'probation') return false;
      if (q) {
        const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        if (
          !fullName.includes(q) &&
          !emp.emp_code?.toLowerCase().includes(q) &&
          !emp.email?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (departmentFilter && String(emp.department_id) !== String(departmentFilter)) return false;
      if (policyFilter && String(emp.probation_policy_id) !== String(policyFilter)) return false;
      if (urgencyFilter && emp.probation_end_date) {
        const days = differenceInCalendarDays(
          parseISO(String(emp.probation_end_date).slice(0, 10)),
          today
        );
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
    () =>
      allEmployees.filter(
        (e) =>
          e.status === 'probation' &&
          e.probation_end_date &&
          differenceInCalendarDays(parseISO(String(e.probation_end_date).slice(0, 10)), today) < 0
      ).length,
    [allEmployees, today]
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['employees-probation', selectedTenantId] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  const closeActionModal = () => {
    setActionTarget(null);
    setActionForm({ extension_months: 3, remarks: '' });
    setActionError('');
  };

  const openAction = (emp, mode) => {
    setActionTarget({ emp, mode });
    setActionForm({ extension_months: 3, remarks: '' });
    setActionError('');
  };

  const confirmMutation = useMutation({
    mutationFn: ({ id, payload }) => employeeApi.confirmProbation(id, payload),
    onSuccess: () => {
      invalidate();
      closeActionModal();
    },
    onError: (err) =>
      setActionError(err.response?.data?.error?.message || 'Failed to confirm probation'),
  });

  const extendMutation = useMutation({
    mutationFn: ({ id, payload }) => employeeApi.extendProbation(id, payload),
    onSuccess: () => {
      invalidate();
      closeActionModal();
    },
    onError: (err) =>
      setActionError(err.response?.data?.error?.message || 'Failed to extend probation'),
  });

  const separateMutation = useMutation({
    mutationFn: ({ id, payload }) => employeeApi.probationUnsuccessful(id, payload),
    onSuccess: () => {
      invalidate();
      closeActionModal();
    },
    onError: (err) =>
      setActionError(err.response?.data?.error?.message || 'Failed to separate employee'),
  });

  const actionPending =
    confirmMutation.isPending || extendMutation.isPending || separateMutation.isPending;

  const handleActionSubmit = (e) => {
    e.preventDefault();
    if (!actionTarget) return;
    setActionError('');
    const { emp, mode } = actionTarget;
    const remarks = actionForm.remarks.trim() || undefined;

    if (mode === 'confirm') {
      confirmMutation.mutate({ id: emp.id, payload: { remarks } });
      return;
    }
    if (mode === 'extend') {
      const months = parseInt(actionForm.extension_months, 10);
      if (!months || months < 1 || months > 24) {
        setActionError('Extension must be between 1 and 24 months');
        return;
      }
      extendMutation.mutate({
        id: emp.id,
        payload: { extension_months: months, remarks },
      });
      return;
    }
    if (mode === 'separate') {
      separateMutation.mutate({ id: emp.id, payload: { remarks } });
    }
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to view the probation tracker.
      </div>
    );
  }

  const targetEmp = actionTarget?.emp;

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
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={policyFilter}
            onChange={(e) => setPolicyFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 w-full sm:w-auto sm:min-w-[160px]"
          >
            <option value="">All policies</option>
            {policies
              .filter((p) => p.is_enabled)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.policy_name}
                </option>
              ))}
          </select>

          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 w-full sm:w-auto sm:min-w-[160px]"
          >
            {URGENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
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
              {allEmployees.length === 0
                ? 'No employees currently on probation'
                : 'No employees match the current filters'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left border-b border-slate-200">
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Employee
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Department
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Policy
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                      Probation End
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                      Days Remaining
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    {canAct && (
                      <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    )}
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
                          ? policyMap[emp.probation_policy_id] || `Policy #${emp.probation_policy_id}`
                          : '—'}
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
                      {canAct && (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openAction(emp, 'confirm')}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                              title="Confirm probation"
                            >
                              <CheckCircle2 size={12} /> Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => openAction(emp, 'extend')}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200"
                              title="Extend probation"
                            >
                              <CalendarClock size={12} /> Extend
                            </button>
                            <button
                              type="button"
                              onClick={() => openAction(emp, 'separate')}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200"
                              title="Separate (probation unsuccessful)"
                            >
                              <XCircle size={12} /> Separate
                            </button>
                          </div>
                        </td>
                      )}
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

      {actionTarget && targetEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            onClick={closeActionModal}
            aria-label="Close"
          />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-semibold text-slate-900">
              {actionTarget.mode === 'confirm' && 'Confirm Probation'}
              {actionTarget.mode === 'extend' && 'Extend Probation'}
              {actionTarget.mode === 'separate' && 'Separate Employee'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {actionTarget.mode === 'confirm' &&
                `${targetEmp.first_name} ${targetEmp.last_name} will be set to active and probation will be closed.`}
              {actionTarget.mode === 'extend' &&
                `Current end date: ${fmtDate(targetEmp.probation_end_date)}. New end date is calculated from the current end date.`}
              {actionTarget.mode === 'separate' &&
                `${targetEmp.first_name} ${targetEmp.last_name} will be marked as separated (probation unsuccessful). This cannot be undone.`}
            </p>
            <form className="mt-4 space-y-4" onSubmit={handleActionSubmit}>
              {actionTarget.mode === 'extend' && (
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Extension months <span className="text-slate-400 font-normal">(1–24)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={actionForm.extension_months}
                    onChange={(e) =>
                      setActionForm((p) => ({ ...p, extension_months: e.target.value }))
                    }
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    required
                    autoFocus
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Remarks <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={actionForm.remarks}
                  onChange={(e) => setActionForm((p) => ({ ...p, remarks: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                  placeholder="Add a note for the record…"
                  maxLength={500}
                />
              </div>
              {actionError && <p className="text-sm text-red-600">{actionError}</p>}
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={closeActionModal}
                  className="btn-secondary text-xs"
                  disabled={actionPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionPending}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50',
                    actionTarget.mode === 'separate'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'btn-primary'
                  )}
                >
                  {actionPending
                    ? 'Saving…'
                    : actionTarget.mode === 'confirm'
                      ? 'Confirm'
                      : actionTarget.mode === 'extend'
                        ? 'Extend'
                        : 'Separate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
