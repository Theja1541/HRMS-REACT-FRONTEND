import { ROLE_LABELS } from './routes';

export const ATTENDANCE_STATUS = {
  present: { label: 'P', full: 'Present', color: 'bg-emerald-100 text-emerald-700' },
  absent: { label: 'A', full: 'Absent', color: 'bg-red-100 text-red-700' },
  wfh: { label: 'W', full: 'WFH', color: 'bg-blue-100 text-blue-700' },
  late: { label: 'L', full: 'Late', color: 'bg-amber-100 text-amber-700' },
  half_day: { label: 'H', full: 'Half Day', color: 'bg-orange-100 text-orange-700' },
  on_leave: { label: 'LV', full: 'On Leave', color: 'bg-purple-100 text-purple-700' },
  holiday: { label: 'HOL', full: 'Holiday', color: 'bg-slate-100 text-slate-500' },
  weekend: { label: '—', full: 'Weekend', color: 'bg-slate-50 text-slate-300' },
  comp_off: { label: 'CO', full: 'Comp Off', color: 'bg-teal-100 text-teal-700' },
};

export const MARKABLE_STATUSES = ['present', 'absent', 'wfh', 'late', 'half_day', 'comp_off'];

export const LEAVE_TYPES = ['CL', 'SL', 'EL', 'LOP', 'ML', 'PL'];

export const LEAVE_STATUS = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export const JOB_STATUSES = {
  draft: 'bg-slate-100 text-slate-600',
  open: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-slate-200 text-slate-600',
  on_hold: 'bg-amber-50 text-amber-700',
};

export const APPLICATION_STATUSES = {
  applied: 'bg-blue-50 text-blue-700',
  screening: 'bg-indigo-50 text-indigo-700',
  interview: 'bg-purple-50 text-purple-700',
  offer: 'bg-emerald-50 text-emerald-700',
  hired: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-50 text-red-700',
};

export const SEPARATION_STATUSES = {
  initiated: 'bg-amber-50 text-amber-700',
  approved: 'bg-blue-50 text-blue-700',
  clearance_pending: 'bg-orange-50 text-orange-700',
  completed: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export const RESIGNATION_STATUS = {
  pending_manager: 'bg-amber-50 text-amber-700',
  pending_hr: 'bg-orange-50 text-orange-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  withdrawn: 'bg-slate-100 text-slate-500',
};

export const RESIGNATION_STATUS_LABELS = {
  pending_manager: 'Pending Manager',
  pending_hr: 'Pending HR',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const RESIGNATION_HISTORY_ACTION_LABELS = {
  submitted: 'Submitted',
  manager_approved: 'Manager Approved',
  manager_rejected: 'Manager Rejected',
  hr_approved: 'HR Approved',
  hr_rejected: 'HR Rejected',
  withdrawn: 'Withdrawn',
};

export const ASSET_STATUSES = {
  available: 'bg-emerald-50 text-emerald-700',
  assigned: 'bg-blue-50 text-blue-700',
  maintenance: 'bg-amber-50 text-amber-700',
  retired: 'bg-slate-200 text-slate-600',
};

export const ASSET_RETURN_STATUS = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
};

export const ASSET_RETURN_STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  completed: 'Completed',
  rejected: 'Rejected',
};

export const ASSET_RETURN_CONDITIONS = {
  good: 'bg-emerald-50 text-emerald-700',
  damaged: 'bg-amber-50 text-amber-700',
  lost: 'bg-red-50 text-red-700',
};

export const ASSET_RETURN_CONDITION_LABELS = {
  good: 'Good',
  damaged: 'Damaged',
  lost: 'Lost',
};

export const ASSET_ACCESSORY_CONDITION_LABELS = {
  good: 'Good',
  damaged: 'Damaged',
  lost: 'Lost',
  missing: 'Missing',
  not_applicable: 'N/A',
};

export const ASSET_DAMAGE_SEVERITY_LABELS = {
  none: 'None',
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major',
  total: 'Total loss',
};

