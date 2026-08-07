import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Check, Clock, DoorOpen, Users, X } from 'lucide-react';
import { resignationApi } from '../../api';
import ResignationDetailDrawer from '../../components/resignation/ResignationDetailDrawer';
import LwdPolicyHint, { LwdDateField } from '../../components/resignation/LwdPolicyHint';
import NoticeSettlementSummary from '../../components/resignation/NoticeSettlementSummary';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { Avatar } from '../../components/shared/StatusBadge';
import { RESIGNATION_STATUS, RESIGNATION_STATUS_LABELS } from '../../constants/hr';
import { calculateExpectedLwd } from '../../utils/resignationLwd';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';
import { useTablePagination } from '../../hooks/useTablePagination';

function formatDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

function RejectModal({ target, onClose, onConfirm, isPending, error }) {
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
        <h3 className="font-semibold text-slate-900">Reject Resignation (HR)</h3>
        <p className="text-xs text-slate-500 mt-1">
          {target.employee?.first_name} {target.employee?.last_name}
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

function ApproveModal({ target, onClose, onConfirm, isPending, error }) {
  const expectedLwd =
    target.expected_last_working_date ??
    calculateExpectedLwd(target.resignation_date, target.notice_period_days);
  const [lastWorkingDate, setLastWorkingDate] = useState(
    target.last_working_date || target.requested_last_working_date || expectedLwd
  );
  const [comments, setComments] = useState('');
  const [buyoutStatus, setBuyoutStatus] = useState('payable');

  const { data: previewData } = useQuery({
    queryKey: ['resignation-lwd-preview', target.id, target.resignation_date, lastWorkingDate],
    queryFn: () =>
      resignationApi.previewLwd({
        resignation_date: target.resignation_date,
        last_working_date: lastWorkingDate,
        employee_id: target.employee_id,
      }),
    enabled: !!lastWorkingDate && !!target.resignation_date,
  });

  const settlement = previewData?.data?.preview?.settlement;
  const showBuyoutChoice =
    settlement?.early_release && settlement?.notice_buyout_applicable && settlement?.notice_buyout_amount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-slate-900">Approve Resignation (HR)</h3>
        <p className="text-xs text-slate-500 mt-1">
          {target.employee?.first_name} {target.employee?.last_name} · Employee will be marked on notice
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm({
              last_working_date: lastWorkingDate || undefined,
              comments: comments.trim() || undefined,
              notice_buyout_status: showBuyoutChoice ? buyoutStatus : undefined,
            });
          }}
        >
          <LwdPolicyHint
            resignationDate={target.resignation_date}
            noticePeriodDays={target.notice_period_days}
            expectedLwd={expectedLwd}
            lastWorkingDate={lastWorkingDate}
            canWaiveEarly
          />
          <LwdDateField
            label="Confirmed last working date"
            resignationDate={target.resignation_date}
            expectedLwd={expectedLwd}
            value={lastWorkingDate}
            onChange={setLastWorkingDate}
            canWaiveEarly
          />
          <NoticeSettlementSummary settlement={settlement} />
          {showBuyoutChoice && (
            <div>
              <label className="text-xs font-medium text-slate-600">Notice buyout decision</label>
              <select
                value={buyoutStatus}
                onChange={(e) => setBuyoutStatus(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="payable">Employee pays buyout</option>
                <option value="waived">Waive buyout</option>
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-600">Comments (optional)</label>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="btn-primary text-xs">
              {isPending ? 'Approving…' : 'Approve & Initiate Exit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResignationPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;

  const [tab, setTab] = useState('hr-queue');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [actionError, setActionError] = useState('');
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [tab, statusFilter] });

  const { data: allData, isLoading: allLoading, error: allError, refetch: refetchAll } = useQuery({
    queryKey: ['resignations', selectedTenantId, statusFilter],
    queryFn: () =>
      resignationApi.list({ scope: 'all', limit: 100, ...(statusFilter ? { status: statusFilter } : {}) }),
    enabled: !tenantRequired,
  });

  const { data: hrData, isLoading: hrLoading } = useQuery({
    queryKey: ['resignation-hr-approvals', selectedTenantId],
    queryFn: () => resignationApi.hrQueue({ limit: 50 }),
    enabled: !tenantRequired,
  });

  const allRequests = allData?.data?.requests || [];
  const hrQueue = hrData?.data?.requests || [];

  const stats = useMemo(() => {
    const pendingHr = allRequests.filter((r) => r.status === 'pending_hr').length;
    const pendingManager = allRequests.filter((r) => r.status === 'pending_manager').length;
    const approved = allRequests.filter((r) => r.status === 'approved').length;
    const rejected = allRequests.filter((r) => r.status === 'rejected').length;
    return { pendingHr, pendingManager, approved, rejected };
  }, [allRequests]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['resignations'] });
    queryClient.invalidateQueries({ queryKey: ['resignation-hr-approvals'] });
    queryClient.invalidateQueries({ queryKey: ['resignation-manager-approvals'] });
    queryClient.invalidateQueries({ queryKey: ['my-resignations'] });
    queryClient.invalidateQueries({ queryKey: ['resignation'] });
    queryClient.invalidateQueries({ queryKey: ['separations'] });
  };

  const hrApproveMutation = useMutation({
    mutationFn: ({ id, payload }) => resignationApi.hrApprove(id, payload),
    onSuccess: () => {
      invalidate();
      setApproveTarget(null);
      setActionError('');
    },
    onError: (err) => {
      setActionError(err.response?.data?.error?.message || 'Failed to approve');
    },
  });

  const hrRejectMutation = useMutation({
    mutationFn: ({ id, rejection_note }) => resignationApi.hrReject(id, { rejection_note }),
    onSuccess: () => {
      invalidate();
      setRejectTarget(null);
      setActionError('');
    },
    onError: (err) => {
      setActionError(err.response?.data?.error?.message || 'Failed to reject');
    },
  });

  const actionPending = hrApproveMutation.isPending || hrRejectMutation.isPending;
  const displayRequests = tab === 'hr-queue' ? hrQueue : allRequests;
  const { items: visibleRequests, pagination } = paginateClient(displayRequests);
  const listLoading = tab === 'hr-queue' ? hrLoading : allLoading;

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to manage resignations.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="People · Exit"
        title="Resignations"
        subtitle="Review employee resignations, approve exits, and view approval history"
        actions={
          <Link to="/separation" className="btn-secondary text-xs inline-flex items-center gap-1">
            <DoorOpen size={14} /> Separation & FNF
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending HR"
          value={stats.pendingHr || hrQueue.length}
          icon={Clock}
          delta={hrQueue.length > 0 ? 'Requires action' : 'Queue clear'}
          deltaType={hrQueue.length > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          label="Pending Manager"
          value={stats.pendingManager}
          icon={Users}
          delta="Awaiting manager sign-off"
          deltaType={stats.pendingManager > 0 ? 'up' : 'neutral'}
        />
        <StatCard label="Approved" value={stats.approved} icon={Check} deltaType="neutral" />
        <StatCard label="Rejected" value={stats.rejected} icon={X} deltaType="neutral" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="ds-tabs scroll-tabs" role="tablist">
        {[
          { id: 'hr-queue', label: `HR Queue (${hrQueue.length})` },
          { id: 'all', label: 'All Requests' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(tab === t.id && 'ds-tab-active')}
          >
            {t.label}
          </button>
        ))}
        </div>

        {tab === 'all' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ds-select w-full sm:w-auto sm:min-w-[150px] sm:ml-auto"
          >
            <option value="">All statuses</option>
            {Object.entries(RESIGNATION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        {listLoading ? (
          <p className="text-center py-12 text-slate-400">Loading resignations…</p>
        ) : allError && tab === 'all' ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-red-500">Failed to load resignations</p>
            <button type="button" onClick={() => refetchAll()} className="btn-secondary text-xs">
              Retry
            </button>
          </div>
        ) : displayRequests.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <DoorOpen size={28} className="mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-600">
              {tab === 'hr-queue' ? 'No resignations pending HR approval' : 'No resignation requests'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Employee</th>
                  <th className="text-left px-4 py-3 font-semibold">Submitted</th>
                  <th className="text-left px-4 py-3 font-semibold">Requested LWD</th>
                  <th className="text-left px-4 py-3 font-semibold">Manager</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Reason</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRequests.map((req) => (
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
                    <td className="px-4 py-3">
                      {req.manager
                        ? `${req.manager.first_name} ${req.manager.last_name}`
                        : '—'}
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
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="line-clamp-2 text-slate-600">{req.reason || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailId(req.id)}
                          className="btn-secondary text-[10px] py-1"
                        >
                          History
                        </button>
                        {req.status === 'pending_hr' && tab === 'hr-queue' && (
                          <>
                            <button
                              type="button"
                              disabled={actionPending}
                              onClick={() => {
                                setApproveTarget(req);
                                setActionError('');
                              }}
                              className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              type="button"
                              disabled={actionPending}
                              onClick={() => {
                                setRejectTarget(req);
                                setActionError('');
                              }}
                              className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <X size={12} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!listLoading && displayRequests.length > 0 && (
        <TablePagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      {approveTarget && (
        <ApproveModal
          target={approveTarget}
          onClose={() => !hrApproveMutation.isPending && setApproveTarget(null)}
          onConfirm={(payload) => hrApproveMutation.mutate({ id: approveTarget.id, payload })}
          isPending={hrApproveMutation.isPending}
          error={actionError}
        />
      )}

      {rejectTarget && (
        <RejectModal
          target={rejectTarget}
          onClose={() => !hrRejectMutation.isPending && setRejectTarget(null)}
          onConfirm={(note) => hrRejectMutation.mutate({ id: rejectTarget.id, rejection_note: note })}
          isPending={hrRejectMutation.isPending}
          error={actionError}
        />
      )}

      {detailId && <ResignationDetailDrawer requestId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
