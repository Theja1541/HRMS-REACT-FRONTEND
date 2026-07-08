import { Fragment, useMemo, useState } from 'react';
import { useTablePagination, normalizePagination } from '../../hooks/useTablePagination';
import TablePagination from '../../components/shared/TablePagination';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ArrowDownLeft, ArrowUpRight, Pencil, Trash2, Eye, FileText, Receipt } from 'lucide-react';
import { financeApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import VoucherDetailDrawer from '../../components/finance/VoucherDetailDrawer';
import FinanceModuleGuide from '../../components/finance/FinanceModuleGuide';
import EmployeeSalaryPaymentsTab from './EmployeeSalaryPaymentsTab';
import {
  TRANSACTION_TYPE_LABELS,
  PAYMENT_MODE_LABELS,
  CATEGORY_TYPE_LABELS,
  FINANCE_WRITE_ROLES,
} from '../../constants/finance';
import { formatINR, cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';

function monthBounds(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  return {
    from: new Date(y, m, 1).toISOString().slice(0, 10),
    to: new Date(y, m + 1, 0).toISOString().slice(0, 10),
  };
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;
  const canWrite = FINANCE_WRITE_ROLES.includes(user?.role);
  const isAuditor = user?.role === 'auditor';
  const [auditorTab, setAuditorTab] = useState('transactions');

  const defaults = monthBounds();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [detailVoucherId, setDetailVoucherId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const { page, limit, setPage, setLimit, queryParams } = useTablePagination({
    resetDeps: [from, to, search, typeFilter, paymentFilter, selectedTenantId],
  });

  const listParams = useMemo(
    () => ({
      from,
      to,
      search: search || undefined,
      transaction_type: typeFilter || undefined,
      payment_mode: paymentFilter || undefined,
      ...queryParams,
    }),
    [from, to, search, typeFilter, paymentFilter, queryParams]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['finance-transactions', selectedTenantId, listParams],
    queryFn: () => financeApi.listTransactions(listParams),
    enabled: !tenantRequired && (!isAuditor || auditorTab === 'transactions'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => financeApi.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-vouchers'] });
      queryClient.invalidateQueries({ queryKey: ['daybook-dashboard'] });
    },
    onError: (err) => {
      window.alert(err.response?.data?.error?.message || 'Failed to delete transaction');
    },
  });

  const handleDelete = (tx) => {
    if (
      !window.confirm(
        `Delete this ${TRANSACTION_TYPE_LABELS[tx.transaction_type]} of ${formatINR(tx.total_amount)}? The linked voucher will be reversed.`
      )
    ) {
      return;
    }
    deleteMutation.mutate(tx.id);
  };

  const transactions = data?.data?.transactions || [];
  const pagination = normalizePagination(data?.data?.pagination, limit);
  const debitTotal = transactions
    .filter((t) => t.transaction_type === 'debit')
    .reduce((s, t) => s + parseFloat(t.total_amount), 0);
  const creditTotal = transactions
    .filter((t) => t.transaction_type === 'credit')
    .reduce((s, t) => s + parseFloat(t.total_amount), 0);

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to view Day Book.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Day Book"
        subtitle={
          isAuditor
            ? 'Payments, receipts, and salary payments (read-only)'
            : 'Record payments and receipts'
        }
        actions={
          canWrite ? (
            <Link to="/transactions/add" className="btn-primary">
              <Plus size={14} /> Add Entry
            </Link>
          ) : null
        }
      />

      {!isAuditor && <FinanceModuleGuide page="transactions" />}

      {isAuditor && (
        <div className="card px-4 border-b border-slate-200">
          <div className="flex gap-4 scroll-tabs border-b border-slate-200 -mx-4 px-4">
            {[
              { id: 'transactions', label: 'Payments & Receipts' },
              { id: 'salary-payments', label: 'Salary Payments' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAuditorTab(t.id)}
                className={cn(
                  'py-3 text-xs font-medium border-b-2 -mb-px',
                  auditorTab === t.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isAuditor && auditorTab === 'salary-payments' ? (
        <EmployeeSalaryPaymentsTab />
      ) : (
        <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Count" value={transactions.length} />
        <StatCard label="Debit (Money out)" value={formatINR(debitTotal)} icon={ArrowUpRight} />
        <StatCard label="Credit (Money in)" value={formatINR(creditTotal)} icon={ArrowDownLeft} />
      </div>

      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
            <option value="">All types</option>
            <option value="debit">Debit (Money out)</option>
            <option value="credit">Credit (Money in)</option>
          </select>
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
            <option value="">All modes</option>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="upi">UPI</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        {isLoading ? (
          <p className="text-center py-12 text-slate-400">Loading…</p>
        ) : error ? (
          <p className="text-center py-12 text-red-500">Failed to load entries</p>
        ) : transactions.length === 0 ? (
          <p className="text-center py-12 text-slate-400">No payments or receipts for this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Vendor</th>
                  <th className="text-left px-4 py-3 font-semibold">Category</th>
                  <th className="text-left px-4 py-3 font-semibold">Mode</th>
                  <th className="text-right px-4 py-3 font-semibold">Total</th>
                  <th className="text-left px-4 py-3 font-semibold">Voucher</th>
                  <th className="text-left px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <Fragment key={tx.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-3">{tx.transaction_date}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            tx.transaction_type === 'debit' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                          )}
                        >
                          {TRANSACTION_TYPE_LABELS[tx.transaction_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3">{tx.vendor?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <p>{tx.category?.name}</p>
                        <p className="text-slate-400">{CATEGORY_TYPE_LABELS[tx.category?.type]}</p>
                      </td>
                      <td className="px-4 py-3 capitalize">{PAYMENT_MODE_LABELS[tx.payment_mode]}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">{formatINR(tx.total_amount)}</td>
                      <td className="px-4 py-3">
                        {tx.voucher ? (
                          <button
                            type="button"
                            onClick={() => setDetailVoucherId(tx.voucher.id)}
                            className="font-mono text-brand-600 hover:underline"
                          >
                            {tx.voucher.voucher_number}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <Link
                            to={`/transactions/${tx.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-600 hover:text-brand-600 rounded border border-slate-200 hover:border-brand-300 bg-white"
                            title="View transaction"
                          >
                            <Eye size={12} /> View
                          </Link>
                          <Link
                            to={`/transactions/${tx.id}/invoice`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-600 hover:text-brand-600 rounded border border-slate-200 hover:border-brand-300 bg-white"
                            title="Tax invoice"
                          >
                            <FileText size={12} /> Invoice
                          </Link>
                          <Link
                            to={`/transactions/${tx.id}/receipt`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-600 hover:text-brand-600 rounded border border-slate-200 hover:border-brand-300 bg-white"
                            title="Payment receipt"
                          >
                            <Receipt size={12} /> Receipt
                          </Link>
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                            className="text-slate-500 hover:text-slate-800 text-[10px] font-medium px-2 py-1"
                          >
                            {expandedId === tx.id ? 'Hide' : 'Lines'}
                          </button>
                          {canWrite && (
                            <>
                              <Link
                                to={`/transactions/${tx.id}/edit`}
                                className="p-1.5 text-slate-400 hover:text-brand-600 rounded"
                                title="Edit transaction"
                              >
                                <Pencil size={14} />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(tx)}
                                disabled={deleteMutation.isPending}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded disabled:opacity-40"
                                title="Delete transaction"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === tx.id && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-semibold uppercase text-slate-500 mb-2">Line Items</p>
                              <table className="w-full text-[11px]">
                                <thead>
                                  <tr className="text-slate-500">
                                    <th className="text-left py-1">Product</th>
                                    <th className="text-right py-1">Qty</th>
                                    <th className="text-right py-1">Rate</th>
                                    <th className="text-right py-1">Amount</th>
                                    <th className="text-right py-1">GST</th>
                                    <th className="text-right py-1">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(tx.line_items || []).map((item, idx) => {
                                    const base = parseFloat(item.amount) || 0;
                                    const gstAmt = parseFloat(item.gst_amount) || 0;
                                    const lineTotal = base + gstAmt;
                                    return (
                                      <tr key={idx}>
                                        <td className="py-1">{item.description}</td>
                                        <td className="py-1 text-right font-mono">{item.qty}</td>
                                        <td className="py-1 text-right font-mono">{formatINR(item.unit_price)}</td>
                                        <td className="py-1 text-right font-mono">{formatINR(base)}</td>
                                        <td className="py-1 text-right font-mono">
                                          {item.gst_applicable || gstAmt > 0
                                            ? `${item.gst_percent}% (${formatINR(gstAmt)})`
                                            : '—'}
                                        </td>
                                        <td className="py-1 text-right font-mono">{formatINR(lineTotal)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            {tx.notes && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase text-slate-500 mb-2">Notes</p>
                                <p className="text-sm text-slate-600">{tx.notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            <TablePagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          </div>
        )}
      </div>

      <VoucherDetailDrawer voucherId={detailVoucherId} onClose={() => setDetailVoucherId(null)} />
        </>
      )}
    </div>
  );
}
