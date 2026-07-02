import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, ImageIcon } from 'lucide-react';
import { billingApi, tenantApi } from '../../api';
import {
  emptyTenantForm,
  emptyBranchRow,
  INDUSTRY_TYPES,
  COMPANY_SIZES,
  TENANT_STATUSES,
  BILLING_CYCLES,
  INDIAN_STATES,
  INDIAN_STATES_WITH_CODES,
  getStateCode,
  tenantToForm,
} from '../../constants/tenant';
import { cn, resolveAssetUrl } from '../../utils/helpers';
import InternationalPhoneInput from '../../components/shared/InternationalPhoneInput';
import {
  formatPhoneForStorage,
  isValidInternationalPhone,
  formatBankAccountInput,
  formatIfscInput,
  validateBankDetails,
} from '../../utils/validation';
import {
  calculateSubscriptionEndDate,
  formatSubscriptionDateDisplay,
} from '../../utils/subscriptionDates';

const STEPS = [
  { id: 1, label: 'Company' },
  { id: 2, label: 'Contact' },
  { id: 3, label: 'Address' },
  { id: 4, label: 'Company Admin' },
  { id: 5, label: 'Subscription' },
];

function Field({ label, required, children, className, hint, error }) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {hint && !error && <p className="mt-1 text-[10px] text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-[10px] text-red-600">{error}</p>}
    </div>
  );
}

function Input({ value, onChange, type = 'text', required, placeholder, readOnly, maxLength, inputMode }) {
  return (
    <input
      type={type}
      required={required}
      readOnly={readOnly}
      placeholder={placeholder}
      value={value}
      maxLength={maxLength}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm',
        readOnly && 'bg-slate-50 text-slate-500 cursor-default'
      )}
    />
  );
}

function Select({ value, onChange, options, placeholder, required }) {
  return (
    <select
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
    >
      <option value="">{placeholder || 'Select…'}</option>
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  );
}

function SectionTitle({ children }) {
  return <h4 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4 mt-2">{children}</h4>;
}

function LogoUpload({ previewUrl, uploading, error, onFile, onClear }) {
  const [dragOver, setDragOver] = useState(false);

  const pickFile = useCallback(
    (file) => {
      if (!file) return;
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
      if (!allowed.includes(file.type)) return;
      if (file.size > 2 * 1024 * 1024) return;
      onFile(file);
    },
    [onFile]
  );

  return (
    <div className="space-y-1">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-colors',
          dragOver ? 'border-brand-500 bg-brand-50/50' : previewUrl ? 'border-brand-300 bg-brand-50/20' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
        )}
      >
        {previewUrl ? (
          <div className="flex items-center gap-4 p-4">
            <img src={previewUrl} alt="Company logo preview" className="w-16 h-16 rounded-lg object-contain border border-slate-200 bg-white" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-800">Logo selected</p>
              <p className="text-[10px] text-slate-400">{uploading ? 'Uploading…' : 'JPG, PNG, WEBP or SVG — max 2 MB'}</p>
            </div>
            <button type="button" onClick={onClear} disabled={uploading} className="p-1 rounded-md hover:bg-slate-200 text-slate-400">
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 p-5 cursor-pointer text-center">
            <ImageIcon size={20} className="text-slate-400" />
            <span className="text-xs text-slate-500">
              Drag & drop or <span className="text-brand-600 font-medium">browse</span>
            </span>
            <span className="text-[10px] text-slate-400">JPG, PNG, WEBP, SVG — max 2 MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </label>
        )}
      </div>
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
}

