import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, Pencil, Receipt } from 'lucide-react';
import { financeApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import {
  TRANSACTION_TYPE_LABELS,
  PAYMENT_MODE_LABELS,
  CATEGORY_TYPE_LABELS,
  FINANCE_WRITE_ROLES,
} from '../../constants/finance';
import { formatINR, cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';

export default function TransactionViewPage() {
  const { id } = useParams();
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;
  const canWrite = FINANCE_WRITE_ROLES.includes(user?.role);

  const { data, isLoading, error } = useQuery({
    queryKey: ['finance-transaction', selectedTenantId, id],
    queryFn: () => financeApi.getTransaction(id),
    enabled: !tenantRequired && Boolean(id),
  });

  const tx = data?.data?.transaction;

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
  const totalGst = (tx.line_items || []).reduce((s, i) => s + parseFloat(i.gst_amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="View Transaction"
        subtitle={`Invoice ref: TXN-${String(tx.transaction_date).replace(/-/g, '')}-${String(tx.id).padStart(4, '0')}`}
        actions={
          <div className="flex gap-2">
            <Link to="/transactions" className="btn-secondary">
              <ArrowLeft size={14} /> Back
            </Link>
            <Link to={`/transactions/${id}/invoice`} className="btn-primary">
              <FileText size={14} /> Invoice
            </Link>
            <Link to={`/transactions/${id}/receipt`} className="btn-secondary">
              <Receipt size={14} /> Receipt
            </Link>
            {canWrite && (
              <Link to={`/transactions/${id}/edit`} className="btn-secondary">
                <Pencil size={14} /> Edit
              </Link>
            )}
          </div>
        }
      />

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
                <th className="text-right px-4 py-3 font-semibold">GST</th>
                <th className="text-right px-4 py-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(tx.line_items || []).map((item, idx) => {
                const base = parseFloat(item.amount) || 0;
                const gstAmt = parseFloat(item.gst_amount) || 0;
                return (
                  <tr key={item.id || idx}>
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3 text-right font-mono">{item.qty}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatINR(item.unit_price)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatINR(base)}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {item.gst_applicable || gstAmt > 0 ? `${item.gst_percent}% (${formatINR(gstAmt)})` : '—'}
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
                <td className="px-4 py-3 text-right font-mono">{formatINR(totalGst)}</td>
                <td className="px-4 py-3 text-right font-mono font-bold">{formatINR(tx.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
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
