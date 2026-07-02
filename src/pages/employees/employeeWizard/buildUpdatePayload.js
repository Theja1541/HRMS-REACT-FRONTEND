import { statutoryFieldsFromForm } from './statutoryFields';
import { formatPhoneForStorage } from '../../../utils/validation';

function strOrNull(v) {
  return v === '' || v === undefined ? null : v;
}

function panOrNull(v) {
  const value = String(v ?? '').trim().toUpperCase();
  return value || null;
}

function digitsOrNull(v) {
  const value = String(v ?? '').replace(/\D/g, '');
  return value || null;
}

function numOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function dateOrNull(v) {
  if (!v) return null;
  return String(v).slice(0, 10);
}

/** Whitelisted payload for PUT /employees/:id — avoids sending nested relations/extra DB fields. */
export function buildUpdatePayload(form) {
  const statutory = statutoryFieldsFromForm(form);

  return {
    emp_code: form.emp_code?.trim() ?? '',
    first_name: form.first_name,
    last_name: form.last_name,
    email: form.email?.trim().toLowerCase() ?? '',
    personal_email: strOrNull(form.personal_email),
    phone: formatPhoneForStorage(form.phone),
    emergency_contact: formatPhoneForStorage(form.emergency_contact),
    emergency_name: strOrNull(form.emergency_name),
    gender: strOrNull(form.gender),
    date_of_birth: dateOrNull(form.date_of_birth),
    blood_group: strOrNull(form.blood_group),
    marital_status: strOrNull(form.marital_status),
    department_id: numOrNull(form.department_id),
    designation_id: numOrNull(form.designation_id),
    branch_id: numOrNull(form.branch_id),
    reporting_to: numOrNull(form.reporting_to),
    employment_type: form.employment_type || 'full_time',
    date_of_joining: dateOrNull(form.date_of_joining),
    status: form.status,
    system_role: form.system_role,
    pan_number: panOrNull(form.pan_number),
    aadhaar_number: digitsOrNull(form.aadhaar_number),
    ...statutory,
    work_from_home: !!form.work_from_home,
    notes: strOrNull(form.notes),
    bank_name: strOrNull(form.bank_name),
    account_number: digitsOrNull(form.account_number),
    ifsc_code: form.ifsc_code ? String(form.ifsc_code).trim().toUpperCase() : null,
    account_type: form.account_type || undefined,
    address_line1: strOrNull(form.address_line1),
    city: strOrNull(form.city),
    state: strOrNull(form.state),
    pincode: strOrNull(form.pincode),
    permanent_address: strOrNull(form.permanent_address),
  };
}
