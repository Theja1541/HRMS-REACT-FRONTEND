import { digitsOnly } from './validation';
import { statutoryFieldsFromForm } from './statutoryFields';
import { formatPhoneForStorage } from '../../../utils/validation';

/** Normalize roles + default system_role for create/update API payloads. */
export function resolveEmployeeRolePayload(form) {
  const roles =
    Array.isArray(form?.roles) && form.roles.length > 0
      ? form.roles
      : form?.system_role
        ? [form.system_role]
        : [];
  const system_role = form?.system_role || roles[0] || 'employee';
  return { roles, system_role };
}

export function buildPayload(form) {
  const contacts = (form.emergency_contacts || [])
    .filter((c) => c.contact_name?.trim() && c.contact_phone?.trim())
    .map((c, index) => ({
      contact_name: c.contact_name.trim(),
      contact_phone: formatPhoneForStorage(c.contact_phone) || c.contact_phone.trim(),
      relationship: c.relationship?.trim() || null,
      is_primary: c.is_primary || (index === 0 && !form.emergency_contacts.some((x) => x.is_primary)),
    }));

  const primary = contacts.find((c) => c.is_primary) || contacts[0];
  const statutory = statutoryFieldsFromForm(form);
  const { roles, system_role } = resolveEmployeeRolePayload(form);

  return {
    emp_code: form.emp_code.trim(),
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: formatPhoneForStorage(form.phone),
    date_of_birth: form.date_of_birth || null,
    gender: form.gender || null,
    blood_group: form.blood_group || null,
    permanent_address: form.permanent_address.trim() || null,
    roles,
    system_role,
    department_id: form.department_id ? parseInt(form.department_id, 10) : null,
    designation_id: form.designation_id ? parseInt(form.designation_id, 10) : null,
    date_of_joining: form.date_of_joining,
    branch_id: form.branch_id ? parseInt(form.branch_id, 10) : null,
    employment_type: form.employment_type,
    reporting_to: form.reporting_to ? parseInt(form.reporting_to, 10) : null,
    attendance_policy_id: form.attendance_policy_id ? parseInt(form.attendance_policy_id, 10) : null,
    work_mode: form.work_mode || 'office',
    aadhaar_number: digitsOnly(form.aadhaar_number) || null,
    bank_name: form.bank_name.trim() || null,
    account_number: digitsOnly(form.account_number) || null,
    ifsc_code: form.ifsc_code.trim().toUpperCase() || null,
    pan_number: form.pan_number.trim().toUpperCase() || null,
    ...statutory,
    emergency_name: primary?.contact_name || null,
    emergency_contact: primary?.contact_phone || null,
    emergency_contacts: contacts,
    notes: form.notes.trim() || null,
    has_probation: form.has_probation === true,
    probation_duration_months:
      form.has_probation === true ? parseInt(form.probation_duration_months, 10) || 6 : null,
    status: form.has_probation === true ? 'probation' : 'active',
  };
}
