import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, CheckCircle, X } from 'lucide-react';
import { hrApi } from '../../api';
import { cn, formatStoryPoints } from '../../utils/helpers';
import { format, parseISO } from 'date-fns';

const SPRINT_STATUS = {
  planned: 'bg-slate-100 text-slate-600',
  active: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-blue-50 text-blue-700',
};

function SprintPointsBar({ done = 0, total = 0 }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="min-w-[120px]">
      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
        <span>{formatStoryPoints(done) || 0} / {formatStoryPoints(total) || 0} pts</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ProjectSprintsPanel({ projectId, canManage }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [completeSprintId, setCompleteSprintId] = useState(null);
  const [moveToSprintId, setMoveToSprintId] = useState('');
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', goal: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['project-sprints', projectId],
    queryFn: () => hrApi.listSprints(projectId),
    enabled: !!projectId,
  });

  const sprints = data?.data?.sprints || [];
  const activeSprint = sprints.find((s) => s.status === 'active');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-board', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => hrApi.createSprint(projectId, payload),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setForm({ name: '', start_date: '', end_date: '', goal: '' });
    },
  });

  const startMutation = useMutation({
    mutationFn: (sprintId) => hrApi.startSprint(sprintId),
    onSuccess: invalidate,
  });

  const completeMutation = useMutation({
    mutationFn: ({ sprintId, move_to_sprint_id }) =>
      hrApi.completeSprint(sprintId, move_to_sprint_id ? { move_to_sprint_id } : {}),
    onSuccess: () => {
      invalidate();
      setCompleteSprintId(null);
      setMoveToSprintId('');
    },
  });

  if (isLoading) {
    return <div className="card p-12 text-center text-slate-400">Loading sprints…</div>;
  }

  return (
    <div className="space-y-4">
      {activeSprint && (
        <div className="card p-4 border-emerald-200 bg-emerald-50/40 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Active Sprint</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeSprint.name}</p>
            <p className="text-xs text-slate-500">
              {format(parseISO(activeSprint.start_date), 'dd MMM')} – {format(parseISO(activeSprint.end_date), 'dd MMM yyyy')}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-emerald-700 block">
              {activeSprint.task_counts?.done || 0}/{activeSprint.task_counts?.total || 0} tasks done
            </span>
            {(activeSprint.point_counts?.total || 0) > 0 && (
              <div className="mt-2 w-40 ml-auto">
                <SprintPointsBar
                  done={activeSprint.point_counts?.done || 0}
                  total={activeSprint.point_counts?.total || 0}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Sprints</h3>
        {canManage && (
          <button type="button" onClick={() => setShowForm(true)} className="btn-primary text-xs inline-flex items-center gap-1">
            <Plus size={12} /> New Sprint
          </button>
        )}
      </div>

      {sprints.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">No sprints yet</div>
      ) : (
        <div className="card overflow-x-auto overscroll-x-contain">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Sprint</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Tasks</th>
                <th className="px-4 py-3">Story Points</th>
                <th className="px-4 py-3">Status</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sprints.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.name}</p>
                    {s.goal && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{s.goal}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {format(parseISO(s.start_date), 'dd MMM')} – {format(parseISO(s.end_date), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {s.task_counts?.done || 0} / {s.task_counts?.total || 0} tasks
                  </td>
                  <td className="px-4 py-3">
                    {(s.point_counts?.total || 0) > 0 ? (
                      <SprintPointsBar
                        done={s.point_counts?.done || 0}
                        total={s.point_counts?.total || 0}
                      />
                    ) : (
                      <span className="text-xs text-slate-400">No points</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded capitalize', SPRINT_STATUS[s.status])}>
                      {s.status}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {s.status === 'planned' && (
                          <button
                            type="button"
                            onClick={() => startMutation.mutate(s.id)}
                            disabled={startMutation.isPending}
                            className="btn-secondary text-[10px] px-2 py-1 inline-flex items-center gap-1"
                          >
                            <Play size={10} /> Start
                          </button>
                        )}
                        {s.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => setCompleteSprintId(s.id)}
                            className="btn-primary text-[10px] px-2 py-1 inline-flex items-center gap-1"
                          >
                            <CheckCircle size={10} /> Complete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(form);
            }}
            className="bg-white rounded-xl p-6 w-full max-w-md space-y-3"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">New Sprint</h3>
              <button type="button" onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <input required placeholder="Sprint name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input required type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <textarea placeholder="Sprint goal (optional)" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs">Cancel</button>
              <button type="submit" disabled={createMutation.isPending} className="btn-primary text-xs">Create</button>
            </div>
          </form>
        </div>
      )}

      {completeSprintId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold">Complete Sprint</h3>
            <p className="text-sm text-slate-600">Move incomplete tasks to another sprint or leave in backlog.</p>
            <select
              value={moveToSprintId}
              onChange={(e) => setMoveToSprintId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Backlog (no sprint)</option>
              {sprints.filter((s) => s.id !== completeSprintId && s.status !== 'completed').map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setCompleteSprintId(null)} className="btn-secondary text-xs">Cancel</button>
              <button
                type="button"
                disabled={completeMutation.isPending}
                onClick={() => completeMutation.mutate({
                  sprintId: completeSprintId,
                  move_to_sprint_id: moveToSprintId ? parseInt(moveToSprintId, 10) : null,
                })}
                className="btn-primary text-xs"
              >
                {completeMutation.isPending ? 'Completing…' : 'Complete Sprint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
