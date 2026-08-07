import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Truck,
} from 'lucide-react';
import { financeApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import VoucherDetailDrawer from '../../components/finance/VoucherDetailDrawer';
import FinanceModuleGuide from '../../components/finance/FinanceModuleGuide';
import QuickAddVendorModal from '../../components/finance/QuickAddVendorModal';
import VoucherEntryForm from './VoucherEntryForm';
import {
  VOUCHER_TYPES,
  VOUCHER_TYPE_LABELS,
  VOUCHER_SOURCE_LABELS,
  VOUCHER_SOURCE_TYPES,
} from '../../constants/finance';
import { formatINR, monthBounds } from '../../utils/helpers';
import { useTablePagination } from '../../hooks/useTablePagination';

function payrollPayslipLink(voucher) {
  if (voucher.source_type !== 'payroll_run' || !voucher.voucher_date) return null;
  const [y, m] = String(voucher.voucher_date).split('-');
  return `/payslips?month=${parseInt(m, 10)}&year=${y}`;
}

function voucherSourceLink(voucher) {
  if (voucher.source_type === 'payroll_run') return payrollPayslipLink(voucher);
  if (voucher.source_type === 'finance_transaction' && voucher.source_id) {
    return `/transactions/${voucher.source_id}`;
  }
  return null;
}

function SourceBadge({ voucher }) {
  const label = VOUCHER_SOURCE_LABELS[voucher.source_type] || voucher.source_type;
  const href = voucherSourceLink(voucher);
  const isLinked = Boolean(href);
  const className = `inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium ${
    isLinked ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-slate-100 text-slate-600'
  }`;

  if (isLinked && href) {
    return (
      <Link to={href} className={`${className} underline-offset-2 hover:underline`} title="Open source record">
        {label}
      </Link>
    );
  }

  return <span className={className}>{label}</span>;
}

function BalanceBadge({ voucher }) {
  if (voucher.is_balanced) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        <CheckCircle2 size={12} />
        OK
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <AlertCircle size={12} />
      Check
    </span>
  );
}

function VoucherGroupRow({ voucher, expanded, onToggle, onViewVoucher }) {
  const typeLabel = VOUCHER_TYPE_LABELS[voucher.voucher_type] || voucher.voucher_type;

  return (
    <>
      <tr className="hover:bg-slate-50/80 bg-white">
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </td>
        <td className="px-4 py-2.5 whitespace-nowrap">{voucher.voucher_date}</td>
        <td className="px-4 py-2.5">
          <button
            type="button"
            onClick={() => onViewVoucher(voucher.id)}
            className="font-mono text-brand-600 hover:text-brand-700 hover:underline underline-offset-2"
            title="View voucher details"
          >
            {voucher.voucher_number}
          </button>
        </td>
        <td className="px-4 py-2.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
            {typeLabel}
          </span>
        </td>
        <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate" title={voucher.narration || ''}>
          {voucher.narration || '—'}
        </td>
        <td className="px-4 py-2.5 text-right font-mono text-emerald-700">{formatINR(voucher.total_debit)}</td>
        <td className="px-4 py-2.5 text-right font-mono text-red-600">{formatINR(voucher.total_credit)}</td>
        <td className="px-4 py-2.5">
          <SourceBadge voucher={voucher} />
        </td>
        <td className="px-4 py-2.5">
          <BalanceBadge voucher={voucher} />
        </td>
      </tr>
      {expanded &&
        voucher.lines.map((line) => (
          <tr key={line.id} className="bg-slate-50/60 text-slate-600">
            <td className="px-4 py-2" />
            <td className="px-4 py-2 pl-8 text-slate-400" colSpan={2}>
              <span className="font-mono text-[10px]">{line.account?.code}</span>
            </td>
            <td className="px-4 py-2 font-medium text-slate-700" colSpan={2}>
              {line.account?.name || '—'}
              {line.narration_line ? (
                <span className="block text-[10px] text-slate-400 font-normal truncate max-w-md">
                  {line.narration_line}
                </span>
              ) : null}
            </td>
            <td className="px-4 py-2 text-right font-mono text-emerald-700">
              {line.debit_amount > 0 ? formatINR(line.debit_amount) : '—'}
            </td>
            <td className="px-4 py-2 text-right font-mono text-red-600">
              {line.credit_amount > 0 ? formatINR(line.credit_amount) : '—'}
            </td>
            <td colSpan={2} />
          </tr>
        ))}
    </>
  );
}

