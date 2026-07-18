import { useQuery } from '@tanstack/react-query';
import { X, Check, Ban, MessageCircle, Info } from 'lucide-react';
import { leaveApi } from '../../api';
import { Avatar } from '../shared/StatusBadge';
import { LEAVE_STATUS } from '../../constants/hr';
import { cn } from '../../utils/helpers';
import { format, parseISO } from 'date-fns';

const DAY_TYPE_LABELS = {
  working: 'Working',
  weekend: 'Weekend',
  holiday: 'Holiday',
};

const ACTION_META = {
  approved: { label: 'Approved', icon: Check, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', icon: Ban, className: 'bg-red-50 text-red-700 border-red-200' },
  info_requested: { label: 'Info requested', icon: MessageCircle, className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

function formatDateTime(value) {
  if (!value) return '—';
  return format(parseISO(value), 'dd MMM yyyy · HH:mm');
}

function DetailField({ label, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-slate-400 font-medium">{label}</p>
      <div className="mt-1 text-sm text-slate-700">{children}</div>
    </div>
  );
}

export default function LeaveRequestDetailDrawer({ requestId, onClose }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['leave-request', requestId],
    queryFn: () => leaveApi.getRequest(requestId),
    enabled: !!requestId,
  });

  if (!requestId) return null;

  const request = data?.data?.request;
  const dayCalc = request?.policy_snapshot?.day_calculation;
  const history = [...(request?.approvalHistory || [])].sort(
    (a, b) => new Date(a.action_date) - new Date(b.action_date)
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-lg bg-white shadow-xl h-full overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            {isLoading ? (
              <h2 className="text-lg font-semibold text-slate-900">Loading request…</h2>
            ) : request ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Avatar
                    name={`${request.employee?.first_name} ${request.employee?.last_name}`}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {request.employee?.first_name} {request.employee?.last_name}
                    </p>
                    {request.employee?.emp_code && (
                      <p className="text-[10px] font-mono text-slate-400">{request.employee.emp_code}</p>
                    )}
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-slate-900 leading-tight">
                  {request.leaveType?.name || request.leave_type}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {format(parseISO(request.from_date), 'dd MMM yyyy')}
                  {request.from_date !== request.to_date &&
                    ` – ${format(parseISO(request.to_date), 'dd MMM yyyy')}`}
                </p>
              </>
            ) : (
              <h2 className="text-lg font-semibold text-slate-900">Leave request</h2>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <p className="p-8 text-center text-slate-400 text-sm">Loading…</p>
        ) : error || !request ? (
          <p className="p-8 text-center text-red-500 text-sm">
            {error?.response?.data?.error?.message || 'Failed to load leave request'}
          </p>
        ) : (
          <div className="flex-1 p-5 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'text-[10px] px-2.5 py-1 rounded-full font-semibold capitalize',
                  LEAVE_STATUS[request.status]
                )}
              >
                {request.status}
              </span>
              {request.is_half_day && (
                <span className="text-[10px] px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-600">
                  Half day
                </span>
              )}
            </div>

            {request.status === 'rejected' && request.rejection_note && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3">
                <p className="text-[10px] uppercase font-semibold text-red-700">Rejection note</p>
                <p className="text-sm text-red-800 mt-1">{request.rejection_note}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Days">{request.days}</DetailField>
              <DetailField label="Applied on">{formatDateTime(request.applied_on)}</DetailField>
              {request.approved_at && (
                <DetailField label={request.status === 'rejected' ? 'Decided on' : 'Approved on'}>
                  {formatDateTime(request.approved_at)}
                </DetailField>
              )}
              {request.approver && (
                <DetailField label="Decided by">
                  {request.approver.first_name} {request.approver.last_name}
                </DetailField>
              )}
              {request.cancelled_on && (
                <DetailField label="Cancelled on">{formatDateTime(request.cancelled_on)}</DetailField>
              )}
            </div>

            {request.reason && (
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-medium">Reason</p>
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{request.reason}</p>
              </div>
            )}

            {request.policy_snapshot && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Info size={14} className="text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-800">Policy at time of apply</h3>
                </div>
                <p className="text-xs text-slate-600">{request.policy_snapshot.policy_name}</p>
                {request.policy_snapshot.approval_levels && (
                  <ApprovalChainProgress
                    levels={request.policy_snapshot.approval_levels}
                    status={request.status}
                    history={history}
                    approvalStep={request.policy_snapshot.approval_step}
                  />
                )}
                {dayCalc && (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex justify-between text-xs">
                      <span className="font-medium text-slate-700">Day calculation</span>
                      <span className="text-slate-600">
                        {dayCalc.totalDays} day{parseFloat(dayCalc.totalDays) === 1 ? '' : 's'}
                        {dayCalc.sandwichRuleEnabled ? ' · sandwich rule' : ''}
                      </span>
                    </div>
                    {dayCalc.breakdown?.length > 0 ? (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-slate-500 border-b border-slate-100">
                            <th className="px-3 py-2 font-medium">Date</th>
                            <th className="px-3 py-2 font-medium">Type</th>
                            <th className="px-3 py-2 font-medium text-right">Counted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {dayCalc.breakdown.map((row) => (
                            <tr key={row.date}>
                              <td className="px-3 py-2 text-slate-700">
                                {format(parseISO(row.date), 'dd MMM yyyy')}
                              </td>
                              <td className="px-3 py-2 text-slate-500">
                                {DAY_TYPE_LABELS[row.type] || row.type}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-slate-700">
                                {row.counted > 0 ? row.counted : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="px-3 py-3 text-xs text-slate-400">No day breakdown available.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Approval history</h3>
              {history.length === 0 ? (
                <p className="text-xs text-slate-400">No approval actions yet.</p>
              ) : (
                <ul className="space-y-3">
                  {history.map((entry) => {
                    const meta = ACTION_META[entry.action] || ACTION_META.approved;
                    const Icon = meta.icon;
                    const approverName = entry.approver
                      ? `${entry.approver.first_name} ${entry.approver.last_name}`
                      : 'Unknown';
                    return (
                      <li
                        key={entry.id}
                        className={cn('rounded-lg border px-3 py-3', meta.className)}
                      >
                        <div className="flex items-start gap-2">
                          <Icon size={14} className="shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold">
                              {meta.label} by {approverName}
                            </p>
                            <p className="text-[10px] opacity-80 mt-0.5">
                              {formatDateTime(entry.action_date)}
                            </p>
                            {entry.comments && (
                              <p className="text-xs mt-2 whitespace-pre-wrap">{entry.comments}</p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovalChainProgress({ levels, status, history, approvalStep }) {
  const managerApproved = history.some((h) => h.action === 'approved');
  const fullyApproved = status === 'approved';
  const rejected = status === 'rejected';

  let steps = [];
  if (levels === 'manager_hr') {
    steps = [
      { key: 'apply', label: 'Applied', done: true },
      {
        key: 'manager',
        label: 'Manager',
        done: managerApproved || fullyApproved,
        current: status === 'pending' && !managerApproved && approvalStep !== 'hr',
      },
      {
        key: 'hr',
        label: 'HR/Admin',
        done: fullyApproved,
        current: status === 'pending' && (managerApproved || approvalStep === 'hr'),
      },
    ];
  } else if (levels === 'single') {
    steps = [
      { key: 'apply', label: 'Applied', done: true },
      {
        key: 'hr',
        label: 'HR/Admin',
        done: fullyApproved,
        current: status === 'pending',
      },
    ];
  } else {
    steps = [
      { key: 'apply', label: 'Applied', done: true },
      {
        key: 'manager',
        label: 'Manager',
        done: fullyApproved,
        current: status === 'pending',
      },
    ];
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[10px] uppercase font-semibold text-slate-500 mb-2">Approval chain</p>
      <ol className="flex flex-wrap items-center gap-2">
        {steps.map((step, index) => (
          <li key={step.key} className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border',
                rejected && step.current
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : step.done
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : step.current
                      ? 'bg-brand-50 text-brand-700 border-brand-200'
                      : 'bg-white text-slate-400 border-slate-200'
              )}
            >
              <span className="w-4 h-4 rounded-full bg-current/10 text-[9px] inline-flex items-center justify-center">
                {index + 1}
              </span>
              {step.label}
              {step.current && status === 'pending' ? ' · awaiting' : ''}
            </span>
            {index < steps.length - 1 && <span className="text-slate-300">→</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
