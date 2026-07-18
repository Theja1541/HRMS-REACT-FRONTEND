/** Labels and options for leave settings admin UI */

export const APPLICABLE_GENDER = [
  { value: 'all', label: 'All employees' },
  { value: 'male', label: 'Male only' },
  { value: 'female', label: 'Female only' },
];

export const ACCRUAL_METHODS = [
  { value: 'fixed', label: 'Fixed annual quota' },
  { value: 'monthly', label: 'Monthly accrual' },
  { value: 'quarterly', label: 'Quarterly accrual' },
];

export const ACCRUAL_TRIGGERS = [
  { value: 'calendar_year', label: 'Calendar year (Jan–Dec)' },
  { value: 'fiscal_year', label: 'Fiscal year (Apr–Mar)' },
  { value: 'doj_anniversary', label: 'Date of joining anniversary' },
];

export const APPROVAL_LEVELS = [
  {
    value: 'manager',
    label: 'Reporting manager only',
    description: 'One step — employee’s reporting manager approves (HR/Admin can override).',
    steps: ['Employee applies', 'Reporting manager approves'],
  },
  {
    value: 'manager_hr',
    label: 'Manager → HR/Admin',
    description: 'Two steps — manager approves first, then HR/Admin gives final approval.',
    steps: ['Employee applies', 'Reporting manager approves', 'HR/Admin final approval'],
  },
  {
    value: 'single',
    label: 'HR/Admin only',
    description: 'One step — skips the reporting manager; only HR or Company Admin can approve.',
    steps: ['Employee applies', 'HR/Admin approves'],
  },
];

export function formatApprovalChain(level) {
  const found = APPROVAL_LEVELS.find((o) => o.value === level);
  return found?.label || String(level || 'manager').replace(/_/g, ' ');
}

export const APPLICABLE_TO = [
  { value: 'all', label: 'All employees' },
  { value: 'department', label: 'By department' },
  { value: 'designation', label: 'By designation' },
  { value: 'employment_type', label: 'By employment type' },
];

export const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
  { value: 'consultant', label: 'Consultant' },
];

export const LEAVE_TYPE_COLORS = [
  '#3B82F6', '#EF4444', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#6B7280', '#6366F1',
];

export function emptyLeaveType() {
  return {
    code: '',
    name: '',
    description: '',
    color_code: '#6366F1',
    icon: 'calendar',
    is_paid: true,
    applicable_gender: 'all',
    is_active: true,
  };
}

export function leaveTypeToForm(row) {
  if (!row) return emptyLeaveType();
  return {
    code: row.code || '',
    name: row.name || '',
    description: row.description || '',
    color_code: row.color_code || '#6366F1',
    icon: row.icon || 'calendar',
    is_paid: row.is_paid ?? true,
    applicable_gender: row.applicable_gender || 'all',
    is_active: row.is_active ?? true,
  };
}

export function emptyLeavePolicy(leaveTypeId = '') {
  return {
    leave_type_id: leaveTypeId,
    policy_name: '',
    accrual_method: 'fixed',
    annual_quota: 12,
    monthly_accrual_rate: 0,
    accrual_trigger: 'calendar_year',
    max_balance_cap: null,
    carry_forward_allowed: false,
    carry_forward_max_days: 0,
    carry_forward_expiry_months: 3,
    encashment_allowed: false,
    encashment_max_days: 0,
    negative_balance_allowed: false,
    negative_balance_max: 0,
    min_service_days_required: 0,
    pro_rata_enabled: true,
    half_day_allowed: true,
    min_days_per_request: 0.5,
    max_days_per_request: null,
    advance_notice_days: 0,
    attachment_required_after_days: 0,
    sandwich_rule_enabled: false,
    applicable_to: 'all',
    comp_off_expiry_days: 90,
    comp_off_half_day_credit: true,
    comp_off_carry_forward: false,
    comp_off_encashment: false,
    approval_levels: 'manager',
    auto_approve_under_days: 0,
    is_active: true,
  };
}

export function policyToForm(row) {
  if (!row) return emptyLeavePolicy();
  return {
    leave_type_id: row.leave_type_id || row.leaveType?.id || '',
    policy_name: row.policy_name || '',
    accrual_method: row.accrual_method || 'fixed',
    annual_quota: parseFloat(row.annual_quota) || 0,
    monthly_accrual_rate: parseFloat(row.monthly_accrual_rate) || 0,
    accrual_trigger: row.accrual_trigger || 'calendar_year',
    max_balance_cap: row.max_balance_cap != null ? parseFloat(row.max_balance_cap) : null,
    carry_forward_allowed: row.carry_forward_allowed ?? false,
    carry_forward_max_days: parseFloat(row.carry_forward_max_days) || 0,
    carry_forward_expiry_months: row.carry_forward_expiry_months ?? 3,
    encashment_allowed: row.encashment_allowed ?? false,
    encashment_max_days: parseFloat(row.encashment_max_days) || 0,
    negative_balance_allowed: row.negative_balance_allowed ?? false,
    negative_balance_max: parseFloat(row.negative_balance_max) || 0,
    min_service_days_required: row.min_service_days_required ?? 0,
    pro_rata_enabled: row.pro_rata_enabled ?? true,
    half_day_allowed: row.half_day_allowed ?? true,
    min_days_per_request: parseFloat(row.min_days_per_request) || 0.5,
    max_days_per_request: row.max_days_per_request != null ? parseFloat(row.max_days_per_request) : null,
    advance_notice_days: row.advance_notice_days ?? 0,
    attachment_required_after_days: row.attachment_required_after_days ?? 0,
    sandwich_rule_enabled: row.sandwich_rule_enabled ?? false,
    applicable_to: row.applicable_to || 'all',
    comp_off_expiry_days: row.comp_off_expiry_days ?? 90,
    comp_off_half_day_credit: row.comp_off_half_day_credit ?? true,
    comp_off_carry_forward: row.comp_off_carry_forward ?? false,
    comp_off_encashment: row.comp_off_encashment ?? false,
    approval_levels: row.approval_levels || 'manager',
    auto_approve_under_days: parseFloat(row.auto_approve_under_days) || 0,
    is_active: row.is_active ?? true,
  };
}

export function formatAccrualSummary(policy) {
  if (policy.accrual_method === 'monthly') {
    return `${policy.monthly_accrual_rate || policy.annual_quota / 12}/mo`;
  }
  if (policy.accrual_method === 'quarterly') {
    return `${(parseFloat(policy.monthly_accrual_rate) || 0) * 3 || policy.annual_quota / 4}/qtr`;
  }
  return `${policy.annual_quota} days/yr`;
}
