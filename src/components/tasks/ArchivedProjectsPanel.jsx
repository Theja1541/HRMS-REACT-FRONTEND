import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Archive, RotateCcw } from 'lucide-react';
import { hrApi } from '../../api';
import { PROJECT_STATUS } from '../../constants/hr';
import { cn } from '../../utils/helpers';

function formatArchivedAt(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy, HH:mm');
  } catch {
    return '—';
  }
}

export default function ArchivedProjectsPanel({ enabled = true }) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['projects-archived'],
    queryFn: () => hrApi.listArchivedProjects(),
    enabled,
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => hrApi.restoreProject(id),
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects-archived'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.removeQueries({ queryKey: ['project', id] });
    },
  });

  const projects = data?.data?.projects || [];

  const handleRestore = (project) => {
    const label = project.code ? `${project.code} — ${project.name}` : project.name;
    if (
      !window.confirm(
        `Restore "${label}"?\n\nThe project will return to the active list with all tasks, members, sprints, and activity intact.`
      )
    ) {
      return;
    }
    restoreMutation.mutate(project.id);
  };

  if (!enabled) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 inline-flex items-center gap-2">
            <Archive size={16} className="text-slate-500" />
            Archived Projects
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Soft-archived projects. Restore to reopen with all related data preserved.
          </p>
        </div>
        {projects.length > 0 && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-1 rounded">
            {projects.length} archived
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="card p-8 text-center text-slate-400 text-sm">Loading archived projects…</div>
      ) : isError ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-red-600 mb-3">
            {error?.response?.data?.error?.message || 'Failed to load archived projects'}
          </p>
          <button type="button" onClick={() => refetch()} className="btn-secondary text-xs">
            Retry
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-8 text-center text-slate-400 text-sm">
          No archived projects
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tasks</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Archived</th>
                <th className="px-4 py-3 w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => {
                const total = p.task_counts?.total || 0;
                const done = p.task_counts?.done || 0;
                const restoring = restoreMutation.isPending && restoreMutation.variables === p.id;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-mono text-[10px] text-slate-400">{p.code}</p>
                      <p className="font-medium text-slate-800">{p.name}</p>
                      {p.manager && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          PM: {p.manager.first_name} {p.manager.last_name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded capitalize',
                          PROJECT_STATUS[p.status]
                        )}
                      >
                        {p.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {done}/{total} done
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {p.team_counts?.total ?? 0} members
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatArchivedAt(p.deleted_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRestore(p)}
                        disabled={restoreMutation.isPending}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg px-2.5 py-1.5 disabled:opacity-50"
                      >
                        <RotateCcw size={12} />
                        {restoring ? 'Restoring…' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {restoreMutation.isError && (
            <p className="px-4 py-3 text-xs text-red-600 border-t border-slate-100">
              {restoreMutation.error?.response?.data?.error?.message || 'Failed to restore project'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
