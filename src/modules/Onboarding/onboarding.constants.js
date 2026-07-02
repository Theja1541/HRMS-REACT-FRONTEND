/** Onboarding checklist categories — matches backend ENUM */
export const ONBOARDING_CATEGORIES = [
  { value: 'documentation', label: 'Documentation', description: 'ID proofs, bank details, signed letters' },
  { value: 'it', label: 'IT & Assets', description: 'Laptop, email, system access' },
  { value: 'hr', label: 'HR & Induction', description: 'Policies, orientation, buddy assignment' },
  { value: 'compliance', label: 'Compliance', description: 'PF, ESIC, statutory filings' },
];

export const CATEGORY_META = Object.fromEntries(
  ONBOARDING_CATEGORIES.map((c) => [c.value, c])
);

export const WORKFLOW_STEPS = [
  {
    step: 1,
    title: 'Build checklist template',
    description: 'Add the standard tasks every new joiner must complete (documents, IT, HR, compliance).',
  },
  {
    step: 2,
    title: 'Start onboarding',
    description: 'Pick a new employee — the system copies your template into their personal checklist.',
  },
  {
    step: 3,
    title: 'Track & complete',
    description: 'HR marks tasks done until the joiner is fully onboarded.',
  },
];

export const SAMPLE_TEMPLATE_TASKS = [
  { task_name: 'Submit PAN & Aadhaar copies', category: 'documentation', sort_order: 1, is_mandatory: true },
  { task_name: 'Sign offer letter & NDA', category: 'hr', sort_order: 2, is_mandatory: true },
  { task_name: 'Laptop provisioning & email setup', category: 'it', sort_order: 3, is_mandatory: true },
  { task_name: 'PF & ESIC enrollment', category: 'compliance', sort_order: 4, is_mandatory: true },
  { task_name: 'HR induction session', category: 'hr', sort_order: 5, is_mandatory: false },
];

export function emptyTemplateForm(sortOrder = 0) {
  return {
    task_name: '',
    category: 'hr',
    sort_order: sortOrder,
    is_mandatory: true,
  };
}

export function categoryLabel(value) {
  return CATEGORY_META[value]?.label || value;
}
