import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { departmentApi, hrApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { useTablePagination } from '../../hooks/useTablePagination';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';
import { formatINR, cn, localDateString } from '../../utils/helpers';

const REPORT_TYPES = [
  { id: 'resignation', label: 'Resignations', icon: 'LogOut' },
  { id: 'notice-period', label: 'Notice Period', icon: 'Clock' },
  { id: 'kt', label: 'Knowledge Transfer', icon: 'BookOpen' },
  { id: 'clearance', label: 'Clearance', icon: 'ShieldCheck' },
  { id: 'asset-return', label: 'Asset Returns', icon: 'Laptop' },
  { id: 'fnf', label: 'F&F Settlements', icon: 'Banknote' },
  { id: 'attrition', label: 'Attrition', icon: 'TrendingDown' },
  { id: 'exit-interview', label: 'Exit Interviews', icon: 'MessageSquareQuote' },
];

const STATUS_OPTIONS = {
  resignation: [
    { value: '', label: 'All statuses' },
    { value: 'pending_manager', label: 'Pending Manager' },
    { value: 'pending_hr', label: 'Pending HR' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'withdrawn', label: 'Withdrawn' },
  ],
  'notice-period': [
    { value: '', label: 'All statuses' },
    { value: 'initiated', label: 'Initiated' },
    { value: 'approved', label: 'Approved' },
    { value: 'clearance_pending', label: 'Clearance Pending' },
    { value: 'completed', label: 'Completed' },
  ],
  kt: [
    { value: '', label: 'All statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'pending_manager', label: 'Pending Manager' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ],
  clearance: [
    { value: '', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ],
  'asset-return': [
    { value: '', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'completed', label: 'Completed' },
  ],
  fnf: [
    { value: '', label: 'All statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'calculated', label: 'Calculated' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'paid', label: 'Paid' },
  ],
  'exit-interview': [
    { value: '', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'employee_submitted', label: 'Employee Submitted' },
    { value: 'manager_submitted', label: 'Manager Submitted' },
    { value: 'completed', label: 'Completed' },
    { value: 'waived', label: 'Waived' },
  ],
};

const EXIT_TYPE_OPTIONS = [
  { value: '', label: 'All exit types' },
  { value: 'resignation', label: 'Resignation' },
  { value: 'termination', label: 'Termination' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'absconding', label: 'Absconding' },
];

function defaultDateRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return {
    from: localDateString(from),
    to: localDateString(now),
  };
}

function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function formatCell(value, key) {
  if (value == null || value === '') return '—';
  if (
    ['total_earnings', 'total_deductions', 'net_payable', 'amount_paid', 'balance_due', 'damage_recovery_amount'].includes(
      key
    )
  ) {
    return formatINR(value);
  }
  return String(value);
}

function SummaryChip({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2 min-w-[110px]">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}

export default function ExitReportsPage() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [reportType, setReportType] = useState('resignation');
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [status, setStatus] = useState('');
  const [exitType, setExitType] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [exporting, setExporting] = useState('');
  const [exportError, setExportError] = useState('');

  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;

  const queryParams = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      status: status || undefined,
      exit_type: exitType || undefined,
      department_id: departmentId || undefined,
    }),
    [from, to, status, exitType, departmentId]
  );

  const { data: deptData } = useQuery({
    queryKey: ['departments', 'exit-reports', selectedTenantId],
    queryFn: () => departmentApi.list({ status: 'active' }),
    enabled: !tenantRequired,
  });

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['exit-report', selectedTenantId, reportType, queryParams],
    queryFn: () => hrApi.getExitReport(reportType, queryParams),
    enabled: !tenantRequired,
    staleTime: 30_000,
  });

  const report = data?.data;
  const rows = report?.rows || [];
  const columns = report?.columns || [];
  const summary = report?.summary || {};

  const { setPage, setLimit, paginateClient } = useTablePagination({
    defaultLimit: 20,
    resetDeps: [reportType, from, to, status, exitType, departmentId],
  });
  const { items: visibleRows, pagination } = paginateClient(rows);

  const statusOptions = STATUS_OPTIONS[reportType] || [{ value: '', label: 'All statuses' }];
  const showExitType = !['resignation', 'asset-return'].includes(reportType);
  const departments = deptData?.data?.departments || [];

  const handleExport = async (format) => {
    try {
      setExportError('');
      setExporting(format);
      const response = await hrApi.exportExitReport(reportType, {
        ...queryParams,
        format,
      });
      const stamp = localDateString();
      const filename = `${reportType.replace(/-/g, '_')}_report_${stamp}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      triggerBlobDownload(response.data, filename);
    } catch (err) {
      setExportError(err?.response?.data?.error?.message || err.message || 'Export failed');
    } finally {
      setExporting('');
    }
  };

  const clearFilters = () => {
    setFrom(defaults.from);
    setTo(defaults.to);
    setStatus('');
    setExitType('');
    setDepartmentId('');
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-sm text-slate-500">
        Select a tenant to view Exit Management reports.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="People · Exit"
        title="Exit Management Reports"
        subtitle="Resignation, notice, KT, clearance, assets, F&F, attrition, and interview exports"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/exit-dashboard" className="btn-secondary text-xs">
              Exit Dashboard
            </Link>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        }
      />

      <div className="ds-tabs scroll-tabs flex-wrap" role="tablist">
        {REPORT_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            role="tab"
            aria-selected={reportType === type.id}
            onClick={() => {
              setReportType(type.id);
              setStatus('');
              setExportError('');
            }}
            className={cn(reportType === type.id && 'ds-tab-active')}
          >
            {type.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="ds-toolbar">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} className="text-slate-400" />
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Filters</p>
          </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="ds-input mt-1 w-full"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="ds-input mt-1 w-full"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="ds-select mt-1 w-full"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          {showExitType && (
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Exit Type</label>
              <select
                value={exitType}
                onChange={(e) => setExitType(e.target.value)}
                className="ds-select mt-1 w-full"
              >
                {EXIT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Department</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="ds-select mt-1 w-full"
            >
              <option value="">All departments</option>
              {(Array.isArray(departments) ? departments : []).map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button type="button" className="btn-secondary text-xs" onClick={clearFilters}>
            Reset filters
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={!!exporting}
            onClick={() => handleExport('xlsx')}
          >
            <FileSpreadsheet size={13} />
            {exporting === 'xlsx' ? 'Exporting…' : 'Export Excel'}
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={!!exporting}
            onClick={() => handleExport('pdf')}
          >
            <FileText size={13} />
            {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
          </button>
          {exportError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle size={12} /> {exportError}
            </p>
          )}
        </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{report?.title || 'Report'}</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {rows.length} record{rows.length === 1 ? '' : 's'}
              {report?.generated_at
                ? ` · Generated ${new Date(report.generated_at).toLocaleString('en-IN')}`
                : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.total != null && <SummaryChip label="Total" value={summary.total} />}
            {summary.on_notice != null && <SummaryChip label="On notice" value={summary.on_notice} />}
            {summary.avg_progress != null && <SummaryChip label="Avg KT %" value={`${summary.avg_progress}%`} />}
            {summary.pending_clearances != null && (
              <SummaryChip label="Pending clearances" value={summary.pending_clearances} />
            )}
            {summary.attrition_rate != null && (
              <SummaryChip label="Attrition %" value={`${summary.attrition_rate}%`} />
            )}
            {summary.avg_overall_rating != null && (
              <SummaryChip label="Avg rating" value={summary.avg_overall_rating} />
            )}
            {summary.net_payable_total != null && (
              <SummaryChip label="Net payable" value={formatINR(summary.net_payable_total)} />
            )}
            {summary.balance_due_total != null && (
              <SummaryChip label="Balance due" value={formatINR(summary.balance_due_total)} />
            )}
            {summary.recovery_total != null && (
              <SummaryChip label="Recovery" value={formatINR(summary.recovery_total)} />
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 size={18} className="animate-spin" /> Generating report…
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <AlertCircle size={28} className="mx-auto text-red-400 mb-2" />
            <p className="text-sm text-red-600">
              {error.response?.data?.error?.message || error.message || 'Failed to load report'}
            </p>
            <button type="button" className="btn-secondary text-xs mt-3" onClick={() => refetch()}>
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <Download size={28} className="mx-auto text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">No records match the selected filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key} className="text-left px-4 py-3 font-semibold whitespace-nowrap">
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((row, index) => (
                    <tr key={`${row.emp_code || 'row'}-${index}`} className="hover:bg-slate-50">
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {formatCell(row[col.key], col.key)}
                        </td>
                      ))}
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

      {(summary.by_status?.length > 0 || summary.by_exit_type?.length > 0 || summary.by_reason?.length > 0 || summary.by_department?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {summary.by_status?.length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-800 mb-3">By status</h3>
              <ul className="space-y-1.5">
                {summary.by_status.map((item) => (
                  <li key={item.key} className="flex justify-between text-xs">
                    <span className="text-slate-500 capitalize">{item.label}</span>
                    <span className="font-semibold text-slate-800">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {summary.by_exit_type?.length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-800 mb-3">By exit type</h3>
              <ul className="space-y-1.5">
                {summary.by_exit_type.map((item) => (
                  <li key={item.key} className="flex justify-between text-xs">
                    <span className="text-slate-500 capitalize">{item.label}</span>
                    <span className="font-semibold text-slate-800">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {summary.by_reason?.length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-800 mb-3">By reason</h3>
              <ul className="space-y-1.5">
                {summary.by_reason.slice(0, 8).map((item) => (
                  <li key={item.key} className="flex justify-between text-xs">
                    <span className="text-slate-500 capitalize">{item.label}</span>
                    <span className="font-semibold text-slate-800">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {summary.by_department?.length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-800 mb-3">By department</h3>
              <ul className="space-y-1.5">
                {summary.by_department.slice(0, 8).map((item) => (
                  <li key={item.key} className="flex justify-between text-xs">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="font-semibold text-slate-800">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
