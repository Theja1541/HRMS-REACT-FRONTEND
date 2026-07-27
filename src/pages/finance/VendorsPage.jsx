import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Search, Trash2, Truck } from 'lucide-react';
import { financeApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import FinanceModuleGuide from '../../components/finance/FinanceModuleGuide';
import TablePagination from '../../components/shared/TablePagination';
import InternationalPhoneInput from '../../components/shared/InternationalPhoneInput';
import { EMPTY_VENDOR_FORM, VENDOR_TYPES, VENDOR_TYPE_LABELS, formatVendorBankDetails } from '../../constants/finance';
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
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';
import { useTablePagination } from '../../hooks/useTablePagination';

function vendorToForm(vendor) {
  return {
    name: vendor.name || '',
    type: vendor.type || 'supplier',
    contact_person: vendor.contact_person || '',
    phone: vendor.phone || '',
    email: vendor.email || '',
    address: vendor.address || '',
    gst_applicable: Boolean(vendor.gst_applicable),
    gstin: vendor.gstin || '',
    bank_details: {
      account_name: vendor.bank_details?.account_name || '',
      bank_name: vendor.bank_details?.bank_name || '',
      branch: vendor.bank_details?.branch || '',
      account_number: vendor.bank_details?.account_number || '',
      ifsc: vendor.bank_details?.ifsc || '',
      upi: vendor.bank_details?.upi || '',
    },
    active: vendor.active !== false,
  };
}

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
    active: form.active,
  };
}

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_VENDOR_FORM);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [search, typeFilter, showInactive] });

  const listParams = useMemo(
    () => ({
      search: search || undefined,
      type: typeFilter || undefined,
      active_only: showInactive ? undefined : 'true',
    }),
    [search, typeFilter, showInactive]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['finance-vendors', selectedTenantId, listParams],
    queryFn: () => financeApi.listVendors(listParams),
    enabled: !tenantRequired,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['finance-vendors'] });

  const createMutation = useMutation({
    mutationFn: (payload) => financeApi.createVendor(payload),
    onSuccess: () => {
      invalidate();
      setModal(null);
      setForm(EMPTY_VENDOR_FORM);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to create vendor'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => financeApi.updateVendor(id, payload),
    onSuccess: () => {
      invalidate();
      setModal(null);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to update vendor'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => financeApi.deleteVendor(id),
    onSuccess: invalidate,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }) => financeApi.updateVendor(id, { active }),
    onSuccess: invalidate,
  });

  const vendors = data?.data?.vendors || [];
  const { items: visibleVendors, pagination } = paginateClient(vendors);
  const activeCount = vendors.filter((v) => v.active).length;
  const gstCount = vendors.filter((v) => v.gst_applicable).length;

  const openCreate = () => {
    setForm(EMPTY_VENDOR_FORM);
    setFormError('');
    setFieldErrors({});
    setModal('create');
  };

  const openEdit = (vendor) => {
    setForm(vendorToForm(vendor));
    setFormError('');
    setFieldErrors({});
    setModal({ mode: 'edit', id: vendor.id });
  };

  const validateForm = () => {
    const errors = {};

    if (!form.name.trim()) {
      errors.name = 'Vendor name is required';
    }
    if (form.gst_applicable && !form.gstin.trim()) {
      errors.gstin = 'GSTIN is required when GST is applicable';
    }
    if (form.phone.trim() && !isValidInternationalPhone(form.phone)) {
      errors.phone = 'Enter a valid international mobile number';
    }
    if (form.email.trim() && !isValidEmail(form.email)) {
      errors.email = 'Enter a valid email address (e.g. name@company.com)';
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

    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError(Object.values(errors)[0]);
      return;
    }

    const payload = buildPayload(form);
    if (modal === 'create') {
      createMutation.mutate(payload);
    } else if (modal?.mode === 'edit') {
      updateMutation.mutate({ id: modal.id, payload });
    }
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to manage vendors.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Finance · Vendors"
        title="Vendors"
        subtitle="Suppliers you pay"
        actions={
          <button type="button" onClick={openCreate} className="btn-primary">
            <Plus size={14} /> Add Vendor
          </button>
        }
      />

      <FinanceModuleGuide page="vendors" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Vendors" value={vendors.length} icon={Truck} />
        <StatCard label="Active" value={activeCount} delta={`${vendors.length - activeCount} inactive`} deltaType="neutral" />
        <StatCard label="GST Registered" value={gstCount} delta="GST applicable vendors" deltaType="neutral" />
      </div>

      <div className="card overflow-hidden">
        <div className="ds-toolbar">
          <div className="toolbar-row">
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, contact, email, GSTIN…"
              className="ds-input pl-9 w-full"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="ds-select w-full sm:w-auto sm:min-w-[140px]"
          >
            <option value="">All types</option>
            {VENDOR_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600 px-2 whitespace-nowrap">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-slate-300"
            />
            Show inactive
          </label>
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        {isLoading ? (
          <p className="text-center py-12 text-slate-400">Loading vendors…</p>
        ) : error ? (
          <p className="text-center py-12 text-red-500">Failed to load vendors</p>
        ) : vendors.length === 0 ? (
          <p className="text-center py-12 text-slate-400">No vendors found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Vendor</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold">GSTIN</th>
                  <th className="text-left px-4 py-3 font-semibold">Bank</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleVendors.map((vendor) => (
                  <tr key={vendor.id} className={cn('hover:bg-slate-50', !vendor.active && 'opacity-60')}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{vendor.name}</p>
                      {vendor.contact_person && (
                        <p className="text-slate-500">{vendor.contact_person}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{VENDOR_TYPE_LABELS[vendor.type] || vendor.type}</td>
                    <td className="px-4 py-3">
                      {vendor.phone && <p>{vendor.phone}</p>}
                      {vendor.email && <p className="text-slate-500">{vendor.email}</p>}
                      {!vendor.phone && !vendor.email && '—'}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {vendor.gst_applicable ? vendor.gstin || '—' : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <VendorBankCell bankDetails={vendor.bank_details} />
                    </td>
                    <td className="px-4 py-3">
                      <ActiveToggle
                        active={vendor.active}
                        disabled={toggleActiveMutation.isPending}
                        onChange={(active) => toggleActiveMutation.mutate({ id: vendor.id, active })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(vendor)}
                          className="p-1.5 text-slate-400 hover:text-brand-600"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete vendor "${vendor.name}"?`)) {
                              deleteMutation.mutate(vendor.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!isLoading && vendors.length > 0 && (
        <TablePagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      {modal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-semibold text-slate-900">
                {modal === 'create' ? 'Add Vendor' : 'Edit Vendor'}
              </h3>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs border border-red-100">{formError}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Name"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  error={fieldErrors.name}
                  required
                />
                <Field
                  label="Type"
                  value={form.type}
                  onChange={(v) => setForm({ ...form, type: v })}
                  placeholder="e.g. Supplier, Service Provider"
                />
                <Field label="Contact Person" value={form.contact_person} onChange={(v) => setForm({ ...form, contact_person: v })} />
                <InternationalPhoneInput
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => {
                    setForm({ ...form, phone: v });
                    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  error={fieldErrors.phone}
                />
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
                <div className="md:col-span-2">
                  <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.gst_applicable}
                    onChange={(e) => setForm({ ...form, gst_applicable: e.target.checked, gstin: e.target.checked ? form.gstin : '' })}
                    className="rounded border-slate-300"
                  />
                  GST applicable
                </label>
                {form.gst_applicable && (
                  <div className="mt-3">
                    <Field
                      label="GSTIN"
                      value={form.gstin}
                      onChange={(v) => setForm({ ...form, gstin: v.toUpperCase() })}
                      placeholder="22AAAAA0000A1Z5"
                      error={fieldErrors.gstin}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-1">Bank Details</h4>
                <p className="text-xs text-slate-500 mb-3">
                  Used for bank transfer, UPI, and cheque payments on transactions. Account number is masked in lists.
                </p>
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Account Name (as per bank)"
                      value={form.bank_details.account_name}
                      onChange={(v) => setForm({ ...form, bank_details: { ...form.bank_details, account_name: v } })}
                    />
                    <Field
                      label="Bank Name"
                      value={form.bank_details.bank_name}
                      onChange={(v) => setForm({ ...form, bank_details: { ...form.bank_details, bank_name: v } })}
                      placeholder="e.g. HDFC Bank"
                    />
                    <Field
                      label="Branch"
                      value={form.bank_details.branch}
                      onChange={(v) => setForm({ ...form, bank_details: { ...form.bank_details, branch: v } })}
                      placeholder="e.g. MG Road, Bengaluru"
                    />
                    <Field
                      label="Account Number"
                      value={form.bank_details.account_number}
                      onChange={(v) => {
                        setForm({ ...form, bank_details: { ...form.bank_details, account_number: formatBankAccountInput(v) } });
                        if (fieldErrors.account_number) setFieldErrors((prev) => ({ ...prev, account_number: undefined }));
                      }}
                      inputMode="numeric"
                      placeholder="9–18 digits"
                      error={fieldErrors.account_number}
                    />
                    <Field
                      label="IFSC Code"
                      value={form.bank_details.ifsc}
                      onChange={(v) => {
                        setForm({ ...form, bank_details: { ...form.bank_details, ifsc: formatIfscInput(v) } });
                        if (fieldErrors.ifsc) setFieldErrors((prev) => ({ ...prev, ifsc: undefined }));
                      }}
                      placeholder="SBIN0001234"
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
                      placeholder="vendor@okhdfcbank"
                    />
                  </div>
                </div>
              </div>

              {modal?.mode === 'edit' && (
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Active vendor
                </label>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function VendorBankCell({ bankDetails }) {
  const formatted = formatVendorBankDetails(bankDetails);
  if (!formatted) return '—';

  return (
    <div className="max-w-[220px]" title={formatted.summary}>
      {formatted.lines.map((line) => (
        <p
          key={line.label}
          className={cn('leading-snug', line.mono ? 'font-mono text-slate-600' : 'text-slate-800')}
        >
          <span className="text-slate-400 font-sans">{line.label}: </span>
          {line.value}
        </p>
      ))}
    </div>
  );
}

function ActiveToggle({ active, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!active)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50',
        active ? 'bg-emerald-500' : 'bg-slate-300'
      )}
      title={active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          active ? 'translate-x-4' : 'translate-x-0'
        )}
      />
      <span className="sr-only">{active ? 'Active' : 'Inactive'}</span>
    </button>
  );
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
          error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200',
          className
        )}
      />
      {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
