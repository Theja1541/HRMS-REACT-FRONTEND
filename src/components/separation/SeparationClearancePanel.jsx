import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Check, MessageSquare, X } from 'lucide-react';
import { hrApi } from '../../api';
import {
  CLEARANCE_CATEGORY_LABELS,
  CLEARANCE_ITEM_STATUSES,
  CLEARANCE_ITEM_STATUS_LABELS,
  CLEARANCE_STATUSES,
} from '../../constants/hr';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../utils/helpers';

const TERMINAL_ITEM_STATUSES = ['completed', 'waived', 'not_applicable'];
const LOCKED_CLEARANCE_STATUSES = ['completed', 'cancelled'];
const HR_ADMIN_ROLES = ['super_admin', 'owner', 'hr'];

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy, h:mm a');
  } catch {
    return value;
  }
}

function formatPerson(user) {
  if (!user) return '—';
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return name || user.emp_code || '—';
}

function formatCategory(category) {
  return CLEARANCE_CATEGORY_LABELS[category] || category || '—';
}

function formatItemRemarks(item) {
  const text = item.remarks?.trim() || item.waiver_reason?.trim();
  return text || '—';
}

function apiErrorMessage(err, fallback) {
  return err?.response?.data?.error?.message || fallback;
}

function canActOnItem(item, clearance) {
  return (
    clearance &&
    !LOCKED_CLEARANCE_STATUSES.includes(clearance.status) &&
    !TERMINAL_ITEM_STATUSES.includes(item.status)
  );
}

function canEditRemarks(clearance) {
  return clearance && !LOCKED_CLEARANCE_STATUSES.includes(clearance.status);
}