export const REVIEW_STATUSES = {
  pending: 'bg-slate-100 text-slate-600',
  self_review: 'bg-blue-50 text-blue-700',
  manager_review: 'bg-purple-50 text-purple-700',
  completed: 'bg-emerald-50 text-emerald-700',
};

export const ONBOARDING_CATEGORIES = ['documentation', 'it', 'hr', 'compliance'];

export const CLEARANCE_CATEGORY_LABELS = {
  documentation: 'Documentation',
  it: 'IT',
  hr: 'HR',
  finance: 'Finance',
  compliance: 'Compliance',
  admin: 'Admin',
  assets: 'Assets',
};

export const CLEARANCE_DEPARTMENT_LABELS = {
  hr: 'HR',
  it: 'IT',
  finance: 'Finance',
  admin: 'Admin',
  manager: 'Manager',
};

export const CLEARANCE_DEPARTMENTS = ['hr', 'it', 'finance', 'admin', 'manager'];

export const CLEARANCE_HISTORY_ACTION_LABELS = {
  created: 'Created',
  assigned: 'Assigned',
  due_date_updated: 'Due date updated',
  remarks_updated: 'Remarks updated',
  approved: 'Approved',
  rejected: 'Rejected',
  reattempt: 'Re-opened',
  attachment_added: 'Attachment added',
  attachment_removed: 'Attachment removed',
  escalated: 'Escalated',
  reminder_sent: 'Reminder sent',
  sla_breached: 'SLA breached',
};

export const CLEARANCE_STATUSES = {
  pending: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-slate-200 text-slate-600',
};

export const CLEARANCE_ITEM_STATUSES = {
  pending: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  waived: 'bg-red-50 text-red-700',
  not_applicable: 'bg-slate-200 text-slate-500',
};

export const CLEARANCE_ITEM_STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  waived: 'Rejected',
  not_applicable: 'N/A',
};

export const KT_PLAN_STATUSES = {
  draft: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-50 text-blue-700',
  pending_manager: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-slate-200 text-slate-600',
};

export const KT_PLAN_STATUS_LABELS = {
  draft: 'Draft',
  in_progress: 'In Progress',
  pending_manager: 'Pending Manager',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const KT_TASK_CATEGORIES = {
  process: 'Process',
  systems: 'Systems',
  contacts: 'Contacts',
  documents: 'Documents',
  projects: 'Projects',
  other: 'Other',
};

export const KT_TASK_STATUSES = {
  pending: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  waived: 'bg-amber-50 text-amber-700',
  not_applicable: 'bg-slate-200 text-slate-500',
};

export const KT_TASK_STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  waived: 'Waived',
  not_applicable: 'N/A',
};

export const KT_DOC_TYPES = {
  sop: 'SOP',
  runbook: 'Runbook',
  project: 'Project',
  policy: 'Policy',
  handover: 'Handover',
  other: 'Other',
};

export const KT_SESSION_STATUSES = {
  scheduled: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-slate-200 text-slate-600',
  no_show: 'bg-amber-50 text-amber-700',
};

export const KT_SESSION_STATUS_LABELS = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export const KT_REPO_TYPES = {
  git: 'Git',
  wiki: 'Wiki',
  drive: 'Drive',
  confluence: 'Confluence',
  notion: 'Notion',
  dashboard: 'Dashboard',
  other: 'Other',
};

export const KT_CREDENTIAL_STATUSES = {
  pending: 'bg-slate-100 text-slate-600',
  shared: 'bg-blue-50 text-blue-700',
  transferred: 'bg-emerald-50 text-emerald-700',
  revoked: 'bg-red-50 text-red-700',
  not_applicable: 'bg-slate-200 text-slate-500',
};

export const KT_CREDENTIAL_STATUS_LABELS = {
  pending: 'Pending',
  shared: 'Shared',
  transferred: 'Transferred',
  revoked: 'Revoked',
  not_applicable: 'N/A',
};

export const EXIT_INTERVIEW_STATUSES = {
  pending: 'bg-slate-100 text-slate-600',
  employee_submitted: 'bg-blue-50 text-blue-700',
  manager_submitted: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  waived: 'bg-slate-200 text-slate-600',
  cancelled: 'bg-slate-200 text-slate-500',
};

