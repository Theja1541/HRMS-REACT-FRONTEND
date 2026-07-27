import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Kanban, AlertCircle } from 'lucide-react';
import { hrApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import TaskDetailModal from '../../components/tasks/TaskDetailModal';
import { TASK_STATUS, PRIORITY_BADGE } from '../../constants/hr';
import { cn } from '../../utils/helpers';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { useTablePagination } from '../../hooks/useTablePagination';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'done', label: 'Done' },
];

export default function MeTasksPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('open');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [filter] });

  const { data, isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => hrApi.listMyTasks(),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }) => hrApi.moveTask(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-tasks'] }),
  });

  const tasks = data?.data?.tasks || [];

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === 'open') return t.status !== 'done';
      if (filter === 'done') return t.status === 'done';
      if (filter === 'overdue') {
        if (!t.due_date || t.status === 'done') return false;
        const due = parseISO(t.due_date);
        return isPast(due) && !isToday(due);
      }
      return true;
    });
  }, [tasks, filter]);

  const open = tasks.filter((t) => t.status !== 'done');
  const overdue = tasks.filter((t) => {
    if (!t.due_date || t.status === 'done') return false;
    const due = parseISO(t.due_date);
    return isPast(due) && !isToday(due);
  });
  const { items: visibleTasks, pagination } = paginateClient(filtered);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="My Work · Tasks"
        title="My Tasks"
        subtitle={`${open.length} open · ${overdue.length} overdue`}
        actions={
          <Link to="/projects" className="btn-secondary text-xs inline-flex items-center gap-2">
            <Kanban size={14} /> All Projects
          </Link>
        }
      />

      <div className="ds-tabs scroll-tabs" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(filter === f.id && 'ds-tab-active')}
          >
            {f.label}
            {f.id === 'overdue' && overdue.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{overdue.length}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-slate-400">Loading tasks…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          {filter === 'overdue' ? 'No overdue tasks — you\'re on track!' : 'No tasks in this view'}
        </div>
      ) : (
        <div className="card overflow-x-auto overscroll-x-contain">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Key</th>
                <th className="px-4 py-3 font-semibold">Task</th>
                <th className="px-4 py-3 font-semibold">Project</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleTasks.map((task) => {
                const dueOverdue = task.due_date && task.status !== 'done'
                  && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));

                return (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-[11px] text-brand-600">
                      {task.task_key || `#${task.id}`}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedTaskId(task.id)}
                        className="font-medium text-slate-800 hover:text-brand-600 text-left"
                      >
                        {task.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{task.project?.name || '—'}</td>
                    <td className="px-4 py-3">
                      {task.due_date ? (
                        <span className={cn('inline-flex items-center gap-1', dueOverdue && 'text-red-600 font-medium')}>
                          {dueOverdue && <AlertCircle size={12} />}
                          {format(parseISO(task.due_date), 'dd MMM yyyy')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('capitalize px-2 py-0.5 rounded text-[10px] font-medium', PRIORITY_BADGE[task.priority])}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', TASK_STATUS[task.status]?.color)}>
                        {TASK_STATUS[task.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={task.status}
                        onChange={(e) => moveMutation.mutate({ id: task.id, status: e.target.value })}
                        disabled={moveMutation.isPending}
                        className="text-[10px] border rounded px-2 py-1"
                      >
                        {Object.keys(TASK_STATUS).map((s) => (
                          <option key={s} value={s}>{TASK_STATUS[s].label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!isLoading && filtered.length > 0 && (
        <TablePagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          projectId={tasks.find((t) => t.id === selectedTaskId)?.project?.id}
          onClose={() => setSelectedTaskId(null)}
          onNavigateTask={(id) => setSelectedTaskId(id)}
          onUpdated={() => queryClient.invalidateQueries({ queryKey: ['my-tasks'] })}
        />
      )}
    </div>
  );
}
