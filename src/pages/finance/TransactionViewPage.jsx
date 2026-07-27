import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Banknote, FileText, Pencil, Receipt } from 'lucide-react';
import { financeApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import ReceivePaymentModal from '../../components/finance/ReceivePaymentModal';
import {
  TRANSACTION_TYPE_LABELS,
  PAYMENT_MODE_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  CATEGORY_TYPE_LABELS,
  FINANCE_WRITE_ROLES,
  buildTransactionNumber,
  resolveLineGstSplit,
} from '../../constants/finance';
import { formatINR, cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';

function invalidateFinanceQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
  queryClient.invalidateQueries({ queryKey: ['finance-transaction'] });
  queryClient.invalidateQueries({ queryKey: ['gst'] });
}

export default function TransactionViewPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;
  const canWrite = FINANCE_WRITE_ROLES.includes(role);
  const [showReceivePayment, setShowReceivePayment] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['finance-transaction', selectedTenantId, id],
    queryFn: () => financeApi.getTransaction(id),
    enabled: !tenantRequired && Boolean(id),
  });

  const tx = data?.data?.transaction;
  const payments = tx?.payments || [];
  const pendingAmount = parseFloat(tx?.pending_amount) || 0;
  const canReceivePayment = canWrite && pendingAmount > 0;
  const canEdit = canWrite;

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to view transactions.
      </div>
    );
  }

  if (isLoading) {
    return <div className="card p-12 text-center text-slate-400">Loading transaction…</div>;
  }

  if (error || !tx) {
    return (
      <div className="card p-12 text-center text-red-500">
        {error?.response?.data?.error?.message || 'Transaction not found'}
        <div className="mt-4">
          <Link to="/transactions" className="btn-secondary">Back to list</Link>
        </div>
      </div>
    );
  }

  const subtotal = (tx.line_items || []).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const totalCgst = (tx.line_items || []).reduce((s, i) => s + resolveLineGstSplit(i).cgst_amount, 0);
  const totalSgst = (tx.line_items || []).reduce((s, i) => s + resolveLineGstSplit(i).sgst_amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Finance · Transaction"
        title="View Transaction"
        subtitle={`Invoice ref: ${buildTransactionNumber(tx)}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Link to="/transactions" className="btn-secondary">
              <ArrowLeft size={14} /> Back
            </Link>
            {canReceivePayment && (
              <button type="button" onClick={() => setShowReceivePayment(true)} className="btn-primary">
                <Banknote size={14} /> Receive Payment
              </button>
            )}
            <Link to={`/transactions/${id}/invoice`} className="btn-primary">
              <FileText size={14} /> Invoice
            </Link>
            <Link to={`/transactions/${id}/receipt`} className="btn-secondary">
              <Receipt size={14} /> Receipt
            </Link>
            {canEdit && (
              <Link to={`/transactions/${id}/edit`} className="btn-secondary">
                <Pencil size={14} /> Edit
              </Link>
            )}
          </div>
        }
      />

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Payment Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryItem label="Grand Total" value={formatINR(tx.total_amount)} />
          <SummaryItem label="Amount Received" value={formatINR(tx.amount_received ?? tx.total_amount)} valueClass="text-emerald-700" />
          <SummaryItem label="Pending Amount" value={formatINR(tx.pending_amount ?? 0)} valueClass="text-orange-600" />
          {parseFloat(tx.pending_amount || 0) > 0 && (
            <SummaryItem
              label="Reminder Date"
              value={tx.pending_reminder_date || 'Not set'}
              valueClass={tx.pending_reminder_date ? 'text-slate-800' : 'text-slate-400'}
            />
          )}
          <div>
            <p className="text-xs text-slate-500">Payment Status</p>
            <span className={`inline-flex mt-1 text-[10px] px-2 py-1 rounded-full font-semibold ${PAYMENT_STATUS_STYLES[tx.payment_status || 'paid']}`}>
              {PAYMENT_STATUS_LABELS[tx.payment_status || 'paid']}
            </span>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Transaction Details</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <Item label="Date" value={tx.transaction_date} />
          <Item label="Type" value={TRANSACTION_TYPE_LABELS[tx.transaction_type]} />
          <Item label="Vendor" value={tx.vendor?.name || '—'} />
          <Item label="Category" value={`${tx.category?.name} (${CATEGORY_TYPE_LABELS[tx.category?.type]})`} />
          <Item label="Payment Mode" value={PAYMENT_MODE_LABELS[tx.payment_mode]} />
          <Item label="Voucher" value={tx.voucher?.voucher_number || '—'} mono />
          {tx.cheque_number && <Item label="Cheque Number" value={tx.cheque_number} mono />}
        </dl>
        {tx.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-1">Details</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{tx.notes}</p>
          </div>
        )}
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Product Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">#</th>
                <th className="text-left px-4 py-3 font-semibold">Product</th>
                <th className="text-right px-4 py-3 font-semibold">Qty</th>
                <th className="text-right px-4 py-3 font-semibold">Unit Price</th>
                <th className="text-right px-4 py-3 font-semibold">Amount</th>
                <th className="text-right px-4 py-3 font-semibold">CGST</th>
                <th className="text-right px-4 py-3 font-semibold">SGST</th>
                <th className="text-right px-4 py-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(tx.line_items || []).map((item, idx) => {
                const base = parseFloat(item.amount) || 0;
                const gstAmt = parseFloat(item.gst_amount) || 0;
                const split = resolveLineGstSplit(item);
                return (
                  <tr key={item.id || idx}>
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3 text-right font-mono">{item.qty}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatINR(item.unit_price)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatINR(base)}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {gstAmt > 0 || split.cgst_amount > 0 ? formatINR(split.cgst_amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {gstAmt > 0 || split.sgst_amount > 0 ? formatINR(split.sgst_amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{formatINR(base + gstAmt)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right text-slate-600">Subtotal</td>
                <td className="px-4 py-3 text-right font-mono">{formatINR(subtotal)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatINR(totalCgst)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatINR(totalSgst)}</td>
                <td className="px-4 py-3 text-right font-mono font-bold">{formatINR(tx.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Payment History</h3>
        </div>
        {payments.length === 0 ? (
          <p className="px-5 py-8 text-center text-slate-400 text-sm">No payments recorded yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                <th className="text-right px-4 py-3 font-semibold">Amount</th>
                <th className="text-left px-4 py-3 font-semibold">Mode</th>
                <th className="text-left px-4 py-3 font-semibold">Reference</th>
                <th className="text-left px-4 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3">{payment.payment_date}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-emerald-700">{formatINR(payment.amount)}</td>
                  <td className="px-4 py-3 capitalize">{PAYMENT_MODE_LABELS[payment.payment_mode]}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {payment.reference_number || payment.cheque_number || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{payment.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ReceivePaymentModal
        open={showReceivePayment}
        transaction={tx}
        onClose={() => setShowReceivePayment(false)}
        onSuccess={() => invalidateFinanceQueries(queryClient)}
      />
    </div>
  );
}

function Item({ label, value, mono }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={cn('mt-0.5 font-medium text-slate-900', mono && 'font-mono')}>{value}</dd>
    </div>
  );
}

function SummaryItem({ label, value, valueClass = 'text-slate-900' }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn('text-lg font-bold mt-1 font-mono', valueClass)}>{value}</p>
    </div>
  );
}
