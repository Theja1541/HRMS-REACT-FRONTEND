import { parseAmount } from './salaryStructure';
import { isValidInternationalPhone } from '../../../utils/validation';

export const OFFICIAL_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const DIGITS_12_PATTERN = /^[0-9]{12}$/;
export const DIGITS_10_PATTERN = /^[0-9]{10}$/;
export const BANK_ACCOUNT_PATTERN = /^[0-9]{9,18}$/;
export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function validateOfficialEmail(email) {
  const trimmed = email?.trim() ?? '';
  if (!trimmed) return 'Official Email is required';
  if (trimmed.length > 150) return 'Official Email must be 150 characters or fewer';
  if (!OFFICIAL_EMAIL_PATTERN.test(trimmed)) return 'Enter a valid official email address';
  return null;
}

export function validateGovernmentIds(form) {
  const errors = {};

  const pan = form.pan_number?.trim().toUpperCase() ?? '';
  if (pan && !PAN_PATTERN.test(pan)) {
    errors.pan_number = 'Invalid PAN format (e.g. ABCDE1234F)';
  }

  const aadhaar = digitsOnly(form.aadhaar_number);
  if (aadhaar && !DIGITS_12_PATTERN.test(aadhaar)) {
    errors.aadhaar_number = 'Aadhaar Number must be exactly 12 digits';
  }

  return errors;
}

export function validateBankingAndStatutory(form) {
  const errors = {};

  const account = digitsOnly(form.account_number);
  if (account && !BANK_ACCOUNT_PATTERN.test(account)) {
    errors.account_number = 'Bank account number must be 9 to 18 digits.';
  }

  const ifsc = form.ifsc_code?.trim().toUpperCase() ?? '';
  if (ifsc && !IFSC_PATTERN.test(ifsc)) {
    errors.ifsc_code = 'IFSC code must be in format SBIN0001234.';
  }

  const uan = digitsOnly(form.uan_number);
  if (form.pf_applicable) {
    if (!uan) {
      errors.uan_number = 'UAN number is required when PF is applicable';
    } else if (!DIGITS_12_PATTERN.test(uan)) {
      errors.uan_number = 'UAN number must be 12 digits.';
    }
  } else if (uan && !DIGITS_12_PATTERN.test(uan)) {
    errors.uan_number = 'UAN number must be 12 digits.';
  }

  const esic = digitsOnly(form.esic_number);
  if (form.esi_applicable) {
    if (!esic) {
      errors.esic_number = 'ESI number is required when ESI is applicable';
    } else if (!DIGITS_10_PATTERN.test(esic)) {
      errors.esic_number = 'ESI number must be 10 digits.';
    }
  } else if (esic && !DIGITS_10_PATTERN.test(esic)) {
    errors.esic_number = 'ESI number must be 10 digits.';
  }

  return errors;
}

export function validateStep(step, form) {
  const errors = {};

  if (step === 1) {
    const code = form.emp_code?.trim() ?? '';
    if (!code) errors.emp_code = 'Employee ID is required';
    else if (code.length > 20) errors.emp_code = 'Employee ID must be 20 characters or fewer';
    if (!form.first_name?.trim()) errors.first_name = 'First name is required';
    if (!form.last_name?.trim()) errors.last_name = 'Last name is required';
    const emailError = validateOfficialEmail(form.email);
    if (emailError) errors.email = emailError;
    if (form.phone && !isValidInternationalPhone(form.phone)) {
      errors.phone = 'Enter a valid international mobile number';
    }
  }

  if (step === 2) {
    if (!form.date_of_joining) errors.date_of_joining = 'Joining date is required';
    if (!form.system_role) errors.system_role = 'Role is required';
  }

  if (step === 3) {
    const ss = form.salary_structure;
    if (!ss?.skip_salary) {
      if (!parseAmount(ss?.earnings?.basic)) {
        errors.salary_basic = 'Basic salary (monthly) is required';
      }
    }
  }

  if (step === 4) {
    Object.assign(errors, validateGovernmentIds(form));
    Object.assign(errors, validateBankingAndStatutory(form));
  }

  if (step === 6) {
    const contacts = form.emergency_contacts || [];
    const filled = contacts.filter((c) => c.contact_name?.trim() || c.contact_phone?.trim());
    filled.forEach((c, i) => {
      if (c.contact_name?.trim() && !c.contact_phone?.trim()) {
        errors[`emergency_contacts.${i}.contact_phone`] = 'Phone is required';
      }
      if (c.contact_phone?.trim() && !c.contact_name?.trim()) {
        errors[`emergency_contacts.${i}.contact_name`] = 'Name is required';
      }
      if (c.contact_phone?.trim() && !isValidInternationalPhone(c.contact_phone)) {
        errors[`emergency_contacts.${i}.contact_phone`] = 'Enter a valid international mobile number';
      }
    });
  }

  return errors;
}

export function validateAllSteps(form) {
  let allErrors = {};
  let firstInvalidStep = null;
  for (let s = 1; s <= 6; s += 1) {
    const stepErrors = validateStep(s, form);
    if (Object.keys(stepErrors).length && firstInvalidStep === null) {
      firstInvalidStep = s;
    }
    allErrors = { ...allErrors, ...stepErrors };
  }
  return { errors: allErrors, firstInvalidStep };
}
