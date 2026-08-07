import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { billingApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import StatusBadge from '../../components/shared/StatusBadge';
import { useTablePagination, normalizePagination } from '../../hooks/useTablePagination';
import { formatINR, cn } from '../../utils/helpers';
import { emptyPlanForm, planToForm, formToPayload } from '../../constants/subscriptionPlans';
import PlanFormModal from './billing/PlanFormModal';
import PaymentsTab from './billing/PaymentsTab';
import InvoicesTab from './billing/InvoicesTab';
import SubscriptionAlertsTab from './billing/SubscriptionAlertsTab';
import { usePortalRole } from '../../hooks/usePortalRole';

const TABS = [
  { id: 'plans', label: 'Plans & Pricing' },
  { id: 'payments', label: 'Payments' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'alerts', label: 'Subscription Alerts' },
];

const PLAN_ACCENTS = [
  'border-l-emerald-500',
  'border-l-teal-600',
  'border-l-violet-500',
  'border-l-amber-500',
  'border-l-sky-500',
  'border-l-rose-500',
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

async function fetchCatalogModules(queryClient) {
  const res = await queryClient.fetchQuery({
    queryKey: ['billing-modules-catalog'],
    queryFn: () => billingApi.listModules({ is_active: true, include_features: true }),
    staleTime: 5 * 60_000,
  });
  return res?.data?.modules || [];
}

export default function BillingPage() {
  const role = usePortalRole();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('plans');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { page, limit, setPage, setLimit, queryParams } = useTablePagination({
    resetDeps: [search, statusFilter],
  });
  const [modal, setModal] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(emptyPlanForm());
  const [formError, setFormError] = useState('');
  const [openingEdit, setOpeningEdit] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['billing-plans', queryParams, search, statusFilter],
    queryFn: () =>
      billingApi.listPlans({
        ...queryParams,
        search: search || undefined,
        is_active: statusFilter || undefined,
      }),
    enabled: tab === 'plans',
  });

  const { data: modulesData, isLoading: catalogLoading, isError: catalogError, error: catalogErr } = useQuery({
    queryKey: ['billing-modules-catalog'],
    queryFn: () => billingApi.listModules({ is_active: true, include_features: true }),
    enabled: tab === 'plans' || modal === 'form',
    staleTime: 5 * 60_000,
  });

  const plans = data?.data?.plans || [];
  const pagination = normalizePagination(data?.pagination, limit);
  const catalogModules = modulesData?.data?.modules || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['billing-plans'] });
    queryClient.invalidateQueries({ queryKey: ['billing-plans-active'] });
  };

  const openCreate = async () => {
    setFormError('');
    setEditingPlan(null);
    setModal('form');
    setForm(emptyPlanForm());

    try {
      await fetchCatalogModules(queryClient);
      setForm({ ...emptyPlanForm(), catalogHydrated: true });
    } catch {
      setFormError('Failed to load modules catalog');
    }
  };

  const openEdit = async (plan) => {
    setFormError('');
    setOpeningEdit(true);
    setModal('form');
    setEditingPlan(plan);
    setForm(planToForm(plan, catalogModules, { catalogHydrated: false }));

    try {
      const modules = catalogModules.length
        ? catalogModules
        : await fetchCatalogModules(queryClient);

      let fullPlan = plan;
      try {
        const res = await billingApi.getPlan(plan.id);
        if (res?.data?.plan) {
          fullPlan = res.data.plan;
          setEditingPlan(fullPlan);
        }
      } catch {
        /* use list row data as fallback */
      }

      setForm(planToForm(fullPlan, modules, { catalogHydrated: true }));
    } catch {
      setFormError('Failed to load plan details or modules catalog');
    } finally {
      setOpeningEdit(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (formData) => {
      if (!formData.catalogHydrated) {
        throw Object.assign(new Error('Modules catalog is still loading. Please wait and try again.'), {
          response: {
            data: {
              error: { message: 'Modules catalog is still loading. Please wait and try again.' },
            },
          },
        });
      }

      const modules =
        catalogModules.length > 0
          ? catalogModules
          : await fetchCatalogModules(queryClient);

      const payload = formToPayload(formData, modules);
      if (editingPlan?.id) {
        return billingApi.updatePlan(editingPlan.id, payload);
      }
      return billingApi.createPlan(payload);
    },
    onSuccess: () => {
      invalidate();
      setModal(null);
      setEditingPlan(null);
      setForm(emptyPlanForm());
      setFormError('');
    },
    onError: (err) => {
      setFormError(err?.response?.data?.error?.message || err?.message || 'Failed to save plan');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: billingApi.deletePlan,
    onSuccess: invalidate,
    onError: (err) => {
      window.alert(err?.response?.data?.error?.message || 'Failed to delete plan');
    },
  });

  if (role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Admin · Billing"
        title="Plans & Pricing"
        subtitle="Manage subscription plans, payments, invoices, and platform billing alerts"
        actions={
          tab === 'plans' ? (
            <button type="button" onClick={openCreate} className="btn-primary">
              <Plus size={14} /> Create Plan
            </button>
          ) : null
        }
      />

      <div className="ds-tabs scroll-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(tab === t.id && 'ds-tab-active')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {tab === 'plans' && (
          <div className="p-4 sm:p-6">
            {isLoading ? (
              <p className="text-center text-slate-400 py-16 text-sm">Loading plans…</p>
            ) : isError ? (
              <p className="text-center text-red-500 py-16 text-sm">
                {error?.response?.data?.error?.message || 'Failed to load plans'}
              </p>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Subscription Plans</h3>
                    <p className="text-xs text-slate-500 mt-1">Manage plan pricing, limits, and access assignments.</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search plans…"
                        className="ds-input pl-9 w-full"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="ds-select w-full sm:w-auto"
                    >
                      {STATUS_FILTER_OPTIONS.map((opt) => (
                        <option key={opt.value || 'all'} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {plans.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-xl p-12 text-center">
                      <p className="text-slate-400 text-sm">
                        {search || statusFilter ? 'No plans match your filters' : 'No subscription plans yet'}
                      </p>
                      {!search && !statusFilter && (
                        <button type="button" onClick={openCreate} className="btn-primary mt-4">
                          <Plus size={14} /> Create Plan
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Plan</th>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Pricing</th>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Limits</th>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Access</th>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {plans.map((plan) => (
                              <tr key={plan.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  <p className="font-medium text-slate-900">{plan.name}</p>
                                  {plan.description ? (
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{plan.description}</p>
                                  ) : null}
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {plan.active_subscribers ?? 0} active subscriber(s)
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  <p>{formatINR(plan.monthly_price)} <span className="text-slate-400 text-xs">/mo</span></p>
                                  <p className="text-xs text-slate-500">{formatINR(plan.yearly_price)} /yr</p>
                                </td>
                                <td className="px-4 py-3 text-slate-600 text-xs">
                                  <p>{plan.employee_limit ?? '∞'} employees</p>
                                </td>
                                <td className="px-4 py-3 text-slate-600 text-xs">
                                  <p>{(plan.modules || []).length} modules</p>
                                  <p>{(plan.features || []).length} features</p>
                                </td>
                                <td className="px-4 py-3">
                                  <StatusBadge status={plan.is_active ? 'active' : 'suspended'} />
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openEdit(plan)}
                                      disabled={openingEdit}
                                      className="btn-secondary text-xs py-1.5"
                                    >
                                      <Pencil size={12} /> Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const subscribers = plan.active_subscribers ?? 0;
                                        const message =
                                          subscribers > 0
                                            ? `Cannot delete "${plan.name}" while ${subscribers} tenant(s) are assigned. Reassign those tenants first.`
                                            : `Delete plan "${plan.name}"? This cannot be undone.`;
                                        if (subscribers > 0) {
                                          window.alert(message);
                                          return;
                                        }
                                        if (window.confirm(message)) {
                                          deleteMutation.mutate(plan.id);
                                        }
                                      }}
                                      disabled={deleteMutation.isPending}
                                      className="btn-secondary text-xs py-1.5 text-red-600 border-red-100 hover:bg-red-50"
                                    >
                                      <Trash2 size={12} /> Delete
                                    </button>
                                  </div>
                                </td>
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
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Platform Subscription Matrix</h3>
                    <p className="text-xs text-slate-500 mt-1">Distribution overview across tiers.</p>
                  </div>
                  <div className="space-y-3">
                    {plans.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-xl">
                        Plans will appear here
                      </p>
                    ) : (
                      plans.map((plan, idx) => (
                        <div
                          key={plan.id}
                          className={cn(
                            'border border-slate-200 rounded-xl p-4 border-l-4',
                            PLAN_ACCENTS[idx % PLAN_ACCENTS.length]
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">{plan.name}</p>
                              <p className="text-lg font-bold text-slate-800 mt-0.5">{formatINR(plan.monthly_price)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-slate-900">{plan.active_subscribers ?? 0}</p>
                              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                                Active subscribers
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-500">
                            <span>{(plan.modules || []).length} modules</span>
                            <span>·</span>
                            <span>{(plan.features || []).length} features</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'payments' && <PaymentsTab />}
        {tab === 'invoices' && <InvoicesTab />}
        {tab === 'alerts' && <SubscriptionAlertsTab />}
      </div>

      <PlanFormModal
        open={modal === 'form'}
        form={form}
        isEdit={!!editingPlan}
        catalogModules={catalogModules}
        catalogLoading={catalogLoading || openingEdit}
        catalogError={catalogError ? catalogErr?.response?.data?.error?.message || 'Failed to load modules catalog' : ''}
        saving={saveMutation.isPending}
        error={formError}
        onClose={() => {
          setModal(null);
          setEditingPlan(null);
          setFormError('');
          setOpeningEdit(false);
        }}
        onChange={setForm}
        onSave={(formData) => saveMutation.mutate(formData)}
      />
    </div>
  );
}
