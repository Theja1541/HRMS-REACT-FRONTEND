import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { billingApi } from '../../../api';
import TablePagination from '../../../components/shared/TablePagination';
import StatusBadge from '../../../components/shared/StatusBadge';
import { useTablePagination, normalizePagination } from '../../../hooks/useTablePagination';
import { formatINR, cn } from '../../../utils/helpers';
import {
  PAYMENT_STATUS_OPTIONS,
  formatBillingDate,
  paymentModeLabel,
  todayDateOnly,
} from '../../../constants/billingTabs';
import RecordPaymentModal from './RecordPaymentModal';

function selectClass() {
  return 'px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600';
}

export default function PaymentsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { page, limit, setPage, setLimit, queryParams } = useTablePagination({ resetDeps: [search, status] });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['billing-payments', queryParams, search, status],
    queryFn: () =>
      billingApi.listPayments({
        ...queryParams,
        search: search || undefined,
        status: status || undefined,
      }),
  });

  const payments = data?.data?.payments || [];
  const pagination = normalizePagination(data?.pagination, limit);

  const recordMutation = useMutation({
    mutationFn: billingApi.recordPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-payments'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-subscriptions'] });
      setModalOpen(false);
    },
  });

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Subscription Payments</h3>
          <p className="text-xs text-slate-500 mt-1">Record and track platform subscription collections from tenants.</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={14} /> Record Payment
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant or reference…"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass()}>
          {PAYMENT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-center text-slate-400 py-16 text-sm">Loading payments…</p>
      ) : isError ? (
        <p className="text-center text-red-500 py-16 text-sm">
          {error?.response?.data?.error?.message || 'Failed to load payments'}
        </p>
      ) : payments.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-xl p-12 text-center">
          <p className="text-slate-400 text-sm">No payments recorded yet</p>
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary mt-4">
            <Plus size={14} /> Record Payment
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Tenant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Mode</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Invoice</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{formatBillingDate(payment.payment_date)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{payment.tenant?.name || '—'}</p>
                      <p className="text-xs text-slate-400">{payment.tenant?.company_code || '—'}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatINR(payment.amount)}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{paymentModeLabel(payment.payment_mode)}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-mono">{payment.reference_no || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{payment.invoice?.invoice_no || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={payment.status === 'completed' ? 'active' : payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}

      <RecordPaymentModal
        open={modalOpen}
        defaultDate={todayDateOnly()}
        saving={recordMutation.isPending}
        error={recordMutation.error?.response?.data?.error?.message || ''}
        onClose={() => setModalOpen(false)}
        onSave={(payload) => recordMutation.mutate(payload)}
      />
    </div>
  );
}