export default function DayBookPage() {
  const queryClient = useQueryClient();
  const defaults = monthBounds();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [voucherType, setVoucherType] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [detailVoucherId, setDetailVoucherId] = useState(null);
  const [syncMessage, setSyncMessage] = useState(null);
  const { setPage, setLimit, paginateClient } = useTablePagination({
    resetDeps: [from, to, voucherType, sourceType],
  });

  const queryParams = useMemo(() => {
    const params = { from, to, limit: 200 };
    if (voucherType) params.voucher_type = voucherType;
    if (sourceType) params.source_type = sourceType;
    return params;
  }, [from, to, voucherType, sourceType]);

  const syncPeriod = useMemo(() => {
    const [y, m] = from.split('-').map(Number);
    return { month: m, year: y };
  }, [from]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['finance-vouchers', queryParams],
    queryFn: () => financeApi.listVouchers(queryParams),
  });

  const syncMutation = useMutation({
    mutationFn: () => financeApi.syncDayBook(syncPeriod),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['finance-vouchers'] });
      queryClient.invalidateQueries({ queryKey: ['daybook-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['finance-trial-balance'] });
      const sync = res?.data;
      if (sync?.already_synced) {
        setSyncMessage({ type: 'info', text: `Already synced: accrual ${sync.accrual_voucher_number || '—'}${sync.disbursement_voucher_number ? `, disbursement ${sync.disbursement_voucher_number}` : ''}.` });
      } else {
        setSyncMessage({ type: 'success', text: `Day Book updated: accrual ${sync?.accrual_voucher_number || '—'}${sync?.disbursement_voucher_number ? `, disbursement ${sync.disbursement_voucher_number}` : ''}.` });
      }
    },
    onError: (err) => {
      setSyncMessage({ type: 'error', text: err.response?.data?.error?.message || 'Sync failed — approve payroll first' });
    },
  });

  const vouchers = data?.data?.vouchers || [];
  const { items: visibleVouchers, pagination } = paginateClient(vouchers);

  const summary = useMemo(() => {
    return vouchers.reduce(
      (acc, v) => {
        acc.total_debit += v.total_debit || 0;
        acc.total_credit += v.total_credit || 0;
        acc.count += 1;
        return acc;
      },
      { total_debit: 0, total_credit: 0, count: 0 }
    );
  }, [vouchers]);

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Finance · Journal"
        title="Day Book"
        subtitle="All accounting entries for the selected dates"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="ds-input"
              aria-label="From date"
            />
            <span className="text-slate-400 text-sm">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="ds-input"
              aria-label="To date"
            />
            <select
              value={voucherType}
              onChange={(e) => setVoucherType(e.target.value)}
              className="ds-select"
              aria-label="Voucher type"
            >
              {VOUCHER_TYPES.map((t) => (
                <option key={t.value || 'all'} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="ds-select"
              aria-label="Source"
            >
              {VOUCHER_SOURCE_TYPES.map((t) => (
                <option key={t.value || 'all'} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="btn-secondary"
            >
              <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} />
              Sync Payroll
            </button>
            <button type="button" onClick={() => setShowVendorModal(true)} className="btn-secondary">
              <Truck size={14} /> Add Vendor
            </button>
            <button type="button" onClick={() => setShowForm(!showForm)} className="btn-primary">
              <Plus size={14} /> Add Entry
            </button>
          </div>
        }
      />

      <FinanceModuleGuide page="daybook" />

      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        <span className="font-medium text-slate-700">Debit</span> = money going out or value you get (expense, asset).{' '}
        <span className="font-medium text-slate-700">Credit</span> = money coming in or value you give (income, payment from cash/bank).
        Both sides must match on every entry.
      </p>

      {syncMessage && (
        <p className={`text-sm rounded-lg px-4 py-2 border ${
          syncMessage.type === 'error'
            ? 'text-red-700 bg-red-50 border-red-100'
            : syncMessage.type === 'info'
            ? 'text-slate-700 bg-slate-50 border-slate-200'
            : 'text-emerald-700 bg-emerald-50 border-emerald-100'
        }`}>
          {syncMessage.text}
        </p>
      )}

      {showForm && (
        <VoucherEntryForm onCancel={() => setShowForm(false)} onSuccess={() => setShowForm(false)} />
      )}

      <div className="stat-grid-3">
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-500 uppercase">Debit (Out / Expense)</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{formatINR(summary.total_debit)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-500 uppercase">Credit (In / Income)</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatINR(summary.total_credit)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-500 uppercase">Entries</p>
          <p className="text-xl font-bold mt-1">{summary.count}</p>
        </div>
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        {isLoading ? (
          <p className="text-center py-12 text-slate-400">Loading vouchers…</p>
        ) : isError ? (
          <p className="text-center py-12 text-red-600">
            {error?.response?.data?.error?.message || 'Failed to load vouchers'}
          </p>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-2">
            <p>No entries in this period.</p>
            <p className="text-xs">
              Add a{' '}
              <Link to="/transactions/add" className="text-brand-600 hover:underline">transaction</Link>
              {' '}or sync payroll.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="w-10 px-4 py-3" />
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Entry No</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Narration</th>
                  <th className="text-right px-4 py-3 font-semibold">Debit (Out)</th>
                  <th className="text-right px-4 py-3 font-semibold">Credit (In)</th>
                  <th className="text-left px-4 py-3 font-semibold">From</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleVouchers.map((voucher) => (
                  <VoucherGroupRow
                    key={voucher.id}
                    voucher={voucher}
                    expanded={expandedIds.has(voucher.id)}
                    onToggle={() => toggleExpanded(voucher.id)}
                    onViewVoucher={setDetailVoucherId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!isLoading && vouchers.length > 0 && (
        <TablePagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      <VoucherDetailDrawer
        voucherId={detailVoucherId}
        onClose={() => setDetailVoucherId(null)}
      />

      <QuickAddVendorModal open={showVendorModal} onClose={() => setShowVendorModal(false)} />
    </div>
  );
}
