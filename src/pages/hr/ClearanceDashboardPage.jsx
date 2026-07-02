import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { hrApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import SeparationClearancePanel from '../../components/separation/SeparationClearancePanel';
import {
  CLEARANCE_CATEGORY_LABELS,
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
  if (!clearance) return null;

  const emp = clearance.employee;
  const req = clearance.separationRequest;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative bg-white w-full max-w-3xl h-full shadow-2xl flex flex-col">
        {/* Header */}
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
              <StatusBadge status={clearance.status} />
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

        {/* Progress summary */}
        {clearance.progress && (
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <ProgressCell progress={clearance.progress} />
              </div>
              <div className="flex gap-4 text-[11px] text-slate-500 shrink-0">
                <span>
                  <span className="font-medium text-slate-700">
                    {clearance.progress.pending_tasks ?? 0}
                  </span>{' '}
                  pending
                </span>
                <span>
                  <span className="font-medium text-slate-700">
                    {clearance.progress.completed_tasks ?? 0}
                  </span>{' '}
                  done
                </span>
                <span>
                  <span className="font-medium text-slate-700">
                    {clearance.progress.rejected_tasks ?? 0}
                  </span>{' '}
                  rejected
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Clearance items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <SeparationClearancePanel
            separationRequestId={clearance.separation_request_id}
            enabled
          />
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

export default function ClearanceDashboardPage() {
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;

  // ── Filter state ──
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [initiatorFilter, setInitiatorFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClearance, setSelectedClearance] = useState(null);
  const [sort, setSort] = useState({ field: 'last_working_date', dir: 'asc' });

  // Debounce search → backend
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
    enabled: !tenantRequired,
    staleTime: 30_000,
  });

  const allClearances = data?.data?.clearances ?? [];
  const serverPagination = data?.data?.pagination;

  // ── Client-side filters ──
  const filtered = useMemo(() => {
    let result = allClearances;
    if (deptFilter) {
      result = result.filter(
        (c) => String(c.employee?.department?.id ?? '') === deptFilter
      );
    }
    if (initiatorFilter) {
      result = result.filter((c) => String(c.initiated_by ?? '') === initiatorFilter);
    }
    return result;
  }, [allClearances, deptFilter, initiatorFilter]);

  // ── Sort ──
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av, bv;
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

  // ── Stats ──
  const stats = useMemo(
    () => ({
      total: filtered.length,
      pending: filtered.filter((c) => c.status === 'pending').length,
      in_progress: filtered.filter((c) => c.status === 'in_progress').length,
      completed: filtered.filter((c) => c.status === 'completed').length,
    }),
    [filtered]
  );

  // ── Filter dropdown options (derived from fetched data) ──
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

  // ── Client-side pagination ──
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

  const hasActiveFilters =
    statusFilter || deptFilter || initiatorFilter || searchInput;

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
        subtitle="Track exit clearance progress across all pending separations"
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Clearances"
          value={stats.total}
          icon={ClipboardList}
          colorClass="bg-brand-600"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          colorClass="bg-slate-500"
        />
        <StatCard
          label="In Progress"
          value={stats.in_progress}
          icon={Loader2}
          colorClass="bg-blue-500"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          colorClass="bg-emerald-500"
        />
      </div>

      {/* Table card */}
      <div className="card">
        {/* Filters */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
          {/* Search */}
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

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
          >
            {CLEARANCE_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Department */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
          >
            <option value="">All departments</option>
            {deptOptions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Initiator (HR owner) */}
          {initiatorOptions.length > 0 && (
            <select
              value={initiatorFilter}
              onChange={(e) => setInitiatorFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            >
              <option value="">All assignees</option>
              {initiatorOptions.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
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
              Showing first 100 of {serverPagination.total} records. Use filters to narrow results.
            </p>
          )}
        </div>

        {/* Table */}
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
              {hasActiveFilters ? 'No clearances match the current filters' : 'No clearances found'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn-secondary text-xs mt-3"
              >
                Clear filters
              </button>
            )}
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
                    <SortTh label="LWD" field="last_working_date" sort={sort} onSort={setSort} />
                    <SortTh label="Status" field="status" sort={sort} onSort={setSort} />
                    <SortTh label="Progress" field="progress" sort={sort} onSort={setSort} />
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
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 group-hover:text-brand-700 transition-colors">
                          {fmtName(c.employee)}
                        </p>
                        {c.employee?.emp_code && (
                          <p className="text-slate-400 mt-0.5">{c.employee.emp_code}</p>
                        )}
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3 text-slate-600">
                        {c.employee?.department?.name ?? '—'}
                      </td>

                      {/* Exit type */}
                      <td className="px-4 py-3 text-slate-600 capitalize">
                        {EXIT_TYPE_LABELS[c.separationRequest?.exit_type] ??
                          c.separationRequest?.exit_type ??
                          '—'}
                      </td>

                      {/* LWD */}
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {fmtDate(c.separationRequest?.last_working_date)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>

                      {/* Progress */}
                      <td className="px-4 py-3 min-w-[130px]">
                        <ProgressCell progress={c.progress} />
                      </td>

                      {/* Assignee (initiator) */}
                      <td className="px-4 py-3 text-slate-500">
                        {c.initiator ? fmtName(c.initiator) : '—'}
                      </td>

                      {/* Action */}
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

      {/* Detail drawer */}
      {selectedClearance && (
        <ClearanceDetailDrawer
          clearance={selectedClearance}
          onClose={() => setSelectedClearance(null)}
        />
      )}
    </div>
  );
}
