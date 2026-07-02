import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { billingApi } from '../../../api';
import { PAYMENT_MODES, todayDateOnly } from '../../../constants/billingTabs';
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

export default function RecordPaymentModal({ open, defaultDate, saving, error, onClose, onSave }) {
  const [form, setForm] = useState({
    tenant_id: '',
    invoice_id: '',
    amount: '',
    payment_date: defaultDate,
    payment_mode: 'bank_transfer',
    reference_no: '',
    notes: '',
  });

  const { data: subsData } = useQuery({
    queryKey: ['tenant-subscriptions-for-payment'],
    queryFn: () => billingApi.listTenantSubscriptions({ limit: 100 }),
    enabled: open,
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['billing-invoices-unpaid', form.tenant_id],
    queryFn: () =>
      billingApi.listInvoices({
        limit: 50,
        tenant_id: form.tenant_id,
        status: 'issued',
      }),
    enabled: open && !!form.tenant_id,
  });

  const subscriptions = subsData?.data?.subscriptions || [];
  const invoices = invoicesData?.data?.invoices || [];

  useEffect(() => {
    if (open) {
      setForm({
        tenant_id: '',
        invoice_id: '',
        amount: '',
        payment_date: defaultDate,
        payment_mode: 'bank_transfer',
        reference_no: '',
        notes: '',
      });
    }
  }, [open, defaultDate]);

  useEffect(() => {
    if (!form.invoice_id) return;
    const invoice = invoices.find((inv) => String(inv.id) === String(form.invoice_id));
    if (invoice && !form.amount) {
      setForm((prev) => ({ ...prev, amount: String(invoice.total) }));
    }
  }, [form.invoice_id, invoices, form.amount]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      tenant_id: parseInt(form.tenant_id, 10),
      invoice_id: form.invoice_id ? parseInt(form.invoice_id, 10) : undefined,
      amount: parseFloat(form.amount),
      payment_date: form.payment_date,
      payment_mode: form.payment_mode,
      reference_no: form.reference_no || undefined,
      notes: form.notes || undefined,
      status: 'completed',
    });
  };

  return (
    <div className="modal-backdrop z-50">
      <div className="modal-panel sm:max-w-lg">
        <div className="modal-panel-header">
          <h3 className="font-semibold text-slate-900 text-sm">Record Subscription Payment</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-panel-body space-y-4">
          <Field label="Tenant" required>
            <select
              required
              value={form.tenant_id}
              onChange={(e) => setForm((prev) => ({ ...prev, tenant_id: e.target.value, invoice_id: '' }))}
              className={inputClass()}
            >
              <option value="">Select tenant…</option>
              {subscriptions.map((row) => (
                <option key={row.tenant_id} value={row.tenant_id}>
                  {row.company_name} ({row.plan_name || 'No plan'})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Link to Invoice">
            <select
              value={form.invoice_id}
              onChange={(e) => setForm((prev) => ({ ...prev, invoice_id: e.target.value, amount: '' }))}
              className={inputClass()}
              disabled={!form.tenant_id}
            >
              <option value="">None (standalone payment)</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_no} · ₹{inv.total}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (₹)" required>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                className={inputClass()}
              />
            </Field>
            <Field label="Payment Date" required>
              <input
                required
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm((prev) => ({ ...prev, payment_date: e.target.value }))}
                className={inputClass()}
              />
            </Field>
          </div>

          <Field label="Payment Mode" required>
            <select
              value={form.payment_mode}
              onChange={(e) => setForm((prev) => ({ ...prev, payment_mode: e.target.value }))}
              className={inputClass()}
            >
              {PAYMENT_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Reference No.">
            <input
              value={form.reference_no}
              onChange={(e) => setForm((prev) => ({ ...prev, reference_no: e.target.value }))}
              className={inputClass()}
              placeholder="UTR / Cheque no."
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className={inputClass('min-h-[72px]')}
              placeholder="Optional notes"
            />
          </Field>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className={cn('btn-primary', saving && 'opacity-70')}>
              {saving ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
