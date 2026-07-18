import { INITIAL_SALARY_STRUCTURE } from './salaryStructure';

export const INITIAL_FORM = {
  emp_code: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  gender: '',
  blood_group: '',
  permanent_address: '',
  roles: ['employee'],
  system_role: 'employee',
  department_id: '',
  designation_id: '',
  date_of_joining: new Date().toISOString().slice(0, 10),
  branch_id: '',
  employment_type: 'full_time',
  reporting_to: '',
  attendance_policy_id: '',
  work_mode: 'office',
  uan_number: '',
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  pan_number: '',
  aadhaar_number: '',
  pf_applicable: false,
  esi_applicable: false,
  esic_number: '',
  notes: '',
  has_probation: false,
  probation_duration_months: 6,
  status: 'active',
  emergency_contacts: [
    { contact_name: '', contact_phone: '', relationship: '', is_primary: true },
  ],
  salary_structure: {
    skip_salary: false,
    earnings: { ...INITIAL_SALARY_STRUCTURE.earnings },
    deductions: { ...INITIAL_SALARY_STRUCTURE.deductions },
    employer: { ...INITIAL_SALARY_STRUCTURE.employer },
  },
  salary_structure_template_id: '',
};

export const WORK_MODE_OPTIONS = [
  { value: 'office', label: 'Office (On-site)' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
];

export const WORK_MODE_LABELS = Object.fromEntries(WORK_MODE_OPTIONS.map((o) => [o.value, o.label]));

export const PROBATION_DURATION_OPTIONS = [1, 2, 3, 6, 9, 12];

export function draftKey(tenantId) {
  return `hrms-employee-master-draft-${tenantId || 'default'}`;
}