export const EXIT_INTERVIEW_STATUS_LABELS = {
  pending: 'Pending Employee',
  employee_submitted: 'Employee Submitted',
  manager_submitted: 'Manager Feedback',
  completed: 'Completed',
  waived: 'Waived',
  cancelled: 'Cancelled',
};

export const EXIT_RESIGNATION_REASON_LABELS = {
  career_growth: 'Career growth',
  compensation: 'Compensation',
  management: 'Management',
  work_life_balance: 'Work-life balance',
  relocation: 'Relocation',
  health: 'Health',
  retirement: 'Retirement',
  better_opportunity: 'Better opportunity',
  culture: 'Culture / environment',
  workload: 'Workload',
  personal: 'Personal reasons',
  other: 'Other',
};

export const EXIT_RESIGNATION_REASONS = Object.keys(EXIT_RESIGNATION_REASON_LABELS);

export const FNF_SETTLEMENT_STATUSES = {
  draft: 'bg-slate-100 text-slate-600',
  calculated: 'bg-blue-50 text-blue-700',
  pending_approval: 'bg-amber-50 text-amber-700',
  approved: 'bg-indigo-50 text-indigo-700',
  partially_paid: 'bg-orange-50 text-orange-700',
  paid: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-slate-200 text-slate-600',
};

export const FNF_SETTLEMENT_STATUS_LABELS = {
  draft: 'Draft',
  calculated: 'Calculated',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export const FNF_PAYMENT_MODES = ['bank', 'neft', 'rtgs', 'imps', 'upi', 'cheque', 'cash'];

export const FNF_PAYMENT_MODE_LABELS = {
  bank: 'Bank Transfer',
  neft: 'NEFT',
  rtgs: 'RTGS',
  imps: 'IMPS',
  upi: 'UPI',
  cheque: 'Cheque',
  cash: 'Cash',
};

export const FNF_PAYMENT_STATUS_LABELS = {
  pending: 'Awaiting approval',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Rejected',
  reversed: 'Reversed',
};

export const FNF_PAYMENT_STATUS_CLASSES = {
  pending: 'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  reversed: 'bg-slate-100 text-slate-600',
};

export const FNF_RECON_STATUS_LABELS = {
  unreconciled: 'Unreconciled',
  matched: 'Matched',
  discrepancy: 'Discrepancy',
};

export const ASSET_STATUS_OPTIONS = ['available', 'assigned', 'maintenance', 'retired'];

export const EMPTY_ASSET_FORM = {
  asset_code: '',
  name: '',
  category_id: '',
  vendor_id: '',
  brand: '',
  model: '',
  serial_number: '',
  purchase_value: '',
  purchase_date: '',
  warranty_expires: '',
  condition_notes: '',
};

export const MAINTENANCE_TYPES = ['repair', 'service', 'calibration', 'inspection'];

export const MAINTENANCE_TYPE_LABELS = {
  repair: 'Repair',
  service: 'Service',
  calibration: 'Calibration',
  inspection: 'Inspection',
};

export const MAINTENANCE_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];

export const MAINTENANCE_STATUS_BADGES = {
  scheduled: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-slate-200 text-slate-600',
};

export const EMPTY_ASSET_MAINTENANCE_FORM = {
  asset_id: '',
  maintenance_type: 'service',
  vendor_id: '',
  scheduled_date: new Date().toISOString().slice(0, 10),
  completed_date: '',
  cost: '',
  description: '',
  status: 'scheduled',
  next_due_date: '',
};

export const EMPTY_ASSET_CATEGORY_FORM = {
  name: '',
  code: '',
  is_active: true,
};

export const PROJECT_STATUS = {
  planning: 'bg-slate-100 text-slate-600',
  active: 'bg-emerald-50 text-emerald-700',
  on_hold: 'bg-amber-50 text-amber-700',
  completed: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-red-50 text-red-700',
};

