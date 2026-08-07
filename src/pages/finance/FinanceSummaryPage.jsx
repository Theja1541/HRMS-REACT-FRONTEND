import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { Link } from 'react-router-dom';
import { financeApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import FinanceModuleGuide from '../../components/finance/FinanceModuleGuide';
import PeriodSelector from '../../components/finance/PeriodSelector';
import TablePagination from '../../components/shared/TablePagination';
import { PAYROLL_STATUS_LABELS } from '../../constants/finance';
import { formatINR, localDateString } from '../../utils/helpers';
import { Banknote, TrendingUp, Users, Landmark } from 'lucide-react';
import { useTablePagination } from '../../hooks/useTablePagination';

export default function FinanceSummaryPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [month, year] });

  const range = useMemo(() => {
    const mm = String(month).padStart(2, '0');
    const from = `${year}-${mm}-01`;
    const to = localDateString(new Date(year, month, 0));
    return { from, to };
  }, [month, year]);

  const { data, isLoading: isPayrollLoading } = useQuery({
    queryKey: ['financial-summary', month, year],
    queryFn: () => financeApi.financialSummary({ month, year }),
  });

  const { data: daybookData, isLoading: isDaybookLoading } = useQuery({
    queryKey: ['finance-summary-daybook', range.from, range.to],
    queryFn: () => financeApi.daybookDashboard(range),
  });

  const summary = data?.data;
  const daybook = daybookData?.data;
  const current = summary?.current;
  const kpis = daybook?.kpis;
  const departmentRows = summary?.departmentBreakdown || [];
  const { items: visibleDepartmentRows, pagination } = paginateClient(departmentRows);
  const toNumber = (value) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const cleaned = String(value ?? '').replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const rawTrendData = (summary?.trend || []).map((t) => ({
    name: t.label,
    gross: toNumber(t.gross),
    net: toNumber(t.net),
    employer: toNumber(t.employer_cost),
  }));
  const chartData = rawTrendData.filter((t) => t.gross > 0 || t.net > 0 || t.employer > 0);
  const effectiveTrendData =
    chartData.length > 0
      ? chartData
      : [
          {
            name: summary?.period_label || `${month}/${year}`,
            gross: toNumber(current?.gross),
            net: toNumber(current?.net),
            employer: toNumber(current?.employer_cost),
          },
        ].filter((t) => t.gross > 0 || t.net > 0 || t.employer > 0);
  const cashFlowData = daybook?.cash_flow_trend || [];
  const isLoading = isPayrollLoading || isDaybookLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Finance · Summary"
        title="Financial Summary"
        subtitle="Day Book and Payroll summary for the selected month"
        actions={<PeriodSelector month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />}
      />

      <FinanceModuleGuide page="finance-summary" />

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading financial summary…</div>
      ) : (
        <>
          {summary?.payroll_status === 'not_processed' && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
              No payroll for {summary.period_label}. <Link to="/payslips" className="underline font-medium">Run payroll</Link> to populate this view.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total Income (Day Book)" value={formatINR(kpis?.total_income ?? 0)} icon={TrendingUp} />
            <StatCard label="Total Expense (Day Book)" value={formatINR(kpis?.total_expense ?? 0)} icon={Banknote} />
            <StatCard label="Net P/L (Day Book)" value={formatINR(kpis?.net_profit_loss ?? 0)} icon={Landmark} />
            <StatCard label="Voucher Lines" value={daybook?.voucher_line_count ?? 0} icon={Users} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Gross Payroll" value={formatINR(current?.gross ?? 0)} icon={Banknote} />
            <StatCard label="Net Disbursement" value={formatINR(current?.net ?? 0)} icon={TrendingUp} />
            <StatCard label="Employer Cost" value={formatINR(current?.employer_cost ?? 0)} delta="Incl. PF & ESI ER" deltaType="neutral" icon={Users} />
            <StatCard
              label="Statutory Payable"
              value={formatINR(current?.statutory_payable ?? 0)}
              delta={PAYROLL_STATUS_LABELS[summary?.payroll_status] || summary?.payroll_status}
              deltaType="neutral"
              icon={Landmark}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="text-sm font-semibold mb-4">Day Book Cash Flow</h3>
              {cashFlowData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={cashFlowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatINR(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="inflow" name="Money In" stroke="#10B981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="outflow" name="Money Out" stroke="#EF4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="net" name="Net" stroke="#2563EB" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400 text-center py-12">No Day Book cash movement yet</p>
              )}
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold mb-4">Payroll Trend</h3>
              {effectiveTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={effectiveTrendData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
                    <Tooltip formatter={(v) => formatINR(v)} />
                    <Legend />
                    <Bar dataKey="gross" name="Gross" fill="#2563EB" radius={[3, 3, 0, 0]} minPointSize={4} />
                    <Bar dataKey="net" name="Net" fill="#10B981" radius={[3, 3, 0, 0]} minPointSize={4} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400 text-center py-12">No payroll history yet</p>
              )}
            </div>

            <div className="card p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold mb-4">YTD {year} Liabilities</h3>
              <div className="space-y-3">
                {[
                  ['Total Gross (YTD)', summary?.ytd?.gross],
                  ['Total Net Paid (YTD)', summary?.ytd?.net],
                  ['PF Contributions (YTD)', summary?.ytd?.pf],
                  ['ESI Contributions (YTD)', summary?.ytd?.esi],
                  ['TDS Deducted (YTD)', summary?.ytd?.tds],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-600">{label}</span>
                    <span className="text-sm font-mono font-semibold">{formatINR(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {summary?.departmentBreakdown?.length > 0 && (
            <div className="card overflow-x-auto overscroll-x-contain">
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold">Department-wise Payroll — {summary.period_label}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Department</th>
                      <th className="text-right px-4 py-3 font-semibold">Employees</th>
                      <th className="text-right px-4 py-3 font-semibold">Gross</th>
                      <th className="text-right px-4 py-3 font-semibold">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleDepartmentRows.map((d) => (
                      <tr key={d.name}>
                        <td className="px-4 py-2.5 font-medium">{d.name}</td>
                        <td className="px-4 py-2.5 text-right">{d.count}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatINR(d.gross)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatINR(d.net)}</td>
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
