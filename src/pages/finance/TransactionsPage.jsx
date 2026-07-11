import { Fragment, useMemo, useState } from 'react';
import { useTablePagination, normalizePagination } from '../../hooks/useTablePagination';
import TablePagination from '../../components/shared/TablePagination';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Trash2,
  Eye,
  FileText,
  Receipt,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { financeApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import VoucherDetailDrawer from '../../components/finance/VoucherDetailDrawer';
import FinanceModuleGuide from '../../components/finance/FinanceModuleGuide';
import EmployeeSalaryPaymentsTab from './EmployeeSalaryPaymentsTab';
import {
  TRANSACTION_TYPE_LABELS,
  PAYMENT_MODE_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  PAYMENT_STATUSES,
  CATEGORY_TYPE_LABELS,
  FINANCE_WRITE_ROLES,
  buildTransactionNumber,
  resolvePaymentStatus,
  resolveLineGstSplit,
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

function daysLeftUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function formatDaysLeft(days) {
  if (days == null) return null;
  if (days > 1) return `${days} days left`;
  if (days === 1) return '1 day left';
  if (days === 0) return 'Due today';
  if (days === -1) return '1 day overdue';
  return `${Math.abs(days)} days overdue`;
}

function pendingAmount(tx) {
  return parseFloat(tx.pending_amount ?? 0);
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
  const [statusFilter, setStatusFilter] = useState('');
  const [dueDateFilter, setDueDateFilter] = useState('');
  const [detailVoucherId, setDetailVoucherId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const { page, limit, setPage, setLimit, queryParams } = useTablePagination({
    resetDeps: [from, to, search, typeFilter, paymentFilter, statusFilter, dueDateFilter, selectedTenantId],
  });

  const listParams = useMemo(
    () => ({
      from,
      to,
      search: search || undefined,
      transaction_type: typeFilter || undefined,
      payment_mode: paymentFilter || undefined,
      payment_status: statusFilter || undefined,
      due_date: dueDateFilter || undefined,
      ...queryParams,
    }),
    [from, to, search, typeFilter, paymentFilter, statusFilter, dueDateFilter, queryParams]
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
      queryClient.invalidateQueries({ queryKey: ['gst'] });
    },
    onError: (err) => {
      window.alert(err.response?.data?.error?.message || 'Failed to delete transaction');
    },
  });

  const handleDelete = (tx) => {
    if (
      !window.confirm(
        `Delete ${buildTransactionNumber(tx)} (${formatINR(tx.total_amount)})? The linked voucher will be reversed.`
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
            <div className="flex flex-col xl:flex-row gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search notes…"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="">All types</option>
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
                <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="">All modes</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="">All statuses</option>
                  {PAYMENT_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-1.5 px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white">
                  <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap pl-1">Due</span>
                  <input
                    type="date"
                    value={dueDateFilter}
                    onChange={(e) => setDueDateFilter(e.target.value)}
                    className="border-none outline-none text-sm bg-transparent py-0.5"
                    title="Due date"
                    aria-label="Due date"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            {isLoading ? (
              <p className="text-center py-12 text-slate-400">Loading…</p>
            ) : error ? (
              <p className="text-center py-12 text-red-500">Failed to load entries</p>
            ) : transactions.length === 0 ? (
              <p className="text-center py-12 text-slate-400">No payments or receipts for this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="text-left px-3 py-3 font-semibold w-8" />
                      <th className="text-left px-3 py-3 font-semibold">Date / Txn</th>
                      <th className="text-left px-3 py-3 font-semibold">Type</th>
                      <th className="text-left px-3 py-3 font-semibold min-w-[160px]">Vendor / Category</th>
                      <th className="text-left px-3 py-3 font-semibold">Mode</th>
                      <th className="text-right px-3 py-3 font-semibold">Grand Total</th>
                      <th className="text-right px-3 py-3 font-semibold">Received</th>
                      <th className="text-right px-3 py-3 font-semibold">Pending</th>
                      <th className="text-left px-3 py-3 font-semibold whitespace-nowrap">Due Date</th>
                      <th className="text-left px-3 py-3 font-semibold">Status</th>
                      <th className="text-left px-3 py-3 font-semibold">Voucher</th>
                      <th className="text-right px-3 py-3 font-semibold min-w-[120px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx) => {
                      const status = resolvePaymentStatus(tx);
                      const pending = pendingAmount(tx);
                      const expanded = expandedId === tx.id;
                      const daysLeft = pending > 0 ? daysLeftUntil(tx.pending_reminder_date) : null;
                      const daysLabel = formatDaysLeft(daysLeft);

                      return (
                        <Fragment key={tx.id}>
                          <tr className={cn('hover:bg-slate-50/80 transition-colors', expanded && 'bg-slate-50/50')}>
                            <td className="px-3 py-3 align-top">
                              <button
                                type="button"
                                onClick={() => setExpandedId(expanded ? null : tx.id)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                title={expanded ? 'Hide line items' : 'Show line items'}
                              >
                                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            </td>
                            <td className="px-3 py-3 align-top whitespace-nowrap">
                              <p className="font-medium text-slate-800">{tx.transaction_date}</p>
                              <Link to={`/transactions/${tx.id}`} className="text-xs font-mono text-brand-600 hover:underline">
                                {buildTransactionNumber(tx)}
                              </Link>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <span
                                className={cn(
                                  'inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
                                  tx.transaction_type === 'debit' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                                )}
                              >
                                {TRANSACTION_TYPE_LABELS[tx.transaction_type]}
                              </span>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <p className="font-medium text-slate-800 truncate max-w-[180px]" title={tx.vendor?.name}>
                                {tx.vendor?.name || '—'}
                              </p>
                              <p className="text-xs text-slate-500 truncate max-w-[180px]" title={tx.category?.name}>
                                {tx.category?.name}
                                <span className="text-slate-400"> · {CATEGORY_TYPE_LABELS[tx.category?.type]}</span>
                              </p>
                            </td>
                            <td className="px-3 py-3 align-top text-slate-600 whitespace-nowrap">
                              {PAYMENT_MODE_LABELS[tx.payment_mode]}
                            </td>
                            <td className="px-3 py-3 align-top text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                              {formatINR(tx.total_amount)}
                            </td>
                            <td className="px-3 py-3 align-top text-right font-mono text-emerald-700 whitespace-nowrap">
                              {formatINR(tx.amount_received ?? tx.total_amount)}
                            </td>
                            <td className={cn(
                              'px-3 py-3 align-top text-right font-mono whitespace-nowrap',
                              pending > 0 ? 'text-orange-600 font-semibold' : 'text-slate-400'
                            )}>
                              {formatINR(pending)}
                            </td>
                            <td className="px-3 py-3 align-top whitespace-nowrap">
                              {pending > 0 && daysLabel ? (
                                <span
                                  className={cn(
                                    'text-xs font-semibold',
                                    daysLeft < 0 && 'text-red-600',
                                    daysLeft === 0 && 'text-amber-600',
                                    daysLeft > 0 && 'text-slate-700'
                                  )}
                                  title={tx.pending_reminder_date ? `Due ${tx.pending_reminder_date}` : undefined}
                                >
                                  {daysLabel}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 align-top">
                              <span className={`inline-flex text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${PAYMENT_STATUS_STYLES[status]}`}>
                                {PAYMENT_STATUS_LABELS[status]}
                              </span>
                            </td>
                            <td className="px-3 py-3 align-top">
                              {tx.voucher ? (
                                <button
                                  type="button"
                                  onClick={() => setDetailVoucherId(tx.voucher.id)}
                                  className="text-xs font-mono text-brand-600 hover:underline"
                                >
                                  {tx.voucher.voucher_number}
                                </button>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="flex items-center justify-end gap-1">
                                <Link
                                  to={`/transactions/${tx.id}`}
                                  className="p-1.5 rounded-md text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                                  title="View"
                                >
                                  <Eye size={15} />
                                </Link>
                                {canWrite && (
                                  <>
                                    <Link
                                      to={`/transactions/${tx.id}/edit`}
                                      className="p-1.5 rounded-md text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                                      title="Edit"
                                    >
                                      <Pencil size={15} />
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(tx)}
                                      disabled={deleteMutation.isPending}
                                      className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                                      title="Delete"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={() => setMenuOpenId(menuOpenId === tx.id ? null : tx.id)}
                                        className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                        title="More"
                                      >
                                        <MoreHorizontal size={15} />
                                      </button>
                                      {menuOpenId === tx.id && (
                                        <>
                                          <button
                                            type="button"
                                            className="fixed inset-0 z-10 cursor-default"
                                            aria-label="Close menu"
                                            onClick={() => setMenuOpenId(null)}
                                          />
                                          <div className="absolute right-0 top-full mt-1 z-20 w-40 py-1 bg-white border border-slate-200 rounded-lg shadow-lg text-xs">
                                            <Link
                                              to={`/transactions/${tx.id}/invoice`}
                                              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700"
                                              onClick={() => setMenuOpenId(null)}
                                            >
                                              <FileText size={13} /> Invoice
                                            </Link>
                                            <Link
                                              to={`/transactions/${tx.id}/receipt`}
                                              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700"
                                              onClick={() => setMenuOpenId(null)}
                                            >
                                              <Receipt size={13} /> Receipt
                                            </Link>
                                            {pending > 0 && (
                                              <Link
                                                to={`/transactions/${tx.id}`}
                                                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-emerald-700"
                                                onClick={() => setMenuOpenId(null)}
                                              >
                                                <ArrowDownLeft size={13} /> Receive Payment
                                              </Link>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="bg-slate-50/60">
                              <td colSpan={12} className="px-4 py-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Line Items</p>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-slate-500 border-b border-slate-200">
                                          <th className="text-left py-1.5 font-medium">Product</th>
                                          <th className="text-right py-1.5 font-medium">Qty</th>
                                          <th className="text-right py-1.5 font-medium">Rate</th>
                                          <th className="text-right py-1.5 font-medium">CGST</th>
                                          <th className="text-right py-1.5 font-medium">SGST</th>
                                          <th className="text-right py-1.5 font-medium">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(tx.line_items || []).map((item, idx) => {
                                          const base = parseFloat(item.amount) || 0;
                                          const gstAmt = parseFloat(item.gst_amount) || 0;
                                          const split = resolveLineGstSplit(item);
                                          return (
                                            <tr key={idx} className="border-b border-slate-100 last:border-0">
                                              <td className="py-1.5 pr-2">{item.description}</td>
                                              <td className="py-1.5 text-right font-mono">{item.qty}</td>
                                              <td className="py-1.5 text-right font-mono">{formatINR(item.unit_price)}</td>
                                              <td className="py-1.5 text-right font-mono">
                                                {gstAmt > 0 || split.cgst_amount > 0 ? formatINR(split.cgst_amount) : '—'}
                                              </td>
                                              <td className="py-1.5 text-right font-mono">
                                                {gstAmt > 0 || split.sgst_amount > 0 ? formatINR(split.sgst_amount) : '—'}
                                              </td>
                                              <td className="py-1.5 text-right font-mono font-medium">{formatINR(base + gstAmt)}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                  {tx.notes && (
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Notes</p>
                                      <p className="text-sm text-slate-600 leading-relaxed">{tx.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                <div className="border-t border-slate-100 px-4">
                  <TablePagination
                    page={pagination.page}
                    limit={pagination.limit}
                    total={pagination.total}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                    onLimitChange={setLimit}
                  />
                </div>
              </div>
            )}
          </div>

          <VoucherDetailDrawer voucherId={detailVoucherId} onClose={() => setDetailVoucherId(null)} />
        </>
      )}
    </div>
  );
}
