import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  IndianRupee,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  CreditCard,
  Settings,
  FileText,
  Mail,
  ArrowRight,
  PauseCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Legend,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format, parseISO, isValid } from 'date-fns';
import { StatCard } from '../../components/shared/PageHeader';
import DashboardHero, { DashboardSection } from '../../components/shared/DashboardHero';
import StatusBadge from '../../components/shared/StatusBadge';
import { formatINR } from '../../utils/helpers';

const PLAN_COLORS = ['#2563EB', '#0D9488', '#059669', '#D97706', '#DC2626', '#64748B'];
const ROLE_COLORS = ['#2563EB', '#0EA5E9', '#059669', '#D97706', '#DC2626', '#0D9488', '#64748B'];
const GROWTH_COLORS = ['#2563EB', '#10B981', '#0D9488', '#F59E0B', '#0EA5E9', '#F43F5E'];

const REQUEST_TYPE_LABELS = {
  upgrade: 'Plan upgrade',
  renewal: 'Renewal',
  employee_limit_increase: 'Employee limit',
};

function formatMonthLabel(monthKey) {
  if (!monthKey) return '—';
  const [year, month] = String(monthKey).split('-');
  const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return isValid(d) ? format(d, 'MMM yy') : monthKey;
}

function formatDate(value) {
  if (!value) return '—';
  try {
    const d = parseISO(String(value).slice(0, 10));
    return isValid(d) ? format(d, 'dd MMM yyyy') : value;
  } catch {
    return value;
  }
}

function RequestSummary({ request }) {
  if (request.request_type === 'upgrade') {
    return (
      <span>
        {request.currentPlan?.name || 'No plan'} → <strong>{request.requestedPlan?.name || '—'}</strong>
      </span>
    );
  }
  if (request.request_type === 'renewal') {
    return (
      <span>
        Extend by <strong>{request.extend_days || 365}</strong> days
      </span>
    );
  }
  if (request.request_type === 'employee_limit_increase') {
    return (
      <span>
        {request.current_employee_limit ?? '—'} → <strong>{request.requested_employee_limit ?? '—'}</strong> seats
      </span>
    );
  }
  return '—';
}

