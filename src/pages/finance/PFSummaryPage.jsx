import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import PeriodSelector from '../../components/finance/PeriodSelector';
import TablePagination from '../../components/shared/TablePagination';
import { formatINR } from '../../utils/helpers';
import { Landmark, Shield, Receipt } from 'lucide-react';
import { useTablePagination } from '../../hooks/useTablePagination';

export default function PFSummaryPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [tab, setTab] = useState('pf');
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [month, year, tab] });

  const { data, isLoading, error } = useQuery({
    queryKey: ['statutory-summary', month, year],
    queryFn: () => financeApi.statutorySummary({ month, year }),
  });

  const summary = data?.data;
  const totals = summary?.totals;
  // Show all payroll employees in each register tab so PF/ESI tabs do not appear blank
  // when contribution for the month is zero for everyone.
  const rows = tab === 'pt'
    ? (summary?.pt?.employees || [])
    : (summary?.employees || []);
  const { items: visibleRows, pagination } = paginateClient(rows || []);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Finance · PF / ESI"
        title="PF / ESI"
        subtitle="Monthly PF, ESI, and PT from payroll"
        actions={<PeriodSelector month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />}
      />

      {summary?.statutory_source === 'line_items' && (
        <p className="text-xs text-slate-500">
          Statutory amounts sourced from payroll run line items ({summary.line_item_count} rows).
        </p>
      )}

      {summary?.payroll_status === 'not_processed' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          No payroll processed for {summary.period_label}. Run payroll from Payslips first.
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading statutory data…</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">Failed to load statutory summary</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="PF (EE + ER)" value={formatINR(summary?.pf?.total)} icon={Landmark} />
            <StatCard label="ESI (EE + ER)" value={formatINR(summary?.esi?.total)} icon={Shield} />
            <StatCard label="Professional Tax" value={formatINR(summary?.pt?.total)} icon={Receipt} />
            <StatCard label="TDS Deducted" value={formatINR(summary?.tds?.total)} icon={Receipt} />
          </div>

          <div className="ds-tabs scroll-tabs" role="tablist">
            {[
              { id: 'pf', label: 'PF Register' },
              { id: 'esi', label: 'ESI Register' },
              { id: 'pt', label: 'PT Register' },
              { id: 'all', label: 'All Employees' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={tab === t.id ? 'ds-tab-active' : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="card overflow-x-auto overscroll-x-contain">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Emp Code</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">UAN / ESIC</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Gross</th>
                    {tab !== 'pt' && tab !== 'esi' && (
                      <>
                        <th className="text-right px-4 py-3 font-semibold text-slate-600">PF (EE)</th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-600">PF (ER)</th>
                      </>
                    )}
                    {tab !== 'pf' && tab !== 'pt' && (
                      <>
                        <th className="text-right px-4 py-3 font-semibold text-slate-600">ESI (EE)</th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-600">ESI (ER)</th>
                      </>
                    )}
                    {tab !== 'pf' && tab !== 'esi' && (
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">PT</th>
                    )}
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">TDS</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-slate-400">No records for this period</td>
                    </tr>
                  ) : (
                    visibleRows.map((emp) => (
                      <tr key={emp.employee_id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono">{emp.emp_code}</td>
                        <td className="px-4 py-2.5">{emp.name}</td>
                        <td className="px-4 py-2.5 text-slate-500">{emp.uan || emp.esic_number || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatINR(emp.gross_salary)}</td>
                        {tab !== 'pt' && tab !== 'esi' && (
                          <>
                            <td className="px-4 py-2.5 text-right font-mono">{formatINR(emp.pf_employee)}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{formatINR(emp.pf_employer)}</td>
                          </>
                        )}
                        {tab !== 'pf' && tab !== 'pt' && (
                          <>
                            <td className="px-4 py-2.5 text-right font-mono">{formatINR(emp.esic_employee)}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{formatINR(emp.esic_employer)}</td>
                          </>
                        )}
                        {tab !== 'pf' && tab !== 'esi' && (
                          <td className="px-4 py-2.5 text-right font-mono">{formatINR(emp.professional_tax)}</td>
                        )}
                        <td className="px-4 py-2.5 text-right font-mono">{formatINR(emp.tds)}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium">{formatINR(emp.net_salary)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {totals?.employees > 0 && (
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold">
                    <tr>
                      <td colSpan={3} className="px-4 py-3">Totals ({totals.employees} employees)</td>
                      <td className="px-4 py-3 text-right font-mono">{formatINR(totals.gross)}</td>
                      {tab !== 'pt' && tab !== 'esi' && (
                        <>
                          <td className="px-4 py-3 text-right font-mono">{formatINR(totals.pf_employee)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatINR(totals.pf_employer)}</td>
                        </>
                      )}
                      {tab !== 'pf' && tab !== 'pt' && (
                        <>
                          <td className="px-4 py-3 text-right font-mono">{formatINR(totals.esic_employee)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatINR(totals.esic_employer)}</td>
                        </>
                      )}
                      {tab !== 'pf' && tab !== 'esi' && (
                        <td className="px-4 py-3 text-right font-mono">{formatINR(totals.professional_tax)}</td>
                      )}
                      <td className="px-4 py-3 text-right font-mono">{formatINR(totals.tds)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatINR(totals.net)}</td>
                    </tr>
                  </tfoot>
                )}
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
          </div>
        </>
      )}
    </div>
  );
}
