import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  Settings2,
  Siren,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { hrApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import SeparationClearancePanel from '../../components/separation/SeparationClearancePanel';
import {
  CLEARANCE_DEPARTMENT_LABELS,
  CLEARANCE_DEPARTMENTS,
  CLEARANCE_STATUSES,
} from '../../constants/hr';
import { useTablePagination } from '../../hooks/useTablePagination';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../utils/helpers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(value) {
  if (!value) return '—';
  try { return format(parseISO(value), 'dd MMM yyyy'); } catch { return value; }
}

function fmtName(emp) {
  if (!emp) return '—';
  return `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim() || emp.emp_code || '—';
}

const EXIT_TYPE_LABELS = {
  resignation: 'Resignation',
  termination: 'Termination',
  retirement: 'Retirement',
  absconding: 'Absconding',
};

function DeptProgressPills({ departmentProgress }) {
  if (!departmentProgress) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {CLEARANCE_DEPARTMENTS.map((dept) => {
        const stats = departmentProgress[dept] || { total: 0, completed: 0, pending: 0, rejected: 0 };
        if (!stats.total) return null;
        const done = stats.completed === stats.total && stats.rejected === 0;
        return (
          <span
            key={dept}
            title={`${CLEARANCE_DEPARTMENT_LABELS[dept]}: ${stats.completed}/${stats.total}`}
            className={cn(
              'text-[9px] font-semibold px-1.5 py-0.5 rounded',
              done
                ? 'bg-emerald-50 text-emerald-700'
                : stats.rejected
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-600'
            )}
          >
            {CLEARANCE_DEPARTMENT_LABELS[dept]} {stats.completed}/{stats.total}
          </span>
        );
      })}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, colorClass }) {
  return (
    <div className="card flex items-center gap-4 p-4 min-w-0">
      <div className={cn('p-2.5 rounded-xl shrink-0', colorClass)}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 truncate">{label}</p>
      </div>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressCell({ progress }) {
  const pct = progress?.completion_percentage ?? 0;
  const total = progress?.total_tasks ?? 0;
  const done = progress?.completed_tasks ?? 0;

  return (
    <div className="min-w-[100px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-700">{pct}%</span>
        <span className="text-[10px] text-slate-400">{done}/{total}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-brand-500' : 'bg-slate-300'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        'inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize whitespace-nowrap',
        CLEARANCE_STATUSES[status] ?? 'bg-slate-100 text-slate-600'
      )}
    >
      {status?.replace(/_/g, ' ') ?? '—'}
    </span>
  );
}

// ─── Clearance Detail Drawer ──────────────────────────────────────────────────

function ClearanceDetailDrawer({ clearance, onClose }) {
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['separation-clearance-detail', clearance?.id],
    queryFn: () => hrApi.getSeparationClearance(clearance.id),
    enabled: !!clearance?.id,
  });

  if (!clearance) return null;

  const full = detailData?.data?.clearance || clearance;
  const emp = full.employee || clearance.employee;
  const req = full.separationRequest || clearance.separationRequest;
  const progress = full.progress || clearance.progress;
  const departmentProgress = full.department_progress || clearance.department_progress;
  const separationRequestId =
    full.separation_request_id || clearance.separation_request_id;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative bg-white w-full max-w-3xl h-full shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 truncate">
              {fmtName(emp)}
              {emp?.emp_code && (
                <span className="ml-2 text-slate-400 font-normal text-xs">#{emp.emp_code}</span>
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              {emp?.department?.name && (
                <span className="text-xs text-slate-500">{emp.department.name}</span>
              )}
              {req?.exit_type && (
                <span className="text-xs text-slate-400">
                  {EXIT_TYPE_LABELS[req.exit_type] ?? req.exit_type}
                </span>
              )}
              {req?.last_working_date && (
                <span className="text-xs text-slate-400">
                  LWD: {fmtDate(req.last_working_date)}
                </span>
              )}
              <StatusBadge status={full.status || clearance.status} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {progress && (
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 shrink-0 space-y-2">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <ProgressCell progress={progress} />
              </div>
              <div className="flex gap-4 text-[11px] text-slate-500 shrink-0">
                <span>
                  <span className="font-medium text-slate-700">
                    {progress.pending_tasks ?? 0}
                  </span>{' '}
                  pending
                </span>
                <span>
                  <span className="font-medium text-slate-700">
                    {progress.completed_tasks ?? 0}
                  </span>{' '}
                  done
                </span>
                <span>
                  <span className="font-medium text-slate-700">
                    {progress.rejected_tasks ?? 0}
                  </span>{' '}
                  rejected
                </span>
              </div>
            </div>
            <DeptProgressPills departmentProgress={departmentProgress} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {detailLoading && !separationRequestId ? (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-400 text-sm">
              <Loader2 size={18} className="animate-spin" />
              Loading clearance…
            </div>
          ) : (
            <SeparationClearancePanel
              separationRequestId={separationRequestId}
              enabled={!!separationRequestId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sortable Column Header ───────────────────────────────────────────────────

function SortTh({ label, field, sort, onSort }) {
  const active = sort.field === field;
  return (
    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">
      <button
        type="button"
        onClick={() =>
          onSort({ field, dir: active && sort.dir === 'asc' ? 'desc' : 'asc' })
        }
        className="inline-flex items-center gap-1 hover:text-brand-600"
      >
        {label}
        {active ? (
          sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ChevronDown size={12} className="text-slate-300" />
        )}
      </button>
    </th>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CLEARANCE_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TABS = [
  { id: 'overview', label: 'Clearances' },
  { id: 'queue', label: 'Department queue' },
  { id: 'owners', label: 'Owners & SLA' },
];

function DepartmentOwnersPanel({ enabled }) {
  const queryClient = useQueryClient();
  const [forms, setForms] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState('');

  const { data: ownersData, isLoading } = useQuery({
    queryKey: ['clearance-department-owners'],
    queryFn: () => hrApi.listClearanceDepartmentOwners(),
    enabled,
  });

  const { data: empData } = useQuery({
    queryKey: ['separation-eligible-employees'],
    queryFn: () => hrApi.listSeparationEligibleEmployees({ limit: 500 }),
    enabled,
  });

  const owners = ownersData?.data?.owners ?? [];
  const employees = empData?.data?.employees || [];

  useEffect(() => {
    const next = {};
    for (const dept of CLEARANCE_DEPARTMENTS) {
      const row = owners.find((o) => o.department === dept);
      next[dept] = {
        owner_employee_id: row?.owner_employee_id ? String(row.owner_employee_id) : '',
        escalate_to_employee_id: row?.escalate_to_employee_id
          ? String(row.escalate_to_employee_id)
          : '',
        reminder_days_before: row?.reminder_days_before ?? 2,
        escalate_days_after_due: row?.escalate_days_after_due ?? 1,
        is_active: row?.is_active !== false,
        notes: row?.notes || '',
      };
    }
    setForms(next);
  }, [owners]);

  const saveMutation = useMutation({
    mutationFn: (payload) => hrApi.upsertClearanceDepartmentOwner(payload),
    onSuccess: () => {
      setSaveOk('Saved');
      setSaveError('');
      queryClient.invalidateQueries({ queryKey: ['clearance-department-owners'] });
      queryClient.invalidateQueries({ queryKey: ['clearance-department-dashboard'] });
      setTimeout(() => setSaveOk(''), 2000);
    },
    onError: (err) => {
      setSaveOk('');
      setSaveError(err.response?.data?.error?.message || err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-slate-400 text-sm">
        <Loader2 size={18} className="animate-spin" />
        Loading department owners…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Configure who owns each clearance department, when reminders fire, and who receives
        escalations after SLA breach. New clearance runs assign items to these owners first.
      </p>
      {(saveError || saveOk) && (
        <p className={cn('text-xs', saveError ? 'text-red-600' : 'text-emerald-600')}>
          {saveError || saveOk}
        </p>
      )}
      <div className="grid gap-3">
        {CLEARANCE_DEPARTMENTS.map((dept) => {
          const form = forms[dept] || {};
          return (
            <div key={dept} className="border border-slate-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800">
                  {CLEARANCE_DEPARTMENT_LABELS[dept]}
                </h3>
                <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.is_active !== false}
                    onChange={(e) =>
                      setForms((prev) => ({
                        ...prev,
                        [dept]: { ...prev[dept], is_active: e.target.checked },
                      }))
                    }
                  />
                  Active
                </label>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="text-[11px] text-slate-500 space-y-1">
                  Owner
                  <select
                    className="input text-xs w-full"
                    value={form.owner_employee_id || ''}
                    onChange={(e) =>
                      setForms((prev) => ({
                        ...prev,
                        [dept]: { ...prev[dept], owner_employee_id: e.target.value },
                      }))
                    }
                  >
                    <option value="">Select owner…</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {fmtName(e)} {e.emp_code ? `(${e.emp_code})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] text-slate-500 space-y-1">
                  Escalate to
                  <select
                    className="input text-xs w-full"
                    value={form.escalate_to_employee_id || ''}
                    onChange={(e) =>
                      setForms((prev) => ({
                        ...prev,
                        [dept]: { ...prev[dept], escalate_to_employee_id: e.target.value },
                      }))
                    }
                  >
                    <option value="">Same as owner</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {fmtName(e)} {e.emp_code ? `(${e.emp_code})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] text-slate-500 space-y-1">
                  Remind days before due
                  <input
                    type="number"
                    min={0}
                    max={30}
                    className="input text-xs w-full"
                    value={form.reminder_days_before ?? 2}
                    onChange={(e) =>
                      setForms((prev) => ({
                        ...prev,
                        [dept]: {
                          ...prev[dept],
                          reminder_days_before: Number(e.target.value),
                        },
                      }))
                    }
                  />
                </label>
                <label className="text-[11px] text-slate-500 space-y-1">
                  Escalate days after due
                  <input
                    type="number"
                    min={0}
                    max={30}
                    className="input text-xs w-full"
                    value={form.escalate_days_after_due ?? 1}
                    onChange={(e) =>
                      setForms((prev) => ({
                        ...prev,
                        [dept]: {
                          ...prev[dept],
                          escalate_days_after_due: Number(e.target.value),
                        },
                      }))
                    }
                  />
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn-primary text-xs"
                  disabled={!form.owner_employee_id || saveMutation.isPending}
                  onClick={() =>
                    saveMutation.mutate({
                      department: dept,
                      owner_employee_id: Number(form.owner_employee_id),
                      escalate_to_employee_id: form.escalate_to_employee_id
                        ? Number(form.escalate_to_employee_id)
                        : null,
                      reminder_days_before: Number(form.reminder_days_before ?? 2),
                      escalate_days_after_due: Number(form.escalate_days_after_due ?? 1),
                      is_active: form.is_active !== false,
                      notes: form.notes || null,
                    })
                  }
                >
                  Save {CLEARANCE_DEPARTMENT_LABELS[dept]}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DepartmentQueuePanel({ enabled, onOpenClearance }) {
  const [dept, setDept] = useState('');
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['clearance-department-dashboard', dept],
    queryFn: () =>
      hrApi.getClearanceDepartmentDashboard(dept ? { department: dept } : undefined),
    enabled,
    staleTime: 30_000,
  });

  const summary = data?.data?.summary;
  const byDept = data?.data?.by_department || {};
  const items = data?.data?.items || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
        >
          <option value="">All clearance departments</option>
          {CLEARANCE_DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {CLEARANCE_DEPARTMENT_LABELS[d]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary text-xs"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Open items" value={summary?.open_items ?? 0} icon={ClipboardList} colorClass="bg-brand-600" />
        <StatCard label="Overdue" value={summary?.overdue ?? 0} icon={AlertTriangle} colorClass="bg-red-500" />
        <StatCard label="Due soon" value={summary?.due_soon ?? 0} icon={Clock} colorClass="bg-amber-500" />
        <StatCard label="Escalated" value={summary?.escalated ?? 0} icon={Siren} colorClass="bg-violet-500" />
        <StatCard label="SLA breached" value={summary?.sla_breached ?? 0} icon={AlertTriangle} colorClass="bg-rose-600" />
      </div>

      <div className="grid sm:grid-cols-5 gap-2">
        {CLEARANCE_DEPARTMENTS.map((d) => {
          const stats = byDept[d] || {};
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDept(d)}
              className={cn(
                'text-left rounded-xl border px-3 py-2',
                dept === d ? 'border-brand-300 bg-brand-50' : 'border-slate-100 bg-white'
              )}
            >
              <p className="text-[11px] font-semibold text-slate-700">
                {CLEARANCE_DEPARTMENT_LABELS[d]}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {stats.pending || 0} open · {stats.overdue || 0} overdue
              </p>
            </button>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400 text-sm">
            <Loader2 size={18} className="animate-spin" />
            Loading queue…
          </div>
        ) : error ? (
          <p className="p-8 text-center text-red-500 text-sm">
            {error.response?.data?.error?.message || error.message}
          </p>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-slate-400 text-sm">No open department items</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-slate-500">
                  <th className="text-left px-4 py-3 font-semibold">Item</th>
                  <th className="text-left px-4 py-3 font-semibold">Employee</th>
                  <th className="text-left px-4 py-3 font-semibold">Dept</th>
                  <th className="text-left px-4 py-3 font-semibold">Due</th>
                  <th className="text-left px-4 py-3 font-semibold">Assignee</th>
                  <th className="text-left px-4 py-3 font-semibold">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() =>
                      onOpenClearance?.({
                        id: item.clearance_id,
                        separation_request_id: item.clearance?.separation_request_id,
                        employee_id: item.clearance?.employee_id,
                        employee: item.clearance?.employee,
                        separationRequest: item.clearance?.separationRequest,
                        status: item.clearance?.status,
                      })
                    }
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{item.title}</p>
                      {item.is_mandatory && (
                        <span className="text-[9px] uppercase text-orange-600">Mandatory</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{fmtName(item.clearance?.employee)}</td>
                    <td className="px-4 py-3">
                      {CLEARANCE_DEPARTMENT_LABELS[item.department] || item.department}
                    </td>
                    <td
                      className={cn(
                        'px-4 py-3 whitespace-nowrap',
                        item.is_overdue ? 'text-red-600 font-semibold' : 'text-slate-600'
                      )}
                    >
                      {fmtDate(item.due_date)}
                    </td>
                    <td className="px-4 py-3">{fmtName(item.assignee)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.is_overdue && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700">
                            Overdue
                          </span>
                        )}
                        {item.is_due_soon && !item.is_overdue && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                            Due soon
                          </span>
                        )}
                        {item.escalated_at && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700">
                            Escalated
                          </span>
                        )}
                        {item.sla_breached_at && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">
                            SLA
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClearanceDashboardPage() {
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;
  const canManageOwners = ['super_admin', 'owner', 'hr', 'admin'].includes(
    user?.role || user?.system_role
  );

  const [tab, setTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [initiatorFilter, setInitiatorFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClearance, setSelectedClearance] = useState(null);
  const [sort, setSort] = useState({ field: 'last_working_date', dir: 'asc' });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const queryParams = useMemo(
    () => ({
      status: statusFilter || undefined,
      search: debouncedSearch || undefined,
      limit: 100,
      page: 1,
    }),
    [statusFilter, debouncedSearch]
  );

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['separation-clearances-dashboard', selectedTenantId, queryParams],
    queryFn: () => hrApi.listSeparationClearances(queryParams),
    enabled: !tenantRequired && tab === 'overview',
    staleTime: 30_000,
  });

  const { data: slaData } = useQuery({
    queryKey: ['clearance-department-dashboard-summary', selectedTenantId],
    queryFn: () => hrApi.getClearanceDepartmentDashboard(),
    enabled: !tenantRequired,
    staleTime: 30_000,
  });

  const allClearances = data?.data?.clearances ?? [];
  const serverPagination = data?.data?.pagination;
  const slaSummary = slaData?.data?.summary;

  const filtered = useMemo(() => {
    let result = allClearances;
    if (deptFilter) {
      result = result.filter((c) => String(c.employee?.department?.id ?? '') === deptFilter);
    }
    if (initiatorFilter) {
      result = result.filter((c) => String(c.initiated_by ?? '') === initiatorFilter);
    }
    return result;
  }, [allClearances, deptFilter, initiatorFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av;
      let bv;
      if (sort.field === 'last_working_date') {
        av = a.separationRequest?.last_working_date ?? '';
        bv = b.separationRequest?.last_working_date ?? '';
      } else if (sort.field === 'employee') {
        av = fmtName(a.employee).toLowerCase();
        bv = fmtName(b.employee).toLowerCase();
      } else if (sort.field === 'progress') {
        av = a.progress?.completion_percentage ?? 0;
        bv = b.progress?.completion_percentage ?? 0;
      } else if (sort.field === 'status') {
        av = a.status ?? '';
        bv = b.status ?? '';
      } else {
        return 0;
      }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sort]);

  const stats = useMemo(
    () => ({
      total: filtered.length,
      pending: filtered.filter((c) => c.status === 'pending').length,
      in_progress: filtered.filter((c) => c.status === 'in_progress').length,
      completed: filtered.filter((c) => c.status === 'completed').length,
    }),
    [filtered]
  );

  const deptOptions = useMemo(() => {
    const map = new Map();
    for (const c of allClearances) {
      const d = c.employee?.department;
      if (d?.id) map.set(String(d.id), d.name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allClearances]);

  const initiatorOptions = useMemo(() => {
    const map = new Map();
    for (const c of allClearances) {
      if (c.initiator?.id) {
        map.set(
          String(c.initiator.id),
          `${c.initiator.first_name ?? ''} ${c.initiator.last_name ?? ''}`.trim() ||
            c.initiator.emp_code
        );
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allClearances]);

  const { setPage, setLimit, paginateClient } = useTablePagination({
    defaultLimit: 20,
    resetDeps: [statusFilter, debouncedSearch, deptFilter, initiatorFilter, sort],
  });
  const { items: visibleRows, pagination: pg } = paginateClient(sorted);

  const clearFilters = () => {
    setStatusFilter('');
    setDeptFilter('');
    setInitiatorFilter('');
    setSearchInput('');
  };

  const hasActiveFilters = statusFilter || deptFilter || initiatorFilter || searchInput;

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to view the clearance dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clearance Dashboard"
        subtitle="Department owners, SLA tracking, and mandatory approval gates for exits"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/clearance-templates" className="btn-secondary text-xs">
              <ClipboardList size={13} /> Manage Templates
            </Link>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="btn-secondary text-xs"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
        {TABS.filter((t) => t.id !== 'owners' || canManageOwners).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3 py-2 text-xs font-medium border-b-2 -mb-px',
              tab === t.id
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t.id === 'owners' && <Settings2 size={12} className="inline mr-1" />}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard label="Total Clearances" value={stats.total} icon={ClipboardList} colorClass="bg-brand-600" />
            <StatCard label="Pending" value={stats.pending} icon={Clock} colorClass="bg-slate-500" />
            <StatCard label="In Progress" value={stats.in_progress} icon={Loader2} colorClass="bg-blue-500" />
            <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} colorClass="bg-emerald-500" />
            <StatCard label="Open items" value={slaSummary?.open_items ?? 0} icon={ClipboardList} colorClass="bg-indigo-500" />
            <StatCard label="Overdue" value={slaSummary?.overdue ?? 0} icon={AlertTriangle} colorClass="bg-red-500" />
            <StatCard label="Escalated" value={slaSummary?.escalated ?? 0} icon={Siren} colorClass="bg-violet-500" />
          </div>

          <div className="card">
            <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search employee…"
                  className="pl-7 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs w-44"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              >
                {CLEARANCE_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              >
                <option value="">All departments</option>
                {deptOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {initiatorOptions.length > 0 && (
                <select
                  value={initiatorFilter}
                  onChange={(e) => setInitiatorFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">All assignees</option>
                  {initiatorOptions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 ml-auto"
                >
                  <X size={12} /> Clear filters
                </button>
              )}

              {serverPagination?.total > 100 && (
                <p className="text-[10px] text-amber-600 ml-auto">
                  Showing first 100 of {serverPagination.total} records. Use filters to narrow
                  results.
                </p>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-slate-400 text-sm">
                <Loader2 size={18} className="animate-spin" />
                Loading clearances…
              </div>
            ) : error ? (
              <p className="p-8 text-center text-red-500 text-sm">
                {error.response?.data?.error?.message || error.message}
              </p>
            ) : sorted.length === 0 ? (
              <div className="py-16 text-center">
                <ClipboardList size={32} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">
                  {hasActiveFilters
                    ? 'No clearances match the current filters'
                    : 'No clearances found'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto overscroll-x-contain">
                  <table className="w-full text-xs min-w-[780px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-slate-500">
                        <SortTh label="Employee" field="employee" sort={sort} onSort={setSort} />
                        <th className="text-left px-4 py-3 font-semibold">Department</th>
                        <th className="text-left px-4 py-3 font-semibold">Exit Type</th>
                        <SortTh
                          label="LWD"
                          field="last_working_date"
                          sort={sort}
                          onSort={setSort}
                        />
                        <SortTh label="Status" field="status" sort={sort} onSort={setSort} />
                        <SortTh label="Progress" field="progress" sort={sort} onSort={setSort} />
                        <th className="text-left px-4 py-3 font-semibold">Dept Approvals</th>
                        <th className="text-left px-4 py-3 font-semibold">Assignee</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {visibleRows.map((c) => (
                        <tr
                          key={c.id}
                          className="hover:bg-slate-50 cursor-pointer group"
                          onClick={() => setSelectedClearance(c)}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 group-hover:text-brand-700 transition-colors">
                              {fmtName(c.employee)}
                            </p>
                            {c.employee?.emp_code && (
                              <p className="text-slate-400 mt-0.5">{c.employee.emp_code}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {c.employee?.department?.name ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 capitalize">
                            {EXIT_TYPE_LABELS[c.separationRequest?.exit_type] ??
                              c.separationRequest?.exit_type ??
                              '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {fmtDate(c.separationRequest?.last_working_date)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="px-4 py-3 min-w-[130px]">
                            <ProgressCell progress={c.progress} />
                          </td>
                          <td className="px-4 py-3 min-w-[160px]">
                            <DeptProgressPills departmentProgress={c.department_progress} />
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {c.initiator ? fmtName(c.initiator) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClearance(c);
                              }}
                              className="btn-secondary text-[10px] py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  page={pg.page}
                  limit={pg.limit}
                  total={pg.total}
                  totalPages={pg.totalPages}
                  onPageChange={setPage}
                  onLimitChange={setLimit}
                />
              </>
            )}
          </div>
        </>
      )}

      {tab === 'queue' && (
        <DepartmentQueuePanel
          enabled={!tenantRequired}
          onOpenClearance={(partial) => setSelectedClearance(partial)}
        />
      )}

      {tab === 'owners' && canManageOwners && (
        <div className="card p-4">
          <DepartmentOwnersPanel enabled={!tenantRequired} />
        </div>
      )}

      {selectedClearance && (
        <ClearanceDetailDrawer
          clearance={selectedClearance}
          onClose={() => setSelectedClearance(null)}
        />
      )}
    </div>
  );
}
