import { Pencil, Users, Trash2 } from 'lucide-react';
import { cn } from '../../../utils/helpers';
import { formatAccrualSummary, formatApprovalChain } from './leaveSettings.constants';
import { ActiveToggle, EmptyState } from './leaveSettingsUi';

export default function LeavePolicyList({
  policies,
  loading,
  error,
  filterTypeId,
  onFilterType,
  leaveTypes,
  onAdd,
  onEdit,
  onAssign,
  onToggleActive,
  onRemoveAssignment,
  togglePending,
  removeAssignmentPending,
}) {
  const filtered = filterTypeId
    ? policies.filter((p) => String(p.leave_type_id) === String(filterTypeId))
    : policies;

  if (loading) return <p className="p-8 text-center text-slate-400 text-sm">Loading policies…</p>;
  if (error) {
    return <p className="p-8 text-center text-red-500 text-sm">{error.response?.data?.error?.message || error.message}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="px-4 pt-3 flex flex-wrap items-center gap-3">
        <select
          value={filterTypeId}
          onChange={(e) => onFilterType(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2"
        >
          <option value="">All leave types</option>
          {leaveTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.code} — {t.name}</option>
          ))}
        </select>
      </div>

      {!filtered.length ? (
        <EmptyState message="No policies for this filter" actionLabel="Add policy" onAction={onAdd} />
      ) : (
        <div className="divide-y divide-slate-100">
          {filtered.map((p) => (
            <div key={p.id} className={cn('px-4 py-4', !p.is_active && 'opacity-60')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.leaveType?.color_code || '#6366F1' }} />
                    <h3 className="font-medium text-slate-900 text-sm">{p.policy_name}</h3>
                    <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{p.leaveType?.code}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatAccrualSummary(p)} · {p.accrual_trigger?.replace(/_/g, ' ')} · Approval: {formatApprovalChain(p.approval_levels)}
                    {p.sandwich_rule_enabled && ' · Sandwich rule'}
                    {p.max_balance_cap != null && ` · max ${parseFloat(p.max_balance_cap)}`}
                  </p>
                  {!(p.assignments || []).length && (
                    <p className="text-xs text-amber-700 mt-1">Not assigned — no employees will receive this policy until you click Assign.</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ActiveToggle active={p.is_active} disabled={togglePending} onChange={(v) => onToggleActive(p, v)} />
                  <button type="button" title="Assign" onClick={() => onAssign(p)} className="btn-secondary text-xs py-1.5 px-2">
                    <Users size={13} /> Assign
                  </button>
                  <button type="button" title="Edit" onClick={() => onEdit(p)} className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50">
                    <Pencil size={15} />
                  </button>
                </div>
              </div>

              {(p.assignments || []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.assignments.map((a) => (
                    <span key={a.id} className="inline-flex items-center gap-1 text-[10px] bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 text-slate-600">
                      {assignmentLabel(a)}
                      <button type="button" disabled={removeAssignmentPending} onClick={() => onRemoveAssignment(p, a)} className="text-slate-400 hover:text-red-500 ml-0.5">
                        <Trash2 size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function assignmentLabel(a) {
  if (a.employee) return `Employee: ${a.employee.first_name} ${a.employee.last_name}`;
  if (a.department) return `Dept: ${a.department.name}`;
  if (a.designation) return `Designation: ${a.designation.name}`;
  if (a.employment_type) return `Type: ${a.employment_type.replace(/_/g, ' ')}`;
  return 'All employees';
}
