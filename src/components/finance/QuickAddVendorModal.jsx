import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api';
import InternationalPhoneInput from '../shared/InternationalPhoneInput';
import { EMPTY_VENDOR_FORM, VENDOR_TYPES } from '../../constants/finance';
import { cn } from '../../utils/helpers';
import {
  formatBankAccountInput,
  formatIfscInput,
  formatPhoneForStorage,
  isValidEmail,
  isValidInternationalPhone,
  isValidUpiId,
  IFSC_PATTERN,
  BANK_ACCOUNT_PATTERN,
} from '../../utils/validation';

function buildPayload(form) {
  return {
    name: form.name.trim(),
    type: form.type,
    contact_person: form.contact_person.trim() || null,
    phone: formatPhoneForStorage(form.phone),
    email: form.email.trim().toLowerCase() || null,
    address: form.address.trim() || null,
    gst_applicable: form.gst_applicable,
    gstin: form.gst_applicable ? form.gstin.trim().toUpperCase() : null,
    bank_details: {
      ...form.bank_details,
      account_number: formatBankAccountInput(form.bank_details.account_number) || '',
      ifsc: formatIfscInput(form.bank_details.ifsc) || '',
      upi: form.bank_details.upi.trim().toLowerCase() || '',
    },
    active: true,
  };
}

function Field({ label, value, onChange, type = 'text', required, placeholder, error, inputMode, className }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'mt-1 w-full px-3 py-2 border rounded-lg text-sm',
          error ? 'border-red-300' : 'border-slate-200',
          className
        )}
      />
      {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}

/**
 * Lightweight vendor create modal — usable from Day Book / Transactions without leaving the page.
 */
export default function QuickAddVendorModal({ open, onClose, onCreated }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY_VENDOR_FORM });
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const createMutation = useMutation({
    mutationFn: (payload) => financeApi.createVendor(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['finance-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['finance-vendors-active'] });
      const vendor = res?.data?.vendor || res?.data;
      onCreated?.(vendor);
      setForm({ ...EMPTY_VENDOR_FORM });
      setFormError('');
      setFieldErrors({});
      onClose?.();
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to create vendor'),
  });

  if (!open) return null;

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Vendor name is required';
    if (form.gst_applicable && !form.gstin.trim()) errors.gstin = 'GSTIN is required when GST is applicable';
    if (form.phone.trim() && !isValidInternationalPhone(form.phone)) {
      errors.phone = 'Enter a valid phone number';
    }
    if (form.email.trim() && !isValidEmail(form.email)) {
      errors.email = 'Enter a valid email';
    }
    if (form.bank_details.upi.trim() && !isValidUpiId(form.bank_details.upi)) {
      errors.upi = 'Enter a valid UPI ID (e.g. name@bank)';
    }
    const accountNumber = formatBankAccountInput(form.bank_details.account_number);
    if (accountNumber && !BANK_ACCOUNT_PATTERN.test(accountNumber)) {
      errors.account_number = 'Account number must be 9 to 18 digits';
    }
    const ifsc = formatIfscInput(form.bank_details.ifsc);
    if (ifsc && !IFSC_PATTERN.test(ifsc)) {
      errors.ifsc = 'IFSC must be 11 characters (e.g. SBIN0001234)';
    }
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError(Object.values(errors)[0]);
      return;
    }
    createMutation.mutate(buildPayload(form));
  };

  const handleClose = () => {
    setForm({ ...EMPTY_VENDOR_FORM });
    setFormError('');
    setFieldErrors({});
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
          <div>
            <h3 className="font-semibold text-slate-900">Add Vendor</h3>
            <p className="text-xs text-slate-500 mt-0.5">Quick add — you can edit bank/GST details later</p>
          </div>
          <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs border border-red-100">{formError}</div>
          )}

          <Field
            label="Vendor name"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            error={fieldErrors.name}
            required
            placeholder="e.g. ABC Supplies"
          />

          <div>
            <label className="text-xs font-medium text-slate-600">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              {VENDOR_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Contact person"
              value={form.contact_person}
              onChange={(v) => setForm({ ...form, contact_person: v })}
            />
            <InternationalPhoneInput
              label="Phone"
              value={form.phone}
              onChange={(v) => {
                setForm({ ...form, phone: v });
                if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              error={fieldErrors.phone}
            />
          </div>

          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => {
              setForm({ ...form, email: v });
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={fieldErrors.email}
            placeholder="name@company.com"
          />

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <p className="text-xs font-medium text-slate-700">Bank / UPI (optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Bank name"
                value={form.bank_details.bank_name}
                onChange={(v) => setForm({ ...form, bank_details: { ...form.bank_details, bank_name: v } })}
              />
              <Field
                label="Account number"
                value={form.bank_details.account_number}
                onChange={(v) => {
                  setForm({
                    ...form,
                    bank_details: { ...form.bank_details, account_number: formatBankAccountInput(v) },
                  });
                  if (fieldErrors.account_number) {
                    setFieldErrors((prev) => ({ ...prev, account_number: undefined }));
                  }
                }}
                inputMode="numeric"
                error={fieldErrors.account_number}
              />
              <Field
                label="IFSC"
                value={form.bank_details.ifsc}
                onChange={(v) => {
                  setForm({
                    ...form,
                    bank_details: { ...form.bank_details, ifsc: formatIfscInput(v) },
                  });
                  if (fieldErrors.ifsc) setFieldErrors((prev) => ({ ...prev, ifsc: undefined }));
                }}
                error={fieldErrors.ifsc}
                className="font-mono uppercase"
              />
              <Field
                label="UPI ID"
                value={form.bank_details.upi}
                onChange={(v) => {
                  setForm({ ...form, bank_details: { ...form.bank_details, upi: v.toLowerCase() } });
                  if (fieldErrors.upi) setFieldErrors((prev) => ({ ...prev, upi: undefined }));
                }}
                error={fieldErrors.upi}
                placeholder="name@bank"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={handleClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Saving…' : 'Save Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
