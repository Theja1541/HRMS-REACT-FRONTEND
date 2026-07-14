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
  work_from_home: false,
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
  status: 'probation',
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

export function draftKey(tenantId) {
  return `hrms-employee-master-draft-${tenantId || 'default'}`;
}
