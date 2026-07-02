import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Users } from 'lucide-react';
import { financeApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import FinanceModuleGuide from '../../components/finance/FinanceModuleGuide';
import TablePagination from '../../components/shared/TablePagination';
import { formatINR, cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { useTablePagination } from '../../hooks/useTablePagination';

function monthBounds(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  return {
    from: new Date(y, m, 1).toISOString().slice(0, 10),
    to: new Date(y, m + 1, 0).toISOString().slice(0, 10),
  };
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-mono">
          {entry.name}: {formatINR(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function DaybookDashboardPage() {
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;

  const defaults = monthBounds();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [from, to] });

  const params = useMemo(() => ({ from, to }), [from, to]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['daybook-dashboard', selectedTenantId, params],
    queryFn: () => financeApi.daybookDashboard(params),
    enabled: !tenantRequired && Boolean(from && to),
  });

  const dashboard = data?.data;
  const kpis = dashboard?.kpis;
  const netPositive = (kpis?.net_profit_loss ?? 0) >= 0;

  const expenseChartData = (dashboard?.expense_by_category || []).slice(0, 12).map((item) => ({
    name: item.name.length > 18 ? `${item.name.slice(0, 16)}…` : item.name,
    fullName: item.name,
    amount: item.amount,
  }));
  const expenseRows = dashboard?.expense_by_category || [];
  const { items: visibleExpenseRows, pagination } = paginateClient(expenseRows);

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to view the Day Book dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Day Book Dashboard"
        subtitle="Income, expense, and cash flow from posted vouchers"
        actions={
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
            <span className="text-slate-400 text-sm">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        }
      />

      <FinanceModuleGuide page="dashboard" showQuickLinks={false} />

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading dashboard…</div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">Failed to load dashboard</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total Income" value={formatINR(kpis?.total_income ?? 0)} icon={TrendingUp} />
            <StatCard label="Total Expense" value={formatINR(kpis?.total_expense ?? 0)} icon={TrendingDown} />
            <StatCard
              label="Employee Salary Expense"
              value={formatINR(kpis?.employee_salary_expense ?? 0)}
              icon={Users}
              delta="Salary Expense COA"
              deltaType="neutral"
            />
            <StatCard
              label="Net Profit / Loss"
              value={formatINR(kpis?.net_profit_loss ?? 0)}
              icon={Wallet}
              delta={netPositive ? 'Profit' : 'Loss'}
              deltaType={netPositive ? 'up' : 'neutral'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Cash Flow Trend</h3>
                <span className="text-[10px] text-slate-400 uppercase">
                  {dashboard?.bucket === 'day' ? 'Daily' : 'Monthly'} · Cash & Bank
                </span>
              </div>
              {(dashboard?.cash_flow_trend || []).some((p) => p.inflow || p.outflow) ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dashboard.cash_flow_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="inflow" name="Inflow" stroke="#10B981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="outflow" name="Outflow" stroke="#EF4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="net" name="Net" stroke="#2563EB" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400 text-center py-16">No cash movement in this period</p>
              )}
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Expense By Category</h3>
                <span className="text-[10px] text-slate-400 uppercase">Expense COA accounts</span>
              </div>
              {expenseChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={expenseChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip
                      formatter={(v) => formatINR(v)}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                    />
                    <Bar dataKey="amount" name="Expense" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400 text-center py-16">No expenses posted in this period</p>
              )}
            </div>
          </div>

          {expenseChartData.length > 0 && (
            <div className="card overflow-x-auto overscroll-x-contain">
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold">Expense Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Account / Category</th>
                      <th className="text-left px-4 py-3 font-semibold">Code</th>
                      <th className="text-right px-4 py-3 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleExpenseRows.map((row) => (
                      <tr key={row.account_id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5">
                          <span className="font-medium">{row.name}</span>
                          {row.is_finance_category && (
                            <span className="ml-2 text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">Category</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-500">{row.account_code || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium">{formatINR(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right font-semibold text-slate-700">Total Expense</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{formatINR(kpis?.total_expense ?? 0)}</td>
                    </tr>
                  </tfoot>
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

          <p className={cn('text-xs text-center text-slate-400')}>
            Based on {dashboard?.voucher_line_count ?? 0} voucher line(s) from posted entries between {dashboard?.from} and {dashboard?.to}
          </p>
        </>
      )}
    </div>
  );
}
