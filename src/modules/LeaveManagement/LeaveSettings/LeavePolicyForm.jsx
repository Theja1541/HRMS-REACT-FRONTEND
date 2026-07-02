import { useState, useEffect } from 'react';
import {
  ACCRUAL_METHODS,
  ACCRUAL_TRIGGERS,
  APPROVAL_LEVELS,
  APPLICABLE_TO,
  emptyLeavePolicy,
  policyToForm,
} from './leaveSettings.constants';
import { Modal, Field, Select, Checkbox, FormError, FormActions, SectionTitle } from './leaveSettingsUi';

export default function LeavePolicyForm({ open, initial, leaveTypes, onClose, onSubmit, loading, error, isEdit }) {
  const [form, setForm] = useState(emptyLeavePolicy());

  useEffect(() => {
    if (open) setForm(policyToForm(initial));
  }, [open, initial]);

  if (!open) return null;

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleAccrualMethodChange = (method) => {
    setForm((f) => {
      const annual = parseFloat(f.annual_quota) || 0;
      const next = { ...f, accrual_method: method };
      if (method === 'monthly' && (!f.monthly_accrual_rate || parseFloat(f.monthly_accrual_rate) === 0)) {
        next.monthly_accrual_rate = annual > 0 ? roundRate(annual / 12) : 0;
      }
      if (method === 'quarterly' && (!f.monthly_accrual_rate || parseFloat(f.monthly_accrual_rate) === 0)) {
        next.monthly_accrual_rate = annual > 0 ? roundRate(annual / 12) : 0;
      }
      return next;
    });
  };

  const handleAnnualQuotaChange = (val) => {
    setForm((f) => {
      const next = { ...f, annual_quota: val };
      const annual = parseFloat(val) || 0;
      if (f.accrual_method === 'monthly' && annual > 0) {
        const implied = roundRate(annual / 12);
        if (!f.monthly_accrual_rate || parseFloat(f.monthly_accrual_rate) === 0) {
          next.monthly_accrual_rate = implied;
        }
      }
      return next;
    });
  };

  const monthlyRate = parseFloat(form.monthly_accrual_rate) || 0;
  const annualQuota = parseFloat(form.annual_quota) || 0;
  const impliedMonthly = annualQuota > 0 ? annualQuota / 12 : 0;
  const rateMismatch =
    form.accrual_method === 'monthly' &&
    annualQuota > 0 &&
    monthlyRate > 0 &&
    Math.abs(monthlyRate - impliedMonthly) > 0.01;
  const selectedType = leaveTypes.find((t) => String(t.id) === String(form.leave_type_id));
  const isCompOff = selectedType?.code === 'CO';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      leave_type_id: parseInt(form.leave_type_id, 10),
      policy_name: form.policy_name.trim(),
      max_balance_cap: form.max_balance_cap === '' || form.max_balance_cap == null ? null : Number(form.max_balance_cap),
      max_days_per_request: form.max_days_per_request === '' || form.max_days_per_request == null ? null : Number(form.max_days_per_request),
    });
  };

  return (
    <Modal title={isEdit ? 'Edit leave policy' : 'Add leave policy'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError message={error} />

        <SectionTitle>Basic</SectionTitle>
        <Select
          label="Leave type"
          value={form.leave_type_id}
          onChange={(v) => set('leave_type_id', v)}
          options={leaveTypes.filter((t) => t.is_active).map((t) => ({ value: t.id, label: `${t.code} — ${t.name}` }))}
          required
        />
        <Field label="Policy name" value={form.policy_name} onChange={(v) => set('policy_name', v)} required placeholder="Standard CL Policy" />
        <p className="text-xs text-slate-500 -mt-2">
          Who receives this policy is set via <strong>Assign</strong> after saving — not the field below.
        </p>
        <Select label="Applicable to (metadata)" value={form.applicable_to} onChange={(v) => set('applicable_to', v)} options={APPLICABLE_TO} placeholder="" />

        <SectionTitle>Accrual</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Accrual method" value={form.accrual_method} onChange={handleAccrualMethodChange} options={ACCRUAL_METHODS} placeholder="" />
          <Select label="Accrual trigger" value={form.accrual_trigger} onChange={(v) => set('accrual_trigger', v)} options={ACCRUAL_TRIGGERS} placeholder="" />
          <Field label="Annual quota (days)" type="number" step="0.5" min="0" value={form.annual_quota} onChange={handleAnnualQuotaChange} hint={form.accrual_method === 'fixed' ? 'Granted at cycle start' : 'Target days per year (reference for rate)'} />
          {form.accrual_method !== 'fixed' && (
            <Field
              label={form.accrual_method === 'monthly' ? 'Monthly accrual rate' : 'Monthly rate (×3 per quarter)'}
              type="number"
              step="0.01"
              min="0"
              value={form.monthly_accrual_rate}
              onChange={(v) => set('monthly_accrual_rate', v)}
              hint={annualQuota > 0 ? `Suggested: ${roundRate(annualQuota / 12)} for ${annualQuota} days/yr` : 'e.g. 1 for 12 days/yr'}
            />
          )}
          <Field label="Max balance cap" type="number" step="0.5" min="0" value={form.max_balance_cap ?? ''} onChange={(v) => set('max_balance_cap', v)} hint="Leave blank for no cap" />
        </div>
        {rateMismatch && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Monthly rate ({monthlyRate}) differs from annual quota ÷ 12 ({roundRate(impliedMonthly)}). Employees accrue at the monthly rate, not the annual quota directly.
          </p>
        )}
        <Checkbox label="Pro-rata for mid-cycle joiners" checked={form.pro_rata_enabled} onChange={(v) => set('pro_rata_enabled', v)} />
        <p className="text-xs text-slate-500 -mt-2 pl-6">
          When unchecked, join-month and fixed grants use the full period rate. When checked, quota is prorated by days remaining in the cycle/month.
        </p>

        <SectionTitle>Request rules</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Min days per request" type="number" step="0.5" min="0.5" value={form.min_days_per_request} onChange={(v) => set('min_days_per_request', v)} />
          <Field label="Max days per request" type="number" step="0.5" min="0.5" value={form.max_days_per_request ?? ''} onChange={(v) => set('max_days_per_request', v)} hint="Blank = no max" />
          <Field label="Advance notice (days)" type="number" min="0" value={form.advance_notice_days} onChange={(v) => set('advance_notice_days', v)} />
          <Field label="Attachment required after (days)" type="number" min="0" value={form.attachment_required_after_days} onChange={(v) => set('attachment_required_after_days', v)} />
          <Field label="Min service days (probation)" type="number" min="0" value={form.min_service_days_required} onChange={(v) => set('min_service_days_required', v)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Checkbox label="Half-day allowed" checked={form.half_day_allowed} onChange={(v) => set('half_day_allowed', v)} />
          <Checkbox label="Sandwich rule (count weekends/holidays between leave days)" checked={form.sandwich_rule_enabled} onChange={(v) => set('sandwich_rule_enabled', v)} />
        </div>

        <SectionTitle>Carry forward & encashment</SectionTitle>
        <div className="space-y-3">
          <Checkbox label="Carry forward allowed" checked={form.carry_forward_allowed} onChange={(v) => set('carry_forward_allowed', v)} />
          {form.carry_forward_allowed && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l-2 border-slate-100">
              <Field label="Max carry-forward days" type="number" step="0.5" min="0" value={form.carry_forward_max_days} onChange={(v) => set('carry_forward_max_days', v)} />
              <Field label="CF expiry (months into new cycle)" type="number" min="0" max="12" value={form.carry_forward_expiry_months} onChange={(v) => set('carry_forward_expiry_months', v)} />
            </div>
          )}
          <Checkbox label="Encashment allowed" checked={form.encashment_allowed} onChange={(v) => set('encashment_allowed', v)} />
          {form.encashment_allowed && (
            <Field label="Max encashable days" type="number" step="0.5" min="0" value={form.encashment_max_days} onChange={(v) => set('encashment_max_days', v)} />
          )}
        </div>

        <SectionTitle>Negative balance</SectionTitle>
        <Checkbox label="Allow negative balance" checked={form.negative_balance_allowed} onChange={(v) => set('negative_balance_allowed', v)} />
        {form.negative_balance_allowed && (
          <Field label="Max negative limit (days)" type="number" step="0.5" min="0" value={form.negative_balance_max} onChange={(v) => set('negative_balance_max', v)} />
        )}

        {isCompOff && (
          <>
            <SectionTitle>Comp-off rules</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Expiry window (days)" type="number" min="1" value={form.comp_off_expiry_days} onChange={(v) => set('comp_off_expiry_days', v)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Checkbox label="Half-day credit allowed" checked={form.comp_off_half_day_credit} onChange={(v) => set('comp_off_half_day_credit', v)} />
              <Checkbox label="Carry forward comp-off" checked={form.comp_off_carry_forward} onChange={(v) => set('comp_off_carry_forward', v)} />
              <Checkbox label="Comp-off encashment" checked={form.comp_off_encashment} onChange={(v) => set('comp_off_encashment', v)} />
            </div>
          </>
        )}

        <SectionTitle>Approval workflow</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Approval chain" value={form.approval_levels} onChange={(v) => set('approval_levels', v)} options={APPROVAL_LEVELS} placeholder="" />
          <Field label="Auto-approve under (days)" type="number" step="0.5" min="0" value={form.auto_approve_under_days} onChange={(v) => set('auto_approve_under_days', v)} hint="0 = disabled" />
        </div>

        <Checkbox label="Policy active" checked={form.is_active} onChange={(v) => set('is_active', v)} />

        <FormActions onCancel={onClose} loading={loading} submitLabel={isEdit ? 'Save policy' : 'Create policy'} />
      </form>
    </Modal>
  );
}

function roundRate(n) {
  const v = parseFloat(n);
  if (Number.isNaN(v)) return '0';
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '');
}
