import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import FinanceModuleGuide from '../../components/finance/FinanceModuleGuide';
import TablePagination from '../../components/shared/TablePagination';
import { financeApi } from '../../api';
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from '../../constants/finance';
import { formatINR, localDateString } from '../../utils/helpers';
import { useTablePagination } from '../../hooks/useTablePagination';

export default function TrialBalancePage() {
  const [asOfDate, setAsOfDate] = useState(localDateString());
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [asOfDate] });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['finance-trial-balance', asOfDate],
    queryFn: () => financeApi.trialBalance({ asOfDate }),
    enabled: !!asOfDate,
  });

  const report = data?.data;
  const totals = report?.totals;
  const isBalanced = totals?.is_balanced !== false;
  const flatRows = ACCOUNT_TYPES.flatMap((type) => {
    const accounts = report?.groups?.[type] || [];
    const subtotal = report?.group_totals?.[type];
    if (!accounts.length) return [];
    return [{ rowType: 'header', type }, ...accounts.map((account) => ({ rowType: 'account', type, account })), { rowType: 'subtotal', type, subtotal }];
  });
  const { items: visibleRows, pagination } = paginateClient(flatRows);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Finance · Trial Balance"
        title="Trial Balance"
        subtitle="All accounts — check that debit equals credit"
        actions={(
          <div className="flex items-center gap-2">
            <label htmlFor="as-of-date" className="text-sm text-slate-500">
              As of
            </label>
            <input
              id="as-of-date"
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="ds-input"
            />
          </div>
        )}
      />

      <FinanceModuleGuide page="trial-balance" />

      {!isLoading && report && !isBalanced && (
        <div className="rounded-lg border-2 border-red-500 bg-red-50 px-4 py-4 flex items-start gap-3">
          <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={22} />
          <div>
            <p className="text-sm font-bold text-red-800 uppercase tracking-wide">
              Trial balance out of balance
            </p>
            <p className="text-sm text-red-700 mt-1">
              Total debits ({formatINR(totals.total_debit)}) do not equal total credits (
              {formatINR(totals.total_credit)}). Imbalance:{' '}
              <span className="font-mono font-bold">{formatINR(Math.abs(totals.imbalance))}</span>.
              This should never happen — investigate voucher posting or data integrity.
            </p>
          </div>
        </div>
      )}

      {!isLoading && report && isBalanced && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2 text-sm text-emerald-800">
          <CheckCircle2 size={18} />
          Trial balance is balanced — total debits equal total credits.
        </div>
      )}

      <div className="card overflow-x-auto overscroll-x-contain">
        {isLoading ? (
          <p className="text-center py-12 text-slate-400">Loading trial balance…</p>
        ) : isError ? (
          <p className="text-center py-12 text-red-600">
            {error?.response?.data?.error?.message || 'Failed to load trial balance'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Code</th>
                  <th className="text-left px-4 py-3 font-semibold">Account</th>
                  <th className="text-right px-4 py-3 font-semibold">Debit</th>
                  <th className="text-right px-4 py-3 font-semibold">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((row, idx) => {
                  if (row.rowType === 'header') {
                    return (
                      <tr key={`h-${row.type}-${idx}`} className="bg-slate-100/80">
                        <td colSpan={4} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          {ACCOUNT_TYPE_LABELS[row.type] || row.type}
                        </td>
                      </tr>
                    );
                  }
                  if (row.rowType === 'subtotal') {
                    return (
                      <tr key={`s-${row.type}-${idx}`} className="bg-slate-50 font-semibold border-t border-slate-200">
                        <td colSpan={2} className="px-4 py-2.5 text-slate-600">
                          {ACCOUNT_TYPE_LABELS[row.type]} subtotal
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-red-600">
                          {formatINR(row.subtotal?.total_debit || 0)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-emerald-700">
                          {formatINR(row.subtotal?.total_credit || 0)}
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={`a-${row.account.id}-${idx}`} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-slate-500">{row.account.code}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.account.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-red-600">
                        {formatINR(row.account.total_debit || 0)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-700">
                        {formatINR(row.account.total_credit || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className={`border-t-2 font-bold ${isBalanced ? 'bg-slate-100 border-slate-300' : 'bg-red-100 border-red-400'}`}>
                <tr>
                  <td colSpan={2} className="px-4 py-3 uppercase text-[11px] tracking-wide">
                    Grand Total
                    {!isBalanced && (
                      <span className="ml-2 text-red-700 normal-case font-semibold">— OUT OF BALANCE</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${isBalanced ? 'text-red-600' : 'text-red-700'}`}>
                    {formatINR(totals?.total_debit || 0)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${isBalanced ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatINR(totals?.total_credit || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
      {!isLoading && !isError && flatRows.length > 0 && (
        <TablePagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}
    </div>
  );
}
