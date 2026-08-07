import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, ExternalLink, FileText, Pencil, Trash2 } from 'lucide-react';
import { portalApi } from '../../../api';
import PageHeader from '../../../components/shared/PageHeader';
import { useAuthStore } from '../../../store/auth.store';
import {
  REIMBURSEMENT_STATUS,
  REIMBURSEMENT_STATUS_LABELS,
  categoryLabel,
  claimDisplayId,
  isDraftClaimId,
} from '../../../constants/reimbursement';
import { deleteDraftClaim, getDraftClaim } from '../../../utils/reimbursementDrafts';
import { cn, formatINR } from '../../../utils/helpers';
import { useState } from 'react';

function formatClaimDate(claim) {
  const raw = claim.claim_date || claim.submitted_at;
  if (!raw) return '—';
  try {
    return format(parseISO(raw), 'dd MMM yyyy, h:mm a');
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
          {claimDisplayId(claim)} will be removed permanently.
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

export default function MeReimbursementViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, selectedTenantId } = useAuthStore();
  const [showDelete, setShowDelete] = useState(false);

  const isDraft = isDraftClaimId(id);
  const draft = isDraft ? getDraftClaim(user?.id, selectedTenantId, id) : null;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-reimbursements', user?.id],
    queryFn: () => portalApi.listMyReimbursements(),
    enabled: !!user?.id && !isDraft,
  });

  const apiClaim = !isDraft
    ? (data?.data?.claims || []).find((c) => String(c.id) === String(id))
    : null;

  const claim = isDraft ? draft : apiClaim;

  const handleDelete = () => {
    deleteDraftClaim(user?.id, selectedTenantId, id);
    setShowDelete(false);
    navigate('/me/reimbursements');
  };

  if (isDraft && !draft) {
    return (
      <div className="space-y-4">
        <PageHeader badge="My Work · Reimbursements" title="Claim not found" subtitle="This draft may have been deleted" />
        <Link to="/me/reimbursements" className="btn-secondary text-xs inline-flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to list
        </Link>
      </div>
    );
  }

  if (!isDraft && isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading claim…</div>;
  }

  if (!isDraft && isError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 text-sm">{error?.response?.data?.error?.message || 'Failed to load claim'}</p>
        <Link to="/me/reimbursements" className="btn-secondary text-xs mt-3 inline-block">Back to list</Link>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="space-y-4">
        <PageHeader badge="My Work · Reimbursements" title="Claim not found" subtitle="You can only view your own reimbursement claims" />
        <Link to="/me/reimbursements" className="btn-secondary text-xs inline-flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to list
        </Link>
      </div>
    );
  }

  const status = claim.status || (isDraft ? 'draft' : 'pending');
  const comments = claim.rejection_note
    ? [{ type: 'rejection', text: claim.rejection_note, at: claim.reviewed_at }]
    : [];

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        badge="My Work · Reimbursements"
        title={claimDisplayId(claim)}
        subtitle={`${categoryLabel(claim.category)} · ${formatINR(claim.amount)}`}
        actions={(
          <div className="flex flex-wrap gap-2">
            {isDraft && (
              <>
                <Link
                  to={`/me/reimbursements/${claim.id}/edit`}
                  className="btn-secondary text-xs inline-flex items-center gap-1.5"
                >
                  <Pencil size={14} /> Edit
                </Link>
                <button
                  type="button"
                  onClick={() => setShowDelete(true)}
                  className="btn-secondary text-xs inline-flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </>
            )}
            <Link to="/me/reimbursements" className="btn-secondary text-xs inline-flex items-center gap-1.5">
              <ArrowLeft size={14} /> Back
            </Link>
          </div>
        )}
      />

      <div className="card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={cn(
              'text-xs font-semibold px-2.5 py-1 rounded-full capitalize',
              REIMBURSEMENT_STATUS[status] || REIMBURSEMENT_STATUS.pending
            )}
          >
            {REIMBURSEMENT_STATUS_LABELS[status] || status}
          </span>
          <p className="text-xs text-slate-400">{formatClaimDate(claim)}</p>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-slate-400 uppercase tracking-wide">Category</dt>
            <dd className="mt-1 font-medium text-slate-800 capitalize">{categoryLabel(claim.category)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 uppercase tracking-wide">Amount</dt>
            <dd className="mt-1 font-semibold text-slate-900">{formatINR(claim.amount)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-400 uppercase tracking-wide">Description</dt>
            <dd className="mt-1 text-slate-700 whitespace-pre-wrap">{claim.description || '—'}</dd>
          </div>
        </dl>

        {claim.receipt_url && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-600 mb-2">Receipt</p>
            <a
              href={claim.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-2 rounded-lg"
            >
              <FileText size={16} />
              View receipt
              <ExternalLink size={12} />
            </a>
          </div>
        )}

        {isDraft && claim.has_receipt && !claim.receipt_url && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Receipt was attached in a previous session. Re-open edit to attach the file again before submitting.
          </p>
        )}

        {claim.reviewed_at && status !== 'pending' && status !== 'draft' && (
          <p className="text-xs text-slate-500">
            Reviewed on {formatClaimDate({ submitted_at: claim.reviewed_at })}
          </p>
        )}

        {claim.paid_at && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            Paid on {formatClaimDate({ submitted_at: claim.paid_at })}
          </p>
        )}

        {comments.length > 0 && (
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <p className="text-xs font-medium text-slate-600">Comments</p>
            {comments.map((c) => (
              <div key={c.text} className="bg-slate-50 rounded-lg px-3 py-2 text-sm">
                <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-1">
                  {c.type === 'rejection' ? 'Rejection note' : 'Comment'}
                </p>
                <p className="text-slate-700">{c.text}</p>
              </div>
            ))}
          </div>
        )}

        {isDraft && (
          <div className="border-t border-slate-100 pt-4">
            <Link to={`/me/reimbursements/${claim.id}/edit`} className="btn-primary text-xs">
              Continue editing & submit
            </Link>
          </div>
        )}
      </div>

      {showDelete && (
        <DeleteDraftModal claim={claim} onClose={() => setShowDelete(false)} onConfirm={handleDelete} />
      )}
    </div>
  );
}