export default function SuperAdminDashboard({ data, user }) {
  const stats = data?.stats || {};
  const planDistribution = data?.planDistribution || [];
  const tenantGrowth = (data?.tenantGrowth || []).map((g) => ({
    label: formatMonthLabel(g.month),
    count: g.count,
  }));
  const recentTenants = data?.recentTenants || [];
  const pendingRequests = data?.pendingRequests || [];
  const expiringSoon = data?.expiringSoon || [];
  const emailDelivery = data?.emailDelivery || { sent: 0, failed: 0 };
  const roleDistribution = data?.roleDistribution || [];

  const firstName = user?.name?.split(' ')[0] || 'Admin';

  return (
    <div className="space-y-6">
      <DashboardHero
        badge="Platform overview"
        title={`Welcome back, ${firstName}`}
        subtitle="Tenants, subscriptions, and system health at a glance."
        chips={[
          { label: 'Tenants', value: stats.totalTenants ?? 0 },
          { label: 'Active', value: stats.activeTenants ?? 0, tone: 'emerald' },
          { label: 'Pending', value: stats.pendingSubscriptionRequests ?? 0, tone: 'amber' },
        ]}
        actions={
          <Link
            to="/tenants"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-sky-50 transition-colors"
          >
            <Plus size={14} /> Add Tenant
          </Link>
        }
      />

      <DashboardSection title="Organizations">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            label="Total Tenants"
            value={stats.totalTenants ?? 0}
            delta="All organizations on platform"
            deltaType="neutral"
            icon={Building2}
            tone="brand"
            to="/tenants"
          />
          <StatCard
            label="Total Employees"
            value={stats.totalEmployees ?? 0}
            delta="Across all companies"
            deltaType="neutral"
            icon={Users}
            tone="sky"
            to="/tenants"
          />
          <StatCard
            label="Active Companies"
            value={stats.activeTenants ?? 0}
            delta={
              stats.totalTenants
                ? `${Math.round(((stats.activeTenants ?? 0) / stats.totalTenants) * 100)}% of tenants`
                : 'No tenants yet'
            }
            deltaType="neutral"
            icon={CheckCircle2}
            tone="emerald"
            to="/tenants"
          />
          <StatCard
            label="Suspended Companies"
            value={stats.suspendedTenants ?? 0}
            delta={(stats.suspendedTenants ?? 0) > 0 ? 'Access restricted' : 'None suspended'}
            deltaType={(stats.suspendedTenants ?? 0) > 0 ? 'down' : 'neutral'}
            icon={AlertTriangle}
            tone="rose"
            to="/tenants"
          />
          <StatCard
            label="Inactive Companies"
            value={stats.inactiveTenants ?? stats.trialTenants ?? 0}
            delta="Trial / not yet active"
            deltaType="neutral"
            icon={PauseCircle}
            tone="slate"
            to="/tenants"
          />
        </div>
      </DashboardSection>

      <DashboardSection title="Revenue & subscriptions" accent="bg-teal-500">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Monthly Revenue (MRR)"
            value={formatINR(stats.monthlyRecurringRevenue ?? 0)}
            delta="Active & trial tenants"
            deltaType="neutral"
            icon={IndianRupee}
            tone="teal"
            to="/subscriptions"
          />
          <StatCard
            label="New Tenants"
            value={stats.newTenantsThisMonth ?? 0}
            delta="This month"
            deltaType="neutral"
            icon={CheckCircle2}
            tone="emerald"
            to="/tenants"
          />
          <StatCard
            label="Pending Approvals"
            value={stats.pendingSubscriptionRequests ?? 0}
            delta={(stats.pendingSubscriptionRequests ?? 0) > 0 ? 'Review required' : 'All clear'}
            deltaType={(stats.pendingSubscriptionRequests ?? 0) > 0 ? 'down' : 'neutral'}
            icon={Clock}
            tone="amber"
            to="/pending-approvals"
          />
          <StatCard
            label="Expiring in 30 Days"
            value={stats.expiringSubscriptions30Days ?? 0}
            delta="Subscription renewals"
            deltaType={(stats.expiringSubscriptions30Days ?? 0) > 0 ? 'down' : 'neutral'}
            icon={AlertTriangle}
            tone="orange"
            to="/subscriptions"
          />
        </div>
      </DashboardSection>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/tenants', label: 'Organizations', icon: Building2, color: 'bg-brand-600' },
          { to: '/pending-approvals', label: 'Approvals', icon: Clock, color: 'bg-amber-500' },
          { to: '/subscriptions', label: 'Subscriptions', icon: CreditCard, color: 'bg-teal-500' },
          { to: '/settings', label: 'Global Settings', icon: Settings, color: 'bg-sky-500' },
        ].map(({ to, label, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            className="card p-4 flex items-center gap-3 hover:shadow-md transition-all group"
          >
            <div className={`w-9 h-9 rounded-lg ${color} text-white flex items-center justify-center shrink-0 shadow-sm`}>
              <Icon size={18} />
            </div>
            <span className="text-sm font-medium text-slate-700 group-hover:text-brand-700">{label}</span>
            <ArrowRight size={14} className="ml-auto text-slate-300 group-hover:text-brand-500" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-blue-50 bg-gradient-to-r from-blue-50/80 to-white px-5 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
              <Building2 size={16} />
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Tenant Growth — Last 6 Months</h3>
          </div>
          <div className="p-5">
            {tenantGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={tenantGrowth} barCategoryGap="28%">
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {tenantGrowth.map((_, i) => (
                      <Cell key={i} fill={GROWTH_COLORS[i % GROWTH_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">No tenant growth data yet</p>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-teal-50 bg-gradient-to-r from-teal-50/80 to-white px-5 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white shadow-sm">
              <Users size={16} />
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Role Distribution — All Companies</h3>
          </div>
          <div className="p-5">
            {roleDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {roleDistribution.map((_, i) => (
                        <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} labelFormatter={(label) => label} />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100">
                  {roleDistribution.map((r, i) => (
                    <div key={r.role} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: ROLE_COLORS[i % ROLE_COLORS.length] }}
                      />
                      {r.label} ({r.count})
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">No employee role data yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-sky-50 bg-gradient-to-r from-sky-50/80 to-white px-5 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm">
              <CreditCard size={16} />
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Tenants by Plan</h3>
          </div>
          <div className="p-5">
            {planDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={planDistribution} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {planDistribution.map((_, i) => (
                        <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100">
                  {planDistribution.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }}
                      />
                      {p.name} ({p.count})
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">No plan distribution data</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-indigo-50 bg-gradient-to-r from-blue-50/80 to-white flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Recent Organizations</h3>
            <Link to="/tenants" className="text-xs font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {recentTenants.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">No tenants yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-slate-500">Organization</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-500">Plan</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-500">Employees</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-500">Status</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-500">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{tenant.name}</p>
                        <p className="text-slate-400 font-mono">{tenant.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{tenant.subscriptionPlan?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{tenant.employee_count ?? 0}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={tenant.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(tenant.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card overflow-hidden p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
              <Mail size={16} />
            </span>
            Email Delivery (7 days)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
              <p className="text-2xl font-bold text-emerald-700">{emailDelivery.sent}</p>
              <p className="text-[10px] text-emerald-600 font-medium uppercase mt-1">Sent</p>
            </div>
            <div className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100">
              <p className="text-2xl font-bold text-rose-700">{emailDelivery.failed}</p>
              <p className="text-[10px] text-rose-600 font-medium uppercase mt-1">Failed</p>
            </div>
          </div>
          <Link to="/settings" className="block text-center text-xs text-brand-600 hover:underline pt-2">
            Configure Global SMTP →
          </Link>
          <div className="pt-3 border-t border-slate-100">
            <Link to="/audit-logs" className="flex items-center gap-2 text-xs text-slate-600 hover:text-brand-600">
              <FileText size={14} />
              View audit logs
              <ArrowRight size={12} className="ml-auto" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-50 bg-gradient-to-r from-amber-50/80 to-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
                <Clock size={16} />
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Pending Subscription Requests</h3>
            </div>
            <Link to="/pending-approvals" className="text-xs font-medium text-amber-700 hover:underline">
              Review
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {pendingRequests.length === 0 ? (
              <li className="px-5 py-8 text-sm text-slate-400 text-center">No pending requests</li>
            ) : (
              pendingRequests.map((req) => (
                <li key={req.id} className="px-5 py-3 hover:bg-amber-50/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800">{req.tenant?.name || 'Unknown tenant'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {REQUEST_TYPE_LABELS[req.request_type] || req.request_type}
                        {' · '}
                        <RequestSummary request={req} />
                      </p>
                    </div>
                    <StatusBadge status="pending" />
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-orange-50 bg-gradient-to-r from-orange-50/80 to-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm">
                <AlertTriangle size={16} />
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Subscriptions Expiring Soon</h3>
            </div>
            <Link to="/subscriptions" className="text-xs font-medium text-orange-700 hover:underline">
              Manage
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {expiringSoon.length === 0 ? (
              <li className="px-5 py-8 text-sm text-slate-400 text-center">No expirations in the next 30 days</li>
            ) : (
              expiringSoon.map((tenant) => (
                <li key={tenant.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-orange-50/40 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{tenant.name}</p>
                    <p className="text-xs text-slate-500">
                      {tenant.subscriptionPlan?.name || 'No plan'} · {tenant.employee_count ?? 0} employees
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-amber-700">{formatDate(tenant.subscription_expiry_date)}</p>
                    <StatusBadge status={tenant.status} className="mt-1" />
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
