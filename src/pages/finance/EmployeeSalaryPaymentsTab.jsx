import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Eye, X, Users, Wallet, FilterX } from 'lucide-react';
import { financeApi } from '../../api';
import { StatCard } from '../../components/shared/PageHeader';
import PayslipView from '../../components/payroll/PayslipView';
import VoucherDetailDrawer from '../../components/finance/VoucherDetailDrawer';
import TablePagination from '../../components/shared/TablePagination';
import { MONTHS } from '../../constants/payroll';
import { formatINR } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { useTablePagination } from '../../hooks/useTablePagination';

const PAYMENT_MODE_LABELS = {
  cash: 'Cash',
  bank: 'Bank',
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  cheque: 'Cheque',
};

function payPeriodLabel(month, year) {
  if (!month || !year) return '—';
  return `${MONTHS[month - 1] || month} ${year}`;
}

export default function EmployeeSalaryPaymentsTab() {
  const { selectedTenantId } = useAuthStore();

  // Default: no date filter → show ALL salary payments
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [detailVoucherId, setDetailVoucherId] = useState(null);
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [from, to, search] });

  const isFiltered = from || to || search;

  const listParams = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      search: search || undefined,
    }),
    [from, to, search]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['finance-salary-payments', selectedTenantId, listParams],
    queryFn: () => financeApi.listSalaryPayments(listParams),
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['finance-salary-payment', selectedTenantId, selectedPaymentId],
    queryFn: () => financeApi.getSalaryPayment(selectedPaymentId),
    enabled: !!selectedPaymentId,
  });

  const payments = data?.data?.payments || [];
  const { items: visiblePayments, pagination } = paginateClient(payments);
  const summary = data?.data?.summary;

  function clearFilters() {
    setFrom('');
    setTo('');
    setSearch('');
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Salary Payments" value={summary?.count ?? payments.length} icon={Users} />
        <StatCard label="Total Net Paid" value={formatINR(summary?.total_net ?? 0)} icon={Wallet} />
      </div>

      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee name or code…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
            {isFiltered && (
              <button
                type="button"
                onClick={clearFilters}
                title="Clear filters"
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-brand-600 border border-slate-200 hover:border-brand-300 rounded-lg bg-white transition-colors"
              >
                <FilterX size={13} /> Clear
              </button>
            )}
          </div>
        </div>
        {isFiltered && (
          <p className="mt-2 text-xs text-slate-400">
            Filtering results
            {from && ` from ${from}`}
            {to && ` to ${to}`}
            {search && ` matching "${search}"`}
            . <button type="button" className="text-brand-600 hover:underline" onClick={clearFilters}>Show all</button>
          </p>
        )}
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        {isLoading ? (
          <p className="text-center py-12 text-slate-400">Loading salary payments…</p>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 text-sm">Failed to load salary payments</p>
            <p className="text-slate-400 text-xs mt-1">{error?.response?.data?.error?.message || error?.message}</p>
          </div>
        ) : payments.length === 0 ? (
          <p className="text-center py-12 text-slate-400">
            {isFiltered ? 'No salary payments match the selected filters.' : 'No employee salary payments found.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Payment Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Employee</th>
                  <th className="text-left px-4 py-3 font-semibold">Pay Period</th>
                  <th className="text-right px-4 py-3 font-semibold">Gross</th>
                  <th className="text-right px-4 py-3 font-semibold">Deductions</th>
                  <th className="text-right px-4 py-3 font-semibold">Net Paid</th>
                  <th className="text-left px-4 py-3 font-semibold">Mode</th>
                  <th className="text-left px-4 py-3 font-semibold">Voucher</th>
                  <th className="text-left px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visiblePayments.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{row.payment_date || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.employee?.name}</p>
                      <p className="text-slate-400 font-mono">{row.employee?.emp_code}</p>
                    </td>
                    <td className="px-4 py-3">{payPeriodLabel(row.month, row.year)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatINR(row.gross_salary)}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-600">
                      {formatINR(row.total_deductions)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-emerald-700">
                      {formatINR(row.net_salary)}
                    </td>
                    <td className="px-4 py-3">
                      {PAYMENT_MODE_LABELS[row.payment_mode] || row.payment_mode || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {row.voucher ? (
                        <button
                          type="button"
                          onClick={() => setDetailVoucherId(row.voucher.id)}
                          className="font-mono text-brand-600 hover:underline"
                        >
                          {row.voucher.voucher_number}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentId(row.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-600 hover:text-brand-600 rounded border border-slate-200 hover:border-brand-300 bg-white"
                      >
                        <Eye size={12} /> View Payslip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && payments.length > 0 && (
        <TablePagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      {selectedPaymentId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelectedPaymentId(null)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-3xl bg-white shadow-xl h-full overflow-y-auto flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Salary Payment</h2>
                <p className="text-xs text-slate-500 mt-0.5">Read-only payslip view</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPaymentId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-5">
              {detailLoading ? (
                <p className="text-center py-16 text-slate-400">Loading payslip…</p>
              ) : detailData?.data?.payslip ? (
                <PayslipView payslip={detailData.data.payslip} />
              ) : (
                <p className="text-center py-16 text-red-500">Payslip not found</p>
              )}
            </div>
          </div>
        </div>
      )}

      <VoucherDetailDrawer voucherId={detailVoucherId} onClose={() => setDetailVoucherId(null)} />
    </div>
  );
}
