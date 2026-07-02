import { useState, useEffect } from 'react';
import { APPLICABLE_GENDER, LEAVE_TYPE_COLORS, leaveTypeToForm } from './leaveSettings.constants';
import { Modal, Field, TextArea, Select, Checkbox, FormError, FormActions } from './leaveSettingsUi';

export default function LeaveTypeForm({ open, initial, onClose, onSubmit, loading, error, isEdit }) {
  const [form, setForm] = useState(leaveTypeToForm(initial));

  useEffect(() => {
    if (open) setForm(leaveTypeToForm(initial));
  }, [open, initial]);

  if (!open) return null;

  const isSystem = initial?.is_system;
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Modal title={isEdit ? 'Edit leave type' : 'Add leave type'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            ...form,
            code: form.code.trim().toUpperCase(),
            name: form.name.trim(),
            description: form.description?.trim() || null,
          });
        }}
        className="space-y-4"
      >
        <FormError message={error} />
        <Field label="Code" value={form.code} onChange={(v) => set('code', v)} required placeholder="e.g. ML" hint={isSystem ? 'System type code cannot be changed' : 'Uppercase, unique per tenant'} disabled={isSystem} />
        <Field label="Name" value={form.name} onChange={(v) => set('name', v)} required placeholder="Maternity Leave" />
        <TextArea label="Description" value={form.description} onChange={(v) => set('description', v)} placeholder="Optional description" />
        <div>
          <label className="text-xs font-medium text-slate-600">Color tag</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {LEAVE_TYPE_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => set('color_code', c)} className={`w-7 h-7 rounded-full border-2 ${form.color_code === c ? 'border-slate-800' : 'border-transparent'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <Field label="Icon name" value={form.icon} onChange={(v) => set('icon', v)} placeholder="calendar" />
        <Select label="Applicable gender" value={form.applicable_gender} onChange={(v) => set('applicable_gender', v)} options={APPLICABLE_GENDER} placeholder="" />
        <Checkbox label="Paid leave" checked={form.is_paid} onChange={(v) => set('is_paid', v)} />
        <Checkbox label="Active" checked={form.is_active} onChange={(v) => set('is_active', v)} />
        <FormActions onCancel={onClose} loading={loading} submitLabel={isEdit ? 'Save changes' : 'Create type'} />
      </form>
    </Modal>
  );
}