function ActionModal({ title, subtitle, children, onClose, isPending }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close" disabled={isPending} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

export default function SeparationClearancePanel({ separationRequestId, enabled = true }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canManage = HR_ADMIN_ROLES.includes(user?.role);

  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [remarksTarget, setRemarksTarget] = useState(null);
  const [approveRemarks, setApproveRemarks] = useState('');
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [remarksText, setRemarksText] = useState('');
  const [modalError, setModalError] = useState('');

  const { data: clearanceData, isLoading: clearanceLoading } = useQuery({
    queryKey: ['separation-clearance', separationRequestId],
    queryFn: () =>
      hrApi.listSeparationClearances({ separation_request_id: separationRequestId, limit: 1 }),
    enabled: enabled && !!separationRequestId,
  });

  const clearance = clearanceData?.data?.clearances?.[0] || null;

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['separation-clearance-items', clearance?.id],
    queryFn: () => hrApi.listSeparationClearanceItems(clearance.id),
    enabled: enabled && !!clearance?.id,
  });

  const invalidateClearance = () => {
    if (clearance?.id) {
      queryClient.invalidateQueries({ queryKey: ['separation-clearance-items', clearance.id] });
    }
    queryClient.invalidateQueries({ queryKey: ['separation-clearance', separationRequestId] });
  };

  const approveMutation = useMutation({
    mutationFn: ({ itemId, remarks }) =>
      hrApi.approveSeparationClearanceItem(clearance.id, itemId, remarks ? { remarks } : {}),
    onSuccess: () => {
      invalidateClearance();
      closeApproveModal();
    },
    onError: (err) => setModalError(apiErrorMessage(err, 'Failed to approve clearance item')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ itemId, remarks }) =>
      hrApi.rejectSeparationClearanceItem(clearance.id, itemId, { remarks }),
    onSuccess: () => {
      invalidateClearance();
      closeRejectModal();
    },
    onError: (err) => setModalError(apiErrorMessage(err, 'Failed to reject clearance item')),
  });

  const remarksMutation = useMutation({
    mutationFn: ({ itemId, remarks }) =>
      hrApi.updateSeparationClearanceItemRemarks(clearance.id, itemId, { remarks }),
    onSuccess: () => {
      invalidateClearance();
      closeRemarksModal();
    },
    onError: (err) => setModalError(apiErrorMessage(err, 'Failed to update remarks')),
  });

  const actionPending =
    approveMutation.isPending || rejectMutation.isPending || remarksMutation.isPending;

  const closeApproveModal = () => {
    if (actionPending) return;
    setApproveTarget(null);
    setApproveRemarks('');
    setModalError('');
  };

  const closeRejectModal = () => {
    if (actionPending) return;
    setRejectTarget(null);
    setRejectRemarks('');
    setModalError('');
  };

  const closeRemarksModal = () => {
    if (actionPending) return;
    setRemarksTarget(null);
    setRemarksText('');
    setModalError('');
  };

  const openApprove = (item) => {
    setApproveTarget(item);
    setApproveRemarks('');
    setModalError('');
  };

  const openReject = (item) => {
    setRejectTarget(item);
    setRejectRemarks('');
    setModalError('');
  };

  const openRemarks = (item) => {
    setRemarksTarget(item);
    setRemarksText(item.remarks?.trim() || '');
    setModalError('');
  };

  if (clearanceLoading) {
    return <p className="text-center text-slate-400 py-12 text-sm">Loading clearance…</p>;
  }

  if (!clearance) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
        <p className="text-sm font-medium text-slate-700">Clearance not started</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Approve the separation request to auto-create the exit clearance checklist.
        </p>
      </div>
    );
  }

  const progress = itemsData?.data?.progress || clearance.progress || {};
  const items = itemsData?.data?.items || [];
  const pct = progress.completion_percentage ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">Clearance status</p>
          <span
            className={cn(
              'inline-flex mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
              CLEARANCE_STATUSES[clearance.status]
            )}
          >
            {clearance.status?.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-brand-600">{pct}%</p>
          <p className="text-[10px] text-slate-400">
            {progress.completed_tasks ?? 0}/{progress.total_tasks ?? 0} tasks done
          </p>
        </div>
      </div>

      <div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex flex-wrap gap-4 mt-2 text-[10px] text-slate-500">
          <span>{progress.pending_tasks ?? 0} pending</span>
          <span>{progress.rejected_tasks ?? 0} rejected</span>
        </div>
      </div>

      {itemsLoading ? (
        <p className="text-center text-slate-400 py-8 text-sm">Loading tasks…</p>
      ) : items.length === 0 ? (
        <p className="text-center text-slate-400 py-8 text-sm">No clearance tasks</p>
      ) : (
        <div className="overflow-x-auto overscroll-x-contain border border-slate-200 rounded-xl">
          <table className="w-full text-xs min-w-[820px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Task</th>
                <th className="text-left px-4 py-3 font-semibold">Department</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Approved By</th>
                <th className="text-left px-4 py-3 font-semibold">Approved At</th>
                <th className="text-left px-4 py-3 font-semibold">Remarks</th>
                {canManage && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const actionable = canActOnItem(item, clearance);
                const remarksEditable = canEditRemarks(clearance);

                return (
                  <tr key={item.id} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{item.title}</p>
                      {item.description && (
                        <p className="text-slate-400 mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatCategory(item.category)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          CLEARANCE_ITEM_STATUSES[item.status]
                        )}
                      >
                        {CLEARANCE_ITEM_STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatPerson(item.approver)}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDateTime(item.approved_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[220px]">
                      <p className="whitespace-pre-wrap break-words">{formatItemRemarks(item)}</p>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1 flex-wrap">
                          {actionable && (
                            <>
                              <button
                                type="button"
                                disabled={actionPending}
                                onClick={() => openApprove(item)}
                                className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                title="Approve clearance item"
                              >
                                <Check size={12} /> Approve
                              </button>
                              <button
                                type="button"
                                disabled={actionPending}
                                onClick={() => openReject(item)}
                                className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                title="Reject clearance item"
                              >
                                <X size={12} /> Reject
                              </button>
                            </>
                          )}
                          {remarksEditable && (
                            <button
                              type="button"
                              disabled={actionPending}
                              onClick={() => openRemarks(item)}
                              className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1"
                              title="Add or edit remarks"
                            >
                              <MessageSquare size={12} /> Remarks
                            </button>
                          )}
                          {!actionable && !remarksEditable && (
                            <span className="text-slate-300 text-[10px]">—</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {approveTarget && (
        <ActionModal
          title="Approve Clearance Item"
          subtitle={approveTarget.title}
          onClose={closeApproveModal}
          isPending={approveMutation.isPending}
        >
          <form
            className="p-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setModalError('');
              approveMutation.mutate({
                itemId: approveTarget.id,
                remarks: approveRemarks.trim() || undefined,
              });
            }}
          >
            <div>
              <label className="text-xs font-medium text-slate-600">Remarks (optional)</label>
              <textarea
                rows={3}
                value={approveRemarks}
                onChange={(e) => setApproveRemarks(e.target.value)}
                placeholder="Add approval notes…"
                maxLength={2000}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            {modalError && <p className="text-sm text-red-600">{modalError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeApproveModal} disabled={approveMutation.isPending} className="btn-secondary text-xs">
                Cancel
              </button>
              <button type="submit" disabled={approveMutation.isPending} className="btn-primary text-xs">
                {approveMutation.isPending ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </form>
        </ActionModal>
      )}

      {rejectTarget && (
        <ActionModal
          title="Reject Clearance Item"
          subtitle={rejectTarget.title}
          onClose={closeRejectModal}
          isPending={rejectMutation.isPending}
        >
          <form
            className="p-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setModalError('');
              const trimmed = rejectRemarks.trim();
              if (trimmed.length < 3) {
                setModalError('Rejection remarks must be at least 3 characters');
                return;
              }
              rejectMutation.mutate({ itemId: rejectTarget.id, remarks: trimmed });
            }}
          >
            <div>
              <label className="text-xs font-medium text-slate-600">Rejection remarks *</label>
              <textarea
                rows={3}
                required
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                placeholder="Explain why this clearance item is rejected…"
                maxLength={2000}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
              <p className="text-[10px] text-slate-400 mt-1">Minimum 3 characters</p>
            </div>
            {modalError && <p className="text-sm text-red-600">{modalError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeRejectModal} disabled={rejectMutation.isPending} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                type="submit"
                disabled={rejectMutation.isPending}
                className="btn-primary text-xs bg-red-600 hover:bg-red-700 border-red-600"
              >
                {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </form>
        </ActionModal>
      )}

      {remarksTarget && (
        <ActionModal
          title="Update Remarks"
          subtitle={remarksTarget.title}
          onClose={closeRemarksModal}
          isPending={remarksMutation.isPending}
        >
          <form
            className="p-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setModalError('');
              const trimmed = remarksText.trim();
              if (!trimmed) {
                setModalError('Remarks cannot be empty');
                return;
              }
              remarksMutation.mutate({ itemId: remarksTarget.id, remarks: trimmed });
            }}
          >
            <div>
              <label className="text-xs font-medium text-slate-600">Remarks *</label>
              <textarea
                rows={3}
                required
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
                placeholder="Add notes for this clearance item…"
                maxLength={2000}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            {modalError && <p className="text-sm text-red-600">{modalError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeRemarksModal} disabled={remarksMutation.isPending} className="btn-secondary text-xs">
                Cancel
              </button>
              <button type="submit" disabled={remarksMutation.isPending} className="btn-primary text-xs">
                {remarksMutation.isPending ? 'Saving…' : 'Save Remarks'}
              </button>
            </div>
          </form>
        </ActionModal>
      )}
    </div>
  );
}
