import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Archive,
  CheckCircle2,
  Laptop,
  LayoutGrid,
  RotateCcw,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { hrApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { format, parseISO } from 'date-fns';
import { useTablePagination } from '../../hooks/useTablePagination';

function CategoryTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-brand-600 font-mono">{payload[0]?.value} asset(s)</p>
    </div>
  );
}

function formatWarrantyDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(String(value).slice(0, 10)), 'dd MMM yyyy');
  } catch {
    return String(value).slice(0, 10);
  }
}

export default function AssetDashboardPage() {
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;
  const isManagerView = user?.role === 'manager';

  const { data, isLoading, error } = useQuery({
    queryKey: ['asset-dashboard', selectedTenantId],
    queryFn: hrApi.getAssetDashboard,
    enabled: !tenantRequired,
  });

  const dashboard = data?.data?.dashboard;
  const summary = dashboard?.summary;
  const byCategory = dashboard?.by_category || [];
  const warrantyAlerts = dashboard?.warranty_alerts;
  const alertDays = warrantyAlerts?.alert_days ?? 30;

  const chartData = useMemo(
    () =>
      byCategory
        .filter((row) => row.count > 0)
        .map((row) => ({
          name: row.name.length > 16 ? `${row.name.slice(0, 14)}…` : row.name,
          fullName: row.name,
          count: row.count,
        })),
    [byCategory]
  );
  const { setPage, setLimit, paginateClient } = useTablePagination();
  const warrantyRows = [...(warrantyAlerts?.expired || []), ...(warrantyAlerts?.expiring_soon || [])];
  const { items: visibleWarrantyRows, pagination } = paginateClient(warrantyRows);

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to view the asset dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Dashboard"
        subtitle={isManagerView ? 'Read-only overview of company assets' : 'Overview of company assets, assignments, and return requests'}
        actions={
          !isManagerView && (
          <div className="flex items-center gap-2">
            <Link to="/assets" className="btn-secondary text-xs">
              <Laptop size={14} /> Registry
            </Link>
            <Link to="/assets/categories" className="btn-secondary text-xs">
              <LayoutGrid size={14} /> Categories
            </Link>
            <Link to="/assets/maintenance" className="btn-secondary text-xs">
              Maintenance
            </Link>
          </div>
          )
        }
      />

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading dashboard…</div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">Failed to load dashboard</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <StatCard label="Total Assets" value={summary?.total_assets ?? 0} icon={Laptop} />
            <StatCard
              label="Available"
              value={summary?.available_assets ?? 0}
              icon={CheckCircle2}
              delta="Ready to assign"
              deltaType="neutral"
            />
            <StatCard
              label="Assigned"
              value={summary?.assigned_assets ?? 0}
              icon={UserCheck}
              delta="With employees"
              deltaType="neutral"
            />
            <StatCard
              label="Retired"
              value={summary?.retired_assets ?? 0}
              icon={Archive}
              delta="Out of circulation"
              deltaType="neutral"
            />
            <StatCard
              label="Pending Returns"
              value={summary?.pending_return_requests ?? 0}
              icon={RotateCcw}
              delta={(summary?.pending_return_requests ?? 0) > 0 ? 'Review queue →' : 'All clear'}
              deltaType={(summary?.pending_return_requests ?? 0) > 0 ? 'up' : 'neutral'}
            />
          </div>

          {((summary?.warranty_expired ?? 0) > 0 || (summary?.warranty_expiring_soon ?? 0) > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                label="Warranty Expiring"
                value={summary?.warranty_expiring_soon ?? 0}
                icon={ShieldAlert}
                delta={`Within ${alertDays} days`}
                deltaType="neutral"
              />
              <StatCard
                label="Warranty Expired"
                value={summary?.warranty_expired ?? 0}
                icon={ShieldAlert}
                delta="Needs attention"
                deltaType={(summary?.warranty_expired ?? 0) > 0 ? 'up' : 'neutral'}
              />
            </div>
          )}

          {(summary?.pending_return_requests ?? 0) > 0 && !isManagerView && (
            <div className="card px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-amber-200 bg-amber-50/50">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">{summary.pending_return_requests}</span> employee return
                {summary.pending_return_requests === 1 ? ' request' : ' requests'} awaiting approval.
              </p>
              <Link to="/assets/returns" className="btn-primary text-xs shrink-0">
                Review return requests
              </Link>
            </div>
          )}

          {(summary?.pending_return_requests ?? 0) > 0 && isManagerView && (
            <div className="card px-4 py-3 border-amber-200 bg-amber-50/50">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">{summary.pending_return_requests}</span> employee return
                {summary.pending_return_requests === 1 ? ' request' : ' requests'} pending HR approval.
              </p>
            </div>
          )}

          {((warrantyAlerts?.expired_count ?? 0) > 0 || (warrantyAlerts?.expiring_soon_count ?? 0) > 0) && (
            <div className="card overflow-hidden border-red-200">
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 text-red-900">
                  <ShieldAlert size={16} className="shrink-0" />
                  <p className="text-sm font-semibold">Warranty expiry alerts</p>
                </div>
                <p className="text-xs text-red-700">
                  {warrantyAlerts.expired_count} expired · {warrantyAlerts.expiring_soon_count} expiring within {alertDays} days
                </p>
              </div>
              <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold">Asset</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Category</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Warranty ends</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleWarrantyRows.map((row) => {
                      const isExpired = (warrantyAlerts.expired || []).some((e) => e.id === row.id);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <p className="font-medium">{row.name}</p>
                            <p className="text-slate-400 font-mono">{row.asset_code}</p>
                          </td>
                          <td className="px-4 py-2.5">{row.category_name || '—'}</td>
                          <td className="px-4 py-2.5">{formatWarrantyDate(row.warranty_expires)}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={cn(
                                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                isExpired ? 'bg-red-100 text-red-700' : 'bg-amber-50 text-amber-700'
                              )}
                            >
                              {isExpired ? 'Expired' : 'Expiring soon'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
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
              <div className="px-4 py-2 border-t border-slate-100 text-right">
                <Link to="/assets" className="text-xs text-brand-600 hover:underline">
                  Update warranty dates in registry →
                </Link>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Assets By Category</h3>
                <span className="text-[10px] text-slate-400 uppercase">Active inventory</span>
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip
                      content={<CategoryTooltip />}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                    />
                    <Bar dataKey="count" name="Assets" fill="#2563EB" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400 text-center py-16">No assets registered yet</p>
              )}
            </div>

            <div className="card overflow-x-auto overscroll-x-contain">
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold">Category Breakdown</h3>
              </div>
              {byCategory.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-16">No categories configured</p>
              ) : (
                <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Category</th>
                        <th className="text-left px-4 py-3 font-semibold">Code</th>
                        <th className="text-right px-4 py-3 font-semibold">Assets</th>
                        <th className="text-left px-4 py-3 font-semibold">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {byCategory.map((row) => {
                        const share = summary?.total_assets
                          ? Math.round((row.count / summary.total_assets) * 100)
                          : 0;
                        return (
                          <tr key={row.category_id} className={cn('hover:bg-slate-50', !row.is_active && 'opacity-50')}>
                            <td className="px-4 py-2.5 font-medium">{row.name}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-500">{row.code}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium">{row.count}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                                  <div
                                    className="h-full bg-brand-600 rounded-full"
                                    style={{ width: `${share}%` }}
                                  />
                                </div>
                                <span className="text-slate-500 w-8 text-right">{share}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-right font-semibold text-slate-700">Total</td>
                        <td className="px-4 py-3 text-right font-mono font-bold">{summary?.total_assets ?? 0}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link to="/assets" className="card p-4 hover:border-brand-200 transition-colors group">
              <p className="text-xs font-medium text-slate-500 uppercase">Quick action</p>
              <p className="text-sm font-semibold text-slate-900 mt-1 group-hover:text-brand-600">Manage registry</p>
              <p className="text-xs text-slate-400 mt-1">Add, assign, and return assets</p>
            </Link>
            <Link to="/assets/categories" className="card p-4 hover:border-brand-200 transition-colors group">
              <p className="text-xs font-medium text-slate-500 uppercase">Quick action</p>
              <p className="text-sm font-semibold text-slate-900 mt-1 group-hover:text-brand-600">Edit categories</p>
              <p className="text-xs text-slate-400 mt-1">{byCategory.length} category types configured</p>
            </Link>
            <Link
              to="/assets/returns"
              className="card p-4 hover:border-brand-200 transition-colors group"
            >
              <p className="text-xs font-medium text-slate-500 uppercase">Quick action</p>
              <p className="text-sm font-semibold text-slate-900 mt-1 group-hover:text-brand-600">Return requests</p>
              <p className="text-xs text-slate-400 mt-1">
                {summary?.pending_return_requests ?? 0} pending approval
              </p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
