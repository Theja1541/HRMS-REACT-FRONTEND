import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { BarChart3, Download, Eye, MessageSquareQuote, Search, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { hrApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import SeparationExitInterviewPanel from '../../components/separation/SeparationExitInterviewPanel';
import ExitInterviewQuestionnaireManager from '../../components/separation/ExitInterviewQuestionnaireManager';
import {
  EXIT_INTERVIEW_STATUS_LABELS,
  EXIT_INTERVIEW_STATUSES,
  EXIT_RESIGNATION_REASON_LABELS,
} from '../../constants/hr';
import { useTablePagination } from '../../hooks/useTablePagination';
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

function StatCard({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-2xl font-bold text-slate-900">{value ?? '—'}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function ExitInterviewsPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [view, setView] = useState('interviews');
  const [exporting, setExporting] = useState('');
  const { page, limit, setPage, setLimit, queryParams } = useTablePagination({
    resetDeps: [status, search],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['exit-interviews', status, page, limit],
    queryFn: () =>
      hrApi.listExitInterviews({
        status: status || undefined,
        ...queryParams,
      }),
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['exit-interview-analytics'],
    queryFn: () => hrApi.getExitInterviewAnalytics(),
    enabled: showAnalytics,
  });

  const interviews = data?.data?.interviews || [];
  const pagination = data?.data?.pagination;
  const analytics = analyticsData?.data;

  const exportReport = async (formatType) => {
    try {
      setExporting(formatType);
      const response = await hrApi.exportExitReport('exit-interview', { format: formatType });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `exit_interview_report.${formatType}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting('');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return interviews;
    return interviews.filter((item) => {
      const name = `${item.employee?.first_name || ''} ${item.employee?.last_name || ''} ${item.employee?.emp_code || ''}`.toLowerCase();
      return name.includes(q);
    });
  }, [interviews, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="People · Exit"
        title="Exit Interviews"
        subtitle="Employee questionnaires, manager & HR feedback, resignation reasons, and analytics"
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setView((current) => (current === 'interviews' ? 'questionnaires' : 'interviews'))}
            >
              <Settings2 size={14} /> {view === 'interviews' ? 'Questionnaires' : 'Interviews'}
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={!!exporting}
              onClick={() => exportReport('xlsx')}
            >
              <Download size={14} /> {exporting === 'xlsx' ? 'Exporting…' : 'Excel'}
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={!!exporting}
              onClick={() => exportReport('pdf')}
            >
              <Download size={14} /> {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setShowAnalytics((v) => !v)}
              disabled={view !== 'interviews'}
            >
              <BarChart3 size={14} /> {showAnalytics ? 'Hide' : 'Show'} analytics
            </button>
            <Link to="/separation" className="btn-secondary text-xs">
              <MessageSquareQuote size={14} /> Separations
            </Link>
          </div>
        }
      />

      {view === 'questionnaires' ? (
        <ExitInterviewQuestionnaireManager />
      ) : (
        <>

      {showAnalytics && analytics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard label="Total" value={analytics.summary?.total} />
            <StatCard label="Completed" value={analytics.summary?.completed} />
            <StatCard label="Pending" value={analytics.summary?.pending} />
            <StatCard label="Completion %" value={`${analytics.summary?.completion_rate ?? 0}%`} />
            <StatCard label="Avg overall" value={analytics.average_ratings?.overall ?? '—'} />
            <StatCard
              label="Would recommend"
              value={analytics.summary?.would_recommend_yes ?? 0}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-xs font-semibold text-slate-700 mb-3">Top resignation reasons</p>
              {(analytics.by_reason || []).length === 0 ? (
                <p className="text-xs text-slate-400">No data yet</p>
              ) : (
                <ul className="space-y-2">
                  {analytics.by_reason.slice(0, 8).map((row) => (
                    <li key={row.reason} className="flex justify-between text-xs">
                      <span className="text-slate-600">
                        {EXIT_RESIGNATION_REASON_LABELS[row.reason] || row.reason}
                      </span>
                      <span className="font-semibold text-slate-800">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card p-4">
              <p className="text-xs font-semibold text-slate-700 mb-3">Average ratings</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(analytics.average_ratings || {}).map(([key, val]) => (
                  <div key={key} className="bg-slate-50 rounded-lg p-2">
                    <p className="text-[10px] text-slate-400 capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{val ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-4">
              <p className="text-xs font-semibold text-slate-700 mb-3">By department</p>
              {(analytics.by_department || []).length === 0 ? (
                <p className="text-xs text-slate-400">No data yet</p>
              ) : (
                <ul className="space-y-2">
                  {analytics.by_department.slice(0, 8).map((row) => (
                    <li key={row.department} className="flex justify-between text-xs">
                      <span className="text-slate-600 truncate">{row.department}</span>
                      <span className="font-semibold text-slate-800">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="card overflow-x-auto">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-700">Department-wise trends</p>
              </div>
              {(analytics.department_trends || []).length === 0 ? (
                <p className="p-6 text-xs text-slate-400">No department trend data yet</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="text-left px-4 py-2">Department</th>
                      <th className="text-right px-3 py-2">Exits</th>
                      <th className="text-right px-3 py-2">Complete</th>
                      <th className="text-right px-3 py-2">Rating</th>
                      <th className="text-right px-4 py-2">Recommend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {analytics.department_trends.map((row) => (
                      <tr key={row.department}>
                        <td className="px-4 py-2 text-slate-700">{row.department}</td>
                        <td className="px-3 py-2 text-right">{row.total}</td>
                        <td className="px-3 py-2 text-right">{row.completion_rate}%</td>
                        <td className="px-3 py-2 text-right">{row.average_rating ?? '—'}</td>
                        <td className="px-4 py-2 text-right">{row.recommend_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card overflow-x-auto">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-700">Monthly interview trends</p>
              </div>
              {(analytics.monthly_trends || []).length === 0 ? (
                <p className="p-6 text-xs text-slate-400">No monthly trend data yet</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="text-left px-4 py-2">Month</th>
                      <th className="text-right px-3 py-2">Interviews</th>
                      <th className="text-right px-3 py-2">Completed</th>
                      <th className="text-right px-4 py-2">Avg rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {analytics.monthly_trends.slice(-12).map((row) => (
                      <tr key={row.month}>
                        <td className="px-4 py-2 text-slate-700">{row.month}</td>
                        <td className="px-3 py-2 text-right">{row.total}</td>
                        <td className="px-3 py-2 text-right">{row.completion_rate}%</td>
                        <td className="px-4 py-2 text-right">{row.average_rating ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

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
          {Object.entries(EXIT_INTERVIEW_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
          </div>
        </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <p className="p-8 text-center text-slate-400 text-xs">Loading exit interviews…</p>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquareQuote size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">No exit interviews</p>
            <p className="text-xs text-slate-500 mt-1">Interviews appear when separations are in progress.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Employee</th>
                <th className="text-left px-4 py-3 font-semibold">Reason</th>
                <th className="text-left px-4 py-3 font-semibold">Overall</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{fmtName(item.employee)}</p>
                    <p className="text-slate-400">{item.employee?.emp_code}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.primary_reason
                      ? EXIT_RESIGNATION_REASON_LABELS[item.primary_reason] || item.primary_reason
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.overall_rating != null ? Number(item.overall_rating).toFixed(1) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                        EXIT_INTERVIEW_STATUSES[item.status]
                      )}
                    >
                      {EXIT_INTERVIEW_STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(item.due_date)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="btn-secondary text-[10px] py-1"
                      onClick={() => setSelectedId(item.id)}
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
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.total_pages}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        )}
      </div>
      </div>

      {selectedId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setSelectedId(null)}
            aria-label="Close"
          />
          <div className="relative bg-white w-full max-w-3xl h-full shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold text-slate-900">Exit interview</h2>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 text-xs"
                onClick={() => setSelectedId(null)}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <SeparationExitInterviewPanel interviewId={selectedId} enabled />
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
