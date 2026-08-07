import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  Users,
  Palmtree,
  UserCheck,
  CalendarDays,
  TrendingUp,
  Banknote,
  CalendarClock,
  AlertTriangle,
  CheckCheck,
  ArrowRight,
  PartyPopper,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import { authApi, dashboardApi } from '../../api';
import { StatCard } from '../../components/shared/PageHeader';
import DashboardHero, { DashboardSection } from '../../components/shared/DashboardHero';
import SubscriptionExpiryBanner from '../../components/subscription/SubscriptionExpiryBanner';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';
import { format, parseISO, isValid } from 'date-fns';
import { formatINR } from '../../utils/helpers';
import SuperAdminDashboard from './SuperAdminDashboard';
import { isPlatformPortal } from '../../utils/portalContext';

function safeParseDate(value) {
  if (!value) return null;
  try {
    const d = parseISO(String(value).slice(0, 10));
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

const DEPT_COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  { bg: 'bg-teal-50', text: 'text-teal-700', bar: 'bg-teal-500' },
  { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  { bg: 'bg-sky-50', text: 'text-sky-700', bar: 'bg-sky-500' },
  { bg: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-500' },
  { bg: 'bg-cyan-50', text: 'text-cyan-700', bar: 'bg-cyan-500' },
  { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500' },
];

const CHART_COLORS = ['#2563EB', '#10B981', '#0D9488', '#F59E0B', '#0EA5E9', '#F43F5E', '#06B6D4'];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <p className="text-sm font-bold text-brand-600">{payload[0].value} present</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, workspace, selectedTenantId, setEntitlements, accessToken } = useAuthStore();
  const role = usePortalRole();
  const isSuperAdmin = isPlatformPortal(accessToken, workspace);
  const isPlatformView = isSuperAdmin && !selectedTenantId;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', selectedTenantId],
    queryFn: () => dashboardApi.get(selectedTenantId ? { tenant_id: selectedTenantId } : {}),
  });

  const { data: meData } = useQuery({
    queryKey: ['auth-me-dashboard-expiry'],
    queryFn: () => authApi.me(),
    enabled: role !== 'super_admin',
    staleTime: 60_000,
  });

  useEffect(() => {
    if (meData?.data?.entitlements) {
      setEntitlements(meData.data.entitlements);
    }
  }, [meData, setEntitlements]);

  const stats = data?.data?.stats || {};

  if (isLoading) {
    return (
      <div className="space-y-6">
        {!isPlatformView && <SubscriptionExpiryBanner />}
        <div className="h-28 rounded-2xl bg-gradient-to-r from-slate-200 via-blue-100 to-sky-100 animate-pulse" />
        <div className="stat-grid-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card animate-pulse h-28 bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (isPlatformView) {
    return <SuperAdminDashboard data={data?.data} user={user} />;
  }

  const chartData = (data?.data?.attendanceTrend || [])
    .map((d) => {
      const parsed = safeParseDate(d.date);
      if (!parsed) return null;
      return {
        day: format(parsed, 'EEE'),
        count: parseInt(d.count, 10),
      };
    })
    .filter(Boolean);

  const firstName = user?.name ? user.name.split(' ')[0] : '';
  const deptMax = Math.max(1, ...(data?.data?.departmentBreakdown || []).map((d) => Number(d.count) || 0));

  return (
    <div className="space-y-6">
      <SubscriptionExpiryBanner />

      <DashboardHero
        badge="Organization overview"
        title={`Welcome back${firstName ? `, ${firstName}` : ''}`}
        subtitle="Your people, attendance, and payroll — at a glance."
        chips={[
          { label: 'Employees', value: stats.totalEmployees ?? 0 },
          { label: 'Present', value: stats.presentToday ?? 0, tone: 'emerald' },
          { label: 'Pending', value: stats.pendingLeaves ?? 0, tone: 'amber' },
        ]}
      />

      <DashboardSection title="Workforce today">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Employees"
            value={stats.totalEmployees ?? 0}
            delta={`+${stats.newJoinersThisMonth ?? 0} this month`}
            icon={Users}
            tone="brand"
            to="/employees"
          />
          <StatCard
            label="Present Today"
            value={stats.presentToday ?? 0}
            icon={UserCheck}
            tone="emerald"
            to="/attendance"
          />
          <StatCard
            label="On Leave Today"
            value={stats.onLeaveToday ?? 0}
            icon={Palmtree}
            tone="teal"
            to="/leaves"
          />
          <StatCard
            label="Pending Leaves"
            value={stats.pendingLeaves ?? 0}
            delta="Needs approval"
            deltaType="neutral"
            icon={CalendarDays}
            tone="amber"
            to="/leaves"
          />
        </div>
      </DashboardSection>

      <DashboardSection title="Probation & confirmations" accent="bg-sky-500">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Employees on Probation"
            value={stats.probationEmployees ?? 0}
            delta="Under review"
            deltaType="neutral"
            icon={Users}
            tone="sky"
            to="/probation-tracker"
          />
          <StatCard
            label="Confirmations Due in 7 Days"
            value={stats.probationDueIn7Days ?? 0}
            delta="Review queue"
            deltaType="neutral"
            icon={CalendarClock}
            tone="orange"
            to="/probation-tracker"
          />
          <StatCard
            label="Overdue Confirmations"
            value={stats.probationOverdue ?? 0}
            delta={(stats.probationOverdue ?? 0) > 0 ? 'Action required' : 'On track'}
            deltaType={(stats.probationOverdue ?? 0) > 0 ? 'down' : 'neutral'}
            icon={AlertTriangle}
            tone="rose"
            to="/probation-tracker"
          />
          <StatCard
            label="Confirmed This Month"
            value={stats.confirmedThisMonth ?? 0}
            delta="Converted to active"
            deltaType="neutral"
            icon={CheckCheck}
            tone="teal"
            to="/probation-tracker"
          />
        </div>
      </DashboardSection>

      {stats.monthlyPayrollNet > 0 && (
        <DashboardSection title="Payroll">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Monthly Payroll (Net)"
              value={formatINR(stats.monthlyPayrollNet)}
              delta={`${stats.monthlyPayrollLabel} · ${stats.monthlyPayrollStatus}`}
              deltaType="neutral"
              icon={Banknote}
              tone="brand"
              to="/finance"
            />
            <Link
              to="/finance"
              className="group relative overflow-hidden rounded-xl border border-teal-200 bg-gradient-to-br from-teal-600 to-sky-600 p-5 text-white shadow-md shadow-teal-500/20 transition hover:shadow-lg hover:shadow-teal-500/30 flex flex-col justify-center"
            >
              <p className="text-sm font-semibold">View Financial Summary</p>
              <p className="mt-1 text-xs text-teal-50/90">Income, expenses & payroll</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium">
                Open finance <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </DashboardSection>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attendance chart */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-blue-50 bg-gradient-to-r from-blue-50/80 to-white px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm shadow-brand-600/30">
                <UserCheck size={16} />
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Attendance — Last 7 Days</h3>
            </div>
          </div>
          <div className="p-5">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} barCategoryGap="28%">
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(37,99,235,0.06)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-10">No attendance data yet</p>
            )}
          </div>
        </div>

        {/* Pending leaves */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-amber-50 bg-gradient-to-r from-amber-50/80 to-white px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm shadow-amber-500/30">
                <CalendarDays size={16} />
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Pending Leave Approvals</h3>
            </div>
            <Link to="/leaves" className="text-xs font-medium text-amber-700 hover:text-amber-800 hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {(data?.data?.pendingRequests || []).length === 0 ? (
              <li className="px-5 py-10 text-sm text-slate-400 text-center">No pending requests</li>
            ) : (
              data.data.pendingRequests.map((req) => (
                <li key={req.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-amber-50/40 transition-colors">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                    {(req.employee?.first_name?.[0] || '?').toUpperCase()}
                    {(req.employee?.last_name?.[0] || '').toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">
                      {req.employee?.first_name} {req.employee?.last_name}
                      <span className="ml-1.5 inline-flex rounded-md bg-teal-100 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
                        {req.leave_type}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {req.days} day(s) · {req.reason}
                    </p>
                  </div>
                  <Link
                    to="/leaves"
                    className="shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-amber-600 transition-colors"
                  >
                    Review
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data?.data?.departmentBreakdown?.length > 0 && (
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-teal-50 bg-gradient-to-r from-teal-50/80 to-white px-5 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white shadow-sm shadow-teal-500/30">
                <TrendingUp size={16} />
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Department Headcount</h3>
            </div>
            <div className="p-5 space-y-3">
              {data.data.departmentBreakdown.map((dept, i) => {
                const c = DEPT_COLORS[i % DEPT_COLORS.length];
                const pct = Math.round((Number(dept.count) / deptMax) * 100);
                return (
                  <div key={dept.name} className={`rounded-xl ${c.bg} px-3.5 py-3`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className={`text-xs font-semibold ${c.text} truncate`}>{dept.name}</p>
                      <p className={`text-lg font-bold ${c.text}`}>{dept.count}</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/70 overflow-hidden">
                      <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-rose-50 bg-gradient-to-r from-rose-50/70 to-white px-5 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-white shadow-sm shadow-rose-500/30">
              <PartyPopper size={16} />
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Upcoming Holidays</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {(data?.data?.upcomingHolidays || []).length === 0 ? (
              <li className="px-5 py-10 text-sm text-slate-400 text-center">No upcoming holidays</li>
            ) : (
              data.data.upcomingHolidays.map((h, i) => {
                const accent = DEPT_COLORS[i % DEPT_COLORS.length];
                const d = safeParseDate(h.date);
                if (!d) return null;
                return (
                  <li key={h.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50/80 transition-colors">
                    <div className={`shrink-0 w-12 rounded-lg ${accent.bg} text-center py-1.5`}>
                      <p className={`text-[10px] font-semibold uppercase ${accent.text}`}>{format(d, 'MMM')}</p>
                      <p className={`text-lg font-bold leading-none ${accent.text}`}>{format(d, 'dd')}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{h.name}</p>
                      <p className="text-xs text-slate-400">{format(d, 'EEEE, dd MMM yyyy')}</p>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
