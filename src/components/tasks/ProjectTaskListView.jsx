import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { TASK_STATUS, PRIORITY_BADGE } from '../../constants/hr';
import LabelBadge from './LabelBadge';
import { cn, formatStoryPoints } from '../../utils/helpers';

const COLUMNS = [
  { key: 'task_key', label: 'Key' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'estimate_points', label: 'Points' },
  { key: 'due_date', label: 'Due' },
  { key: 'sprint', label: 'Sprint' },
];

function compareTasks(a, b, key, dir) {
  const mul = dir === 'asc' ? 1 : -1;

  const val = (task) => {
    if (key === 'assignee') {
      return `${task.assignee?.first_name || ''} ${task.assignee?.last_name || ''}`.trim().toLowerCase();
    }
    if (key === 'estimate_points') return parseFloat(task.estimate_points) || 0;
    if (key === 'due_date') return task.due_date ? new Date(task.due_date).getTime() : 0;
    if (key === 'sprint') return task.sprint_id || 0;
    return String(task[key] ?? '').toLowerCase();
  };

  const av = val(a);
  const bv = val(b);
  if (av < bv) return -1 * mul;
  if (av > bv) return 1 * mul;
  return 0;
}

function SortHeader({ column, sortKey, sortDir, onSort }) {
  const active = sortKey === column.key;
  return (
    <button
      type="button"
      onClick={() => onSort(column.key)}
      className="inline-flex items-center gap-1 hover:text-slate-700"
    >
      {column.label}
      {active ? (
        sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      ) : (
        <span className="w-3" />
      )}
    </button>
  );
}

export default function ProjectTaskListView({
  tasks,
  sprints = [],
  isLoading,
  isError,
  error,
  onRetry,
  onTaskClick,
}) {
  const [sortKey, setSortKey] = useState('task_key');
  const [sortDir, setSortDir] = useState('asc');

  const sprintMap = useMemo(
    () => new Map(sprints.map((s) => [s.id, s.name])),
    [sprints]
  );

  const sortedTasks = useMemo(() => {
    return [...(tasks || [])].sort((a, b) => compareTasks(a, b, sortKey, sortDir));
  }, [tasks, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (isLoading) {
    return <div className="card p-12 text-center text-slate-400">Loading tasks…</div>;
  }

  if (isError) {
    return (
      <div className="card p-12 text-center">
        <p className="text-sm text-red-600 mb-3">
          {error?.response?.data?.error?.message || 'Failed to load tasks'}
        </p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-secondary text-xs">Retry</button>
        )}
      </div>
    );
  }

  if (sortedTasks.length === 0) {
    return (
      <div className="card p-12 text-center text-slate-400">
        No tasks match the current filters
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto overscroll-x-contain">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.key} className="px-4 py-3 whitespace-nowrap">
                <SortHeader column={col} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </th>
            ))}
            <th className="px-4 py-3">Labels</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedTasks.map((task) => (
            <tr
              key={task.id}
              className="hover:bg-slate-50/80 cursor-pointer"
              onClick={() => onTaskClick?.(task)}
            >
              <td className="px-4 py-3 font-mono text-xs text-brand-600 whitespace-nowrap">
                {task.task_key || `#${task.id}`}
              </td>
              <td className="px-4 py-3 font-medium text-slate-800 max-w-[240px]">
                <span className="line-clamp-2">{task.title}</span>
                {task.task_type && task.task_type !== 'task' && (
                  <span className="block text-[10px] text-slate-400 capitalize mt-0.5">{task.task_type}</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded', TASK_STATUS[task.status]?.color)}>
                  {TASK_STATUS[task.status]?.label || task.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded capitalize', PRIORITY_BADGE[task.priority])}>
                  {task.priority}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                {task.assignee
                  ? `${task.assignee.first_name} ${task.assignee.last_name}`
                  : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">
                {formatStoryPoints(task.estimate_points) || '—'}
              </td>
              <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                {task.due_date ? format(parseISO(task.due_date), 'dd MMM yyyy') : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                {task.sprint_id ? sprintMap.get(task.sprint_id) || `Sprint #${task.sprint_id}` : 'Backlog'}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1 max-w-[160px]">
                  {(task.labels || []).slice(0, 2).map((label) => (
                    <LabelBadge key={label.id} label={label} className="text-[9px]" />
                  ))}
                  {(task.labels || []).length > 2 && (
                    <span className="text-[9px] text-slate-400">+{task.labels.length - 2}</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
