import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Calendar, CheckCircle2, Users, ListTodo } from 'lucide-react';
import { hrApi } from '../../api';
import { StatCard } from '../shared/PageHeader';
import { TASK_STATUS, PRIORITY_BADGE } from '../../constants/hr';
import { cn } from '../../utils/helpers';
import { Avatar } from '../shared/StatusBadge';

export default function ProjectDashboardPanel({ projectId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['project-dashboard', projectId],
    queryFn: () => hrApi.getProjectDashboard(projectId),
    enabled: !!projectId,
  });

  const dashboard = data?.data?.dashboard;

  if (isLoading) {
    return <div className="card p-12 text-center text-slate-400">Loading dashboard…</div>;
  }

  if (error || !dashboard) {
    return <div className="card p-12 text-center text-red-500">Failed to load dashboard</div>;
  }

  const { summary, status_counts, priority_open, workload } = dashboard;
  const maxStatus = Math.max(...Object.values(status_counts || {}), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Open Tasks" value={summary.open_tasks ?? 0} icon={ListTodo} />
        <StatCard label="Overdue" value={summary.overdue_count ?? 0} icon={AlertCircle} />
        <StatCard label="Due Today" value={summary.due_today_count ?? 0} icon={Calendar} />
        <StatCard label="Members" value={summary.member_count ?? 0} icon={Users} />
      </div>

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
            Total tasks: {summary.total_tasks ?? 0} · Done: {status_counts?.done || 0}
          </p>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-slate-400" />
          Workload (open tasks per assignee)
        </h3>
        {workload?.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No assigned open tasks</p>
        ) : (
          <div className="space-y-3">
            {workload.map((row) => {
              const name = row.assignee?.first_name
                ? `${row.assignee.first_name} ${row.assignee.last_name}`
                : `Employee #${row.assignee?.id}`;
              const maxW = Math.max(...workload.map((w) => w.open_tasks), 1);
              return (
                <div key={row.assignee?.id} className="flex items-center gap-3">
                  <Avatar name={name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium truncate">{name}</span>
                      <span className="text-slate-500 shrink-0 ml-2">{row.open_tasks} tasks</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${(row.open_tasks / maxW) * 100}%` }}
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
