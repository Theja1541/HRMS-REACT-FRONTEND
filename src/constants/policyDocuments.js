import { format, parseISO } from 'date-fns';

export const POLICY_CATEGORIES = {
  leave_policy: 'Leave Policy',
  code_of_conduct: 'Code of Conduct',
  it_policy: 'IT Policy',
  hr_policy: 'HR Policy',
  payroll_policy: 'Payroll Policy',
  other: 'Other',
};

export function policyCategoryLabel(category) {
  return POLICY_CATEGORIES[category] || category?.replace(/_/g, ' ') || 'Other';
}

export function formatPolicyDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

/** Revision label derived from updated_at (no dedicated version field in API). */
export function formatPolicyVersion(policy) {
  if (!policy?.updated_at) return '—';
  try {
    const updated = parseISO(policy.updated_at);
    const created = policy.created_at ? parseISO(policy.created_at) : null;
    if (created && updated.getTime() - created.getTime() > 60_000) {
      return `Rev. ${format(updated, 'dd MMM yyyy')}`;
    }
    return 'Original';
  } catch {
    return '—';
  }
}

export function policyAcknowledgementStatus(policy) {
  if (!policy?.acknowledgement_required && !policy?.requires_acknowledgement) {
    return { key: 'not_required', label: 'Not required' };
  }
  if (policy?.is_acknowledged) {
    return { key: 'acknowledged', label: 'Acknowledged' };
  }
  return { key: 'pending', label: 'Pending' };
}

export const POLICY_ACK_STATUS_STYLES = {
  acknowledged: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  not_required: 'bg-slate-100 text-slate-500',
};
