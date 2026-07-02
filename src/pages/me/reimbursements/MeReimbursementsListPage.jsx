import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Eye, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { portalApi } from '../../../api';
import PageHeader from '../../../components/shared/PageHeader';
import TablePagination from '../../../components/shared/TablePagination';
import { useAuthStore } from '../../../store/auth.store';
import {
  REIMBURSEMENT_STATUS,
  REIMBURSEMENT_STATUS_LABELS,
  categoryLabel,
  claimDisplayId,
  isDraftClaimId,
} from '../../../constants/reimbursement';
import { deleteDraftClaim, listDraftClaims } from '../../../utils/reimbursementDrafts';
import { cn, formatINR } from '../../../utils/helpers';
import { useTablePagination } from '../../../hooks/useTablePagination';

function formatClaimDate(claim) {
  const raw = claim.claim_date || claim.submitted_at;
  if (!raw) return '—';
  try {
    return format(parseISO(raw), 'dd MMM yyyy');
  } catch {
    return raw;
  }
}

function DeleteDraftModal({ claim, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <h3 className="text-sm font-semibold text-slate-900">Delete draft claim?</h3>
        <p className="text-sm text-slate-500 mt-2">
          {claimDisplayId(claim)} will be removed. This cannot be undone.
        </p>
        <div className="flex gap-2 mt-5 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary text-xs">Cancel</button>
          <button type="button" onClick={onConfirm} className="btn-primary text-xs bg-red-600 hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MeReimbursementsListPage() {
  const { user, selectedTenantId } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [draftTick, setDraftTick] = useState(0);
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [statusFilter] });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-reimbursements', user?.id, statusFilter],
    queryFn: () => portalApi.listMyReimbursements(statusFilter && !statusFilter.startsWith('draft') ? { status: statusFilter } : {}),
    enabled: !!user?.id,
  });

  const apiClaims = data?.data?.claims || [];

  const drafts = useMemo(
    () => listDraftClaims(user?.id, selectedTenantId),
    [user?.id, selectedTenantId, draftTick]
  );

  const claims = useMemo(() => {
    const merged = [
      ...drafts.map((d) => ({ ...d, status: 'draft' })),
      ...apiClaims,
    ];
    const filtered = statusFilter
      ? merged.filter((c) => c.status === statusFilter)
      : merged;
    return filtered.sort((a, b) => {
      const da = new Date(a.claim_date || a.submitted_at || a.updated_at || 0).getTime();
      const db = new Date(b.claim_date || b.submitted_at || b.updated_at || 0).getTime();
      return db - da;
    });
  }, [drafts, apiClaims, statusFilter]);
  const { items: visibleClaims, pagination } = paginateClient(claims);

  const handleDeleteDraft = () => {
    if (!deleteTarget) return;
    deleteDraftClaim(user?.id, selectedTenantId, deleteTarget.id);
    setDeleteTarget(null);
    setDraftTick((t) => t + 1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Reimbursements"
        subtitle="Submit and track expense reimbursement claims"
        actions={(
          <Link to="/me/reimbursements/new" className="btn-primary text-xs inline-flex items-center gap-1.5">
            <Plus size={14} /> New Claim
          </Link>
        )}
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="p-12 text-center text-slate-400">Loading claims…</p>
        ) : isError ? (
          <div className="p-12 text-center">
            <p className="text-red-500 text-sm">{error?.response?.data?.error?.message || 'Failed to load claims'}</p>
            <button type="button" onClick={() => refetch()} className="btn-secondary text-xs mt-3">Retry</button>
          </div>
        ) : claims.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No reimbursement claims yet</p>
            <Link to="/me/reimbursements/new" className="btn-primary text-xs mt-4 inline-flex items-center gap-1.5">
              <Plus size={14} /> Create your first claim
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Claim ID</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibleClaims.map((claim) => {
                const isDraft = isDraftClaimId(claim.id);
                return (
                  <tr key={claim.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{claimDisplayId(claim)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatClaimDate(claim)}</td>
                    <td className="px-4 py-3 capitalize text-slate-700">{categoryLabel(claim.category)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{formatINR(claim.amount)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                          REIMBURSEMENT_STATUS[claim.status] || REIMBURSEMENT_STATUS.pending
                        )}
                      >
                        {REIMBURSEMENT_STATUS_LABELS[claim.status] || claim.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/me/reimbursements/${claim.id}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                          title="View"
                        >
                          <Eye size={15} />
                        </Link>
                        {isDraft && (
                          <>
                            <Link
                              to={`/me/reimbursements/${claim.id}/edit`}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                              title="Edit"
                            >
                              <Pencil size={15} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(claim)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {!isLoading && !isError && claims.length > 0 && (
        <TablePagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      {deleteTarget && (
        <DeleteDraftModal
          claim={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteDraft}
        />
      )}
    </div>
  );
}
