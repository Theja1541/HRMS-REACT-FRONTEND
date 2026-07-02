import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { X, Clock, User } from 'lucide-react';
import { resignationApi } from '../../api';
import NoticeSettlementSummary from './NoticeSettlementSummary';
import { Avatar } from '../shared/StatusBadge';
import {
  RESIGNATION_STATUS,
  RESIGNATION_STATUS_LABELS,
  RESIGNATION_HISTORY_ACTION_LABELS,
} from '../../constants/hr';
import { cn } from '../../utils/helpers';

function formatHistoryActor(entry) {
  if (entry.approver_name) return entry.approver_name;
  if (entry.approver?.first_name || entry.approver?.last_name) {
    return `${entry.approver.first_name || ''} ${entry.approver.last_name || ''}`.trim();
  }
  if (entry.approver_type === 'super_admin') return 'Super Admin';
  return 'Unknown';
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy, h:mm a');
  } catch {
    return value;
  }
}

export default function ResignationDetailDrawer({ requestId, onClose }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['resignation', requestId],
    queryFn: () => resignationApi.get(requestId),
    enabled: !!requestId,
  });

  const request = data?.data?.request;
  const history = request?.approvalHistory || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white w-full max-w-lg h-full shadow-xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Resignation Details</h2>
            {request && (
              <p className="text-xs text-slate-500 mt-0.5">
                {request.employee?.first_name} {request.employee?.last_name} · #{request.id}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <p className="text-center text-slate-400 py-12">Loading…</p>
          ) : error ? (
            <p className="text-center text-red-500 py-12">Failed to load resignation details</p>
          ) : !request ? (
            <p className="text-center text-slate-400 py-12">Not found</p>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <Avatar
                  name={`${request.employee?.first_name || ''} ${request.employee?.last_name || ''}`}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">
                    {request.employee?.first_name} {request.employee?.last_name}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">{request.employee?.emp_code}</p>
                  <p className="text-xs text-slate-500 mt-1">{request.employee?.department?.name || '—'}</p>
                  <span
                    className={cn(
                      'inline-flex mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      RESIGNATION_STATUS[request.status]
                    )}
                  >
                    {RESIGNATION_STATUS_LABELS[request.status] || request.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-400 uppercase text-[10px]">Resignation Date</p>
                  <p className="font-medium text-slate-800 mt-1">{formatDate(request.resignation_date)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-400 uppercase text-[10px]">Expected LWD</p>
                  <p className="font-medium text-slate-800 mt-1">
                    {formatDate(request.expected_last_working_date)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-400 uppercase text-[10px]">Requested LWD</p>
                  <p className="font-medium text-slate-800 mt-1">
                    {formatDate(request.requested_last_working_date)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-400 uppercase text-[10px]">Confirmed LWD</p>
                  <p className="font-medium text-slate-800 mt-1">
                    {formatDate(request.last_working_date || request.requested_last_working_date)}
                    {request.is_early_lwd && (
                      <span className="ml-1 text-[10px] font-semibold text-amber-700">Early</span>
                    )}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-400 uppercase text-[10px]">Notice Period</p>
                  <p className="font-medium text-slate-800 mt-1">{request.notice_period_days ?? '—'} days</p>
                </div>
              </div>

              <NoticeSettlementSummary
                settlement={request}
                buyoutStatus={request.notice_buyout_status}
              />

              {request.reason && (
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1">Reason</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{request.reason}</p>
                </div>
              )}

              {request.handover_notes && (
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1">Handover Notes</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{request.handover_notes}</p>
                </div>
              )}

              {request.rejection_note && (
                <div>
                  <p className="text-xs font-medium text-red-600 mb-1">Rejection Note</p>
                  <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3 border border-red-100">
                    {request.rejection_note}
                  </p>
                </div>
              )}

              {request.withdrawal_reason && (
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1">Withdrawal Reason</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{request.withdrawal_reason}</p>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                  <Clock size={14} /> Approval History
                </h3>
                {history.length === 0 ? (
                  <p className="text-xs text-slate-400">No history recorded</p>
                ) : (
                  <ol className="space-y-3">
                    {history.map((entry) => (
                      <li key={entry.id} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          <User size={12} className="text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0 border-l-2 border-slate-100 pl-3 pb-1">
                          <p className="text-xs font-medium text-slate-800">
                            {RESIGNATION_HISTORY_ACTION_LABELS[entry.action] || entry.action}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {formatHistoryActor(entry)}
                            {' · '}
                            {formatDateTime(entry.action_date)}
                          </p>
                          {entry.comments && (
                            <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded p-2">{entry.comments}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
