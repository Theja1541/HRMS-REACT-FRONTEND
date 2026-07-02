import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { financeApi } from '../../api';
import { VOUCHER_TYPE_LABELS, VOUCHER_SOURCE_LABELS, FINANCE_WRITE_ROLES } from '../../constants/finance';
import { formatINR } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';

function payrollPayslipLink(voucher) {
  if (voucher?.source_type !== 'payroll_run' || !voucher?.voucher_date) return null;
  const [y, m] = String(voucher.voucher_date).split('-');
  return `/payslips?month=${parseInt(m, 10)}&year=${y}`;
}

function voucherSourceLink(voucher) {
  if (voucher?.source_type === 'payroll_run') return payrollPayslipLink(voucher);
  if (voucher?.source_type === 'finance_transaction' && voucher?.source_id) {
    return `/transactions/${voucher.source_id}`;
  }
  return null;
}

const REVERSIBLE_SOURCES = new Set(['manual']);

export default function VoucherDetailDrawer({ voucherId, highlightAccountId, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canWrite = FINANCE_WRITE_ROLES.includes(user?.role);

  const { data, isLoading, error } = useQuery({
    queryKey: ['finance-voucher', voucherId],
    queryFn: () => financeApi.getVoucher(voucherId),
    enabled: !!voucherId,
  });

  const reverseMutation = useMutation({
    mutationFn: () => financeApi.reverseVoucher(voucherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-voucher', voucherId] });
      queryClient.invalidateQueries({ queryKey: ['finance-vouchers'] });
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['daybook-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['finance-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['finance-trial-balance'] });
      onClose?.();
    },
  });

  if (!voucherId) return null;

  const voucher = data?.data?.voucher;
  const typeLabel = voucher ? VOUCHER_TYPE_LABELS[voucher.voucher_type] || voucher.voucher_type : '';
  const sourceLabel = voucher ? VOUCHER_SOURCE_LABELS[voucher.source_type] || voucher.source_type : '';
  const sourceHref =
    voucher && user?.role !== 'auditor' ? voucherSourceLink(voucher) : null;
  const canReverse =
    canWrite &&
    voucher?.status === 'posted' &&
    REVERSIBLE_SOURCES.has(voucher?.source_type);

  const handleReverse = () => {
    if (
      !window.confirm(
        `Reverse voucher ${voucher.voucher_number}? A balancing journal entry will be posted and this voucher will be marked reversed.`
      )
    ) {
      return;
    }
    reverseMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-2xl bg-white shadow-xl h-full overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            {voucher?.voucher_number && (
              <p className="text-xs font-mono text-brand-600 mb-1">{voucher.voucher_number}</p>
            )}
            <h2 className="text-lg font-semibold text-slate-900 leading-tight">
              {isLoading ? 'Loading voucher…' : typeLabel || 'Voucher'}
            </h2>
            {voucher?.voucher_date && (
              <p className="text-xs text-slate-500 mt-1">{voucher.voucher_date}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <p className="p-8 text-center text-slate-400">Loading voucher…</p>
        ) : error || !voucher ? (
          <p className="p-8 text-center text-red-500">
            {error?.response?.data?.error?.message || 'Failed to load voucher'}
          </p>
        ) : (
          <div className="flex-1 p-5 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-medium">Status</p>
                <p className="mt-1 text-sm capitalize text-slate-700">{voucher.status}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-medium">Source</p>
                {sourceHref ? (
                  <Link
                    to={sourceHref}
                    className="mt-1 inline-block text-sm text-brand-600 hover:underline"
                    onClick={onClose}
                  >
                    {sourceLabel}
                  </Link>
                ) : (
                  <p className="mt-1 text-sm text-slate-700">{sourceLabel}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-medium">Total Debit</p>
                <p className="mt-1 text-sm font-mono text-emerald-700">{formatINR(voucher.total_debit)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-medium">Total Credit</p>
                <p className="mt-1 text-sm font-mono text-red-600">{formatINR(voucher.total_credit)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {voucher.is_balanced ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <CheckCircle2 size={14} />
                  Balanced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                  <AlertCircle size={14} />
                  Out of balance
                </span>
              )}
              {voucher.posted_at && (
                <span className="text-xs text-slate-400">Posted {String(voucher.posted_at).slice(0, 10)}</span>
              )}
              {canReverse && (
                <button
                  type="button"
                  onClick={handleReverse}
                  disabled={reverseMutation.isPending}
                  className="btn-secondary text-xs ml-auto"
                >
                  <RotateCcw size={14} className={reverseMutation.isPending ? 'animate-spin' : ''} />
                  Reverse Voucher
                </button>
              )}
            </div>

            {reverseMutation.isError && (
              <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
                {reverseMutation.error?.response?.data?.error?.message || 'Failed to reverse voucher'}
              </div>
            )}

            {voucher.narration && (
              <div className="card p-4">
                <p className="text-[10px] uppercase text-slate-400 font-medium">Narration</p>
                <p className="mt-1 text-sm text-slate-700">{voucher.narration}</p>
              </div>
            )}

            <div className="card overflow-x-auto overscroll-x-contain">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Account</th>
                      <th className="text-right px-4 py-3 font-semibold">Debit</th>
                      <th className="text-right px-4 py-3 font-semibold">Credit</th>
                      <th className="text-left px-4 py-3 font-semibold">Line narration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {voucher.lines.map((line) => {
                      const highlighted = highlightAccountId && String(line.account_id) === String(highlightAccountId);
                      return (
                        <tr
                          key={line.id}
                          className={highlighted ? 'bg-brand-50/70' : 'hover:bg-slate-50'}
                        >
                          <td className="px-4 py-2.5">
                            <p className="font-mono text-[10px] text-slate-400">{line.account?.code}</p>
                            <p className="font-medium text-slate-700">{line.account?.name || '—'}</p>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-emerald-700">
                            {line.debit_amount > 0 ? formatINR(line.debit_amount) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-red-600">
                            {line.credit_amount > 0 ? formatINR(line.credit_amount) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate" title={line.narration_line || ''}>
                            {line.narration_line || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold">
                    <tr>
                      <td className="px-4 py-3">Totals</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatINR(voucher.total_debit)}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">{formatINR(voucher.total_credit)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
