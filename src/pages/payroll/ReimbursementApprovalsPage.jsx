import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Check, ExternalLink, FileText, Wallet, X } from 'lucide-react';
import { hrApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { Avatar } from '../../components/shared/StatusBadge';
import {
  REIMBURSEMENT_STATUS,
  categoryLabel,
  claimDisplayId,
} from '../../constants/reimbursement';
import { cn, formatINR } from '../../utils/helpers';
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

export default function ReimbursementApprovalsPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [detailClaim, setDetailClaim] = useState(null);
  const { setPage, setLimit, paginateClient } = useTablePagination();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reimbursement-approvals', selectedTenantId],
    queryFn: hrApi.listPendingReimbursements,
    enabled: !tenantRequired,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['reimbursement-approvals'] });
    queryClient.invalidateQueries({ queryKey: ['my-reimbursements'] });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, mark_paid }) => hrApi.approveReimbursement(id, { mark_paid }),
    onSuccess: invalidate,
    onError: (err) => {
      window.alert(err.response?.data?.error?.message || 'Failed to approve claim');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, rejection_note }) =>
      hrApi.rejectReimbursement(id, rejection_note ? { rejection_note } : {}),
    onSuccess: () => {
      invalidate();
      closeRejectModal();
    },
    onError: (err) => {
      setRejectError(err.response?.data?.error?.message || 'Failed to reject claim');
    },
  });

  const claims = data?.data?.claims || [];
  const { items: visibleClaims, pagination } = paginateClient(claims);
  const actionPending = approveMutation.isPending || rejectMutation.isPending;

  const closeRejectModal = () => {
    if (rejectMutation.isPending) return;
    setRejectTarget(null);
    setRejectNote('');
    setRejectError('');
  };

  const employeeName = (emp) =>
    emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : 'Employee';

  const handleApprove = (claim, markPaid = false) => {
    const label = markPaid ? 'approve and mark as paid' : 'approve';
    if (
      !window.confirm(
        `${label.charAt(0).toUpperCase() + label.slice(1)} ${claimDisplayId(claim)} (${formatINR(claim.amount)}) for ${employeeName(claim.employee)}?`
      )
    ) {
      return;
    }
    approveMutation.mutate({ id: claim.id, mark_paid: markPaid });
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to review reimbursement claims.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Payroll · Reimbursements"
        title="Reimbursement Claims"
        subtitle="Review and approve employee expense reimbursement requests"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Pending Claims"
          value={claims.length}
          icon={Wallet}
          delta={claims.length > 0 ? 'Awaiting approval' : 'Queue is clear'}
          deltaType={claims.length > 0 ? 'up' : 'neutral'}
        />
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        <div className="ds-toolbar flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Pending approval queue</h3>
          <span className="text-xs text-slate-500">{claims.length} claim(s)</span>
        </div>

        {isLoading ? (
          <p className="text-center py-16 text-slate-400 text-sm">Loading reimbursement claims…</p>
        ) : error ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-red-500 text-sm">
              {error?.response?.data?.error?.message || 'Failed to load reimbursement claims'}
            </p>
            <button type="button" onClick={() => refetch()} className="btn-secondary text-xs">
              Retry
            </button>
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Wallet size={28} className="mx-auto text-slate-200" />
            <p className="text-slate-400 text-sm">No pending reimbursement claims</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When employees submit claims from My Reimbursements, they will appear here for review.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Claim ID</th>
                  <th className="text-left px-4 py-3 font-semibold">Employee</th>
                  <th className="text-left px-4 py-3 font-semibold">Submitted</th>
                  <th className="text-left px-4 py-3 font-semibold">Category</th>
                  <th className="text-right px-4 py-3 font-semibold">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold">Description</th>
                  <th className="text-left px-4 py-3 font-semibold">Receipt</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-700">{claimDisplayId(claim)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={employeeName(claim.employee)} size="sm" />
                        <div>
                          <p className="font-medium text-slate-900">{employeeName(claim.employee)}</p>
                          <p className="text-slate-400 font-mono">{claim.employee?.emp_code || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatDate(claim.submitted_at)}</td>
                    <td className="px-4 py-3 capitalize">{categoryLabel(claim.category)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatINR(claim.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[200px]">
                      <p className="line-clamp-2">{claim.description || '—'}</p>
                      {claim.description && claim.description.length > 80 && (
                        <button
                          type="button"
                          onClick={() => setDetailClaim(claim)}
                          className="text-brand-600 hover:underline mt-0.5"
                        >
                          View full
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {claim.receipt_url ? (
                        <a
                          href={claim.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"
                        >
                          <FileText size={12} />
                          Open
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={actionPending}
                          onClick={() => handleApprove(claim, false)}
                          className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          title="Approve claim"
                        >
                          <Check size={12} /> Approve
                        </button>
                        <button
                          type="button"
                          disabled={actionPending}
                          onClick={() => handleApprove(claim, true)}
                          className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                          title="Approve and mark paid"
                        >
                          <Check size={12} /> Pay
                        </button>
                        <button
                          type="button"
                          disabled={actionPending}
                          onClick={() => {
                            setRejectTarget(claim);
                            setRejectNote('');
                            setRejectError('');
                          }}
                          className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          title="Reject claim"
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
        )}
        <TablePagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </div>

      {detailClaim && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-mono text-slate-400">{claimDisplayId(detailClaim)}</p>
                <h3 className="font-semibold mt-0.5">{employeeName(detailClaim.employee)}</h3>
              </div>
              <span
                className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0',
                  REIMBURSEMENT_STATUS.pending
                )}
              >
                Pending
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <dt className="text-xs text-slate-400">Category</dt>
                <dd className="font-medium capitalize">{categoryLabel(detailClaim.category)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Amount</dt>
                <dd className="font-semibold">{formatINR(detailClaim.amount)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-slate-400">Description</dt>
                <dd className="mt-1 text-slate-700 whitespace-pre-wrap">{detailClaim.description || '—'}</dd>
              </div>
            </dl>
            {detailClaim.receipt_url && (
              <a
                href={detailClaim.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-brand-600 mb-4"
              >
                <FileText size={14} /> View receipt <ExternalLink size={12} />
              </a>
            )}
            <div className="flex justify-end">
              <button type="button" onClick={() => setDetailClaim(null)} className="btn-secondary text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold">Reject Reimbursement Claim</h3>
              <p className="text-xs text-slate-500 mt-1">
                {claimDisplayId(rejectTarget)} · {employeeName(rejectTarget.employee)} ·{' '}
                {formatINR(rejectTarget.amount)}
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setRejectError('');
                rejectMutation.mutate({
                  id: rejectTarget.id,
                  rejection_note: rejectNote.trim() || undefined,
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-600">Rejection note (optional)</label>
                <textarea
                  rows={3}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Explain why this claim is being rejected…"
                  maxLength={500}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">The employee will see this note on their claim.</p>
              </div>
              {rejectError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {rejectError}
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeRejectModal} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectMutation.isPending}
                  className="btn-primary bg-red-600 hover:bg-red-700 border-red-600"
                >
                  {rejectMutation.isPending ? 'Rejecting…' : 'Reject claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
