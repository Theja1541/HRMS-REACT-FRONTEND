export const POSTING_TYPES = [
  { value: 'internal', label: 'Internal only', description: 'Visible to employees on the internal job board' },
  { value: 'external', label: 'External only', description: 'Published on the public careers page' },
  { value: 'both', label: 'Internal + External', description: 'Employees can apply or refer; public careers page shows the role' },
];

export const POSTING_TYPE_LABELS = Object.fromEntries(POSTING_TYPES.map((t) => [t.value, t.label]));

export const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
];

export const EMPLOYMENT_TYPE_LABELS = Object.fromEntries(EMPLOYMENT_TYPES.map((t) => [t.value, t.label]));

export const APPLICATION_SOURCES = [
  { value: 'internal', label: 'Internal (Employee)' },
  { value: 'referral', label: 'Employee Referral' },
  { value: 'careers_page', label: 'Careers Page' },
  { value: 'direct', label: 'HR / Direct' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'agency', label: 'Agency' },
];

export const APPLICATION_SOURCE_LABELS = Object.fromEntries(
  APPLICATION_SOURCES.map((t) => [t.value, t.label])
);

export const EMPTY_OPENING_FORM = {
  title: '',
  department_id: '',
  designation_id: '',
  openings: 1,
  status: 'draft',
  posting_type: 'both',
  is_referral_eligible: true,
  location: '',
  employment_type: 'full_time',
  description: '',
  attachment: null,
  existing_attachment_url: '',
  existing_attachment_name: '',
  remove_attachment: false,
  min_experience: '',
  max_ctc: '',
  closes_at: '',
};

export const RECRUITMENT_WORKFLOW_STEPS = [
  {
    step: 1,
    title: 'Create & publish opening',
    detail: 'HR defines role, posting channel (internal / external / both), and referral eligibility.',
  },
  {
    step: 2,
    title: 'Candidates enter pipeline',
    detail: 'Internal apply, employee referrals, careers page, or HR manual add.',
  },
  {
    step: 3,
    title: 'Screen → Interview → Offer',
    detail: 'Move candidates through the ATS pipeline until hired or rejected.',
  },
  {
    step: 4,
    title: 'Hire & onboard',
    detail: 'On hire, create employee record and start onboarding checklist.',
  },
];
