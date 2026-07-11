import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Users, Palmtree, UserCheck, CalendarDays, TrendingUp, Banknote, CalendarClock, AlertTriangle, CheckCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { authApi, dashboardApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import SubscriptionExpiryBanner from '../../components/subscription/SubscriptionExpiryBanner';
import { useAuthStore } from '../../store/auth.store';
import { format, parseISO } from 'date-fns';
import { formatINR } from '../../utils/helpers';
import SuperAdminDashboard from './SuperAdminDashboard';
import { isPlatformPortal } from '../../utils/portalContext';

export default function DashboardPage() {
  const { user, workspace, selectedTenantId, setEntitlements, accessToken } = useAuthStore();
  const isSuperAdmin = isPlatformPortal(accessToken, workspace);
  const isPlatformView = isSuperAdmin && !selectedTenantId;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', selectedTenantId],
    queryFn: () => dashboardApi.get(selectedTenantId ? { tenant_id: selectedTenantId } : {}),
  });

  const { data: meData } = useQuery({
    queryKey: ['auth-me-dashboard-expiry'],
    queryFn: () => authApi.me(),
    enabled: user?.role !== 'super_admin',
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

  const chartData = (data?.data?.attendanceTrend || []).map((d) => ({
    day: format(parseISO(d.date), 'EEE'),
    count: parseInt(d.count, 10),
  }));

  return (
    <div className="space-y-6">
      <SubscriptionExpiryBanner />

      <PageHeader
        title={`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        subtitle="Your organization at a glance"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={stats.totalEmployees ?? 0} delta={`+${stats.newJoinersThisMonth ?? 0} this month`} icon={Users} />
        <StatCard label="Present Today" value={stats.presentToday ?? 0} icon={UserCheck} />
        <StatCard label="On Leave Today" value={stats.onLeaveToday ?? 0} icon={Palmtree} />
        <StatCard label="Pending Leaves" value={stats.pendingLeaves ?? 0} delta="Needs approval" deltaType="neutral" icon={CalendarDays} />
        <StatCard
          label="Employees on Probation"
          value={stats.probationEmployees ?? 0}
          delta="Under review"
          deltaType="neutral"
          icon={Users}
        />
        <StatCard
          label="Confirmations Due in 7 Days"
          value={stats.probationDueIn7Days ?? 0}
          delta="Review queue"
          deltaType="neutral"
          icon={CalendarClock}
        />
        <StatCard
          label="Overdue Confirmations"
          value={stats.probationOverdue ?? 0}
          delta={(stats.probationOverdue ?? 0) > 0 ? 'Action required' : 'On track'}
          deltaType={(stats.probationOverdue ?? 0) > 0 ? 'up' : 'neutral'}
          icon={AlertTriangle}
        />
        <StatCard
          label="Confirmed This Month"
          value={stats.confirmedThisMonth ?? 0}
          delta="Converted to active"
          deltaType="neutral"
          icon={CheckCheck}
        />
      </div>

      {stats.monthlyPayrollNet > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Monthly Payroll (Net)"
            value={formatINR(stats.monthlyPayrollNet)}
            delta={`${stats.monthlyPayrollLabel} · ${stats.monthlyPayrollStatus}`}
            deltaType="neutral"
            icon={Banknote}
          />
          <Link to="/finance" className="stat-card flex items-center justify-center text-brand-600 text-sm font-medium hover:bg-brand-50 transition-colors">
            View Financial Summary →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4">Attendance — Last 7 Days</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No attendance data yet</p>
          )}
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Pending Leave Approvals</h3>
            <Link to="/leaves" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {(data?.data?.pendingRequests || []).length === 0 ? (
              <li className="px-5 py-6 text-sm text-slate-400 text-center">No pending requests</li>
            ) : (
              data.data.pendingRequests.map((req) => (
                <li key={req.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">
                      {req.employee?.first_name} {req.employee?.last_name} — {req.leave_type}
                    </p>
                    <p className="text-xs text-slate-400">{req.days} day(s) · {req.reason}</p>
                  </div>
                  <Link to="/leaves" className="btn-secondary text-[10px] py-1 px-2">Review</Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data?.data?.departmentBreakdown?.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-brand-600" />
              Department Headcount
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {data.data.departmentBreakdown.map((dept) => (
                <div key={dept.name} className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{dept.count}</p>
                  <p className="text-xs text-slate-500 mt-1">{dept.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold">Upcoming Holidays</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {(data?.data?.upcomingHolidays || []).length === 0 ? (
              <li className="px-5 py-6 text-sm text-slate-400 text-center">No upcoming holidays</li>
            ) : (
              data.data.upcomingHolidays.map((h) => (
                <li key={h.id} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium">{h.name}</span>
                  <span className="text-xs text-slate-400">{format(parseISO(h.date), 'dd MMM yyyy')}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
