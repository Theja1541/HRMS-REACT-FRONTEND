import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Icons from 'lucide-react';
import { platformApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import PeriodSelector from '../../components/finance/PeriodSelector';
import TablePagination from '../../components/shared/TablePagination';
import { REPORT_TYPES } from '../../constants/platform';
import { formatINR, cn } from '../../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTablePagination } from '../../hooks/useTablePagination';

const HELPDESK_STATUS_COLORS = {
  open: '#2563EB',
  in_progress: '#D97706',
  resolved: '#059669',
  closed: '#64748B',
};

const HELPDESK_PRIORITY_COLORS = {
  low: '#94A3B8',
  medium: '#2563EB',
  high: '#EA580C',
  urgent: '#DC2626',
};

function formatAvgResolution(hours, days) {
  if (hours == null || days == null) return '—';
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'}`;
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

function HelpdeskBarChart({ data, colorKey, defaultColor = '#2563EB' }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
        <Tooltip />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.key} fill={colorKey?.[entry.key] || defaultColor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function ReportsPage() {
  const now = new Date();
  const [report, setReport] = useState('headcount');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [report, month, year] });

  const { data, isLoading } = useQuery({
    queryKey: ['report', report, month, year],
    queryFn: async () => {
      switch (report) {
        case 'headcount': return platformApi.reportHeadcount();
        case 'attendance': return platformApi.reportAttendance({ month, year });
        case 'leave': return platformApi.reportLeave({ year });
        case 'payroll': return platformApi.reportPayroll({ year });
        case 'employee-master': return platformApi.reportEmployeeMaster();
        case 'helpdesk': return platformApi.reportHelpdesk();
        default: return null;
      }
    },
  });

  const r = data?.data;
  const leaveRows = r?.breakdown || [];
  const employeeRows = r?.rows || [];
  const { items: visibleLeaveRows, pagination: leavePagination } = paginateClient(leaveRows);
  const { items: visibleEmployeeRows, pagination: employeePagination } = paginateClient(employeeRows);

  return (
    <div className="space-y-6">
      <PageHeader badge="Platform · Reports" title="Reports" subtitle="HR analytics and export-ready summaries" />

      <div className="ds-tabs scroll-tabs" role="tablist">
        {REPORT_TYPES.map((t) => {
          const Icon = Icons[t.icon] || Icons.FileText;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={report === t.id}
              onClick={() => setReport(t.id)}
              className={cn('inline-flex items-center gap-2', report === t.id && 'ds-tab-active')}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {['attendance', 'leave', 'payroll'].includes(report) && (
        <PeriodSelector month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
      )}

      <div className="card p-6">
        {isLoading ? <p className="text-center py-12 text-slate-400">Generating report…</p> : (
          <>
            {report === 'headcount' && r && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Stat label="Total" value={r.total} />
                  <Stat label="Active" value={r.active} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-3">By Department</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={r.by_department}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {report === 'attendance' && r && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat label="Employees" value={r.total_employees} />
                <Stat label="Attendance %" value={`${r.avg_attendance_pct}%`} />
                {Object.entries(r.by_status || {}).map(([k, v]) => <Stat key={k} label={k} value={v} />)}
              </div>
            )}

            {report === 'leave' && r && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Stat label="Pending" value={r.pending_requests} />
                  <Stat label="Approved YTD" value={r.approved_ytd} />
                </div>
                <div className="table-scroll">
                  <table className="w-full text-xs min-w-[480px]">
                  <thead className="bg-slate-50"><tr>
                    <th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Status</th>
                    <th className="text-right px-3 py-2">Count</th><th className="text-right px-3 py-2">Days</th>
                  </tr></thead>
                  <tbody className="divide-y">{visibleLeaveRows.map((b, i) => (
                    <tr key={i}><td className="px-3 py-2">{b.leave_type}</td><td className="px-3 py-2 capitalize">{b.status}</td>
                    <td className="px-3 py-2 text-right">{b.count}</td><td className="px-3 py-2 text-right">{b.total_days}</td></tr>
                  ))}</tbody>
                  </table>
                </div>
                <TablePagination
                  page={leavePagination.page}
                  limit={leavePagination.limit}
                  total={leavePagination.total}
                  totalPages={leavePagination.totalPages}
                  onPageChange={setPage}
                  onLimitChange={setLimit}
                />
              </div>
            )}

            {report === 'payroll' && r && (
              <div className="space-y-4">
                <div className="stat-grid-3">
                  <Stat label="Months Processed" value={r.months_processed} />
                  <Stat label="YTD Gross" value={formatINR(r.ytd_gross)} />
                  <Stat label="YTD Net" value={formatINR(r.ytd_net)} />
                </div>
                {r.monthly?.length > 0 && (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={r.monthly.map((m) => ({ name: `M${m.month}`, net: m.net }))}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => formatINR(v)} />
                      <Bar dataKey="net" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {report === 'employee-master' && r && (
              <div className="overflow-x-auto">
                <p className="text-sm text-slate-500 mb-3">{r.count} employees</p>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50"><tr>
                    {['Employee ID', 'Name', 'Official Email', 'Department', 'Status', 'Joining'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-semibold">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y">
                    {visibleEmployeeRows.map((row) => (
                      <tr key={row.emp_code}>
                        <td className="px-3 py-2 font-mono">{row.emp_code}</td>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{row.email}</td>
                        <td className="px-3 py-2">{row.department || '—'}</td>
                        <td className="px-3 py-2 capitalize">{row.status}</td>
                        <td className="px-3 py-2">{row.joining}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePagination
                  page={employeePagination.page}
                  limit={employeePagination.limit}
                  total={employeePagination.total}
                  totalPages={employeePagination.totalPages}
                  onPageChange={setPage}
                  onLimitChange={setLimit}
                />
              </div>
            )}

            {report === 'helpdesk' && r && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Stat label="Total Tickets" value={r.total} />
                  <Stat label="Avg Resolution Time" value={formatAvgResolution(r.avg_resolution_hours, r.avg_resolution_days)} />
                  <Stat label="Resolved Tickets" value={r.resolved_ticket_count} />
                  <Stat label="Open" value={r.by_status?.find((s) => s.key === 'open')?.count ?? 0} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Tickets by Status</h4>
                    <HelpdeskBarChart data={r.by_status || []} colorKey={HELPDESK_STATUS_COLORS} />
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {(r.by_status || []).map((item) => (
                        <div key={item.key} className="flex justify-between text-xs bg-slate-50 rounded px-2 py-1.5">
                          <span className="text-slate-600">{item.name}</span>
                          <span className="font-semibold text-slate-800">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-3">Tickets by Priority</h4>
                    <HelpdeskBarChart data={r.by_priority || []} colorKey={HELPDESK_PRIORITY_COLORS} />
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {(r.by_priority || []).map((item) => (
                        <div key={item.key} className="flex justify-between text-xs bg-slate-50 rounded px-2 py-1.5">
                          <span className="text-slate-600">{item.name}</span>
                          <span className="font-semibold text-slate-800">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3">Tickets by Category</h4>
                  {(r.by_category || []).length === 0 ? (
                    <p className="text-sm text-slate-400">No tickets yet</p>
                  ) : (
                    <>
                      <HelpdeskBarChart data={r.by_category || []} defaultColor="#6366F1" />
                      <div className="mt-3 table-scroll">
                        <table className="w-full text-xs min-w-[320px]">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left px-3 py-2">Category</th>
                              <th className="text-right px-3 py-2">Tickets</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {(r.by_category || []).map((item) => (
                              <tr key={item.key}>
                                <td className="px-3 py-2">{item.name}</td>
                                <td className="px-3 py-2 text-right font-medium">{item.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg p-4 text-center">
      <p className="text-xs text-slate-500 uppercase">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
