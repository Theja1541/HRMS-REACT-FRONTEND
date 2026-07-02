import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PRIORITY_BADGE, TASK_TYPES } from '../../constants/hr';
import LabelBadge from './LabelBadge';
import { cn, formatStoryPoints } from '../../utils/helpers';
import { format, parseISO, isPast, isToday } from 'date-fns';

function TaskCardBody({ task, onClick, compact, dragHandleProps, isDragging, bulkMode, selected, onToggleSelect }) {
  const dueOverdue = task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
  const dueToday = task.due_date && isToday(parseISO(task.due_date));

  return (
    <div
      className={cn(
        'bg-white border rounded-lg p-3 group hover:border-brand-300 hover:shadow-sm transition-all',
        selected ? 'border-brand-500 ring-1 ring-brand-200' : 'border-slate-200',
        isDragging && 'shadow-lg ring-2 ring-brand-200'
      )}
    >
      <div className="flex items-start gap-2">
        {bulkMode && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(task.id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 shrink-0"
          />
        )}
        {dragHandleProps && (
          <button
            type="button"
            className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing mt-0.5 shrink-0 touch-none"
            {...dragHandleProps}
            aria-label="Drag task"
          >
            <GripVertical size={14} />
          </button>
        )}
        <button type="button" onClick={() => onClick?.(task)} className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {task.task_key && (
              <span className="text-[10px] font-mono text-brand-600">{task.task_key}</span>
            )}
            {task.task_type && task.task_type !== 'task' && (
              <span className="text-[9px] uppercase font-semibold text-slate-400">{TASK_TYPES[task.task_type] || task.task_type}</span>
            )}
            {formatStoryPoints(task.estimate_points) && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                {formatStoryPoints(task.estimate_points)} pts
              </span>
            )}
            <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded capitalize ml-auto', PRIORITY_BADGE[task.priority])}>
              {task.priority}
            </span>
          </div>
          <p className={cn('text-sm font-medium text-slate-800', compact && 'line-clamp-2')}>{task.title}</p>
          {!compact && (task.labels || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {task.labels.slice(0, 3).map((label) => (
                <LabelBadge key={label.id} label={label} className="text-[9px]" />
              ))}
              {task.labels.length > 3 && (
                <span className="text-[9px] text-slate-400">+{task.labels.length - 3}</span>
              )}
            </div>
          )}
          {!compact && task.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center justify-between mt-2 gap-2">
            {task.assignee ? (
              <span className="text-[10px] text-slate-500 truncate">
                {task.assignee.first_name} {task.assignee.last_name?.[0]}.
              </span>
            ) : (
              <span className="text-[10px] text-slate-300">Unassigned</span>
            )}
            {task.due_date && (
              <span className={cn(
                'text-[10px] shrink-0',
                dueOverdue ? 'text-red-600 font-medium' : dueToday ? 'text-amber-600' : 'text-slate-400'
              )}>
                {format(parseISO(task.due_date), 'dd MMM')}
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

export function TaskCardPreview({ task, compact }) {
  return <TaskCardBody task={task} compact={compact} />;
}

export default function TaskCard({
  task, onClick, compact = false, bulkMode, selected, onToggleSelect,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `task-${task.id}`, data: { type: 'task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCardBody
        task={task}
        onClick={onClick}
        compact={compact}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        bulkMode={bulkMode}
        selected={selected}
        onToggleSelect={onToggleSelect}
      />
    </div>
  );
}
