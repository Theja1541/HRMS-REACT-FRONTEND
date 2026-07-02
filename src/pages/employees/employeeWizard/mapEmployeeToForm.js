import { INITIAL_FORM } from './constants';
import { mapSalaryRecordToStructure } from './salaryStructure';

/** Map API employee + optional active salary record into wizard form state. */
export function mapEmployeeToForm(employee, salary = null) {
  if (!employee) return { ...INITIAL_FORM };

  const contacts =
    employee.emergencyContacts?.length > 0
      ? employee.emergencyContacts.map((c) => ({
          contact_name: c.contact_name || '',
          contact_phone: c.contact_phone || '',
          relationship: c.relationship || '',
          is_primary: Boolean(c.is_primary),
        }))
      : INITIAL_FORM.emergency_contacts;

  return {
    ...INITIAL_FORM,
    emp_code: employee.emp_code || '',
    first_name: employee.first_name || '',
    last_name: employee.last_name || '',
    email: employee.email || '',
    phone: employee.phone || '',
    date_of_birth: employee.date_of_birth || '',
    gender: employee.gender || '',
    blood_group: employee.blood_group || '',
    permanent_address: employee.permanent_address || employee.address_line1 || '',
    system_role: employee.system_role || 'employee',
    department_id: employee.department_id ? String(employee.department_id) : '',
    designation_id: employee.designation_id ? String(employee.designation_id) : '',
    date_of_joining: employee.date_of_joining || '',
    branch_id: employee.branch_id ? String(employee.branch_id) : '',
    employment_type: employee.employment_type || 'full_time',
    reporting_to: employee.reporting_to ? String(employee.reporting_to) : '',
    work_from_home: Boolean(employee.work_from_home),
    uan_number: employee.uan_number || '',
    bank_name: employee.bank_name || '',
    account_number: employee.account_number || '',
    ifsc_code: employee.ifsc_code || '',
    pan_number: employee.pan_number || '',
    aadhaar_number: employee.aadhaar_number || '',
    pf_applicable: Boolean(employee.pf_applicable),
    esi_applicable: Boolean(employee.esi_applicable),
    esic_number: employee.esic_number || '',
    notes: employee.notes || '',
    status: employee.status || 'probation',
    emergency_contacts: contacts,
    salary_structure: salary
      ? mapSalaryRecordToStructure(salary)
      : { ...INITIAL_FORM.salary_structure },
  };
}
