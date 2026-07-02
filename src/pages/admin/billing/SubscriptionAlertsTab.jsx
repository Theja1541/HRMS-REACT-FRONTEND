import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, AlertTriangle } from 'lucide-react';
import { billingApi } from '../../../api';
import { ALERT_SEVERITY_OPTIONS, ALERT_TYPE_LABELS, severityClass } from '../../../constants/billingTabs';
import { cn } from '../../../utils/helpers';

function selectClass() {
  return 'px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600';
}

function SummaryCard({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
  };
  return (
    <div className={cn('rounded-xl border p-4', tones[tone] || tones.slate)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function alertActionLink(alert) {
  if (alert.alert_type === 'pending_request') {
    return { to: '/pending-approvals', label: 'Review request' };
  }
  return { to: '/subscriptions', label: 'View subscription' };
}

export default function SubscriptionAlertsTab() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['billing-alerts', search, severity],
    queryFn: () =>
      billingApi.listSubscriptionAlerts({
        search: search || undefined,
        severity: severity || undefined,
      }),
    refetchInterval: 60_000,
  });

  const alerts = data?.data?.alerts || [];
  const summary = data?.data?.summary || { total: 0, critical: 0, high: 0, medium: 0, low: 0 };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Subscription Alerts</h3>
        <p className="text-xs text-slate-500 mt-1">
          Expiring subscriptions, pending payments, approvals, and limit breaches across all tenants.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Total alerts" value={summary.total} />
        <SummaryCard label="Critical" value={summary.critical} tone="red" />
        <SummaryCard label="High" value={summary.high} tone="orange" />
        <SummaryCard label="Medium" value={summary.medium} tone="amber" />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant…"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
          />
        </div>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={selectClass()}>
          {ALERT_SEVERITY_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-center text-slate-400 py-16 text-sm">Loading alerts…</p>
      ) : isError ? (
        <p className="text-center text-red-500 py-16 text-sm">
          {error?.response?.data?.error?.message || 'Failed to load alerts'}
        </p>
      ) : alerts.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-xl p-12 text-center">
          <AlertTriangle size={28} className="mx-auto text-emerald-500 mb-3" />
          <p className="text-slate-600 text-sm font-medium">All clear — no subscription alerts</p>
          <p className="text-xs text-slate-400 mt-1">Alerts appear for expiring plans, pending billing, and approval queues.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const action = alertActionLink(alert);
            return (
              <div
                key={alert.id}
                className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start gap-3 hover:bg-slate-50/80"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={cn('text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border', severityClass(alert.severity))}>
                      {alert.severity}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                      {ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{alert.message}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {alert.tenant_name} · {alert.tenant_code}
                  </p>
                </div>
                <Link to={action.to} className="btn-secondary text-xs py-1.5 shrink-0 self-start">
                  {action.label}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
