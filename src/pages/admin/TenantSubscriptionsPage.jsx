import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { billingApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { useTablePagination, normalizePagination } from '../../hooks/useTablePagination';
import StatusBadge from '../../components/shared/StatusBadge';
import { formatINR, cn, localDateString } from '../../utils/helpers';
import { usePortalRole } from '../../hooks/usePortalRole';
import { BILLING_CYCLES } from '../../constants/tenant';

function selectClass() {
  return 'w-full min-w-[120px] px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function billingCycleLabel(value) {
  return BILLING_CYCLES.find((c) => c.value === value)?.label || value || '—';
}

function todayDateOnly() {
  return localDateString();
}

export default function TenantSubscriptionsPage() {
  const role = usePortalRole();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [billingCycles, setBillingCycles] = useState({});
  const [rowError, setRowError] = useState({});
  const { page, limit, setPage, setLimit, queryParams } = useTablePagination({ resetDeps: [search] });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tenant-subscriptions', queryParams, search],
    queryFn: () => billingApi.listTenantSubscriptions({ ...queryParams, search: search || undefined }),
  });

  const { data: plansData } = useQuery({
    queryKey: ['billing-plans-active'],
    queryFn: () => billingApi.listPlans({ limit: 100, is_active: true }),
  });

  const plans = plansData?.data?.plans || [];
  const rows = data?.data?.subscriptions || [];
  const pagination = normalizePagination(data?.pagination, limit);

  const rowBillingCycle = (row) => billingCycles[row.tenant_id] ?? row.billing_cycle ?? 'yearly';

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tenant-subscriptions'] });
    queryClient.invalidateQueries({ queryKey: ['tenants'] });
  };

  const setError = (tenantId, message) => {
    setRowError((prev) => ({ ...prev, [tenantId]: message }));
    setTimeout(() => {
      setRowError((prev) => {
        const next = { ...prev };
        delete next[tenantId];
        return next;
      });
    }, 4000);
  };

  const planMutation = useMutation({
    mutationFn: async ({ row, planId }) => {
      if (row.has_subscription_record) {
        return billingApi.changeTenantPlan(row.tenant_id, { plan_id: planId });
      }
      return billingApi.assignTenantSubscription(row.tenant_id, {
        plan_id: planId,
        start_date: todayDateOnly(),
        billing_cycle: rowBillingCycle(row),
        billing_status: row.billing_status || 'pending',
      });
    },
    onSuccess: invalidate,
    onError: (err, { row }) => setError(row.tenant_id, err?.response?.data?.error?.message || 'Failed to change plan'),
  });

  const billingMutation = useMutation({
    mutationFn: ({ tenantId, billing_status }) =>
      billingApi.updateTenantBillingStatus(tenantId, billing_status),
    onSuccess: invalidate,
    onError: (err, { tenantId }) =>
      setError(tenantId, err?.response?.data?.error?.message || 'Failed to update billing status'),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ tenantId, status }) => {
      if (status === 'active') return billingApi.activateTenantSubscription(tenantId);
      if (status === 'suspended') return billingApi.suspendTenantSubscription(tenantId);
      throw new Error('Unsupported status');
    },
    onSuccess: invalidate,
    onError: (err, { tenantId }) =>
      setError(tenantId, err?.response?.data?.error?.message || 'Failed to update subscription status'),
  });

  const renewMutation = useMutation({
    mutationFn: ({ tenantId, billing_cycle }) =>
      billingApi.extendTenantSubscription(tenantId, { billing_cycle }),
    onSuccess: invalidate,
    onError: (err, { tenantId }) =>
      setError(tenantId, err?.response?.data?.error?.message || 'Failed to renew subscription'),
  });

  if (role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Admin · Subscriptions"
        title="Tenant Subscriptions"
        subtitle="Manage subscription plans, billing cycles, and access for each tenant"
      />

      <div className="card overflow-hidden">
        <div className="ds-toolbar">
          <div className="toolbar-row">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company or tenant code…"
              className="ds-input pl-9 w-full"
            />
          </div>
          </div>
        </div>

        {isLoading ? (
          <p className="p-12 text-center text-slate-400 text-sm">Loading subscriptions…</p>
        ) : isError ? (
          <p className="p-12 text-center text-red-500 text-sm">
            {error?.response?.data?.error?.message || 'Failed to load subscriptions'}
          </p>
        ) : rows.length === 0 ? (
          <p className="p-12 text-center text-slate-400 text-sm">No tenants found</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1080px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Company</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Tenant Code</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Current Plan</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Billing Cycle</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Expiry Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Days Remaining</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Billing Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Subscription Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const cycle = rowBillingCycle(row);
                    const isUpdating =
                      (planMutation.isPending && planMutation.variables?.row?.tenant_id === row.tenant_id) ||
                      (billingMutation.isPending && billingMutation.variables?.tenantId === row.tenant_id) ||
                      (statusMutation.isPending && statusMutation.variables?.tenantId === row.tenant_id) ||
                      (renewMutation.isPending && renewMutation.variables?.tenantId === row.tenant_id);

                    return (
                      <tr key={row.tenant_id} className={cn('hover:bg-slate-50', isUpdating && 'opacity-60')}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{row.company_name}</p>
                          {rowError[row.tenant_id] && (
                            <p className="text-[10px] text-red-600 mt-0.5">{rowError[row.tenant_id]}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.tenant_code || '—'}</td>
                        <td className="px-4 py-3">
                          <select
                            value={row.plan_id || ''}
                            onChange={(e) => {
                              const planId = parseInt(e.target.value, 10);
                              if (!planId || planId === row.plan_id) return;
                              planMutation.mutate({ row, planId });
                            }}
                            className={selectClass()}
                            disabled={planMutation.isPending}
                          >
                            <option value="">Select plan…</option>
                            {plans.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({formatINR(p.monthly_price)})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5 min-w-[120px]">
                            <select
                              value={cycle}
                              onChange={(e) =>
                                setBillingCycles((prev) => ({ ...prev, [row.tenant_id]: e.target.value }))
                              }
                              className={selectClass()}
                              title="Billing cycle used for new assignments and renewals"
                            >
                              {BILLING_CYCLES.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            {row.has_subscription_record && (
                              <button
                                type="button"
                                disabled={renewMutation.isPending}
                                onClick={() => {
                                  renewMutation.mutate({
                                    tenantId: row.tenant_id,
                                    billing_cycle: cycle,
                                  });
                                }}
                                className="btn-secondary text-[10px] py-1 px-2 shrink-0"
                              >
                                Renew
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                          {formatDate(row.end_date)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'text-sm font-semibold tabular-nums',
                              row.days_remaining != null && row.days_remaining <= 7
                                ? 'text-red-600'
                                : 'text-slate-800'
                            )}
                          >
                            {row.days_remaining ?? '—'}
                          </span>
                          {!row.has_subscription_record && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Expiry set on plan assign ({billingCycleLabel(cycle)})
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={row.billing_status || 'pending'}
                            onChange={(e) => {
                              if (!row.has_subscription_record) {
                                setError(row.tenant_id, 'Assign a plan before updating billing status');
                                return;
                              }
                              billingMutation.mutate({
                                tenantId: row.tenant_id,
                                billing_status: e.target.value,
                              });
                            }}
                            className={selectClass()}
                            disabled={billingMutation.isPending}
                          >
                            <option value="pending">Pending</option>
                            <option value="collected">Collected</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={
                                row.subscription_status === 'suspended'
                                  ? 'suspended'
                                  : row.subscription_status === 'active'
                                    ? 'active'
                                    : 'inactive'
                              }
                              onChange={(e) => {
                                const next = e.target.value;
                                if (!row.has_subscription_record && next !== 'inactive') {
                                  setError(row.tenant_id, 'Assign a plan before changing status');
                                  return;
                                }
                                if (next === 'active' || next === 'suspended') {
                                  statusMutation.mutate({ tenantId: row.tenant_id, status: next });
                                }
                              }}
                              className={selectClass()}
                              disabled={statusMutation.isPending}
                            >
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                              <option value="inactive" disabled>
                                Inactive
                              </option>
                            </select>
                            <StatusBadge
                              status={
                                row.subscription_status === 'active'
                                  ? 'active'
                                  : row.subscription_status === 'suspended'
                                    ? 'suspended'
                                    : 'inactive'
                              }
                            />
                          </div>
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
          </>
        )}
      </div>
    </div>
  );
}
