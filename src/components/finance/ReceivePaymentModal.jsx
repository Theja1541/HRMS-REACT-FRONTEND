import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { financeApi } from '../../api';
import { PAYMENT_MODES } from '../../constants/finance';

function round2(n) {
  return Math.round(n * 100) / 100;
}

function formatMoney(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export default function ReceivePaymentModal({ open, transaction, onClose, onSuccess }) {
  const pending = round2(parseFloat(transaction?.pending_amount) || 0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [chequeNumber, setChequeNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open || !transaction) return;
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setAmount(String(pending || ''));
    setPaymentMode(transaction.payment_mode || 'cash');
    setChequeNumber('');
    setReferenceNumber('');
    setNotes('');
    setFormError('');
  }, [open, transaction, pending]);

  const saveMutation = useMutation({
    mutationFn: (payload) => financeApi.recordTransactionPayment(transaction.id, payload),
    onSuccess: () => {
      onSuccess?.();
      onClose?.();
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to record payment'),
  });

  if (!open || !transaction) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    const paymentAmount = round2(parseFloat(amount));
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setFormError('Enter a valid payment amount');
      return;
    }
    if (paymentAmount > pending) {
      setFormError(`Amount cannot exceed pending balance (${formatMoney(pending)})`);
      return;
    }

    saveMutation.mutate({
      payment_date: paymentDate,
      amount: paymentAmount,
      payment_mode: paymentMode,
      cheque_number: paymentMode === 'cheque' ? chequeNumber.trim() || null : null,
      reference_number: referenceNumber.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Receive Payment</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Grand Total {formatMoney(transaction.total_amount)} · Received {formatMoney(transaction.amount_received)} · Pending {formatMoney(pending)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {formError && (
            <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{formError}</div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-600">Payment Date</label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Amount</label>
            <input
              type="number"
              min="0.01"
              max={pending}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">Maximum: {formatMoney(pending)}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              {PAYMENT_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
          </div>

          {paymentMode === 'cheque' && (
            <div>
              <label className="text-xs font-medium text-slate-600">Cheque Number</label>
              <input
                type="text"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="Enter cheque number"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-600">Reference Number (optional)</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="UTR / transaction reference"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending || pending <= 0} className="btn-primary">
              {saveMutation.isPending ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
