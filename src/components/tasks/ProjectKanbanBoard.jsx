import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard, { TaskCardPreview } from './TaskCard';
import { TASK_STATUS } from '../../constants/hr';
import { cn } from '../../utils/helpers';

function KanbanColumn({ column, onTaskClick, bulkMode, selectedIds, onToggleSelect }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${column.id}`, data: { type: 'column', column } });
  const tasks = column.tasks || [];
  const meta = TASK_STATUS[column.status_mapping] || TASK_STATUS.todo;
  const taskIds = tasks.map((t) => `task-${t.id}`);

  return (
    <div className="card p-3 min-h-[420px] flex flex-col">
      <h3 className={cn('text-xs font-semibold uppercase tracking-wide mb-3 px-1 inline-block px-2 py-0.5 rounded w-fit', meta.color)}>
        {column.name} ({tasks.length})
      </h3>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 min-h-[120px] rounded-lg p-1 transition-colors',
          isOver && 'bg-brand-50/50 ring-1 ring-brand-200'
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
              bulkMode={bulkMode}
              selected={selectedIds?.has(task.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8">Drop tasks here</p>
        )}
      </div>
    </div>
  );
}

function parseTaskId(id) {
  return parseInt(String(id).replace('task-', ''), 10);
}

function parseColumnId(id) {
  return parseInt(String(id).replace('column-', ''), 10);
}

export default function ProjectKanbanBoard({
  board,
  onMoveTask,
  onTaskClick,
  isMoving,
  bulkMode,
  selectedIds,
  onToggleSelect,
  filtersActive = false,
}) {
  const [activeTask, setActiveTask] = useState(null);
  const columns = board?.columns || [];
  const hasMatchingTasks = useMemo(
    () => columns.some((col) => (col.tasks || []).length > 0),
    [columns]
  );

  const taskMap = useMemo(() => {
    const map = new Map();
    columns.forEach((col) => {
      (col.tasks || []).forEach((t) => map.set(t.id, { task: t, columnId: col.id, column: col }));
    });
    return map;
  }, [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragStart = (event) => {
    const taskId = parseTaskId(event.active.id);
    setActiveTask(taskMap.get(taskId)?.task || null);
  };

  const handleDragEnd = (event) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || isMoving) return;

    const taskId = parseTaskId(active.id);
    const activeInfo = taskMap.get(taskId);
    if (!activeInfo) return;

    if (String(over.id).startsWith('column-')) {
      const targetColumnId = parseColumnId(over.id);
      if (activeInfo.columnId === targetColumnId) return;
      const targetCol = columns.find((c) => c.id === targetColumnId);
      const colTasks = (targetCol?.tasks || []).filter((t) => t.id !== taskId);
      onMoveTask({
        taskId,
        board_column_id: targetColumnId,
        after_task_id: colTasks[colTasks.length - 1]?.id,
      });
      return;
    }

    if (String(over.id).startsWith('task-')) {
      const overTaskId = parseTaskId(over.id);
      if (overTaskId === taskId) return;

      const overInfo = taskMap.get(overTaskId);
      if (!overInfo) return;

      const targetColumnId = overInfo.columnId;
      const colTasks = (overInfo.column.tasks || []).filter((t) => t.id !== taskId);
      const overIndex = colTasks.findIndex((t) => t.id === overTaskId);
      const activeIndex = activeInfo.columnId === targetColumnId
        ? (activeInfo.column.tasks || []).findIndex((t) => t.id === taskId)
        : -1;

      const payload = { taskId, board_column_id: targetColumnId };

      if (activeInfo.columnId === targetColumnId && activeIndex !== -1 && activeIndex < overIndex) {
        payload.after_task_id = overTaskId;
      } else {
        payload.before_task_id = overTaskId;
      }

      onMoveTask(payload);
    }
  };

  if (!board?.columns?.length) {
    return <div className="card p-12 text-center text-slate-400">No board columns configured</div>;
  }

  if (filtersActive && !hasMatchingTasks) {
    return <div className="card p-12 text-center text-slate-400">No tasks match the current filters</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            onTaskClick={onTaskClick}
            bulkMode={bulkMode}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-90 rotate-2 scale-105">
            <TaskCardPreview task={activeTask} compact />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
