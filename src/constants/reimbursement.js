export const REIMBURSEMENT_CATEGORIES = [
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food' },
  { value: 'medical', label: 'Medical' },
  { value: 'internet', label: 'Internet' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' },
];

export const CATEGORIES_REQUIRING_RECEIPT = ['travel', 'food', 'medical'];

export const REIMBURSEMENT_STATUS = {
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  paid: 'bg-blue-50 text-blue-700',
};

export const REIMBURSEMENT_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
};

export function categoryLabel(value) {
  return REIMBURSEMENT_CATEGORIES.find((c) => c.value === value)?.label || value;
}

export function isDraftClaimId(id) {
  return String(id).startsWith('draft-');
}

export function claimDisplayId(claim) {
  if (isDraftClaimId(claim.id)) {
    return `DRAFT-${String(claim.id).slice(-6).toUpperCase()}`;
  }
  return `RMB-${String(claim.id).padStart(5, '0')}`;
}
