import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Users,
  ListTodo,
  Percent,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { hrApi } from '../../api';
import { StatCard } from '../shared/PageHeader';
import { TASK_STATUS, PRIORITY_BADGE } from '../../constants/hr';
import { cn } from '../../utils/helpers';
import { Avatar } from '../shared/StatusBadge';

function formatPct(value) {
  if (value == null || Number.isNaN(Number(value))) return '0%';
  return `${Number(value)}%`;
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default function ProjectDashboardPanel({ projectId, onTaskClick }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['project-dashboard', projectId],
    queryFn: () => hrApi.getProjectDashboard(projectId),
    enabled: !!projectId,
  });

  const dashboard = data?.data?.dashboard;

  const trendChartData = useMemo(
    () =>
      (dashboard?.trends?.series || []).map((row) => ({
        ...row,
        label: format(parseISO(row.date), 'dd MMM'),
      })),
    [dashboard?.trends?.series]
  );

  const workloadChartData = useMemo(
    () =>
      (dashboard?.workload || []).slice(0, 8).map((row) => {
        const name = row.assignee?.first_name
          ? `${row.assignee.first_name} ${row.assignee.last_name?.[0] || ''}.`
          : `Emp #${row.assignee?.id}`;
        return {
          name: name.length > 14 ? `${name.slice(0, 12)}…` : name,
          fullName: row.assignee?.first_name
            ? `${row.assignee.first_name} ${row.assignee.last_name || ''}`.trim()
            : `Employee #${row.assignee?.id}`,
          open: row.open_tasks,
          done: row.done_tasks,
          overdue: row.overdue_tasks,
        };
      }),
    [dashboard?.workload]
  );

  if (isLoading) {
    return <div className="card p-12 text-center text-slate-400">Loading dashboard…</div>;
  }

  if (error || !dashboard) {
    return <div className="card p-12 text-center text-red-500">Failed to load dashboard</div>;
  }

  const {
    summary,
    status_counts,
    priority_open,
    workload,
    sprint_progress = [],
    overdue_tasks = [],
  } = dashboard;
  const maxStatus = Math.max(...Object.values(status_counts || {}), 1);
  const activeSprint = sprint_progress.find((s) => s.status === 'active');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <StatCard label="Open Tasks" value={summary.open_tasks ?? 0} icon={ListTodo} />
        <StatCard label="Completed" value={summary.completed_tasks ?? status_counts?.done ?? 0} icon={CheckCircle2} />
        <StatCard label="Overdue" value={summary.overdue_count ?? 0} icon={AlertCircle} />
        <StatCard label="Due Today" value={summary.due_today_count ?? 0} icon={Calendar} />
        <StatCard label="Completion Rate" value={formatPct(summary.completion_rate)} icon={Percent} />
        <StatCard label="Members" value={summary.member_count ?? 0} icon={Users} />
      </div>

      {activeSprint && (
        <div className="card p-4 border-emerald-200 bg-emerald-50/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Active Sprint</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeSprint.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeSprint.start_date && format(parseISO(activeSprint.start_date), 'dd MMM')}
                {' – '}
                {activeSprint.end_date && format(parseISO(activeSprint.end_date), 'dd MMM yyyy')}
              </p>
            </div>
            <div className="min-w-[180px]">
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>{activeSprint.task_counts?.done || 0}/{activeSprint.task_counts?.total || 0} tasks</span>
                <span>{formatPct(activeSprint.completion_rate)}</span>
              </div>
              <div className="h-2 bg-white rounded-full overflow-hidden border border-emerald-100">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(100, activeSprint.completion_rate || 0)}%` }}
                />
              </div>
              {(activeSprint.point_counts?.total || 0) > 0 && (
                <p className="text-[10px] text-slate-500 mt-1">
                  {activeSprint.point_counts.done}/{activeSprint.point_counts.total} story points
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4">Tasks by Status</h3>
          <div className="space-y-3">
            {Object.entries(TASK_STATUS).map(([key, meta]) => {
              const count = status_counts?.[key] || 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">{meta.label}</span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${(count / maxStatus) * 100}%`, minWidth: count ? '4px' : 0 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4">Open by Priority</h3>
          <div className="flex flex-wrap gap-2">
            {['urgent', 'high', 'medium', 'low'].map((p) => (
              <span key={p} className={cn('text-sm font-semibold px-3 py-2 rounded-lg capitalize', PRIORITY_BADGE[p])}>
                {p}: {priority_open?.[p] || 0}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Total tasks: {summary.total_tasks ?? 0} · Done: {summary.completed_tasks ?? status_counts?.done ?? 0} · Rate: {formatPct(summary.completion_rate)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <TrendingUp size={16} className="text-slate-400" />
            Task Trends
          </h3>
          <p className="text-xs text-slate-400 mb-4">Created vs completed over the last {dashboard.trends?.days || 14} days</p>
          {trendChartData.every((d) => d.created === 0 && d.completed === 0) ? (
            <p className="text-sm text-slate-400 text-center py-10">No task activity in this period</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip content={<TrendTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="created" name="Created" stroke="#3b82f6" fill="#93c5fd" fillOpacity={0.35} strokeWidth={2} />
                  <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" fill="#6ee7b7" fillOpacity={0.35} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            Assignee Workload
          </h3>
          <p className="text-xs text-slate-400 mb-4">Open vs completed tasks by assignee</p>
          {workloadChartData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No assigned tasks yet</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0]?.payload;
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                          <p className="font-semibold text-slate-700 mb-1">{row.fullName}</p>
                          <p className="text-brand-600">Open: {row.open}</p>
                          <p className="text-emerald-600">Done: {row.done}</p>
                          <p className="text-amber-600">Overdue: {row.overdue}</p>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="open" name="Open" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="done" name="Done" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Target size={16} className="text-slate-400" />
            Sprint Progress
          </h3>
          {sprint_progress.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No sprints yet</p>
          ) : (
            <div className="space-y-3">
              {sprint_progress.map((sprint) => (
                <div key={sprint.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{sprint.name}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{sprint.status}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 shrink-0">
                      {formatPct(sprint.completion_rate)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white rounded-full overflow-hidden border border-slate-100">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        sprint.status === 'active' ? 'bg-emerald-500' : sprint.status === 'completed' ? 'bg-blue-500' : 'bg-slate-400'
                      )}
                      style={{ width: `${Math.min(100, sprint.completion_rate || 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                    <span>{sprint.task_counts?.done || 0}/{sprint.task_counts?.total || 0} tasks</span>
                    {(sprint.point_counts?.total || 0) > 0 && (
                      <span>{sprint.point_counts.done}/{sprint.point_counts.total} pts</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-slate-400" />
            Overdue Tasks
          </h3>
          {overdue_tasks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No overdue tasks</p>
          ) : (
            <div className="space-y-2">
              {overdue_tasks.map((task) => {
                const assigneeName = task.assignee?.first_name
                  ? `${task.assignee.first_name} ${task.assignee.last_name || ''}`.trim()
                  : null;
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onTaskClick?.(task.id)}
                    className="w-full text-left p-3 rounded-lg bg-amber-50/60 border border-amber-100 hover:border-amber-200 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] text-brand-600">{task.task_key || `#${task.id}`}</p>
                        <p className="text-sm font-medium text-slate-800 truncate mt-0.5">{task.title}</p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Due {task.due_date ? format(parseISO(task.due_date), 'dd MMM yyyy') : '—'}
                          {assigneeName ? ` · ${assigneeName}` : ''}
                        </p>
                      </div>
                      <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded capitalize shrink-0', PRIORITY_BADGE[task.priority])}>
                        {task.priority}
                      </span>
                    </div>
                  </button>
                );
              })}
              {(summary.overdue_count || 0) > overdue_tasks.length && (
                <p className="text-[10px] text-slate-400 text-center pt-1">
                  Showing {overdue_tasks.length} of {summary.overdue_count} overdue
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-slate-400" />
          Workload Detail
        </h3>
        {workload?.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No assigned tasks</p>
        ) : (
          <div className="space-y-3">
            {workload.map((row) => {
              const name = row.assignee?.first_name
                ? `${row.assignee.first_name} ${row.assignee.last_name}`
                : `Employee #${row.assignee?.id}`;
              const maxOpen = Math.max(...workload.map((w) => w.open_tasks), 1);
              return (
                <div key={row.assignee?.id} className="flex items-center gap-3">
                  <Avatar name={name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1 gap-2">
                      <span className="font-medium truncate">{name}</span>
                      <span className="text-slate-500 shrink-0">
                        {row.open_tasks} open · {row.done_tasks} done
                        {row.overdue_tasks > 0 ? ` · ${row.overdue_tasks} overdue` : ''}
                        {' · '}
                        {formatPct(row.completion_rate)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${(row.open_tasks / maxOpen) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
