import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  Check,
  ChevronDown,
  ChevronRight,
  History,
  MessageSquare,
  Paperclip,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import { hrApi } from '../../api';
import {
  CLEARANCE_DEPARTMENT_LABELS,
  CLEARANCE_DEPARTMENTS,
  CLEARANCE_HISTORY_ACTION_LABELS,
  CLEARANCE_ITEM_STATUS_LABELS,
  CLEARANCE_ITEM_STATUSES,
  CLEARANCE_STATUSES,
} from '../../constants/hr';
import { useAuthStore } from '../../store/auth.store';
import { cn, localDateString } from '../../utils/helpers';
import { resolvePortalRole } from '../../utils/portalContext';

const TERMINAL_ITEM_STATUSES = ['completed', 'waived', 'not_applicable'];
const LOCKED_CLEARANCE_STATUSES = ['completed', 'cancelled'];
const HR_ADMIN_ROLES = ['super_admin', 'owner', 'hr', 'admin'];

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

function formatPerson(user) {
  if (!user) return '—';
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return name || user.emp_code || '—';
}

function apiErrorMessage(err, fallback) {
  return err?.response?.data?.error?.message || fallback;
}

function canActOnItem(item, clearance, user, role) {
  if (!clearance || LOCKED_CLEARANCE_STATUSES.includes(clearance.status)) return false;
  if (TERMINAL_ITEM_STATUSES.includes(item.status)) return false;
  if (HR_ADMIN_ROLES.includes(role)) return true;
  return item.assigned_to === user?.id;
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

function DeptProgressPills({ departmentProgress }) {
  if (!departmentProgress) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {CLEARANCE_DEPARTMENTS.map((dept) => {
        const stats = departmentProgress[dept] || { total: 0, completed: 0, pending: 0, rejected: 0 };
        if (!stats.total) return null;
        const done = stats.completed === stats.total && stats.rejected === 0;
        return (
          <span
            key={dept}
            className={cn(
              'text-[10px] font-semibold px-2 py-1 rounded-full',
              done
                ? 'bg-emerald-50 text-emerald-700'
                : stats.rejected
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-600'
            )}
          >
            {CLEARANCE_DEPARTMENT_LABELS[dept]} {stats.completed}/{stats.total}
          </span>
        );
      })}
    </div>
  );
}

