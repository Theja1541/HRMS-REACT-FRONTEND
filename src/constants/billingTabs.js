export const PAYMENT_MODES = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

export const INVOICE_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'issued', label: 'Issued' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
];

export const ALERT_SEVERITY_OPTIONS = [
  { value: '', label: 'All severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const ALERT_TYPE_LABELS = {
  billing_pending: 'Payment Pending',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  suspended: 'Suspended',
  pending_request: 'Pending Approval',
  employee_limit: 'Employee Limit',
  trial_ending: 'Trial Ending',
};

export function paymentModeLabel(value) {
  return PAYMENT_MODES.find((m) => m.value === value)?.label || value || '—';
}

export function formatBillingDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

export function severityClass(severity) {
  const map = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    low: 'bg-sky-100 text-sky-800 border-sky-200',
    info: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return map[severity] || map.info;
}