export const PROJECT_MEMBER_ROLES = [
  { value: 'member', label: 'Team Member', description: 'Works on assigned tasks' },
  { value: 'team_leader', label: 'Team Leader', description: 'Leads a squad; can assign and manage tasks' },
  { value: 'admin', label: 'Project Admin', description: 'Full project configuration access' },
];

export const PROJECT_MEMBER_ROLE_LABELS = Object.fromEntries(
  PROJECT_MEMBER_ROLES.map((r) => [r.value, r.label])
);

export const PROJECT_MEMBER_ROLE_BADGE = {
  admin: 'bg-indigo-50 text-indigo-700',
  team_leader: 'bg-violet-50 text-violet-700',
  member: 'bg-slate-100 text-slate-600',
};

export const TASK_STATUS = {
  todo: { label: 'To Do', color: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In Progress', color: 'bg-blue-50 text-blue-700' },
  review: { label: 'Review', color: 'bg-purple-50 text-purple-700' },
  done: { label: 'Done', color: 'bg-emerald-50 text-emerald-700' },
};

export const TASK_COLUMNS = ['todo', 'in_progress', 'review', 'done'];

export const PRIORITY_BADGE = {
  low: 'bg-slate-100 text-slate-500',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-700',
  urgent: 'bg-red-100 text-red-800',
};

export const TASK_TYPES = {
  task: 'Task',
  bug: 'Bug',
  story: 'Story',
  subtask: 'Subtask',
};

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-Time' },
  { value: 'intern', label: 'Intern' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'contract', label: 'Contract' },
];

export const SYSTEM_ROLES = [
  { value: 'employee', label: ROLE_LABELS.employee },
  { value: 'manager', label: ROLE_LABELS.manager },
  { value: 'hr', label: ROLE_LABELS.hr },
  { value: 'owner', label: ROLE_LABELS.owner },
  { value: 'pf_team', label: ROLE_LABELS.pf_team },
  { value: 'auditor', label: ROLE_LABELS.auditor },
];

export const EMPLOYEE_DOCUMENTS = [
  { key: 'profile_photo', label: 'Profile Photo', accept: 'image/*,.pdf' },
  { key: 'resume', label: 'Resume', accept: '.pdf,.doc,.docx' },
  { key: 'offer_letter', label: 'Offer Letter', accept: '.pdf,.doc,.docx' },
  { key: 'aadhar_card', label: 'Aadhar Card', accept: 'image/*,.pdf' },
  { key: 'pan_card', label: 'PAN Card', accept: 'image/*,.pdf' },
  { key: 'address_proof', label: 'Address Proof', accept: 'image/*,.pdf' },
  { key: 'education_certificate', label: 'Education Certificate', accept: 'image/*,.pdf' },
  { key: 'experience_certificate', label: 'Experience Certificate', accept: 'image/*,.pdf' },
];

export const DOCUMENT_TEMPLATE_TYPES = [
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'appointment_letter', label: 'Appointment Letter' },
  { value: 'confirmation_letter', label: 'Confirmation Letter' },
  { value: 'increment_letter', label: 'Increment Letter' },
  { value: 'relieving_letter', label: 'Relieving Letter' },
  { value: 'experience_letter', label: 'Experience Letter' },
  { value: 'salary_certificate', label: 'Salary Certificate' },
  { value: 'other', label: 'Other' },
];

export const DOCUMENT_TEMPLATE_TYPE_LABELS = Object.fromEntries(
  DOCUMENT_TEMPLATE_TYPES.map((t) => [t.value, t.label])
);

export const DOCUMENT_TEMPLATE_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const WIZARD_STEPS = [
  { id: 1, label: 'Personal Information', short: 'Personal' },
  { id: 2, label: 'Employment Information', short: 'Employment' },
  { id: 3, label: 'Salary Structure', short: 'Salary' },
  { id: 4, label: 'Compliance & Bank', short: 'Compliance' },
  { id: 5, label: 'Document Uploads', short: 'Documents' },
  { id: 6, label: 'Emergency & Review', short: 'Review' },
];

export const EMERGENCY_RELATIONSHIPS = [
  'Spouse',
  'Parent',
  'Sibling',
  'Child',
  'Friend',
  'Other',
];