export default function SeparationClearancePanel({ separationRequestId, enabled = true }) {
  const queryClient = useQueryClient();
  const { user, workspace, roles, selectedRole, accessToken } = useAuthStore();
  const role = resolvePortalRole({ accessToken, workspace, user, roles, selectedRole });
  const isHr = HR_ADMIN_ROLES.includes(role);

  const [expandedDepts, setExpandedDepts] = useState(() => new Set(CLEARANCE_DEPARTMENTS));
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [remarksTarget, setRemarksTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [approveRemarks, setApproveRemarks] = useState('');
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [remarksText, setRemarksText] = useState('');
  const [assignForm, setAssignForm] = useState({ assigned_to: '', due_date: '' });
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

  const { data: empData } = useQuery({
    queryKey: ['separation-eligible-employees'],
    queryFn: () => hrApi.listSeparationEligibleEmployees({ limit: 500 }),
    enabled: enabled && isHr,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['clearance-item-history', clearance?.id, historyTarget?.id],
    queryFn: () => hrApi.getSeparationClearanceItemHistory(clearance.id, historyTarget.id),
    enabled: !!clearance?.id && !!historyTarget?.id,
  });

  const invalidateClearance = () => {
    if (clearance?.id) {
      queryClient.invalidateQueries({ queryKey: ['separation-clearance-items', clearance.id] });
    }
    queryClient.invalidateQueries({ queryKey: ['separation-clearance', separationRequestId] });
    queryClient.invalidateQueries({ queryKey: ['separation-clearances'] });
  };

  const approveMutation = useMutation({
    mutationFn: ({ itemId, remarks }) =>
      hrApi.approveSeparationClearanceItem(clearance.id, itemId, remarks ? { remarks } : {}),
    onSuccess: () => {
      invalidateClearance();
      setApproveTarget(null);
      setApproveRemarks('');
      setModalError('');
    },
    onError: (err) => setModalError(apiErrorMessage(err, 'Failed to approve')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ itemId, remarks }) =>
      hrApi.rejectSeparationClearanceItem(clearance.id, itemId, { remarks }),
    onSuccess: () => {
      invalidateClearance();
      setRejectTarget(null);
      setRejectRemarks('');
      setModalError('');
    },
    onError: (err) => setModalError(apiErrorMessage(err, 'Failed to reject')),
  });

  const remarksMutation = useMutation({
    mutationFn: ({ itemId, remarks }) =>
      hrApi.updateSeparationClearanceItemRemarks(clearance.id, itemId, { remarks }),
    onSuccess: () => {
      invalidateClearance();
      setRemarksTarget(null);
      setRemarksText('');
      setModalError('');
    },
    onError: (err) => setModalError(apiErrorMessage(err, 'Failed to update remarks')),
  });

  const assignMutation = useMutation({
    mutationFn: ({ itemId, ...payload }) =>
      hrApi.updateSeparationClearanceItemAssignment(clearance.id, itemId, payload),
    onSuccess: () => {
      invalidateClearance();
      setAssignTarget(null);
      setModalError('');
    },
    onError: (err) => setModalError(apiErrorMessage(err, 'Failed to update assignment')),
  });

  const reattemptMutation = useMutation({
    mutationFn: (itemId) => hrApi.reattemptSeparationClearanceItem(clearance.id, itemId, {}),
    onSuccess: invalidateClearance,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ itemId, file }) => {
      const fd = new FormData();
      fd.append('file', file);
      return hrApi.uploadSeparationClearanceAttachment(clearance.id, itemId, fd);
    },
    onSuccess: invalidateClearance,
    onError: (err) => window.alert(apiErrorMessage(err, 'Upload failed')),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: ({ itemId, attachmentId }) =>
      hrApi.deleteSeparationClearanceAttachment(clearance.id, itemId, attachmentId),
    onSuccess: invalidateClearance,
  });

  const actionPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    remarksMutation.isPending ||
    assignMutation.isPending;

  const progress = itemsData?.data?.progress || clearance?.progress || {};
  const departmentProgress = itemsData?.data?.department_progress || {};
  const items = itemsData?.data?.items || [];
  const employees = empData?.data?.employees || [];
  const pct = progress.completion_percentage ?? 0;

  const itemsByDept = useMemo(() => {
    const map = {};
    for (const dept of CLEARANCE_DEPARTMENTS) map[dept] = [];
    for (const item of items) {
      const dept = CLEARANCE_DEPARTMENTS.includes(item.department) ? item.department : 'hr';
      map[dept].push(item);
    }
    return map;
  }, [items]);

  const toggleDept = (dept) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  if (clearanceLoading) {
    return <p className="text-center text-slate-400 py-12 text-sm">Loading clearance…</p>;
  }

  if (!clearance) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
        <p className="text-sm font-medium text-slate-700">Clearance not started</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Approve the separation request to auto-create the department-wise exit clearance checklist.
        </p>
      </div>
    );
  }

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
          <p className="text-[10px] text-slate-400 mt-2">
            Separation cannot complete until all mandatory department clearances are approved.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-brand-600">{pct}%</p>
          <p className="text-[10px] text-slate-400">
            {progress.completed_tasks ?? 0}/{progress.total_tasks ?? 0} approved
          </p>
        </div>
      </div>

      <div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3">
          <DeptProgressPills departmentProgress={departmentProgress} />
        </div>
      </div>

      {itemsLoading ? (
        <p className="text-center text-slate-400 py-8 text-sm">Loading department tasks…</p>
      ) : items.length === 0 ? (
        <p className="text-center text-slate-400 py-8 text-sm">No clearance tasks</p>
      ) : (
        <div className="space-y-3">
          {CLEARANCE_DEPARTMENTS.map((dept) => {
            const deptItems = itemsByDept[dept] || [];
            if (!deptItems.length) return null;
            const expanded = expandedDepts.has(dept);
            const stats = departmentProgress[dept] || {};

            return (
              <div key={dept} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleDept(dept)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-left"
                >
                  <div className="flex items-center gap-2">
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="text-xs font-semibold text-slate-800">
                      {CLEARANCE_DEPARTMENT_LABELS[dept]}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {stats.completed || 0}/{stats.total || deptItems.length} approved
                      {stats.rejected ? ` · ${stats.rejected} rejected` : ''}
                    </span>
                  </div>
                </button>

                {expanded && (
                  <ul className="divide-y divide-slate-100">
                    {deptItems.map((item) => {
                      const actionable = canActOnItem(item, clearance, user, role);
                      const overdue =
                        item.due_date &&
                        !TERMINAL_ITEM_STATUSES.includes(item.status) &&
                        item.due_date < localDateString();

                      return (
                        <li key={item.id} className="p-4 space-y-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xs font-medium text-slate-800">{item.title}</p>
                                {item.is_mandatory && (
                                  <span className="text-[9px] font-semibold uppercase text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                    Mandatory
                                  </span>
                                )}
                                {item.escalated_at && (
                                  <span className="text-[9px] font-semibold uppercase text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">
                                    Escalated
                                  </span>
                                )}
                                {item.sla_breached_at && (
                                  <span className="text-[9px] font-semibold uppercase text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                                    SLA breached
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                    CLEARANCE_ITEM_STATUSES[item.status]
                                  )}
                                >
                                  {CLEARANCE_ITEM_STATUS_LABELS[item.status] || item.status}
                                </span>
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                              )}
                              <p className="text-[10px] text-slate-400 mt-1">
                                Assignee: {formatPerson(item.assignee)} · Due:{' '}
                                <span className={overdue ? 'text-red-600 font-semibold' : ''}>
                                  {formatDate(item.due_date)}
                                </span>
                                {item.approver && (
                                  <> · Approved by {formatPerson(item.approver)}</>
                                )}
                              </p>
                              {(item.remarks || item.waiver_reason) && (
                                <p className="text-[11px] text-slate-600 mt-1 bg-slate-50 rounded-lg px-2 py-1.5">
                                  {item.remarks || item.waiver_reason}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1 justify-end">
                              {actionable && (
                                <>
                                  <button
                                    type="button"
                                    disabled={actionPending}
                                    onClick={() => {
                                      setApproveTarget(item);
                                      setApproveRemarks('');
                                      setModalError('');
                                    }}
                                    className="btn-secondary text-[10px] py-1 text-emerald-700 border-emerald-200"
                                  >
                                    <Check size={12} /> Approve
                                  </button>
                                  <button
                                    type="button"
                                    disabled={actionPending}
                                    onClick={() => {
                                      setRejectTarget(item);
                                      setRejectRemarks('');
                                      setModalError('');
                                    }}
                                    className="btn-secondary text-[10px] py-1 text-red-600 border-red-200"
                                  >
                                    <X size={12} /> Reject
                                  </button>
                                </>
                              )}
                              {isHr && item.status === 'waived' && (
                                <button
                                  type="button"
                                  className="btn-secondary text-[10px] py-1"
                                  onClick={() => reattemptMutation.mutate(item.id)}
                                >
                                  <RotateCcw size={12} /> Re-open
                                </button>
                              )}
                              {!LOCKED_CLEARANCE_STATUSES.includes(clearance.status) &&
                                (isHr || item.assigned_to === user?.id) && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn-secondary text-[10px] py-1"
                                      onClick={() => {
                                        setRemarksTarget(item);
                                        setRemarksText(item.remarks || '');
                                        setModalError('');
                                      }}
                                    >
                                      <MessageSquare size={12} /> Remarks
                                    </button>
                                    <label className="btn-secondary text-[10px] py-1 cursor-pointer inline-flex items-center gap-1">
                                      <Upload size={12} /> Attach
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) uploadMutation.mutate({ itemId: item.id, file });
                                          e.target.value = '';
                                        }}
                                      />
                                    </label>
                                  </>
                                )}
                              {isHr && !LOCKED_CLEARANCE_STATUSES.includes(clearance.status) && (
                                <button
                                  type="button"
                                  className="btn-secondary text-[10px] py-1"
                                  onClick={() => {
                                    setAssignTarget(item);
                                    setAssignForm({
                                      assigned_to: item.assigned_to ? String(item.assigned_to) : '',
                                      due_date: item.due_date || '',
                                    });
                                    setModalError('');
                                  }}
                                >
                                  Assign / Due
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn-secondary text-[10px] py-1"
                                onClick={() => setHistoryTarget(item)}
                              >
                                <History size={12} /> History
                              </button>
                            </div>
                          </div>

                          {item.attachments?.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {item.attachments.map((att) => (
                                <span
                                  key={att.id}
                                  className="inline-flex items-center gap-1 text-[10px] bg-slate-50 border border-slate-100 rounded-lg px-2 py-1"
                                >
                                  <Paperclip size={10} className="text-slate-400" />
                                  <a
                                    href={att.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-brand-600 hover:underline truncate max-w-[140px]"
                                  >
                                    {att.file_name}
                                  </a>
                                  {(isHr || att.uploaded_by === user?.id) &&
                                    !LOCKED_CLEARANCE_STATUSES.includes(clearance.status) && (
                                      <button
                                        type="button"
                                        className="text-red-500"
                                        onClick={() =>
                                          deleteAttachmentMutation.mutate({
                                            itemId: item.id,
                                            attachmentId: att.id,
                                          })
                                        }
                                      >
                                        <X size={10} />
                                      </button>
                                    )}
                                </span>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {approveTarget && (
        <ActionModal
          title="Approve clearance"
          subtitle={approveTarget.title}
          onClose={() => !actionPending && setApproveTarget(null)}
          isPending={actionPending}
        >
          <div className="p-5 space-y-3">
            <textarea
              className="input text-xs min-h-[80px]"
              placeholder="Remarks (optional)"
              value={approveRemarks}
              onChange={(e) => setApproveRemarks(e.target.value)}
            />
            {modalError && <p className="text-xs text-red-600">{modalError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={() => setApproveTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary text-xs"
                disabled={actionPending}
                onClick={() =>
                  approveMutation.mutate({
                    itemId: approveTarget.id,
                    remarks: approveRemarks.trim() || undefined,
                  })
                }
              >
                Approve
              </button>
            </div>
          </div>
        </ActionModal>
      )}

      {rejectTarget && (
        <ActionModal
          title="Reject clearance"
          subtitle={rejectTarget.title}
          onClose={() => !actionPending && setRejectTarget(null)}
          isPending={actionPending}
        >
          <div className="p-5 space-y-3">
            <textarea
              className="input text-xs min-h-[80px]"
              placeholder="Rejection reason (required)"
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
            />
            {modalError && <p className="text-xs text-red-600">{modalError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={() => setRejectTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary text-xs bg-red-600 border-red-600"
                disabled={actionPending || rejectRemarks.trim().length < 3}
                onClick={() =>
                  rejectMutation.mutate({ itemId: rejectTarget.id, remarks: rejectRemarks.trim() })
                }
              >
                Reject
              </button>
            </div>
          </div>
        </ActionModal>
      )}

      {remarksTarget && (
        <ActionModal
          title="Update remarks"
          subtitle={remarksTarget.title}
          onClose={() => !actionPending && setRemarksTarget(null)}
          isPending={actionPending}
        >
          <div className="p-5 space-y-3">
            <textarea
              className="input text-xs min-h-[80px]"
              value={remarksText}
              onChange={(e) => setRemarksText(e.target.value)}
            />
            {modalError && <p className="text-xs text-red-600">{modalError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={() => setRemarksTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary text-xs"
                disabled={actionPending || !remarksText.trim()}
                onClick={() =>
                  remarksMutation.mutate({ itemId: remarksTarget.id, remarks: remarksText.trim() })
                }
              >
                Save
              </button>
            </div>
          </div>
        </ActionModal>
      )}

      {assignTarget && (
        <ActionModal
          title="Assignee & due date"
          subtitle={assignTarget.title}
          onClose={() => !actionPending && setAssignTarget(null)}
          isPending={actionPending}
        >
          <div className="p-5 space-y-3">
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-semibold">Assignee</label>
              <select
                className="input text-xs mt-1"
                value={assignForm.assigned_to}
                onChange={(e) => setAssignForm((f) => ({ ...f, assigned_to: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.first_name} {e.last_name} ({e.emp_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-semibold">Due date</label>
              <input
                type="date"
                className="input text-xs mt-1"
                value={assignForm.due_date}
                onChange={(e) => setAssignForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
            {modalError && <p className="text-xs text-red-600">{modalError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={() => setAssignTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary text-xs"
                disabled={actionPending}
                onClick={() =>
                  assignMutation.mutate({
                    itemId: assignTarget.id,
                    assigned_to: assignForm.assigned_to ? Number(assignForm.assigned_to) : null,
                    due_date: assignForm.due_date || null,
                  })
                }
              >
                Save
              </button>
            </div>
          </div>
        </ActionModal>
      )}

      {historyTarget && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setHistoryTarget(null)}
            aria-label="Close"
          />
          <div className="relative bg-white w-full max-w-md h-full shadow-xl flex flex-col">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Approval history</h3>
                <p className="text-xs text-slate-500 mt-0.5">{historyTarget.title}</p>
              </div>
              <button type="button" onClick={() => setHistoryTarget(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {historyLoading ? (
                <p className="text-xs text-slate-400">Loading…</p>
              ) : (historyData?.data?.history || historyTarget.approvalHistory || []).length === 0 ? (
                <p className="text-xs text-slate-400">No history yet</p>
              ) : (
                <ul className="space-y-3">
                  {(historyData?.data?.history || historyTarget.approvalHistory || []).map((h) => (
                    <li key={h.id} className="text-xs border-l-2 border-slate-200 pl-3">
                      <p className="font-semibold text-slate-800">
                        {CLEARANCE_HISTORY_ACTION_LABELS[h.action] || h.action}
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        {formatPerson(h.actor)} · {formatDateTime(h.created_at)}
                      </p>
                      {(h.from_status || h.to_status) && (
                        <p className="text-slate-400 mt-0.5">
                          {h.from_status || '—'} → {h.to_status || '—'}
                        </p>
                      )}
                      {h.remarks && <p className="text-slate-600 mt-1">{h.remarks}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
