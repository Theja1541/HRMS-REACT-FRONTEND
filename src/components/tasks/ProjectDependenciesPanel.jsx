import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, ArrowRight } from 'lucide-react';
import { hrApi } from '../../api';
import { cn } from '../../utils/helpers';

async function loadProjectDependencyEdges(projectId, taskIds) {
  const edges = [];
  const results = await Promise.all(
    taskIds.map(async (id) => {
      try {
        const res = await hrApi.listTaskDependencies(id);
        const deps = res?.data?.dependencies || [];
        return deps.map((d) => ({
          id: d.id,
          fromTaskId: id,
          toTaskId: d.depends_on_task_id,
          toKey: d.dependsOnTask?.task_key,
          toTitle: d.dependsOnTask?.title,
          relation: d.relation_type,
        }));
      } catch {
        return [];
      }
    })
  );
  results.flat().forEach((e) => edges.push(e));
  return edges;
}

async function loadTaskCacheForEdges(edges) {
  const uniqueTaskIds = Array.from(
    new Set(
      (edges || []).flatMap((edge) => [edge.fromTaskId, edge.toTaskId]).filter(Boolean)
    )
  );

  const taskRows = await Promise.all(
    uniqueTaskIds.map(async (taskId) => {
      try {
        const res = await hrApi.getTask(taskId);
        return [taskId, res?.data?.task || null];
      } catch {
        return [taskId, null];
      }
    })
  );

  return new Map(taskRows.filter(([, task]) => task));
}

export default function ProjectDependenciesPanel({ projectId, tasks, onTaskClick }) {
  const taskIds = useMemo(() => (tasks || []).map((t) => t.id), [tasks]);

  const { data, isLoading } = useQuery({
    queryKey: ['project-dependencies', projectId, taskIds.join(',')],
    queryFn: async () => {
      const edges = await loadProjectDependencyEdges(projectId, taskIds);
      const taskCache = await loadTaskCacheForEdges(edges);
      return { edges, taskCache };
    },
    enabled: !!projectId && taskIds.length > 0,
    staleTime: 60_000,
  });

  const edges = data?.edges || [];
  const taskCache = data?.taskCache || new Map();

  const enrichedEdges = edges.map((e) => ({
    ...e,
    from: taskCache.get(e.fromTaskId),
    to: taskCache.get(e.toTaskId) || { task_key: e.toKey, title: e.toTitle },
  }));

  if (isLoading) {
    return <div className="card p-12 text-center text-slate-400">Loading dependencies…</div>;
  }

  if (!enrichedEdges.length) {
    return (
      <div className="card p-12 text-center">
        <GitBranch size={32} className="mx-auto text-slate-300 mb-3" />
        <p className="text-sm text-slate-500">No task dependencies in this project</p>
        <p className="text-xs text-slate-400 mt-1">Add dependencies from a task&apos;s detail panel</p>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <GitBranch size={16} className="text-slate-400" />
        Dependency Graph
      </h3>
      <div className="space-y-2">
        {enrichedEdges.map((edge) => (
          <div
            key={edge.id}
            className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg text-sm flex-wrap"
          >
            <button
              type="button"
              onClick={() => onTaskClick?.(edge.fromTaskId)}
              className="font-mono text-[11px] text-brand-600 hover:underline"
            >
              {edge.from?.task_key || `#${edge.fromTaskId}`}
            </button>
            <span className="text-slate-400 text-xs truncate max-w-[120px]">{edge.from?.title}</span>
            <ArrowRight size={14} className="text-slate-400 shrink-0" />
            <span className={cn(
              'text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded',
              edge.relation === 'blocks' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
            )}>
              {edge.relation === 'blocks' ? 'blocks' : 'blocked by'}
            </span>
            <ArrowRight size={14} className="text-slate-400 shrink-0" />
            <button
              type="button"
              onClick={() => onTaskClick?.(edge.toTaskId)}
              className="font-mono text-[11px] text-brand-600 hover:underline"
            >
              {edge.to?.task_key || edge.toKey || `#${edge.toTaskId}`}
            </button>
            <span className="text-slate-400 text-xs truncate max-w-[120px]">{edge.to?.title || edge.toTitle}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
