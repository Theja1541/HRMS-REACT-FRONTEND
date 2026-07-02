import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { Check, DoorOpen, IndianRupee, Plus, RotateCcw, X } from 'lucide-react';
import { employeeApi, resignationApi } from '../../api';
import ResignationDetailDrawer from '../../components/resignation/ResignationDetailDrawer';
import LwdPolicyHint, { LwdDateField } from '../../components/resignation/LwdPolicyHint';
import NoticeSettlementSummary from '../../components/resignation/NoticeSettlementSummary';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { Avatar } from '../../components/shared/StatusBadge';
import { RESIGNATION_STATUS, RESIGNATION_STATUS_LABELS } from '../../constants/hr';
import { calculateExpectedLwd, isEarlyLwd } from '../../utils/resignationLwd';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { useTablePagination } from '../../hooks/useTablePagination';

const ACTIVE_STATUSES = new Set(['pending_manager', 'pending_hr']);

function formatDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

function SubmitModal({ noticeDays, onClose, onSuccess }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [resignationDate, setResignationDate] = useState(today);
  const [requestedLwd, setRequestedLwd] = useState('');
  const [form, setForm] = useState({
    reason: '',
    handover_notes: '',
  });
  const [error, setError] = useState('');

  const { data: previewData, isLoading: previewLoading } = useQuery({
    queryKey: ['resignation-lwd-preview', resignationDate, requestedLwd],
    queryFn: () =>
      resignationApi.previewLwd({
        resignation_date: resignationDate,
        last_working_date: requestedLwd,
      }),
    enabled: !!resignationDate && !!requestedLwd,
  });

  const preview = previewData?.data?.preview;
  const effectiveNoticeDays = preview?.notice_period_days ?? noticeDays;
  const expectedLwd =
    preview?.expected_last_working_date ??
    calculateExpectedLwd(resignationDate, effectiveNoticeDays);
  const settlement = preview?.settlement;

  useEffect(() => {
    setRequestedLwd((current) => {
      if (!current || (expectedLwd && current < expectedLwd)) return expectedLwd;
      return current;
    });
  }, [expectedLwd]);

  const mutation = useMutation({
    mutationFn: () =>
      resignationApi.submit({
        resignation_date: resignationDate,
        requested_last_working_date: requestedLwd,
        reason: form.reason || undefined,
        handover_notes: form.handover_notes || undefined,
      }),
    onSuccess: () => onSuccess(),
    onError: (err) => {
      setError(err.response?.data?.error?.message || 'Failed to submit resignation');
    },
  });

  const clientError =
    requestedLwd && expectedLwd && isEarlyLwd(requestedLwd, expectedLwd)
      ? `Last working date must be on or after ${expectedLwd} (${effectiveNoticeDays}-day notice).`
      : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Submit Resignation</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            if (clientError) return;
            mutation.mutate();
          }}
        >
          <div>
            <label className="text-xs font-medium text-slate-600">Resignation date *</label>
            <input
              type="date"
              required
              value={resignationDate}
              onChange={(e) => setResignationDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <LwdPolicyHint
            resignationDate={resignationDate}
            noticePeriodDays={effectiveNoticeDays}
            expectedLwd={expectedLwd}
            lastWorkingDate={requestedLwd}
          />

          <LwdDateField
            label="Last working date *"
            resignationDate={resignationDate}
            expectedLwd={expectedLwd}
            value={requestedLwd}
            onChange={setRequestedLwd}
          />
          {settlement?.early_release && (
            <NoticeSettlementSummary settlement={settlement} compact />
          )}
          {previewLoading && !preview && (
            <p className="text-[11px] text-slate-400">Calculating expected LWD from notice policy…</p>
          )}

          <div>
            <label className="text-xs font-medium text-slate-600">Reason</label>
            <textarea
              rows={3}
              maxLength={500}
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="Brief reason for resignation…"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Handover notes</label>
            <textarea
              rows={2}
              maxLength={2000}
              value={form.handover_notes}
              onChange={(e) => setForm((f) => ({ ...f, handover_notes: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="Knowledge transfer plan, pending tasks…"
            />
          </div>
          {(error || clientError) && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {clientError || error}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !!clientError || !requestedLwd}
              className="btn-primary text-xs"
            >
              {mutation.isPending ? 'Submitting…' : 'Submit Resignation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ManagerApproveModal({ target, canWaiveEarly, onClose, onConfirm, isPending, error }) {
  const expectedLwd =
    target.expected_last_working_date ??
    calculateExpectedLwd(target.resignation_date, target.notice_period_days);
  const [lastWorkingDate, setLastWorkingDate] = useState(
    target.requested_last_working_date || expectedLwd
  );
  const [comments, setComments] = useState('');

  const clientError =
    !canWaiveEarly && isEarlyLwd(lastWorkingDate, expectedLwd)
      ? `Last working date must be on or after ${expectedLwd}.`
      : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
        <h3 className="font-semibold text-slate-900">Approve Resignation (Manager)</h3>
        <p className="text-xs text-slate-500 mt-1">
          {target.employee?.first_name} {target.employee?.last_name} · Forward to HR after approval
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (clientError) return;
            onConfirm({
              last_working_date: lastWorkingDate || undefined,
              comments: comments.trim() || undefined,
            });
          }}
        >
          <LwdPolicyHint
            resignationDate={target.resignation_date}
            noticePeriodDays={target.notice_period_days}
            expectedLwd={expectedLwd}
            lastWorkingDate={lastWorkingDate}
            canWaiveEarly={canWaiveEarly}
          />
          <LwdDateField
            label="Confirmed last working date"
            resignationDate={target.resignation_date}
            expectedLwd={expectedLwd}
            value={lastWorkingDate}
            onChange={setLastWorkingDate}
            canWaiveEarly={canWaiveEarly}
          />
          <div>
            <label className="text-xs font-medium text-slate-600">Comments (optional)</label>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          {(error || clientError) && <p className="text-sm text-red-600">{clientError || error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" disabled={isPending || !!clientError} className="btn-primary text-xs">
              {isPending ? 'Approving…' : 'Approve & Send to HR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WithdrawModal({ request, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => resignationApi.withdraw(request.id, { withdrawal_reason: reason || undefined }),
    onSuccess: () => onSuccess(),
    onError: (err) => {
      setError(err.response?.data?.error?.message || 'Failed to withdraw resignation');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-2">Withdraw Resignation</h3>
        <p className="text-xs text-slate-500 mb-4">
          This will cancel your pending resignation request. You can submit a new one later if needed.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            mutation.mutate();
          }}
        >
          <label className="text-xs font-medium text-slate-600">Reason (optional)</label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            placeholder="Why are you withdrawing?"
          />
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          <div className="flex gap-2 mt-4 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary text-xs">
              {mutation.isPending ? 'Withdrawing…' : 'Confirm Withdrawal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RejectModal({ target, level, onClose, onConfirm, isPending, error }) {
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
        <h3 className="font-semibold text-slate-900">Reject Resignation</h3>
        <p className="text-xs text-slate-500 mt-1">
          {target.employee?.first_name} {target.employee?.last_name} · {level === 'hr' ? 'HR' : 'Manager'} action
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm(note.trim() || undefined);
          }}
        >
          <div>
            <label className="text-xs font-medium text-slate-600">Rejection note</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="Explain why this resignation is being rejected…"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary text-xs bg-red-600 hover:bg-red-700 border-red-600"
            >
              {isPending ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApprovalTable({ requests, level, onView, onApprove, onReject, actionPending }) {
  if (!requests.length) {
    return (
      <p className="text-center py-8 text-sm text-slate-400">No pending approvals</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Employee</th>
            <th className="text-left px-4 py-3 font-semibold">Resignation</th>
            <th className="text-left px-4 py-3 font-semibold">Requested LWD</th>
            <th className="text-left px-4 py-3 font-semibold">Reason</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {requests.map((req) => (
            <tr key={req.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Avatar name={`${req.employee?.first_name} ${req.employee?.last_name}`} size="sm" />
                  <div>
                    <p className="font-medium">
                      {req.employee?.first_name} {req.employee?.last_name}
                    </p>
                    <p className="text-slate-400 font-mono">{req.employee?.emp_code}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">{formatDate(req.resignation_date)}</td>
              <td className="px-4 py-3">{formatDate(req.requested_last_working_date)}</td>
              <td className="px-4 py-3 max-w-[200px]">
                <p className="line-clamp-2 text-slate-600">{req.reason || '—'}</p>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button type="button" onClick={() => onView(req.id)} className="btn-secondary text-[10px] py-1">
                    View
                  </button>
                  <button
                    type="button"
                    disabled={actionPending}
                    onClick={() => onApprove(req)}
                    className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  >
                    <Check size={12} /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={actionPending}
                    onClick={() => onReject(req)}
                    className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <X size={12} /> Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MeResignationPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isManager = ['super_admin', 'owner', 'hr', 'manager'].includes(user?.role);

  const [showSubmit, setShowSubmit] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectError, setRejectError] = useState('');
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveError, setApproveError] = useState('');
  const {
    setPage: setManagerPage,
    setLimit: setManagerLimit,
    paginateClient: paginateManagerQueue,
  } = useTablePagination();
  const {
    setPage: setMyPage,
    setLimit: setMyLimit,
    paginateClient: paginateMyRequests,
  } = useTablePagination();

  const canWaiveEarly = ['super_admin', 'owner', 'hr'].includes(user?.role);

  const { data: profileData } = useQuery({
    queryKey: ['employee-self'],
    queryFn: employeeApi.getSelf,
  });

  const noticeDays =
    profileData?.data?.employee?.effective_notice_period_days ??
    profileData?.data?.employee?.notice_period_days ??
    30;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-resignations', user?.id],
    queryFn: () => resignationApi.myRequests({ limit: 50 }),
    enabled: !!user?.id,
  });

  const { data: managerData, isLoading: managerLoading } = useQuery({
    queryKey: ['resignation-manager-approvals', user?.id],
    queryFn: () => resignationApi.managerQueue({ limit: 50 }),
    enabled: isManager && !!user?.id,
  });

  const requests = data?.data?.requests || [];
  const managerQueue = managerData?.data?.requests || [];
  const { items: visibleManagerQueue, pagination: managerPagination } = paginateManagerQueue(managerQueue);
  const { items: visibleRequests, pagination: myPagination } = paginateMyRequests(requests);
  const hasActive = requests.some((r) => ACTIVE_STATUSES.has(r.status));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['my-resignations'] });
    queryClient.invalidateQueries({ queryKey: ['resignation-manager-approvals'] });
    queryClient.invalidateQueries({ queryKey: ['resignations'] });
    queryClient.invalidateQueries({ queryKey: ['resignation-hr-approvals'] });
    queryClient.invalidateQueries({ queryKey: ['resignation'] });
  };

  const managerApproveMutation = useMutation({
    mutationFn: ({ id, payload }) => resignationApi.managerApprove(id, payload),
    onSuccess: () => {
      invalidate();
      setApproveTarget(null);
      setApproveError('');
    },
    onError: (err) => {
      setApproveError(err.response?.data?.error?.message || 'Failed to approve');
    },
  });

  const managerRejectMutation = useMutation({
    mutationFn: ({ id, rejection_note }) => resignationApi.managerReject(id, { rejection_note }),
    onSuccess: () => {
      invalidate();
      setRejectTarget(null);
      setRejectError('');
    },
    onError: (err) => {
      setRejectError(err.response?.data?.error?.message || 'Failed to reject');
    },
  });

  const actionPending = managerApproveMutation.isPending || managerRejectMutation.isPending;

  const handleManagerApprove = (req) => {
    setApproveError('');
    setApproveTarget(req);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resignation"
        subtitle="Submit and track your resignation requests"
        actions={
          !hasActive ? (
            <button type="button" onClick={() => setShowSubmit(true)} className="btn-primary text-xs inline-flex items-center gap-1">
              <Plus size={14} /> Submit Resignation
            </button>
          ) : null
        }
      />

      {isManager && (
        <div className="card overflow-x-auto overscroll-x-contain">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800">Pending Your Approval</h3>
            <p className="text-xs text-slate-500 mt-0.5">Resignations from your direct reportees</p>
          </div>
          {managerLoading ? (
            <p className="text-center py-8 text-slate-400">Loading…</p>
          ) : (
            <ApprovalTable
              requests={visibleManagerQueue}
              level="manager"
              onView={setDetailId}
              onApprove={handleManagerApprove}
              onReject={(req) => {
                setRejectTarget(req);
                setRejectError('');
              }}
              actionPending={actionPending}
            />
          )}
          <TablePagination
            page={managerPagination.page}
            limit={managerPagination.limit}
            total={managerPagination.total}
            totalPages={managerPagination.totalPages}
            onPageChange={setManagerPage}
            onLimitChange={setManagerLimit}
          />
        </div>
      )}

      <div className="card overflow-x-auto overscroll-x-contain">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">My Resignation Requests</h3>
          <span className="text-xs text-slate-500">{requests.length} request(s)</span>
        </div>

        {isLoading ? (
          <p className="text-center py-12 text-slate-400">Loading…</p>
        ) : error ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-red-500">Failed to load resignations</p>
            <button type="button" onClick={() => refetch()} className="btn-secondary text-xs">
              Retry
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <DoorOpen size={28} className="mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No resignation requests</p>
            <p className="text-xs text-slate-400">Submit a resignation when you decide to leave the organization.</p>
            {!hasActive && (
              <button type="button" onClick={() => setShowSubmit(true)} className="btn-primary text-xs mt-2">
                Submit Resignation
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Submitted</th>
                  <th className="text-left px-4 py-3 font-semibold">Requested LWD</th>
                  <th className="text-left px-4 py-3 font-semibold">Confirmed LWD</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Reason</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{formatDate(req.resignation_date)}</td>
                    <td className="px-4 py-3">{formatDate(req.requested_last_working_date)}</td>
                    <td className="px-4 py-3">
                      {formatDate(req.last_working_date || req.requested_last_working_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          RESIGNATION_STATUS[req.status]
                        )}
                      >
                        {RESIGNATION_STATUS_LABELS[req.status] || req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="line-clamp-2 text-slate-600">{req.reason || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        <button type="button" onClick={() => setDetailId(req.id)} className="btn-secondary text-[10px] py-1">
                          View
                        </button>
                        {req.status === 'hr_approved' && (
                          <Link
                            to="/me/fnf"
                            className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          >
                            <IndianRupee size={11} /> F&amp;F
                          </Link>
                        )}
                        {ACTIVE_STATUSES.has(req.status) && (
                          <button
                            type="button"
                            onClick={() => setWithdrawTarget(req)}
                            className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1"
                          >
                            <RotateCcw size={12} /> Withdraw
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TablePagination
          page={myPagination.page}
          limit={myPagination.limit}
          total={myPagination.total}
          totalPages={myPagination.totalPages}
          onPageChange={setMyPage}
          onLimitChange={setMyLimit}
        />
      </div>

      {showSubmit && (
        <SubmitModal
          noticeDays={noticeDays}
          onClose={() => setShowSubmit(false)}
          onSuccess={() => {
            invalidate();
            setShowSubmit(false);
          }}
        />
      )}

      {approveTarget && (
        <ManagerApproveModal
          target={approveTarget}
          canWaiveEarly={canWaiveEarly}
          onClose={() => {
            setApproveTarget(null);
            setApproveError('');
          }}
          onConfirm={(payload) =>
            managerApproveMutation.mutate({ id: approveTarget.id, payload })
          }
          isPending={managerApproveMutation.isPending}
          error={approveError}
        />
      )}

      {withdrawTarget && (
        <WithdrawModal
          request={withdrawTarget}
          onClose={() => setWithdrawTarget(null)}
          onSuccess={() => {
            invalidate();
            setWithdrawTarget(null);
          }}
        />
      )}

      {rejectTarget && (
        <RejectModal
          target={rejectTarget}
          level="manager"
          onClose={() => !managerRejectMutation.isPending && setRejectTarget(null)}
          onConfirm={(note) => managerRejectMutation.mutate({ id: rejectTarget.id, rejection_note: note })}
          isPending={managerRejectMutation.isPending}
          error={rejectError}
        />
      )}

      {detailId && <ResignationDetailDrawer requestId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
