import { isValidPhoneNumber } from 'libphonenumber-js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const UPI_PATTERN = /^[\w.\-]{2,256}@[\w.\-]{2,64}$/;

export function isValidInternationalPhone(value) {
  if (!value?.trim()) return true;
  const normalized = value.startsWith('+') ? value : `+${value}`;
  return isValidPhoneNumber(normalized);
}

export function isValidEmail(value) {
  if (!value?.trim()) return true;
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidUpiId(value) {
  if (!value?.trim()) return true;
  return UPI_PATTERN.test(value.trim().toLowerCase());
}

export function formatPhoneForStorage(value) {
  if (!value?.trim()) return null;
  const digits = value.replace(/\s/g, '');
  if (digits.startsWith('+')) return digits;
  return `+${digits}`;
}

export const BANK_ACCOUNT_PATTERN = /^[0-9]{9,18}$/;
export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function formatBankAccountInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 18);
}

export function formatIfscInput(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
}

export function validateBankDetails({ bank_account_number, bank_ifsc_code } = {}) {
  const errors = {};
  const account = formatBankAccountInput(bank_account_number);
  if (account && !BANK_ACCOUNT_PATTERN.test(account)) {
    errors.bank_account_number = 'Bank account number must be 9 to 18 digits.';
  }
  const ifsc = formatIfscInput(bank_ifsc_code);
  if (ifsc && !IFSC_PATTERN.test(ifsc)) {
    errors.bank_ifsc_code = 'IFSC code must be in format SBIN0001234.';
  }
  return errors;
}
