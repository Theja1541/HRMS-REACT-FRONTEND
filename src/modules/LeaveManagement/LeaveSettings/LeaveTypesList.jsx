import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '../../../utils/helpers';
import { ActiveToggle, EmptyState } from './leaveSettingsUi';

export default function LeaveTypesList({
  types,
  loading,
  error,
  onAdd,
  onEdit,
  onToggleActive,
  togglePending,
}) {
  if (loading) return <p className="p-8 text-center text-slate-400 text-sm">Loading leave types…</p>;
  if (error) {
    return (
      <p className="p-8 text-center text-red-500 text-sm">
        {error.response?.data?.error?.message || error.message}
      </p>
    );
  }
  if (!types.length) {
    return <EmptyState message="No leave types configured" actionLabel="Add leave type" onAction={onAdd} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left">
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Type</th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Code</th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Paid</th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Gender</th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Active</th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {types.map((t) => (
            <tr key={t.id} className={cn('hover:bg-slate-50', !t.is_active && 'opacity-60')}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color_code || '#6366F1' }} />
                  <div>
                    <p className="font-medium text-slate-900">{t.name}</p>
                    {t.is_system && <span className="text-[10px] text-slate-400 uppercase">System</span>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs">{t.code}</td>
              <td className="px-4 py-3 text-slate-600">{t.is_paid ? 'Paid' : 'Unpaid'}</td>
              <td className="px-4 py-3 text-slate-600 capitalize">{t.applicable_gender}</td>
              <td className="px-4 py-3">
                <ActiveToggle
                  active={t.is_active}
                  disabled={togglePending}
                  onChange={(is_active) => onToggleActive(t, is_active)}
                />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <button type="button" title="Edit" onClick={() => onEdit(t)} className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50">
                    <Pencil size={15} />
                  </button>
                  {!t.is_system && t.is_active && (
                    <button type="button" title="Deactivate" onClick={() => onToggleActive(t, false)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 size={15} />
                    </button>
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
