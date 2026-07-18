import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Banknote,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  Laptop,
  Loader2,
  RefreshCw,
  TrendingDown,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { hrApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import { useAuthStore } from '../../store/auth.store';
import { cn, formatINR } from '../../utils/helpers';

const PERIOD_OPTIONS = [
  { value: 3, label: 'Last 3 months' },
  { value: 6, label: 'Last 6 months' },
  { value: 12, label: 'Last 12 months' },
  { value: 24, label: 'Last 24 months' },
];

const REASON_LABELS = {
  career_growth: 'Career growth',
  compensation: 'Compensation',
  management: 'Management',
  work_life_balance: 'Work-life balance',
  relocation: 'Relocation',
  health: 'Health',
  retirement: 'Retirement',
  better_opportunity: 'Better opportunity',
  culture: 'Culture',
  workload: 'Workload',
  personal: 'Personal',
  other: 'Other',
};

function employeeName(employee) {
  if (!employee) return '—';
  return `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.emp_code || '—';
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`));
}

function MetricCard({ label, value, detail, icon: Icon, tone = 'blue', to }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    violet: 'bg-violet-50 text-violet-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  const content = (
    <div className="card p-4 h-full hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value ?? 0}</p>
          {detail && <p className="text-[10px] text-slate-400 mt-1">{detail}</p>}
        </div>
        <span className={cn('p-2 rounded-lg shrink-0', tones[tone])}>
          <Icon size={17} />
        </span>
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function QueueCard({ title, count, icon: Icon, to, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-brand-600" />
          <h3 className="text-xs font-semibold text-slate-800">{title}</h3>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        </div>
        <Link to={to} className="text-[10px] font-medium text-brand-600 hover:underline">
          View all
        </Link>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyQueue({ label }) {
  return <p className="text-xs text-slate-400 text-center py-5">{label}</p>;
}

function ProgressBar({ value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${safeValue}%` }} />
      </div>
      <span className="text-[10px] text-slate-500 w-8 text-right">{safeValue}%</span>
    </div>
  );
}

export default function ExitDashboardPage() {
  const [months, setMonths] = useState(12);
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['exit-dashboard', selectedTenantId, months],
    queryFn: () => hrApi.getExitDashboard({ months }),
    enabled: !tenantRequired,
    staleTime: 30_000,
  });

  const dashboard = data?.data;
  const summary = dashboard?.summary || {};
  const workflow = dashboard?.workflow || {};
  const attrition = dashboard?.attrition || {};
  const analytics = dashboard?.exit_analytics || {};

  const exitRows = useMemo(() => {
    const ktByEmployee = new Map((workflow.kt || []).map((item) => [item.employee_id, item]));
    const clearanceByEmployee = new Map(
      (workflow.clearances || []).map((item) => [item.employee_id, item])
    );
    const fnfByEmployee = new Map((workflow.fnf || []).map((item) => [item.employee_id, item]));
    return (workflow.active_separations || []).map((request) => ({
      ...request,
      kt: ktByEmployee.get(request.employee_id),
      clearance: clearanceByEmployee.get(request.employee_id),
      fnf: fnfByEmployee.get(request.employee_id),
    }));
  }, [workflow]);

  const departmentData = (attrition.by_department || []).slice(0, 7);
  const reasonData = (analytics.by_reason || []).slice(0, 7).map((item) => ({
    ...item,
    label: REASON_LABELS[item.reason] || item.reason?.replace(/_/g, ' ') || 'Other',
  }));

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-sm text-slate-500">
        Select a tenant to view the HR Exit Dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Exit Dashboard"
        subtitle="Exit pipeline, operational readiness, attrition, and interview insights"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
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

      {isLoading ? (
        <div className="card py-20 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 size={18} className="animate-spin" /> Loading exit dashboard…
        </div>
      ) : error ? (
        <div className="card py-16 text-center">
          <AlertCircle size={28} className="mx-auto text-red-400 mb-2" />
          <p className="text-sm text-red-600">
            {error.response?.data?.error?.message || error.message || 'Unable to load dashboard'}
          </p>
          <button type="button" className="btn-secondary text-xs mt-3" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            <MetricCard label="Pending resignations" value={summary.pending_resignations} icon={DoorOpen} tone="amber" to="/resignations" />
            <MetricCard label="Pending KT" value={summary.pending_kt} icon={BookOpen} tone="violet" to="/knowledge-transfer" />
            <MetricCard label="Pending clearances" value={summary.pending_clearances} detail={`${summary.pending_clearance_items || 0} mandatory items`} icon={ClipboardCheck} tone="blue" to="/clearance-dashboard" />
            <MetricCard label="Asset returns" value={summary.pending_asset_returns} icon={Laptop} tone="red" to="/assets/returns" />
            <MetricCard label="Pending F&F" value={summary.pending_fnf} icon={Banknote} tone="amber" to="/fnf-settlements" />
            <MetricCard label="On notice" value={summary.employees_on_notice} icon={Clock3} tone="slate" to="/employees" />
            <MetricCard label="Completed exits" value={summary.completed_exits} detail={`Last ${months} months`} icon={CheckCircle2} tone="emerald" to="/employees/archive" />
            <MetricCard label="Attrition rate" value={`${summary.attrition_rate || 0}%`} detail={`Last ${months} months`} icon={TrendingDown} tone="red" />
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Active exit pipeline</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Nearest last working dates first</p>
              </div>
              <Link to="/separation" className="text-xs text-brand-600 hover:underline">Manage exits</Link>
            </div>
            {exitRows.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 size={28} className="mx-auto text-emerald-300 mb-2" />
                <p className="text-sm text-slate-400">No active exits in the pipeline</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[820px]">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Employee</th>
                      <th className="text-left px-4 py-3 font-semibold">Department</th>
                      <th className="text-left px-4 py-3 font-semibold">LWD</th>
                      <th className="text-left px-4 py-3 font-semibold">Separation</th>
                      <th className="text-left px-4 py-3 font-semibold">KT</th>
                      <th className="text-left px-4 py-3 font-semibold">Clearance</th>
                      <th className="text-left px-4 py-3 font-semibold">F&amp;F</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {exitRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{employeeName(row.employee)}</p>
                          <p className="text-[10px] text-slate-400">{row.employee?.emp_code}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{row.employee?.department?.name || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700">{formatDate(row.last_working_date)}</td>
                        <td className="px-4 py-3 capitalize text-slate-600">{row.status?.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 min-w-[140px]">
                          {row.kt ? <ProgressBar value={row.kt.progress_percent} /> : <span className="text-amber-600">Not started</span>}
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-600">
                          {row.clearance?.status?.replace(/_/g, ' ') || <span className="text-amber-600">Not started</span>}
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-600">
                          {row.fnf?.status?.replace(/_/g, ' ') || <span className="text-slate-400">Pending</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <QueueCard title="Knowledge transfer" count={summary.pending_kt || 0} icon={BookOpen} to="/knowledge-transfer">
              {(workflow.kt || []).length === 0 ? <EmptyQueue label="No pending KT plans" /> : (
                <ul className="space-y-3">
                  {(workflow.kt || []).slice(0, 4).map((item) => (
                    <li key={item.id}>
                      <div className="flex justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-700 truncate">{employeeName(item.employee)}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(item.due_date)}</span>
                      </div>
                      <ProgressBar value={item.progress_percent} />
                    </li>
                  ))}
                </ul>
              )}
            </QueueCard>

            <QueueCard title="Asset returns" count={summary.pending_asset_returns || 0} icon={Laptop} to="/assets/returns">
              {(workflow.asset_returns || []).length === 0 ? <EmptyQueue label="No pending exit asset returns" /> : (
                <ul className="divide-y divide-slate-100">
                  {(workflow.asset_returns || []).slice(0, 4).map((item) => (
                    <li key={item.id} className="py-2 first:pt-0 last:pb-0 flex justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{item.asset?.name || item.asset?.asset_code}</p>
                        <p className="text-[10px] text-slate-400 truncate">{employeeName(item.employee)}</p>
                      </div>
                      <span className="text-[10px] capitalize text-amber-600">{item.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </QueueCard>

            <QueueCard title="F&F settlements" count={summary.pending_fnf || 0} icon={Banknote} to="/fnf-settlements">
              {(workflow.fnf || []).length === 0 ? <EmptyQueue label="No pending settlements" /> : (
                <ul className="divide-y divide-slate-100">
                  {(workflow.fnf || []).slice(0, 4).map((item) => (
                    <li key={item.id} className="py-2 first:pt-0 last:pb-0 flex justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{employeeName(item.employee)}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{item.status?.replace(/_/g, ' ')}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{formatINR(item.balance_due || item.net_payable || 0)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </QueueCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Attrition trend</h3>
                  <p className="text-[11px] text-slate-400">Monthly exits and attrition rate</p>
                </div>
                <TrendingDown size={17} className="text-red-500" />
              </div>
              {(attrition.monthly || []).length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={attrition.monthly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="exits" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="rate" orientation="right" unit="%" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="exits" type="monotone" dataKey="exits" name="Exits" stroke="#2563EB" strokeWidth={2} />
                    <Line yAxisId="rate" type="monotone" dataKey="attrition_rate" name="Attrition %" stroke="#DC2626" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyQueue label="No attrition data for this period" />}
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Exits by department</h3>
                  <p className="text-[11px] text-slate-400">Completed exits in the selected period</p>
                </div>
                <Users size={17} className="text-brand-600" />
              </div>
              {departmentData.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={departmentData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <YAxis dataKey="department" type="category" width={90} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Exits" fill="#2563EB" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyQueue label="No completed exits for this period" />}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="card p-5 xl:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Top exit reasons</h3>
                  <p className="text-[11px] text-slate-400">Based on submitted exit interviews</p>
                </div>
                <BarChart3 size={17} className="text-violet-600" />
              </div>
              {reasonData.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={reasonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Responses" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyQueue label="No exit interview reasons recorded" />}
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-900">Exit interview health</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Selected period</p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xl font-bold text-slate-900">{analytics.interviews || 0}</p>
                  <p className="text-[10px] text-slate-500">Interviews</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xl font-bold text-emerald-700">{analytics.completion_rate || 0}%</p>
                  <p className="text-[10px] text-emerald-700">Completion</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xl font-bold text-blue-700">{analytics.recommendation_rate || 0}%</p>
                  <p className="text-[10px] text-blue-700">Would recommend</p>
                </div>
                <div className="bg-violet-50 rounded-lg p-3">
                  <p className="text-xl font-bold text-violet-700">{analytics.average_ratings?.overall ?? '—'}</p>
                  <p className="text-[10px] text-violet-700">Overall / 5</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {Object.entries(analytics.average_ratings || {})
                  .filter(([key]) => key !== 'overall')
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-semibold text-slate-700">{value ?? '—'} / 5</span>
                    </div>
                  ))}
              </div>
              <Link to="/exit-interviews" className="btn-secondary text-xs w-full justify-center mt-4">
                View exit interviews
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
