import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  CheckSquare,
  FileText,
  Palmtree,
  Megaphone,
  Cake,
  Award,
  Clock,
  AlertCircle,
  User,
  Users,
  Laptop,
  LifeBuoy,
  Bell,
  Wallet,
  PartyPopper,
} from 'lucide-react';
import { portalApi } from '../../api';
import { StatCard } from '../../components/shared/PageHeader';
import DashboardHero, { DashboardSection } from '../../components/shared/DashboardHero';
import { Avatar } from '../../components/shared/StatusBadge';
import { ATTENDANCE_STATUS } from '../../constants/hr';
import { useAuthStore } from '../../store/auth.store';
import { format, parseISO, isValid } from 'date-fns';

function safeParseDate(value) {
  if (!value) return null;
  try {
    const d = parseISO(String(value).slice(0, 10));
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

const OCCASION_COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-700' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { bg: 'bg-teal-50', text: 'text-teal-700' },
  { bg: 'bg-amber-50', text: 'text-amber-700' },
  { bg: 'bg-sky-50', text: 'text-sky-700' },
  { bg: 'bg-rose-50', text: 'text-rose-700' },
];

function todayAttendanceLabel(status) {
  if (!status || status === 'not_checked_in') return 'Not marked today';
  if (status === 'checked_in' || status === 'checked_out') return 'Present';
  const meta = ATTENDANCE_STATUS[status];
  return meta?.full || status.replace(/_/g, ' ');
}

function OccasionList({ items, emptyLabel }) {
  if (!items?.length) {
    return <p className="px-5 py-4 text-sm text-slate-400 text-center">{emptyLabel}</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item, i) => {
        const c = OCCASION_COLORS[i % OCCASION_COLORS.length];
        return (
          <li key={`${item.employee_id}-${item.type}`} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/80 transition-colors">
            <Avatar name={item.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
              <p className="text-[10px] text-slate-400">
                {item.department || item.emp_code}
                {item.years != null ? ` · ${item.years} yr${item.years !== 1 ? 's' : ''}` : ''}
              </p>
            </div>
            <span className={`text-[10px] font-semibold shrink-0 rounded-md px-1.5 py-0.5 ${c.bg} ${c.text}`}>
              {item.days_until === 0 ? 'Today' : `in ${item.days_until}d`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function MeHomePage() {
  const { user } = useAuthStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['portal-summary'],
    queryFn: portalApi.getSummary,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 rounded-2xl bg-gradient-to-r from-slate-200 via-blue-100 to-sky-100 animate-pulse" />
        <div className="stat-grid-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card animate-pulse h-28 bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-500 text-sm mb-3">Failed to load dashboard</p>
        <button type="button" onClick={() => refetch()} className="btn-secondary text-xs">
          Retry
        </button>
      </div>
    );
  }

  const summary = data?.data?.summary || data?.data || {};
  const employee = summary.employee || {};
  const attendance = summary.attendance || {};
  const leave = summary.leave || { types: [], total_available: 0 };
  const myPending = summary.my_pending || {};
  const pendingApprovals = summary.pending_approvals;
  const helpdesk = summary.helpdesk || {};
  const helpdeskLastTickets = helpdesk.last_tickets || [];

  const firstName = employee.first_name || user?.name?.split(' ')[0] || 'there';
  const attendanceLabel = todayAttendanceLabel(attendance.status);

  return (
    <div className="space-y-6">
      <DashboardHero
        badge="Self-service portal"
        title={`Hello, ${firstName}`}
        subtitle={
          employee.designation
            ? `${employee.emp_code} · ${employee.designation}`
            : 'Your attendance, leaves, and tasks in one place.'
        }
        chips={[
          { label: 'Leave', value: leave.total_available?.toFixed?.(1) ?? leave.total_available ?? 0, tone: 'teal' },
          { label: 'Tasks', value: summary.open_tasks ?? 0, tone: 'sky' },
          {
            label: 'Today',
            value: attendanceLabel === 'Present' ? 'Present' : '—',
            tone: attendanceLabel === 'Present' ? 'emerald' : 'amber',
          },
        ]}
      />

      <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-blue-100 bg-gradient-to-r from-blue-50/60 to-white">
        <div className="flex items-center gap-4">
          <Avatar name={employee.name || firstName} size="lg" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Today&apos;s Attendance</p>
            <p className="text-xs text-slate-500 mt-1">
              {attendanceLabel}
              {attendance.is_late && <span className="ml-2 text-amber-600 font-medium">Late</span>}
            </p>
          </div>
        </div>
        <Link to="/me/attendance" className="btn-primary text-xs">
          View Attendance
        </Link>
      </div>

      {myPending.profile_edits > 0 && (
        <div className="card p-4 flex items-start gap-3 border-amber-200 bg-amber-50/50">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-900">Pending requests</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {myPending.profile_edits} profile edit(s) awaiting HR approval
            </p>
          </div>
        </div>
      )}

      <DashboardSection title="Quick stats">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Leave Available"
            value={leave.total_available?.toFixed?.(1) ?? leave.total_available ?? 0}
            icon={Palmtree}
            tone="teal"
            to="/me/leaves"
          />
          <StatCard
            label="Open Tasks"
            value={summary.open_tasks ?? 0}
            icon={CheckSquare}
            tone="sky"
            to="/me/tasks"
          />
          <StatCard
            label="My Attendance"
            value="View"
            delta="Check-in history"
            deltaType="neutral"
            icon={CalendarCheck}
            tone="emerald"
            to="/me/attendance"
          />
          <StatCard
            label="My Payslips"
            value="View"
            delta="Salary documents"
            deltaType="neutral"
            icon={FileText}
            tone="brand"
            to="/me/payslips"
          />
        </div>
      </DashboardSection>

      {pendingApprovals && pendingApprovals.total > 0 && (
        <div className="card overflow-hidden border-amber-200">
          <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-white border-b border-amber-100 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
              <Clock size={16} />
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Pending Approvals</h3>
            <span className="ml-auto text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {pendingApprovals.total}
            </span>
          </div>
          <div className="px-5 py-4 flex flex-wrap gap-4 text-sm">
            {pendingApprovals.leaves > 0 && (
              <Link to="/me/leaves" className="text-amber-700 font-medium hover:underline">
                {pendingApprovals.leaves} leave request(s)
              </Link>
            )}
            {pendingApprovals.profile_edits > 0 && (
              <span className="text-slate-600">{pendingApprovals.profile_edits} profile edit(s)</span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-sky-50 bg-gradient-to-r from-sky-50/80 to-white flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm">
              <LifeBuoy size={16} />
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Helpdesk</h3>
            <Link to="/me/helpdesk" className="ml-auto text-xs font-medium text-sky-700 hover:underline">
              Raise New Ticket
            </Link>
          </div>
          <div className="px-5 py-3 grid grid-cols-3 gap-2 border-b border-slate-100">
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
              <p className="text-[10px] uppercase text-amber-700">Open</p>
              <p className="text-sm font-semibold text-amber-900 mt-0.5">{helpdesk.open ?? 0}</p>
            </div>
            <div className="rounded-xl bg-sky-50 border border-sky-100 px-3 py-2">
              <p className="text-[10px] uppercase text-sky-700">In Progress</p>
              <p className="text-sm font-semibold text-sky-900 mt-0.5">{helpdesk.in_progress ?? 0}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
              <p className="text-[10px] uppercase text-emerald-700">Closed</p>
              <p className="text-sm font-semibold text-emerald-900 mt-0.5">{helpdesk.closed ?? 0}</p>
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {helpdeskLastTickets.length === 0 ? (
              <li className="px-5 py-6 text-sm text-slate-400 text-center">No tickets yet</li>
            ) : (
              helpdeskLastTickets.map((ticket) => (
                <li key={ticket.id} className="px-5 py-3 hover:bg-sky-50/40 transition-colors">
                  <Link to="/me/helpdesk" className="block">
                    <p className="text-xs font-mono text-slate-400">{ticket.ticket_no}</p>
                    <p className="text-sm font-medium text-slate-800 truncate">{ticket.subject}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {ticket.category?.name || ticket.category?.code || 'General'}
                      {' · '}
                      {String(ticket.status || '').replace(/_/g, ' ')}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-teal-50 bg-gradient-to-r from-teal-50/80 to-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white shadow-sm">
                <Palmtree size={16} />
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Leave Balances</h3>
            </div>
            <Link to="/me/leaves" className="text-xs font-medium text-teal-700 hover:underline">
              Apply leave
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {leave.types?.length === 0 ? (
              <li className="px-5 py-6 text-sm text-slate-400 text-center">No balances allocated</li>
            ) : (
              leave.types?.map((b, i) => {
                const c = OCCASION_COLORS[i % OCCASION_COLORS.length];
                return (
                  <li key={b.leave_type || i} className="px-5 py-3 flex justify-between text-sm items-center">
                    <span className={`font-medium rounded-md px-2 py-0.5 text-xs ${c.bg} ${c.text}`}>{b.leave_type}</span>
                    <span className="text-slate-600 font-medium">
                      {b.available} / {b.allocated} days
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="card overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-orange-50 bg-gradient-to-r from-orange-50/70 to-white flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm">
              <Megaphone size={16} />
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Announcements</h3>
            <Link to="/me/announcements" className="ml-auto text-xs font-medium text-orange-700 hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {(summary.announcements || []).length === 0 ? (
              <li className="px-5 py-6 text-sm text-slate-400 text-center">No announcements</li>
            ) : (
              summary.announcements.map((a) => (
                <li key={a.id} className="px-5 py-3 hover:bg-orange-50/30 transition-colors">
                  <p className="text-sm font-medium text-slate-800">{a.title}</p>
                  {(a.publish_at || a.published_at) && (() => {
                    const published = safeParseDate(a.publish_at || a.published_at);
                    if (!published) return null;
                    return (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {format(published, 'dd MMM yyyy')}
                      </p>
                    );
                  })()}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-rose-50 bg-gradient-to-r from-rose-50/70 to-white flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-white shadow-sm">
              <PartyPopper size={16} />
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Upcoming Holidays</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {(summary.upcoming_holidays || []).length === 0 ? (
              <li className="px-5 py-4 text-sm text-slate-400 text-center">No upcoming holidays</li>
            ) : (
              summary.upcoming_holidays.map((h, i) => {
                const c = OCCASION_COLORS[i % OCCASION_COLORS.length];
                const d = safeParseDate(h.date);
                if (!d) return null;
                return (
                  <li key={h.id} className="px-5 py-3 flex items-center gap-3">
                    <div className={`shrink-0 w-11 rounded-lg ${c.bg} text-center py-1`}>
                      <p className={`text-[9px] font-semibold uppercase ${c.text}`}>{format(d, 'MMM')}</p>
                      <p className={`text-base font-bold leading-none ${c.text}`}>{format(d, 'dd')}</p>
                    </div>
                    <span className="text-sm font-medium text-slate-800 truncate">{h.name}</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-pink-50 bg-gradient-to-r from-pink-50/70 to-white flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500 text-white shadow-sm">
              <Cake size={16} />
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Birthdays (7 days)</h3>
          </div>
          <OccasionList
            items={[...(summary.birthdays?.team || []), ...(summary.birthdays?.org || [])].slice(0, 5)}
            emptyLabel="No birthdays this week"
          />
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-violet-50 bg-gradient-to-r from-emerald-50/70 to-white flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
              <Award size={16} />
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Work Anniversaries</h3>
          </div>
          <OccasionList
            items={[...(summary.work_anniversaries?.team || []), ...(summary.work_anniversaries?.org || [])].slice(0, 5)}
            emptyLabel="No anniversaries this week"
          />
        </div>
      </div>

      <DashboardSection title="Shortcuts" accent="bg-slate-400">
        <div className="flex flex-wrap gap-3">
          {[
            { to: '/me/profile', label: 'My Profile', icon: User, color: 'bg-brand-600' },
            { to: '/me/directory', label: 'Directory', icon: Users, color: 'bg-sky-500' },
            { to: '/me/assets', label: 'My Assets', icon: Laptop, color: 'bg-teal-500' },
            { to: '/me/reimbursements', label: 'My Reimbursements', icon: Wallet, color: 'bg-emerald-500' },
            { to: '/me/helpdesk', label: 'Helpdesk', icon: LifeBuoy, color: 'bg-amber-500' },
            { to: '/me/notifications', label: 'Notifications', icon: Bell, color: 'bg-orange-500' },
            { to: '/me/tasks', label: 'My Tasks', icon: CheckSquare, color: 'bg-sky-600' },
            { to: '/me/leaves', label: 'My Leaves', icon: Palmtree, color: 'bg-teal-600' },
          ].map(({ to, label, icon: Icon, color }) => (
            <Link
              key={to}
              to={to}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${color} text-white`}>
                <Icon size={14} />
              </span>
              {label}
            </Link>
          ))}
        </div>
      </DashboardSection>
    </div>
  );
}
