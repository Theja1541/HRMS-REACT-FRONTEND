import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, ClipboardCheck, HelpCircle, Menu, Search } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NAV_ITEMS, flattenNavItems } from '../../constants/routes';
import { billingApi, platformApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';
import { cn } from '../../utils/helpers';
import { formatDistanceToNow, parseISO } from 'date-fns';

const PAGE_TITLES = {};
flattenNavItems().forEach((item) => {
  PAGE_TITLES[item.path] = item.label;
});
PAGE_TITLES['/helpdesk'] = 'Helpdesk';
PAGE_TITLES['/helpdesk/categories'] = 'Helpdesk Categories';
PAGE_TITLES['/announcements'] = 'Announcements';
PAGE_TITLES['/reports'] = 'Reports';
PAGE_TITLES['/audit-logs'] = 'Audit Logs';
PAGE_TITLES['/me'] = 'My Dashboard';
PAGE_TITLES['/me/attendance'] = 'My Attendance';
PAGE_TITLES['/me/leaves'] = 'My Leaves';
PAGE_TITLES['/me/profile'] = 'My Profile';
PAGE_TITLES['/me/directory'] = 'Directory';
PAGE_TITLES['/me/tasks'] = 'My Tasks';
PAGE_TITLES['/me/payslips'] = 'My Payslips';
PAGE_TITLES['/me/assets'] = 'My Assets';
PAGE_TITLES['/me/announcements'] = 'Announcements';
PAGE_TITLES['/me/helpdesk'] = 'Helpdesk';
PAGE_TITLES['/me/notifications'] = 'Notification Settings';
PAGE_TITLES['/projects'] = 'Projects & Tasks';
PAGE_TITLES['/roles'] = 'Roles & Permissions';
PAGE_TITLES['/billing'] = 'Plans & Pricing';
PAGE_TITLES['/pending-approvals'] = 'Pending Approvals';
PAGE_TITLES['/subscriptions'] = 'Tenant Subscriptions';

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'super_admin';
  const toggleMobileSidebar = useUiStore((s) => s.toggleMobileSidebar);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const title = PAGE_TITLES[location.pathname] || 'HRMS';

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => platformApi.listNotifications({ limit: 15 }),
    refetchInterval: 60_000,
  });

  const { data: pendingRequestsData } = useQuery({
    queryKey: ['subscription-requests-pending-count'],
    queryFn: async () => {
      const res = await billingApi.pendingSubscriptionRequestsCount();
      return res?.data?.count ?? 0;
    },
    enabled: isSuperAdmin,
    refetchInterval: 60_000,
  });

  const pendingRequestCount = pendingRequestsData ?? 0;

  const markRead = useMutation({
    mutationFn: platformApi.markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: platformApi.markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.data?.notifications || [];
  const unread = data?.data?.unread_count || 0;

  const handleClick = (n) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  return (
    <header className="relative bg-white border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center gap-2 sm:gap-4 shrink-0 min-w-0">
      <button
        type="button"
        onClick={toggleMobileSidebar}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden shrink-0"
        aria-label="Open navigation menu"
      >
        <Menu size={18} />
      </button>
      <div className="min-w-0 flex-1 lg:flex-none">
        <h2 className="text-sm sm:text-md font-semibold text-slate-900 truncate">{title}</h2>
        <p className="text-xs text-slate-400 items-center gap-1 truncate hidden md:flex">
          <span>HRMS</span><span>/</span><span>{title}</span>
        </p>
      </div>
      <div className="flex-1 hidden lg:block" />
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 min-w-[180px] lg:min-w-[210px]">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input placeholder="Search…" className="border-none bg-transparent text-xs outline-none w-full text-slate-700 placeholder:text-slate-400 min-w-0" />
        </div>
        <button
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500"
          aria-label="Search"
        >
          <Search size={16} />
        </button>

        <div className="relative">
          <button type="button" onClick={() => setOpen(!open)} className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">
            <Bell size={16} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
              <div className="fixed sm:absolute inset-x-4 sm:inset-x-auto sm:right-0 top-14 sm:top-10 sm:w-80 max-w-none bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b flex justify-between items-center gap-2">
                  <p className="text-sm font-semibold">Notifications</p>
                  {unread > 0 && (
                    <button type="button" onClick={() => markAllRead.mutate()} className="text-[10px] text-brand-600 hover:underline shrink-0">Mark all read</button>
                  )}
                </div>
                <ul className="max-h-[min(20rem,calc(100dvh-5rem))] sm:max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <li className="px-4 py-8 text-center text-xs text-slate-400">No notifications</li>
                  ) : (
                    notifications.map((n) => (
                      <li key={n.id}>
                        <button type="button" onClick={() => handleClick(n)} className={cn('w-full text-left px-4 py-3 hover:bg-slate-50', !n.is_read && 'bg-brand-50/40')}>
                          <p className="text-xs font-medium text-slate-800">{n.title}</p>
                          {n.message && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>}
                          <p className="text-[10px] text-slate-400 mt-1">{formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })}</p>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </>
          )}
        </div>

        {isSuperAdmin && (
          <Link
            to="/pending-approvals"
            className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 shrink-0"
            title="Pending subscription requests"
          >
            <ClipboardCheck size={16} />
            {pendingRequestCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
              </span>
            )}
          </Link>
        )}

        <Link to="/helpdesk" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 shrink-0" title="Helpdesk">
          <HelpCircle size={16} />
        </Link>
      </div>

      {searchOpen && (
        <div className="absolute left-0 right-0 top-14 z-30 border-b border-slate-200 bg-white px-4 py-2 md:hidden">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              autoFocus
              placeholder="Search…"
              className="border-none bg-transparent text-sm outline-none w-full text-slate-700 placeholder:text-slate-400"
              onBlur={() => setSearchOpen(false)}
            />
          </div>
        </div>
      )}
    </header>
  );
}
