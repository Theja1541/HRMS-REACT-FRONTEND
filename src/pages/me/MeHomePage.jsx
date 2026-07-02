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
} from 'lucide-react';
import { portalApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import { Avatar } from '../../components/shared/StatusBadge';
import { ATTENDANCE_STATUS } from '../../constants/hr';
import { useAuthStore } from '../../store/auth.store';
import { format, parseISO } from 'date-fns';

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
      {items.map((item) => (
        <li key={`${item.employee_id}-${item.type}`} className="px-5 py-3 flex items-center gap-3">
          <Avatar name={item.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
            <p className="text-[10px] text-slate-400">
              {item.department || item.emp_code}
              {item.years != null ? ` · ${item.years} yr${item.years !== 1 ? 's' : ''}` : ''}
            </p>
          </div>
          <span className="text-[10px] font-medium text-brand-600 shrink-0">
            {item.days_until === 0 ? 'Today' : `in ${item.days_until}d`}
          </span>
        </li>
      ))}
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
    return <div className="p-12 text-center text-slate-400">Loading your dashboard…</div>;
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${firstName}`}
        subtitle={employee.designation ? `${employee.emp_code} · ${employee.designation}` : 'Your self-service portal'}
      />

      <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={employee.name || firstName} size="lg" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Today&apos;s Attendance</p>
            <p className="text-xs text-slate-500 mt-1">
              {todayAttendanceLabel(attendance.status)}
              {attendance.is_late && (
                <span className="ml-2 text-amber-600 font-medium">Late</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/me/attendance" className="btn-secondary text-xs">
            View Attendance
          </Link>
        </div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Leave Available" value={leave.total_available?.toFixed?.(1) ?? leave.total_available ?? 0} icon={Palmtree} />
        <StatCard label="Open Tasks" value={summary.open_tasks ?? 0} icon={CheckSquare} />
        <Link to="/me/attendance" className="stat-card hover:bg-slate-50 transition-colors flex items-center gap-3">
          <CalendarCheck className="text-brand-600" size={20} />
          <span className="text-sm font-medium text-slate-700">My Attendance</span>
        </Link>
        <Link to="/me/payslips" className="stat-card hover:bg-slate-50 transition-colors flex items-center gap-3">
          <FileText className="text-brand-600" size={20} />
          <span className="text-sm font-medium text-slate-700">My Payslips</span>
        </Link>
      </div>

      {pendingApprovals && pendingApprovals.total > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold">Pending Approvals</h3>
            <span className="ml-auto text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {pendingApprovals.total}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {pendingApprovals.leaves > 0 && (
              <Link to="/me/leaves" className="text-brand-600 hover:underline">
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
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <LifeBuoy size={14} className="text-slate-400" />
            <h3 className="text-sm font-semibold">Helpdesk</h3>
            <Link to="/me/helpdesk" className="ml-auto text-xs text-brand-600 hover:underline">
              Raise New Ticket
            </Link>
          </div>
          <div className="px-5 py-3 grid grid-cols-3 gap-2 border-b border-slate-100">
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
              <p className="text-[10px] uppercase text-slate-500">Open</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{helpdesk.open ?? 0}</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
              <p className="text-[10px] uppercase text-slate-500">In Progress</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{helpdesk.in_progress ?? 0}</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
              <p className="text-[10px] uppercase text-slate-500">Closed</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{helpdesk.closed ?? 0}</p>
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {helpdeskLastTickets.length === 0 ? (
              <li className="px-5 py-6 text-sm text-slate-400 text-center">No tickets yet</li>
            ) : (
              helpdeskLastTickets.map((ticket) => (
                <li key={ticket.id} className="px-5 py-3">
                  <p className="text-xs font-mono text-slate-400">{ticket.ticket_no}</p>
                  <p className="text-sm font-medium text-slate-800 truncate">{ticket.subject}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {(ticket.category?.name || ticket.category?.code || 'General')}
                    {' · '}
                    {String(ticket.status || '').replace(/_/g, ' ')}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold">Leave Balances</h3>
            <Link to="/me/leaves" className="text-xs text-brand-600 hover:underline">Apply leave</Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {leave.types?.length === 0 ? (
              <li className="px-5 py-6 text-sm text-slate-400 text-center">No balances allocated</li>
            ) : (
              leave.types?.map((b, i) => (
                <li key={b.leave_type || i} className="px-5 py-3 flex justify-between text-sm">
                  <span className="font-medium">{b.leave_type}</span>
                  <span className="text-slate-600">{b.available} / {b.allocated} days</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <Megaphone size={14} className="text-slate-400" />
            <h3 className="text-sm font-semibold">Announcements</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {(summary.announcements || []).length === 0 ? (
              <li className="px-5 py-6 text-sm text-slate-400 text-center">No announcements</li>
            ) : (
              summary.announcements.map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-slate-800">{a.title}</p>
                  {(a.publish_at || a.published_at) && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {format(parseISO(a.publish_at || a.published_at), 'dd MMM yyyy')}
                    </p>
                  )}
                </li>
              ))
            )}
          </ul>
          <div className="px-5 py-3 border-t">
            <Link to="/me/announcements" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <CalendarCheck size={14} className="text-slate-400" />
            <h3 className="text-sm font-semibold">Upcoming Holidays</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {(summary.upcoming_holidays || []).length === 0 ? (
              <li className="px-5 py-4 text-sm text-slate-400 text-center">No upcoming holidays</li>
            ) : (
              summary.upcoming_holidays.map((h) => (
                <li key={h.id} className="px-5 py-3 flex justify-between text-sm">
                  <span className="font-medium">{h.name}</span>
                  <span className="text-slate-500">{format(parseISO(h.date), 'dd MMM')}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <Cake size={14} className="text-slate-400" />
            <h3 className="text-sm font-semibold">Birthdays (7 days)</h3>
          </div>
          <OccasionList
            items={[...(summary.birthdays?.team || []), ...(summary.birthdays?.org || [])].slice(0, 5)}
            emptyLabel="No birthdays this week"
          />
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <Award size={14} className="text-slate-400" />
            <h3 className="text-sm font-semibold">Work Anniversaries</h3>
          </div>
          <OccasionList
            items={[...(summary.work_anniversaries?.team || []), ...(summary.work_anniversaries?.org || [])].slice(0, 5)}
            emptyLabel="No anniversaries this week"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/me/profile" className="btn-secondary text-xs inline-flex items-center gap-2">
          <User size={14} /> My Profile
        </Link>
        <Link to="/me/directory" className="btn-secondary text-xs inline-flex items-center gap-2">
          <Users size={14} /> Directory
        </Link>
        <Link to="/me/assets" className="btn-secondary text-xs inline-flex items-center gap-2">
          <Laptop size={14} /> My Assets
        </Link>
        <Link to="/me/reimbursements" className="btn-secondary text-xs inline-flex items-center gap-2">
          <Wallet size={14} /> My Reimbursements
        </Link>
        <Link to="/me/helpdesk" className="btn-secondary text-xs inline-flex items-center gap-2">
          <LifeBuoy size={14} /> Helpdesk
        </Link>
        <Link to="/me/notifications" className="btn-secondary text-xs inline-flex items-center gap-2">
          <Bell size={14} /> Notifications
        </Link>
        <Link to="/me/tasks" className="btn-secondary text-xs inline-flex items-center gap-2">
          <CheckSquare size={14} /> My Tasks
        </Link>
        <Link to="/me/leaves" className="btn-secondary text-xs inline-flex items-center gap-2">
          <Palmtree size={14} /> My Leaves
        </Link>
      </div>
    </div>
  );
}
