import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/shared/PageHeader';
import FinanceModuleGuide from '../../components/finance/FinanceModuleGuide';
import VoucherDetailDrawer from '../../components/finance/VoucherDetailDrawer';
import TablePagination from '../../components/shared/TablePagination';
import { financeApi } from '../../api';
import { ACCOUNT_TYPE_LABELS } from '../../constants/finance';
import { formatINR } from '../../utils/helpers';
import { useTablePagination } from '../../hooks/useTablePagination';

function monthBounds(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const from = new Date(y, m, 1).toISOString().slice(0, 10);
  const to = new Date(y, m + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

function formatBalance(value) {
  if (value === 0) return `${formatINR(0)} Dr`;
  return value > 0 ? `${formatINR(Math.abs(value))} Dr` : `${formatINR(Math.abs(value))} Cr`;
}

export default function AccountLedgerPage() {
  const [searchParams] = useSearchParams();
  const defaults = monthBounds();
  const [accountId, setAccountId] = useState(searchParams.get('accountId') || '');
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [detailVoucherId, setDetailVoucherId] = useState(null);
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [accountId, from, to] });

  const coaQuery = useQuery({
    queryKey: ['finance-coa-active'],
    queryFn: () => financeApi.listChartOfAccounts({ active_only: true, limit: 500 }),
  });

  const ledgerParams = useMemo(() => ({ from, to }), [from, to]);

  const ledgerQuery = useQuery({
    queryKey: ['finance-ledger', accountId, ledgerParams],
    queryFn: () => financeApi.accountLedger(accountId, ledgerParams),
    enabled: !!accountId,
  });

  const groupedAccounts = useMemo(() => {
    const groups = coaQuery.data?.data?.groups || {};
    return Object.fromEntries(
      Object.entries(groups).map(([type, items]) => [
        type,
        (items || []).filter((account) => account.is_active !== false),
      ])
    );
  }, [coaQuery.data]);

  const ledger = ledgerQuery.data?.data;
  const lines = ledger?.lines || [];
  const { items: visibleLines, pagination } = paginateClient(lines);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Ledger"
        subtitle="Running balance for one account"
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white min-w-[260px]"
            >
              <option value="">Select account</option>
              {Object.entries(groupedAccounts).map(([type, items]) => (
                <optgroup key={type} label={ACCOUNT_TYPE_LABELS[type] || type}>
                  {items.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              aria-label="Ledger from date"
            />
            <span className="text-slate-400 text-sm">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              aria-label="Ledger to date"
            />
          </div>
        )}
      />

      <FinanceModuleGuide page="ledger" />

      {!accountId ? (
        <div className="card p-8 text-sm text-slate-500 text-center">Choose an account to view its ledger.</div>
      ) : ledgerQuery.isLoading ? (
        <div className="card p-8 text-sm text-slate-500 text-center">Loading ledger...</div>
      ) : ledgerQuery.isError ? (
        <div className="card p-8 text-sm text-red-600 text-center">
          {ledgerQuery.error?.response?.data?.error?.message || 'Failed to load ledger'}
        </div>
      ) : (
        <>
          <div className="card p-4">
            <p className="text-sm font-medium text-slate-700">
              {ledger?.account?.code} - {ledger?.account?.name}
            </p>
            <p className="text-xs text-slate-500 mt-1 capitalize">
              {ledger?.account?.account_type || '—'} {ledger?.account?.is_active ? '' : '(Inactive)'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-xs text-slate-500 uppercase">Opening Balance</p>
              <p className="mt-1 text-lg font-bold text-slate-800">{formatBalance(ledger?.opening_balance || 0)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500 uppercase">Entries</p>
              <p className="mt-1 text-lg font-bold text-slate-800">{lines.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500 uppercase">Closing Balance</p>
              <p className="mt-1 text-lg font-bold text-brand-700">{formatBalance(ledger?.closing_balance || 0)}</p>
            </div>
          </div>

          <div className="card overflow-x-auto overscroll-x-contain">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Date</th>
                    <th className="text-left px-4 py-3 font-semibold">Voucher</th>
                    <th className="text-left px-4 py-3 font-semibold">Narration</th>
                    <th className="text-right px-4 py-3 font-semibold">Debit</th>
                    <th className="text-right px-4 py-3 font-semibold">Credit</th>
                    <th className="text-right px-4 py-3 font-semibold">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No ledger lines in selected period
                      </td>
                    </tr>
                  ) : (
                    visibleLines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 whitespace-nowrap">{line.voucher_date}</td>
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => setDetailVoucherId(line.voucher_id)}
                            className="text-left font-mono text-brand-600 hover:text-brand-700 hover:underline underline-offset-2"
                            title="View full voucher"
                          >
                            {line.voucher_number}
                          </button>
                          <p className="text-[10px] text-slate-400 capitalize">{line.voucher_type?.replace('_', ' ')}</p>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 max-w-md truncate" title={line.narration_line || line.voucher_narration || ''}>
                          {line.narration_line || line.voucher_narration || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-emerald-700">
                          {line.debit_amount > 0 ? formatINR(line.debit_amount) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-red-600">
                          {line.credit_amount > 0 ? formatINR(line.credit_amount) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-700">
                          {formatBalance(line.running_balance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {lines.length > 0 && (
            <TablePagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          )}
        </>
      )}

      <VoucherDetailDrawer
        voucherId={detailVoucherId}
        highlightAccountId={accountId}
        onClose={() => setDetailVoucherId(null)}
      />
    </div>
  );
}
