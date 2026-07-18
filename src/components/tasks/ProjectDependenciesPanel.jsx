import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, GitBranch, Search } from 'lucide-react';
import { hrApi } from '../../api';
import { cn } from '../../utils/helpers';

export default function ProjectDependenciesPanel({ projectId, onTaskClick }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['project-dependencies', projectId],
    queryFn: () => hrApi.listProjectDependencies(projectId),
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const edges = data?.data?.edges || [];
  const involvedTasks = data?.data?.tasks || [];

  const graph = useMemo(() => {
    const taskMap = new Map(involvedTasks.map((task) => [task.id, task]));

    const graphEdges = edges
      .filter((edge) => edge.blocking_task_id && edge.blocked_task_id)
      .map((edge) => ({
        id: edge.id,
        blockingTaskId: edge.blocking_task_id,
        blockedTaskId: edge.blocked_task_id,
        blockingTask: edge.blocking_task || taskMap.get(edge.blocking_task_id),
        blockedTask: edge.blocked_task || taskMap.get(edge.blocked_task_id),
        relationType: edge.relation_type,
      }));

    const involvedIds = Array.from(
      new Set(graphEdges.flatMap((edge) => [edge.blockingTaskId, edge.blockedTaskId]))
    );

    const incoming = new Map();
    const outgoing = new Map();
    involvedIds.forEach((id) => {
      incoming.set(id, []);
      outgoing.set(id, []);
    });
    graphEdges.forEach((edge) => {
      incoming.get(edge.blockedTaskId)?.push(edge.blockingTaskId);
      outgoing.get(edge.blockingTaskId)?.push(edge.blockedTaskId);
    });

    const depths = new Map(involvedIds.map((id) => [id, 0]));
    for (let i = 0; i < involvedIds.length; i += 1) {
      let changed = false;
      graphEdges.forEach((edge) => {
        const nextDepth = (depths.get(edge.blockingTaskId) || 0) + 1;
        if (nextDepth > (depths.get(edge.blockedTaskId) || 0)) {
          depths.set(edge.blockedTaskId, nextDepth);
          changed = true;
        }
      });
      if (!changed) break;
    }

    const columns = new Map();
    involvedIds.forEach((id) => {
      const depth = Math.min(depths.get(id) || 0, 12);
      if (!columns.has(depth)) columns.set(depth, []);
      columns.get(depth).push(id);
    });

    columns.forEach((ids) => {
      ids.sort((a, b) => {
        const taskA = taskMap.get(a);
        const taskB = taskMap.get(b);
        return String(taskA?.task_key || a).localeCompare(String(taskB?.task_key || b));
      });
    });

    const nodeWidth = 220;
    const nodeHeight = 96;
    const columnGap = 96;
    const rowGap = 36;
    const padding = 28;
    const positions = new Map();
    const sortedDepths = Array.from(columns.keys()).sort((a, b) => a - b);
    sortedDepths.forEach((depth) => {
      const ids = columns.get(depth) || [];
      ids.forEach((id, row) => {
        positions.set(id, {
          x: padding + depth * (nodeWidth + columnGap),
          y: padding + row * (nodeHeight + rowGap),
        });
      });
    });

    const maxRows = Math.max(1, ...Array.from(columns.values()).map((ids) => ids.length));
    const maxDepth = Math.max(0, ...sortedDepths);
    const width = Math.max(760, padding * 2 + (maxDepth + 1) * nodeWidth + maxDepth * columnGap);
    const height = Math.max(260, padding * 2 + maxRows * nodeHeight + (maxRows - 1) * rowGap);

    const nodes = involvedIds.map((id) => {
      const task = taskMap.get(id) || { id };
      return {
        id,
        task,
        position: positions.get(id),
        blockedByCount: incoming.get(id)?.length || 0,
        blocksCount: outgoing.get(id)?.length || 0,
      };
    });

    return { graphEdges, nodes, positions, width, height, nodeWidth, nodeHeight };
  }, [edges, involvedTasks]);

  const filteredEdges = useMemo(() => {
    const q = search.trim().toLowerCase();
    return graph.graphEdges.filter((edge) => {
      if (statusFilter) {
        const matchStatus =
          edge.blockingTask?.status === statusFilter || edge.blockedTask?.status === statusFilter;
        if (!matchStatus) return false;
      }
      if (!q) return true;
      const haystack = [
        edge.blockingTask?.task_key,
        edge.blockingTask?.title,
        edge.blockedTask?.task_key,
        edge.blockedTask?.title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [graph.graphEdges, search, statusFilter]);

  const visibleNodeIds = useMemo(() => {
    if (!search.trim() && !statusFilter) return null;
    return new Set(filteredEdges.flatMap((e) => [e.blockingTaskId, e.blockedTaskId]));
  }, [filteredEdges, search, statusFilter]);

  if (isLoading) {
    return <div className="card p-12 text-center text-slate-400">Loading dependencies…</div>;
  }

  if (isError) {
    return (
      <div className="card p-12 text-center space-y-3">
        <p className="text-sm text-red-600">
          {error?.response?.data?.error?.message || 'Failed to load dependencies'}
        </p>
        <button type="button" onClick={() => refetch()} className="btn-secondary text-xs">
          Retry
        </button>
      </div>
    );
  }

  if (!graph.graphEdges.length) {
    return (
      <div className="card p-12 text-center">
        <GitBranch size={32} className="mx-auto text-slate-300 mb-3" />
        <p className="text-sm text-slate-500">No task dependencies in this project</p>
        <p className="text-xs text-slate-400 mt-1">
          Open a task and use the Dependencies tab to link blocked / blocking tasks
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <GitBranch size={16} className="text-slate-400" />
              Dependency Graph
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Arrows point from the blocking task to the blocked task ({graph.graphEdges.length} link
              {graph.graphEdges.length === 1 ? '' : 's'}).
            </p>
          </div>
          <div className="flex gap-2 text-[10px] text-slate-500 shrink-0">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Blocks others
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Blocked
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div className="overflow-auto rounded-xl border border-slate-100 bg-slate-50/70">
          <div className="relative" style={{ width: graph.width, height: graph.height }}>
            <svg
              width={graph.width}
              height={graph.height}
              className="absolute inset-0 pointer-events-none"
              role="img"
              aria-label="Project task dependency graph"
            >
              <defs>
                <marker
                  id="dependency-arrow"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" />
                </marker>
              </defs>
              {graph.graphEdges.map((edge) => {
                if (visibleNodeIds && !visibleNodeIds.has(edge.blockingTaskId) && !visibleNodeIds.has(edge.blockedTaskId)) {
                  return null;
                }
                const from = graph.positions.get(edge.blockingTaskId);
                const to = graph.positions.get(edge.blockedTaskId);
                if (!from || !to) return null;

                const startX = from.x + graph.nodeWidth;
                const startY = from.y + graph.nodeHeight / 2;
                const endX = to.x;
                const endY = to.y + graph.nodeHeight / 2;
                const midX = startX + Math.max(48, (endX - startX) / 2);
                const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX - 8} ${endY}`;
                const dimmed = visibleNodeIds
                  && (!visibleNodeIds.has(edge.blockingTaskId) || !visibleNodeIds.has(edge.blockedTaskId));

                return (
                  <path
                    key={edge.id}
                    d={path}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    opacity={dimmed ? 0.2 : 1}
                    markerEnd="url(#dependency-arrow)"
                  />
                );
              })}
            </svg>

            {graph.nodes.map((node) => {
              const hidden = visibleNodeIds && !visibleNodeIds.has(node.id);
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onTaskClick?.(node.id)}
                  className={cn(
                    'absolute text-left bg-white rounded-xl border shadow-sm p-3 hover:border-brand-300 hover:shadow-md transition',
                    node.blockedByCount > 0 ? 'border-amber-200' : 'border-slate-200',
                    hidden && 'opacity-20 pointer-events-none'
                  )}
                  style={{
                    left: node.position.x,
                    top: node.position.y,
                    width: graph.nodeWidth,
                    height: graph.nodeHeight,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-brand-600">
                      {node.task?.task_key || `#${node.id}`}
                    </span>
                    <span className={cn(
                      'text-[9px] font-semibold px-1.5 py-0.5 rounded capitalize',
                      node.blockedByCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                    )}>
                      {node.task?.status || 'task'}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-800 mt-2 line-clamp-2">
                    {node.task?.title || 'Untitled task'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[10px]">
                    {node.blockedByCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <AlertTriangle size={11} /> Blocked by {node.blockedByCount}
                      </span>
                    )}
                    {node.blocksCount > 0 && (
                      <span className="text-red-600">Blocks {node.blocksCount}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-3">Relationships</h3>
        {filteredEdges.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No relationships match your filters</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {filteredEdges.map((edge) => (
              <div key={edge.id} className="bg-slate-50 rounded-lg p-3 text-xs flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onTaskClick?.(edge.blockingTaskId)}
                  className="font-mono text-brand-600 hover:underline shrink-0"
                >
                  {edge.blockingTask?.task_key || `#${edge.blockingTaskId}`}
                </button>
                <span className="text-red-600 font-semibold">blocks</span>
                <button
                  type="button"
                  onClick={() => onTaskClick?.(edge.blockedTaskId)}
                  className="font-mono text-brand-600 hover:underline shrink-0"
                >
                  {edge.blockedTask?.task_key || `#${edge.blockedTaskId}`}
                </button>
                <span className="text-slate-400 truncate">{edge.blockedTask?.title}</span>
                {edge.blockedTask?.status !== 'done' && edge.blockingTask?.status !== 'done' && (
                  <span className="ml-auto text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                    Active
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
