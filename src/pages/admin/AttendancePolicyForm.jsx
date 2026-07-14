import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import api from '../../api/client';

const DEFAULT = {
  name: '',
  payroll_calculation_mode: 'status_based',
  salary_proration_basis: 'working_days',
  week_off_policy: 'paid',
  holiday_policy: 'paid',
  missing_checkout_action: 'mark_absent',
  auto_status_downgrade: true,
  full_day_hours: 8,
  half_day_hours: 4,
  late_grace_minutes: 15,
  early_exit_grace_minutes: 15,
  overtime_enabled: false,
  overtime_threshold_minutes: 30,
  overtime_rate_multiplier: 1.5,
  overtime_comp_off_enabled: false,
  comp_off_on_weekly_off: true,
  comp_off_on_holiday: true,
  comp_off_on_overtime: false,
  comp_off_min_hours: 4,
  comp_off_auto_approve: false,
};

function Field({ label, hint, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-800">{label}</div>
        {hint && <div className="text-xs text-slate-500 mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  );
}

function NumberInput({ value, onChange, min = 0, step = 1 }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-24 rounded border border-slate-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-500"
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export default function AttendancePolicyForm({ policy, onClose, onSave }) {
  const [form, setForm] = useState({ ...DEFAULT, ...(policy || {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        payroll_calculation_mode: form.payroll_calculation_mode,
        salary_proration_basis: form.salary_proration_basis,
        week_off_policy: form.week_off_policy,
        holiday_policy: form.holiday_policy,
        missing_checkout_action: form.missing_checkout_action,
        auto_status_downgrade: form.auto_status_downgrade,
        full_day_hours: form.full_day_hours,
        half_day_hours: form.half_day_hours,
        late_grace_minutes: form.late_grace_minutes,
        early_exit_grace_minutes: form.early_exit_grace_minutes,
        overtime_enabled: form.overtime_enabled,
        overtime_threshold_minutes: form.overtime_threshold_minutes,
        overtime_rate_multiplier: form.overtime_rate_multiplier,
        overtime_comp_off_enabled: form.overtime_comp_off_enabled,
        comp_off_on_weekly_off: form.comp_off_on_weekly_off,
        comp_off_on_holiday: form.comp_off_on_holiday,
        comp_off_on_overtime: form.comp_off_on_overtime,
        comp_off_min_hours: form.comp_off_min_hours,
        comp_off_auto_approve: form.comp_off_auto_approve,
      };

      if (policy?.id) {
        await api.put(`/attendance-policies/${policy.id}`, payload);
      } else {
        await api.post('/attendance-policies', payload);
      }
      onSave();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 rounded text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-slate-800">{policy ? 'Edit Policy' : 'Create Policy'}</h3>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="card divide-y divide-slate-100">
        <div className="px-4 py-3 bg-slate-50 rounded-t">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">General Settings</div>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Policy Name</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="e.g. Contract Worker Policy"
            />
          </div>
          <Field label="Payroll Calculation Mode" hint="How payroll engines prorate salary">
            <Select
              value={form.payroll_calculation_mode}
              onChange={(v) => set('payroll_calculation_mode', v)}
              options={[
                { value: 'status_based', label: 'Status Based (Full/Half Day/Absent)' },
                { value: 'hour_based', label: 'Hour Based (Effective Hours)' }
              ]}
            />
          </Field>
          <Field label="Salary Proration Basis" hint="Denominator for salary division">
            <Select
              value={form.salary_proration_basis}
              onChange={(v) => set('salary_proration_basis', v)}
              options={[
                { value: 'working_days', label: 'Working Days (Calendar - Week Offs - Holidays)' },
                { value: 'calendar_days', label: 'Calendar Days (e.g. 30/31)' },
                { value: 'standard_days', label: 'Standard Days (Fixed 30 Days)' }
              ]}
            />
          </Field>
          <Field label="Week Off Policy" hint="Are weekly off days paid or unpaid?">
            <Select
              value={form.week_off_policy}
              onChange={(v) => set('week_off_policy', v)}
              options={[{ value: 'paid', label: 'Paid' }, { value: 'unpaid', label: 'Unpaid' }]}
            />
          </Field>
          <Field label="Holiday Policy" hint="Are holidays paid or unpaid?">
            <Select
              value={form.holiday_policy}
              onChange={(v) => set('holiday_policy', v)}
              options={[{ value: 'paid', label: 'Paid' }, { value: 'unpaid', label: 'Unpaid' }]}
            />
          </Field>
          <Field label="Missing Checkout Action" hint="What to do if employee forgets to checkout">
            <Select
              value={form.missing_checkout_action}
              onChange={(v) => set('missing_checkout_action', v)}
              options={[
                { value: 'mark_absent', label: 'Mark Absent' },
                { value: 'mark_half_day', label: 'Mark Half Day' },
                { value: 'ignore', label: 'Ignore (Use Check-in Time)' }
              ]}
            />
          </Field>
          <Field label="Auto-Status Downgrade" hint="Automatically assign Half Day or Absent based on hours worked">
            <Toggle checked={form.auto_status_downgrade} onChange={(v) => set('auto_status_downgrade', v)} />
          </Field>
        </div>
      </div>

      <div className="card divide-y divide-slate-100">
        <div className="px-4 py-3 bg-slate-50 rounded-t">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hours Thresholds</div>
        </div>
        <div className="px-4">
          <Field label="Full day hours" hint="Minimum effective hours to count as full day">
            <NumberInput value={form.full_day_hours} onChange={(v) => set('full_day_hours', v)} min={1} step={0.5} />
          </Field>
          <Field label="Half day hours" hint="Minimum effective hours to count as half day">
            <NumberInput value={form.half_day_hours} onChange={(v) => set('half_day_hours', v)} min={0.5} step={0.5} />
          </Field>
          <Field label="Late grace (minutes)" hint="Minutes after shift start before marking late">
            <NumberInput value={form.late_grace_minutes} onChange={(v) => set('late_grace_minutes', v)} />
          </Field>
          <Field label="Early exit grace (minutes)" hint="Minutes before shift end allowed without penalty">
            <NumberInput value={form.early_exit_grace_minutes} onChange={(v) => set('early_exit_grace_minutes', v)} />
          </Field>
        </div>
      </div>

      <div className="card divide-y divide-slate-100">
        <div className="px-4 py-3 bg-slate-50 rounded-t">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overtime</div>
        </div>
        <div className="px-4">
          <Field label="Enable overtime tracking">
            <Toggle checked={form.overtime_enabled} onChange={(v) => set('overtime_enabled', v)} />
          </Field>
          {form.overtime_enabled && (
            <>
              <Field label="Overtime threshold (minutes)" hint="Extra minutes worked before overtime is counted">
                <NumberInput value={form.overtime_threshold_minutes} onChange={(v) => set('overtime_threshold_minutes', v)} />
              </Field>
              <Field label="Overtime rate multiplier" hint="e.g. 1.5 = 1.5× hourly rate">
                <NumberInput value={form.overtime_rate_multiplier} onChange={(v) => set('overtime_rate_multiplier', v)} min={1} step={0.25} />
              </Field>
              <Field label="Credit comp-off for overtime">
                <Toggle checked={form.overtime_comp_off_enabled} onChange={(v) => set('overtime_comp_off_enabled', v)} />
              </Field>
            </>
          )}
        </div>
      </div>

      <div className="card divide-y divide-slate-100">
        <div className="px-4 py-3 bg-slate-50 rounded-t">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Comp-off Eligibility</div>
        </div>
        <div className="px-4">
          <Field label="Working on weekly off">
            <Toggle checked={form.comp_off_on_weekly_off} onChange={(v) => set('comp_off_on_weekly_off', v)} />
          </Field>
          <Field label="Working on holiday">
            <Toggle checked={form.comp_off_on_holiday} onChange={(v) => set('comp_off_on_holiday', v)} />
          </Field>
          <Field label="Overtime on working day">
            <Toggle checked={form.comp_off_on_overtime} onChange={(v) => set('comp_off_on_overtime', v)} />
          </Field>
          <Field label="Minimum hours for comp-off" hint="Minimum hours worked to be eligible">
            <NumberInput value={form.comp_off_min_hours} onChange={(v) => set('comp_off_min_hours', v)} min={0.5} step={0.5} />
          </Field>
          <Field label="Auto-approve comp-off credits">
            <Toggle checked={form.comp_off_auto_approve} onChange={(v) => set('comp_off_auto_approve', v)} />
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-3 py-4">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary text-sm px-6 py-2"
        >
          {saving ? 'Saving...' : 'Save Policy'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="btn-white text-sm px-6 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
