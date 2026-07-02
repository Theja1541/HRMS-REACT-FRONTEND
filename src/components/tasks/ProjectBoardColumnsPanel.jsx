import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronUp, ChevronDown, Columns3, X } from 'lucide-react';
import { hrApi } from '../../api';
import { TASK_STATUS } from '../../constants/hr';
import { cn } from '../../utils/helpers';

const STATUS_OPTIONS = ['todo', 'in_progress', 'review', 'done'];

const EMPTY_FORM = {
  name: '',
  status_mapping: 'todo',
  is_done_column: false,
};

export default function ProjectBoardColumnsPanel({ projectId, canManage }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['project-board', projectId],
    queryFn: () => hrApi.getProjectBoard(projectId),
    enabled: !!projectId,
  });

  const board = data?.data?.board;
  const columns = useMemo(
    () => [...(board?.columns || [])].sort((a, b) => a.position - b.position),
    [board]
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project-board', projectId] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ columnId, payload }) => hrApi.updateBoardColumn(columnId, payload),
    onSuccess: () => {
      setActionError('');
      invalidate();
    },
    onError: (err) => {
      setActionError(err.response?.data?.error?.message || 'Failed to update column');
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload) => hrApi.createBoardColumn(board.id, payload),
    onSuccess: () => {
      setFormError('');
      setShowForm(false);
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (err) => {
      setFormError(err.response?.data?.error?.message || 'Failed to create column');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ boardId, columnIds }) =>
      hrApi.reorderBoardColumns(boardId, { column_ids: columnIds }),
    onSuccess: () => {
      setActionError('');
      invalidate();
    },
    onError: (err) => {
      setActionError(err.response?.data?.error?.message || 'Failed to reorder columns');
    },
  });

  const isReordering = reorderMutation.isPending;

  const handleRename = (column, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === column.name) return;
    updateMutation.mutate({ columnId: column.id, payload: { name: trimmed } });
  };

  const handleMove = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length || !board?.id) return;

    const nextOrder = columns.map((col) => col.id);
    [nextOrder[index], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[index]];
    reorderMutation.mutate({ boardId: board.id, columnIds: nextOrder });
  };

  if (!canManage) {
    return (
      <div className="card p-12 text-center text-slate-400">
        Column settings are available to managers only.
      </div>
    );
  }

  if (isLoading) {
    return <div className="card p-12 text-center text-slate-400">Loading columns…</div>;
  }

  if (isError) {
    return (
      <div className="card p-12 text-center">
        <p className="text-sm text-red-600 mb-3">
          {error?.response?.data?.error?.message || 'Failed to load board columns'}
        </p>
        <button type="button" onClick={() => refetch()} className="btn-secondary text-xs">
          Retry
        </button>
      </div>
    );
  }

  if (!board) {
    return <div className="card p-12 text-center text-slate-400">No board found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Board Columns</h3>
          <p className="text-xs text-slate-500 mt-0.5">{board.name}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setFormError('');
          }}
          className="btn-primary text-xs inline-flex items-center gap-1"
        >
          <Plus size={12} /> Add Column
        </button>
      </div>

      {actionError && (
        <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">
          {actionError}
        </div>
      )}

      {columns.length === 0 ? (
        <div className="card p-12 text-center">
          <Columns3 size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">No columns configured</p>
        </div>
      ) : (
        <div className="card overflow-x-auto overscroll-x-contain">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 w-20">Order</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status mapping</th>
                <th className="px-4 py-3">Tasks</th>
                <th className="px-4 py-3">Done column</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {columns.map((col, index) => (
                <tr key={col.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-xs text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3">
                    <input
                      key={`${col.id}-${col.name}`}
                      defaultValue={col.name}
                      onBlur={(e) => handleRename(col, e.target.value)}
                      disabled={updateMutation.isPending}
                      className="w-full min-w-[140px] text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded',
                      TASK_STATUS[col.status_mapping]?.color || 'bg-slate-100 text-slate-600'
                    )}>
                      {TASK_STATUS[col.status_mapping]?.label || col.status_mapping}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {col.tasks?.length || 0}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {col.is_done_column ? 'Yes' : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0 || isReordering}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                        title="Move up"
                        aria-label="Move column up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === columns.length - 1 || isReordering}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                        title="Move down"
                        aria-label="Move column down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </td>
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
              setFormError('');
              if (!form.name.trim()) {
                setFormError('Column name is required');
                return;
              }
              createMutation.mutate({
                name: form.name.trim(),
                status_mapping: form.status_mapping,
                is_done_column: form.is_done_column,
              });
            }}
            className="bg-white rounded-xl p-6 w-full max-w-md space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-slate-900">Add Column</h3>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                  setFormError('');
                }}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">
                {formError}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-600">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. QA"
                maxLength={80}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Status mapping</label>
              <select
                value={form.status_mapping}
                onChange={(e) => setForm({ ...form, status_mapping: e.target.value })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATUS[s]?.label || s}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Tasks moved to this column will use this workflow status.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_done_column}
                onChange={(e) => setForm({ ...form, is_done_column: e.target.checked })}
                className="rounded border-slate-300"
              />
              Mark as done column
            </label>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                  setFormError('');
                }}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary text-xs"
              >
                {createMutation.isPending ? 'Adding…' : 'Add Column'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
