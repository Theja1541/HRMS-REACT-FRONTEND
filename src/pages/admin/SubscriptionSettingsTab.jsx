import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUpCircle, RefreshCw, Clock, CreditCard, Users } from 'lucide-react';
import { authApi, portalApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import StatusBadge from '../../components/shared/StatusBadge';
import TablePagination from '../../components/shared/TablePagination';
import { useTablePagination, normalizePagination } from '../../hooks/useTablePagination';
import { cn, formatINR } from '../../utils/helpers';

const REQUEST_TYPE_LABELS = {
  upgrade: 'Upgrade',
  renewal: 'Renewal',
  employee_limit_increase: 'Employee Limit',
};

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RequestDetail({ row }) {
  if (row.request_type === 'upgrade') {
    return (
      <span className="text-slate-600">
        {row.currentPlan?.name || 'No plan'} → <strong>{row.requestedPlan?.name || '—'}</strong>
      </span>
    );
  }
  if (row.request_type === 'renewal') {
    return (
      <span className="text-slate-600">
        Extend by <strong>{row.extend_days || 365}</strong> days
      </span>
    );
  }
  if (row.request_type === 'employee_limit_increase') {
    return (
      <span className="text-slate-600">
        {row.current_employee_limit ?? '—'} → <strong>{row.requested_employee_limit ?? '—'}</strong>
      </span>
    );
  }
  return '—';
}

function RequestModal({
  type,
  onClose,
  onSubmit,
  isPending,
  error,
  plans,
  currentPlanId,
  currentEmployeeLimit,
}) {
  const [requestedPlanId, setRequestedPlanId] = useState('');
  const [extendDays, setExtendDays] = useState('365');
  const [requestedEmployeeLimit, setRequestedEmployeeLimit] = useState('');
  const [notes, setNotes] = useState('');

  const upgradePlans = (plans || []).filter((p) => p.id !== currentPlanId);
  const minRequestedLimit =
    currentEmployeeLimit != null ? Number(currentEmployeeLimit) + 1 : 2;

  const modalTitle =
    type === 'upgrade'
      ? 'Request Plan Upgrade'
      : type === 'renewal'
        ? 'Request Subscription Renewal'
        : 'Request Employee Limit Increase';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (type === 'upgrade') {
      onSubmit({
        request_type: 'upgrade',
        requested_plan_id: Number(requestedPlanId),
        notes: notes.trim() || undefined,
      });
      return;
    }
    if (type === 'employee_limit_increase') {
      onSubmit({
        request_type: 'employee_limit_increase',
        requested_employee_limit: Number(requestedEmployeeLimit),
        notes: notes.trim() || undefined,
      });
      return;
    }
    onSubmit({
      request_type: 'renewal',
      extend_days: Number(extendDays) || 365,
      notes: notes.trim() || undefined,
    });
  };

  const limitInvalid =
    type === 'employee_limit_increase' &&
    (!requestedEmployeeLimit ||
      Number(requestedEmployeeLimit) < minRequestedLimit ||
      !Number.isInteger(Number(requestedEmployeeLimit)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">{modalTitle}</h3>
          <p className="text-xs text-slate-500 mt-1">
            Your request will be sent to the platform administrator for approval.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {type === 'upgrade' ? (
            <div>
              <label className="text-xs font-medium text-slate-600">Target plan</label>
              <select
                required
                value={requestedPlanId}
                onChange={(e) => setRequestedPlanId(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
              >
                <option value="">Select a plan…</option>
                {upgradePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — {formatINR(plan.monthly_price)}/mo
                  </option>
                ))}
              </select>
              {upgradePlans.length === 0 && (
                <p className="text-[10px] text-amber-600 mt-1">No higher plans available to select.</p>
              )}
            </div>
          ) : type === 'employee_limit_increase' ? (
            <>
              <div>
                <label className="text-xs font-medium text-slate-600">Current limit</label>
                <p className="mt-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800">
                  {currentEmployeeLimit != null ? `${currentEmployeeLimit} employees` : '—'}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Requested limit</label>
                <input
                  type="number"
                  min={minRequestedLimit}
                  required
                  value={requestedEmployeeLimit}
                  onChange={(e) => setRequestedEmployeeLimit(e.target.value)}
                  placeholder={`Minimum ${minRequestedLimit}`}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Must be greater than your current employee limit.
                </p>
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs font-medium text-slate-600">Extension period (days)</label>
              <input
                type="number"
                min={1}
                max={1825}
                required
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
              />
              <p className="text-[10px] text-slate-400 mt-1">Default is 365 days (1 year).</p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-600">Notes (optional)</label>
            <textarea
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context for the administrator…"
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || (type === 'upgrade' && !requestedPlanId) || limitInvalid}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {isPending ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn('text-lg font-semibold mt-1', accent || 'text-slate-900')}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SubscriptionSettingsTab() {
  const queryClient = useQueryClient();
  const entitlements = useAuthStore((s) => s.entitlements);
  const setEntitlements = useAuthStore((s) => s.setEntitlements);
  const user = useAuthStore((s) => s.user);
  const [modal, setModal] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [toast, setToast] = useState(null);
  const { page, limit, setPage, setLimit, queryParams } = useTablePagination();

  const { data: meData } = useQuery({
    queryKey: ['auth-me-subscription'],
    queryFn: () => authApi.me(),
    staleTime: 0,
  });

  useEffect(() => {
    if (meData?.data?.entitlements) {
      setEntitlements(meData.data.entitlements);
    }
  }, [meData, setEntitlements]);

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-catalog-plans'],
    queryFn: () => portalApi.listSubscriptionPlans(),
  });

  const { data: historyData, isLoading: historyLoading, isError: historyError } = useQuery({
    queryKey: ['tenant-subscription-requests', queryParams],
    queryFn: () => portalApi.listSubscriptionRequests(queryParams),
  });

  const plans = plansData?.data?.plans || [];
  const rows = historyData?.data?.requests || [];
  const pagination = normalizePagination(historyData?.pagination, limit);

  const subscription = entitlements?.subscription;
  const plan = entitlements?.plan;
  const currentPlanId = plan?.id || subscription?.plan_id || null;
  const daysRemaining = subscription?.days_remaining;
  const daysAccent =
    daysRemaining == null
      ? 'text-slate-900'
      : daysRemaining <= 14
        ? 'text-red-600'
        : daysRemaining <= 30
          ? 'text-amber-600'
          : 'text-emerald-600';

  const createMutation = useMutation({
    mutationFn: (payload) => portalApi.createSubscriptionRequest(payload),
    onSuccess: () => {
      setModal(null);
      setSubmitError('');
      setToast('Request submitted. A platform administrator will review it shortly.');
      queryClient.invalidateQueries({ queryKey: ['tenant-subscription-requests'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-subscription-requests-pending'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-requests-pending-count'] });
      setTimeout(() => setToast(null), 5000);
    },
    onError: (err) => {
      setSubmitError(err?.response?.data?.error?.message || 'Failed to submit request');
    },
  });

  const { data: pendingData } = useQuery({
    queryKey: ['tenant-subscription-requests-pending'],
    queryFn: () => portalApi.listSubscriptionRequests({ status: 'pending', limit: 100 }),
  });

  const pendingRows = pendingData?.data?.requests || [];
  const hasPendingUpgrade = pendingRows.some((r) => r.request_type === 'upgrade');
  const hasPendingRenewal = pendingRows.some((r) => r.request_type === 'renewal');
  const hasPendingLimitIncrease = pendingRows.some(
    (r) => r.request_type === 'employee_limit_increase'
  );

  const currentEmployeeLimit =
    meData?.data?.user?.tenant?.employee_limit ?? user?.tenant?.employee_limit ?? null;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard
          label="Current Plan"
          value={plan?.name || '—'}
          sub={plan?.id ? `Plan ID ${plan.id}` : undefined}
        />
        <SummaryCard
          label="Subscription Status"
          value={
            subscription?.subscription_status ? (
              <StatusBadge status={subscription.subscription_status} />
            ) : (
              '—'
            )
          }
        />
        <SummaryCard label="Start Date" value={formatDate(subscription?.start_date)} />
        <SummaryCard label="End Date" value={formatDate(subscription?.end_date)} />
        <SummaryCard
          label="Days Remaining"
          value={daysRemaining != null ? String(daysRemaining) : '—'}
          accent={daysAccent}
          sub={subscription?.end_date ? `Until ${formatDate(subscription.end_date)}` : undefined}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <CreditCard className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
        <p className="text-xs text-slate-600 flex-1 min-w-[200px]">
          Plan changes, renewals, and employee limit increases require administrator approval.
          You cannot change your subscription directly from this page.
        </p>
        <button
          type="button"
          disabled={hasPendingUpgrade || plansLoading}
          onClick={() => {
            setSubmitError('');
            setModal('upgrade');
          }}
          className="btn-secondary text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
          title={hasPendingUpgrade ? 'A pending upgrade request already exists' : undefined}
        >
          <ArrowUpCircle className="w-3.5 h-3.5" aria-hidden />
          Request Upgrade
        </button>
        <button
          type="button"
          disabled={hasPendingRenewal}
          onClick={() => {
            setSubmitError('');
            setModal('renewal');
          }}
          className="btn-primary text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
          title={hasPendingRenewal ? 'A pending renewal request already exists' : undefined}
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden />
          Request Renewal
        </button>
        <button
          type="button"
          disabled={hasPendingLimitIncrease || currentEmployeeLimit == null}
          onClick={() => {
            setSubmitError('');
            setModal('employee_limit_increase');
          }}
          className="btn-secondary text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
          title={
            hasPendingLimitIncrease
              ? 'A pending employee limit request already exists'
              : currentEmployeeLimit == null
                ? 'Current employee limit unavailable'
                : undefined
          }
        >
          <Users className="w-3.5 h-3.5" aria-hidden />
          Request Employee Limit Increase
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" aria-hidden />
          <h3 className="text-sm font-semibold text-slate-900">Request History</h3>
        </div>

        {historyLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading request history…</div>
        ) : historyError ? (
          <div className="p-8 text-center text-xs text-red-600">Failed to load request history.</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No subscription requests yet. Use the actions above to submit a request.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-left">
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Details</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Admin Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {REQUEST_TYPE_LABELS[row.request_type] || row.request_type}
                      </td>
                      <td className="px-4 py-3">
                        <RequestDetail row={row} />
                        {row.notes && (
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs" title={row.notes}>
                            Note: {row.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize',
                            STATUS_STYLES[row.status] || 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={row.admin_notes || ''}>
                        {row.admin_notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={page}
              limit={limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          </>
        )}
      </div>

      {modal && (
        <RequestModal
          type={modal}
          plans={plans}
          currentPlanId={currentPlanId}
          currentEmployeeLimit={currentEmployeeLimit}
          onClose={() => {
            setModal(null);
            setSubmitError('');
          }}
          onSubmit={(payload) => createMutation.mutate(payload)}
          isPending={createMutation.isPending}
          error={submitError}
        />
      )}
    </div>
  );
}
