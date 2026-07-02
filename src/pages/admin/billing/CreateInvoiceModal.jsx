import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { billingApi } from '../../../api';
import { BILLING_CYCLES } from '../../../constants/tenant';
import { todayDateOnly } from '../../../constants/billingTabs';
import { cn } from '../../../utils/helpers';

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function inputClass(extra = '') {
  return `w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 ${extra}`;
}

export default function CreateInvoiceModal({ open, saving, error, onClose, onSave }) {
  const [form, setForm] = useState({
    tenant_id: '',
    billing_cycle: 'yearly',
    invoice_date: todayDateOnly(),
    due_date: '',
    notes: '',
  });

  const { data: subsData } = useQuery({
    queryKey: ['tenant-subscriptions-for-invoice'],
    queryFn: () => billingApi.listTenantSubscriptions({ limit: 100 }),
    enabled: open,
  });

  const subscriptions = subsData?.data?.subscriptions || [];
  const selectedSub = subscriptions.find((row) => String(row.tenant_id) === String(form.tenant_id));

  useEffect(() => {
    if (open) {
      setForm({
        tenant_id: '',
        billing_cycle: 'yearly',
        invoice_date: todayDateOnly(),
        due_date: '',
        notes: '',
      });
    }
  }, [open]);

  useEffect(() => {
    if (selectedSub?.billing_cycle) {
      setForm((prev) => ({ ...prev, billing_cycle: selectedSub.billing_cycle }));
    }
  }, [selectedSub?.billing_cycle, selectedSub?.tenant_id]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      tenant_id: parseInt(form.tenant_id, 10),
      billing_cycle: form.billing_cycle,
      invoice_date: form.invoice_date,
      due_date: form.due_date || undefined,
      notes: form.notes || undefined,
      issue: true,
    });
  };

  return (
    <div className="modal-backdrop z-50">
      <div className="modal-panel sm:max-w-lg">
        <div className="modal-panel-header">
          <h3 className="font-semibold text-slate-900 text-sm">Generate Subscription Invoice</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-panel-body space-y-4">
          <Field label="Tenant" required>
            <select
              required
              value={form.tenant_id}
              onChange={(e) => setForm((prev) => ({ ...prev, tenant_id: e.target.value }))}
              className={inputClass()}
            >
              <option value="">Select tenant…</option>
              {subscriptions.map((row) => (
                <option key={row.tenant_id} value={row.tenant_id}>
                  {row.company_name} · {row.plan_name || 'No plan'}
                </option>
              ))}
            </select>
          </Field>

          {selectedSub && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
              <p>
                <span className="text-slate-400">Plan:</span> {selectedSub.plan_name || '—'}
              </p>
              <p>
                <span className="text-slate-400">Billing status:</span> {selectedSub.billing_status}
              </p>
              <p>
                <span className="text-slate-400">Subscription ends:</span> {selectedSub.end_date || '—'}
              </p>
            </div>
          )}

          <Field label="Billing Cycle" required>
            <select
              value={form.billing_cycle}
              onChange={(e) => setForm((prev) => ({ ...prev, billing_cycle: e.target.value }))}
              className={inputClass()}
            >
              {BILLING_CYCLES.map((cycle) => (
                <option key={cycle.value} value={cycle.value}>
                  {cycle.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Invoice Date" required>
              <input
                required
                type="date"
                value={form.invoice_date}
                onChange={(e) => setForm((prev) => ({ ...prev, invoice_date: e.target.value }))}
                className={inputClass()}
              />
            </Field>
            <Field label="Due Date">
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                className={inputClass()}
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className={inputClass('min-h-[72px]')}
              placeholder="Optional invoice notes"
            />
          </Field>

          <p className="text-[11px] text-slate-500">
            Amount is calculated from plan pricing and platform GST rate configured in the database.
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className={cn('btn-primary', saving && 'opacity-70')}>
              {saving ? 'Generating…' : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