function BranchList({ title, rows, onChange, onAdd, onRemove }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600">{title}</p>
        <button type="button" onClick={onAdd} className="text-xs text-brand-600 font-medium flex items-center gap-1">
          <Plus size={12} /> Add
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">None added</p>
      ) : (
        rows.map((row, idx) => (
          <div key={idx} className="p-3 border border-slate-200 rounded-lg space-y-2 bg-slate-50/50">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">#{idx + 1}</span>
              <button type="button" onClick={() => onRemove(idx)} className="text-red-500 hover:text-red-700">
                <Trash2 size={14} />
              </button>
            </div>
            <Input value={row.name} onChange={(v) => onChange(idx, 'name', v)} placeholder="Branch name" />
            <Input value={row.address} onChange={(v) => onChange(idx, 'address', v)} placeholder="Address" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input value={row.city} onChange={(v) => onChange(idx, 'city', v)} placeholder="City" />
              <Input value={row.state} onChange={(v) => onChange(idx, 'state', v)} placeholder="State" />
              <Input value={row.pincode} onChange={(v) => onChange(idx, 'pincode', v)} placeholder="ZIP" />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function CreateTenantModal({ open, tenantId, saving, error, onClose, onSubmit }) {
  const isEdit = Boolean(tenantId);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyTenantForm());
  const [logoPreview, setLogoPreview] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [pendingLogoFile, setPendingLogoFile] = useState(null);
  const [bankErrors, setBankErrors] = useState({});

  const { data: tenantData, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant-edit', tenantId],
    queryFn: () => tenantApi.get(tenantId),
    enabled: open && !!tenantId,
  });

  const { data: plansData } = useQuery({
    queryKey: ['billing-plans-active'],
    queryFn: () => billingApi.listPlans({ limit: 100, is_active: true }),
    enabled: open,
  });

  const plans = plansData?.data?.plans || [];

  useEffect(() => {
    if (!open || !form.subscription_plan_id || plans.length === 0) return;
    const plan = plans.find((p) => String(p.id) === String(form.subscription_plan_id));
    if (!plan) return;
    const nextLimit = plan.employee_limit != null ? String(plan.employee_limit) : '';
    setForm((f) => (f.employee_limit === nextLimit ? f : { ...f, employee_limit: nextLimit }));
  }, [open, plans, form.subscription_plan_id]);

  const subscriptionExpiryPreview = useMemo(() => {
    if (isEdit) return null;
    return calculateSubscriptionEndDate(form.subscription_start_date, form.billing_cycle);
  }, [isEdit, form.subscription_start_date, form.billing_cycle]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setLogoUploading(false);
    setLogoError('');
    setPendingLogoFile(null);
    setBankErrors({});
    if (tenantId && tenantData?.data?.tenant) {
      const t = tenantData.data.tenant;
      setForm(tenantToForm(t));
      setLogoPreview(t.logo_url ? resolveAssetUrl(t.logo_url) : '');
    } else if (!tenantId) {
      setForm(emptyTenantForm());
      setLogoPreview('');
    }
  }, [open, tenantId, tenantData]);

  useEffect(() => {
    return () => {
      if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setAdmin = (key, value) => setForm((f) => ({ ...f, admin: { ...f.admin, [key]: value } }));

  const updateBranchList = (listKey, idx, field, value) => {
    setForm((f) => {
      const list = [...f[listKey]];
      list[idx] = { ...list[idx], [field]: value };
      return { ...f, [listKey]: list };
    });
  };

  const handlePlanChange = (planId) => {
    const plan = plans.find((p) => String(p.id) === String(planId));
    setForm((f) => ({
      ...f,
      subscription_plan_id: planId,
      employee_limit: plan?.employee_limit != null ? String(plan.employee_limit) : '',
      monthly_cost: plan ? String(plan.monthly_price) : f.monthly_cost,
    }));
  };

  const handleGstStateChange = (stateName) => {
    setForm((f) => ({
      ...f,
      gst_state: stateName,
      gst_state_code: getStateCode(stateName),
    }));
  };

  const handleLogoFile = async (file) => {
    setLogoError('');
    setPendingLogoFile(file);
    if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const res = await tenantApi.uploadLogo(file);
      const url = res?.data?.logo_url || '';
      set('logo_url', url);
      if (url && !logoPreview?.startsWith('blob:')) {
        setLogoPreview(resolveAssetUrl(url));
      }
      setPendingLogoFile(null);
    } catch (err) {
      setLogoError(err?.response?.data?.error?.message || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const clearLogo = () => {
    if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
    setLogoPreview('');
    setPendingLogoFile(null);
    setLogoError('');
    set('logo_url', '');
  };

  const buildPayload = () => {
    const payload = {
      name: form.name.trim(),
      company_code: form.company_code.trim().toUpperCase(),
      slug: form.slug.trim().toLowerCase(),
      legal_business_name: form.legal_business_name.trim(),
      industry: form.industry,
      company_size: form.company_size,
      registration_number: form.registration_number.trim(),
      gstin: form.gstin.trim().toUpperCase() || null,
      gst_state: form.gst_state || null,
      gst_state_code: form.gst_state_code || null,
      bank_account_number: formatBankAccountInput(form.bank_account_number) || null,
      bank_ifsc_code: formatIfscInput(form.bank_ifsc_code) || null,
      bank_name: form.bank_name.trim() || null,
      bank_branch: form.bank_branch.trim() || null,
      pan: form.pan.trim().toUpperCase() || null,
      logo_url: form.logo_url.trim() || null,
      website_url: form.website_url.trim() || null,
      description: form.description.trim() || null,
      email: form.email.trim(),
      phone: formatPhoneForStorage(form.phone) || form.phone.trim(),
      alternate_phone: formatPhoneForStorage(form.alternate_phone),
      support_email: form.support_email.trim() || null,
      hr_email: form.hr_email.trim() || null,
      address_line1: form.address_line1.trim(),
      address_line2: form.address_line2.trim() || null,
      city: form.city.trim(),
      state: form.state,
      country: form.country,
      pincode: form.pincode.trim(),
      head_office_name: form.head_office_name.trim() || null,
      regional_offices: form.regional_offices.filter((b) => b.name?.trim()),
      branches: form.branches.filter((b) => b.name?.trim()),
      admin: {
        first_name: form.admin.first_name.trim(),
        last_name: form.admin.last_name.trim(),
        email: form.admin.email.trim(),
        phone: formatPhoneForStorage(form.admin.phone) || form.admin.phone.trim(),
        username: form.admin.username.trim() || null,
      },
    };
    if (!isEdit) {
      payload.subscription_plan_id = parseInt(form.subscription_plan_id, 10);
      payload.subscription_start_date = form.subscription_start_date;
      payload.billing_cycle = form.billing_cycle;
      payload.employee_limit = form.employee_limit ? parseInt(form.employee_limit, 10) : null;
      payload.monthly_cost = form.monthly_cost ? parseFloat(form.monthly_cost) : null;
      payload.status = form.status;
    } else {
      payload.subscription_plan_id = parseInt(form.subscription_plan_id, 10);
      payload.status = form.status;
      payload.employee_limit = form.employee_limit ? parseInt(form.employee_limit, 10) : null;
      payload.monthly_cost = form.monthly_cost ? parseFloat(form.monthly_cost) : null;
    }
    return payload;
  };

  const displayStep = step;
  const totalSteps = STEPS.length;
  const currentStepLabel = STEPS[step - 1]?.label;

  const goNext = () => {
    if (step === 1) {
      const errors = validateBankDetails({
        bank_account_number: form.bank_account_number,
        bank_ifsc_code: form.bank_ifsc_code,
      });
      if (Object.keys(errors).length > 0) {
        setBankErrors(errors);
        return;
      }
      setBankErrors({});
    }
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const onLastStep = step === 5;
    if (!onLastStep) {
      goNext();
      return;
    }
    if (logoUploading) return;
    if (step === 1 || step === 5) {
      const errors = validateBankDetails({
        bank_account_number: form.bank_account_number,
        bank_ifsc_code: form.bank_ifsc_code,
      });
      if (Object.keys(errors).length > 0) {
        setBankErrors(errors);
        if (step !== 1) setStep(1);
        return;
      }
      setBankErrors({});
    }
    if (pendingLogoFile && !form.logo_url) {
      setLogoUploading(true);
      try {
        const res = await tenantApi.uploadLogo(pendingLogoFile);
        const logoUrl = res?.data?.logo_url || '';
        set('logo_url', logoUrl);
        onSubmit({ ...buildPayload(), logo_url: logoUrl });
      } catch (err) {
        setLogoError(err?.response?.data?.error?.message || 'Failed to upload logo');
      } finally {
        setLogoUploading(false);
      }
      return;
    }
    onSubmit(buildPayload());
  };

  if (!open) return null;

  const progressSteps = STEPS;

  return (
    <div className="modal-backdrop z-50">
      <div className="modal-panel sm:max-w-3xl">
        <div className="modal-panel-header">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">{isEdit ? 'Edit Tenant' : 'Create Tenant'}</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Step {displayStep} of {totalSteps} — {currentStepLabel}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
        </div>

        <div className="px-6 pt-4 shrink-0">
          <div className="flex gap-1">
            {progressSteps.map((s, idx) => (
              <div
                key={s.id}
                className={cn(
                  'flex-1 h-1 rounded-full',
                  idx + 1 <= displayStep ? 'bg-brand-600' : 'bg-slate-200'
                )}
              />
            ))}
          </div>
        </div>

        {tenantLoading && isEdit ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading tenant…</div>
        ) : (
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="modal-panel-body space-y-4">
            {step === 1 && (
              <>
                <SectionTitle>Company Information</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Company Name" required>
                    <Input required value={form.name} onChange={(v) => set('name', v)} />
                  </Field>
                  <Field label="Company Code" required>
                    <Input
                      required
                      readOnly={isEdit}
                      value={form.company_code}
                      onChange={(v) => set('company_code', v.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                      placeholder="TECHNOVA"
                    />
                  </Field>
                  <Field label="Company Slug" required>
                    <Input
                      required
                      value={form.slug}
                      onChange={(v) => set('slug', v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="technova"
                    />
                  </Field>
                  <Field label="Legal Business Name" required>
                    <Input required value={form.legal_business_name} onChange={(v) => set('legal_business_name', v)} />
                  </Field>
                  <Field label="Industry Type" required>
                    <Select required value={form.industry} onChange={(v) => set('industry', v)} options={INDUSTRY_TYPES} placeholder="Select industry" />
                  </Field>
                  <Field label="Company Size" required>
                    <Select required value={form.company_size} onChange={(v) => set('company_size', v)} options={COMPANY_SIZES} />
                  </Field>
                  <Field label="Registration Number" required>
                    <Input required value={form.registration_number} onChange={(v) => set('registration_number', v)} />
                  </Field>
                  <Field label="PAN Number">
                    <Input value={form.pan} onChange={(v) => set('pan', v.toUpperCase())} />
                  </Field>
                  <Field label="Website URL">
                    <Input value={form.website_url} onChange={(v) => set('website_url', v)} placeholder="https://" />
                  </Field>
                  <Field label="Company Description" className="col-span-2">
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => set('description', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                      placeholder="Brief description…"
                    />
                  </Field>
                </div>

                <SectionTitle>GST & Billing Details</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="GST Number">
                    <Input
                      value={form.gstin}
                      onChange={(v) => set('gstin', v.toUpperCase())}
                      placeholder="22AAAAA0000A1Z5"
                    />
                  </Field>
                  <Field label="State">
                    <Select
                      value={form.gst_state}
                      onChange={handleGstStateChange}
                      options={INDIAN_STATES_WITH_CODES.map((s) => ({ value: s.name, label: s.name }))}
                      placeholder="Select state"
                    />
                  </Field>
                  <Field label="State Code">
                    <Input value={form.gst_state_code} readOnly placeholder="Auto-filled" />
                  </Field>
                </div>

                <SectionTitle>Bank Details (for Receipts)</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="A/c (Bank Account No)"
                    hint="9–18 digits"
                    error={bankErrors.bank_account_number}
                  >
                    <Input
                      value={form.bank_account_number}
                      onChange={(v) => {
                        set('bank_account_number', formatBankAccountInput(v));
                        if (bankErrors.bank_account_number) {
                          setBankErrors((prev) => ({ ...prev, bank_account_number: undefined }));
                        }
                      }}
                      placeholder="9–18 digits"
                      inputMode="numeric"
                      maxLength={18}
                    />
                  </Field>
                  <Field
                    label="IFSC Code"
                    hint="Format: SBIN0001234"
                    error={bankErrors.bank_ifsc_code}
                  >
                    <Input
                      value={form.bank_ifsc_code}
                      onChange={(v) => {
                        set('bank_ifsc_code', formatIfscInput(v));
                        if (bankErrors.bank_ifsc_code) {
                          setBankErrors((prev) => ({ ...prev, bank_ifsc_code: undefined }));
                        }
                      }}
                      placeholder="SBIN0001234"
                      maxLength={11}
                    />
                  </Field>
                  <Field label="Bank Name">
                    <Input
                      value={form.bank_name}
                      onChange={(v) => set('bank_name', v)}
                      placeholder="e.g. State Bank of India"
                    />
                  </Field>
                  <Field label="Bank Branch">
                    <Input
                      value={form.bank_branch}
                      onChange={(v) => set('bank_branch', v)}
                      placeholder="e.g. S.N Colony"
                    />
                  </Field>
                </div>
                {(form.bank_account_number || form.bank_ifsc_code || form.bank_name || form.bank_branch) && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-700 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                      Receipt Preview
                    </p>
                    <p>
                      <span className="font-semibold bg-yellow-100 px-0.5">A/c # :</span>{' '}
                      {form.bank_account_number || '—'}
                    </p>
                    <p>
                      <span className="font-semibold">IFSC:</span> {form.bank_ifsc_code || '—'}
                    </p>
                    <p>
                      <span className="font-semibold bg-yellow-100 px-0.5">BRANCH:</span>{' '}
                      {form.bank_branch || form.bank_name || '—'}
                    </p>
                  </div>
                )}

                <SectionTitle>Company Logo</SectionTitle>
                <Field label="Upload Logo">
                  <LogoUpload
                    previewUrl={logoPreview}
                    uploading={logoUploading}
                    error={logoError}
                    onFile={handleLogoFile}
                    onClear={clearLogo}
                  />
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <SectionTitle>Contact Information</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Official Email" required>
                    <Input required type="email" value={form.email} onChange={(v) => set('email', v)} />
                  </Field>
                  <InternationalPhoneInput
                    label="Phone Number"
                    required
                    value={form.phone}
                    onChange={(v) => set('phone', v)}
                  />
                  <InternationalPhoneInput
                    label="Alternate Phone"
                    value={form.alternate_phone}
                    onChange={(v) => set('alternate_phone', v)}
                  />
                  <Field label="Support Email">
                    <Input type="email" value={form.support_email} onChange={(v) => set('support_email', v)} />
                  </Field>
                  <Field label="HR Email" className="col-span-2">
                    <Input type="email" value={form.hr_email} onChange={(v) => set('hr_email', v)} />
                  </Field>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <SectionTitle>Registered Address</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Address Line 1" required className="col-span-2">
                    <Input required value={form.address_line1} onChange={(v) => set('address_line1', v)} />
                  </Field>
                  <Field label="Address Line 2" className="col-span-2">
                    <Input value={form.address_line2} onChange={(v) => set('address_line2', v)} />
                  </Field>
                  <Field label="City" required>
                    <Input required value={form.city} onChange={(v) => set('city', v)} />
                  </Field>
                  <Field label="State" required>
                    <Select required value={form.state} onChange={(v) => set('state', v)} options={INDIAN_STATES} placeholder="Select state" />
                  </Field>
                  <Field label="Country" required>
                    <Input required value={form.country} onChange={(v) => set('country', v)} />
                  </Field>
                  <Field label="ZIP Code" required>
                    <Input required value={form.pincode} onChange={(v) => set('pincode', v)} />
                  </Field>
                </div>

                <SectionTitle>Branch Information (Optional)</SectionTitle>
                <Field label="Head Office Name">
                  <Input value={form.head_office_name} onChange={(v) => set('head_office_name', v)} placeholder="Defaults to registered address" />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <BranchList
                    title="Regional Offices"
                    rows={form.regional_offices}
                    onChange={(i, f, v) => updateBranchList('regional_offices', i, f, v)}
                    onAdd={() => setForm((f) => ({ ...f, regional_offices: [...f.regional_offices, emptyBranchRow()] }))}
                    onRemove={(i) => setForm((f) => ({ ...f, regional_offices: f.regional_offices.filter((_, j) => j !== i) }))}
                  />
                  <BranchList
                    title="Branches"
                    rows={form.branches}
                    onChange={(i, f, v) => updateBranchList('branches', i, f, v)}
                    onAdd={() => setForm((f) => ({ ...f, branches: [...f.branches, emptyBranchRow()] }))}
                    onRemove={(i) => setForm((f) => ({ ...f, branches: f.branches.filter((_, j) => j !== i) }))}
                  />
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <SectionTitle>Company Admin Information</SectionTitle>
                <p className="text-xs text-slate-500 -mt-2 mb-4">
                  {isEdit
                    ? 'Primary company administrator. Password changes are handled via password reset.'
                    : 'This user becomes the company administrator. Credentials are auto-generated and emailed.'}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="First Name" required>
                    <Input required value={form.admin.first_name} onChange={(v) => setAdmin('first_name', v)} />
                  </Field>
                  <Field label="Last Name" required>
                    <Input required value={form.admin.last_name} onChange={(v) => setAdmin('last_name', v)} />
                  </Field>
                  <Field label="Email" required>
                    <Input required type="email" value={form.admin.email} onChange={(v) => setAdmin('email', v)} />
                  </Field>
                  <InternationalPhoneInput
                    label="Mobile Number"
                    required
                    value={form.admin.phone}
                    onChange={(v) => setAdmin('phone', v)}
                  />
                  <Field label="Username">
                    <Input value={form.admin.username} onChange={(v) => setAdmin('username', v)} placeholder="Optional" />
                  </Field>
                  <Field label="Role">
                    <Input value="Company Admin" readOnly />
                  </Field>
                  {!isEdit && (
                    <Field label="Password" className="col-span-2">
                      <Input value="Auto-generated on create" readOnly />
                    </Field>
                  )}
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <SectionTitle>Subscription / Billing</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Plan" required className="col-span-2">
                    {plans.length === 0 ? (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        No active plans found. Create a subscription plan in Billing first.
                      </p>
                    ) : (
                      <Select
                        required
                        value={form.subscription_plan_id}
                        onChange={handlePlanChange}
                        options={plans.map((p) => ({ value: p.id, label: `${p.name} — ₹${p.monthly_price}/mo` }))}
                        placeholder="Select plan"
                      />
                    )}
                  </Field>
                  {!isEdit && (
                    <>
                      <Field label="Start Date" required>
                        <Input required type="date" value={form.subscription_start_date} onChange={(v) => set('subscription_start_date', v)} />
                      </Field>
                      <Field label="Billing Cycle" required>
                        <Select
                          required
                          value={form.billing_cycle}
                          onChange={(v) => set('billing_cycle', v)}
                          options={BILLING_CYCLES}
                          placeholder="Select billing cycle"
                        />
                      </Field>
                      <Field
                        label="Subscription Expiry"
                        className="col-span-2"
                        hint="Auto-calculated from start date and billing cycle"
                      >
                        <Input
                          readOnly
                          value={
                            subscriptionExpiryPreview
                              ? formatSubscriptionDateDisplay(subscriptionExpiryPreview)
                              : 'Select start date and billing cycle'
                          }
                        />
                      </Field>
                    </>
                  )}
                  <Field
                    label="Employee Limit"
                    required={!!form.subscription_plan_id && form.employee_limit !== ''}
                    hint={form.subscription_plan_id ? 'Auto-filled from plan' : undefined}
                  >
                    <Input
                      required={!!form.subscription_plan_id && form.employee_limit !== ''}
                      type="text"
                      value={form.employee_limit || (form.subscription_plan_id ? 'Unlimited' : '')}
                      readOnly={!!form.subscription_plan_id}
                      placeholder={form.subscription_plan_id ? 'Unlimited' : 'Select a plan first'}
                    />
                  </Field>
                  <Field label="Monthly Cost (INR)" hint={form.subscription_plan_id ? 'Auto-filled from plan' : undefined}>
                    <Input type="number" min="0" step="0.01" value={form.monthly_cost} onChange={(v) => set('monthly_cost', v)} placeholder="Optional" readOnly={!!form.subscription_plan_id} />
                  </Field>
                  <Field label="Status" required>
                    <Select required value={form.status} onChange={(v) => set('status', v)} options={TENANT_STATUSES} />
                  </Field>
                </div>
              </>
            )}

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs border border-red-100">{error}</div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex justify-between shrink-0">
            <button
              type="button"
              disabled={step === 1}
              onClick={goBack}
              className="btn-secondary"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button
                type="submit"
                disabled={saving || logoUploading || (step === 5 && plans.length === 0)}
                className="btn-primary"
              >
                {saving
                  ? isEdit ? 'Saving…' : 'Creating…'
                  : step === 5
                    ? isEdit ? 'Save Changes' : 'Create Tenant'
                    : <>Next <ChevronRight size={14} /></>}
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
