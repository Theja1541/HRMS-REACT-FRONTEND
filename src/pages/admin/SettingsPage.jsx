import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import SmtpSettingsTab from './SmtpSettingsTab';
import SubscriptionSettingsTab from './SubscriptionSettingsTab';
import BrandingSettingsTab from './BrandingSettingsTab';
import WorkingCalendarPage from './WorkingCalendarPage';
import AttendancePolicyPage from './AttendancePolicyPage';
import ChangePasswordForm from '../../components/auth/ChangePasswordForm';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../utils/helpers';

const ADMIN_ROLES = ['super_admin', 'owner', 'hr'];

const TABS = [
  { id: 'branding', label: 'Branding', roles: ADMIN_ROLES },
  { id: 'smtp', label: 'Email / SMTP', roles: ADMIN_ROLES },
  { id: 'subscription', label: 'Subscription', path: '/settings/subscription', roles: ['owner', 'hr'] },
  { id: 'working_calendar', label: 'Working Calendar', path: '/settings/working-calendar', roles: ['owner', 'hr', 'admin', 'manager'] },
  { id: 'attendance_policy', label: 'Attendance Policy', path: '/settings/attendance-policy', roles: ['owner', 'hr', 'admin'] },
];

function tabFromPath(pathname, role) {
  if (pathname.includes('/settings/subscription')) return 'subscription';
  if (pathname.includes('/settings/working-calendar')) return 'working_calendar';
  if (pathname.includes('/settings/attendance-policy')) return 'attendance_policy';
  return 'branding';
}

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isAdmin = ADMIN_ROLES.includes(role);

  const [tab, setTab] = useState(() => tabFromPath(location.pathname, role));

  const visibleTabs = TABS.filter((t) => !t.roles || t.roles.includes(role));

  useEffect(() => {
    setTab(tabFromPath(location.pathname, role));
  }, [location.pathname, role]);

  const selectTab = (t) => {
    if (t.roles && !t.roles.includes(role)) return;
    setTab(t.id);
    if (t.id === 'subscription') {
      if (location.pathname !== '/settings/subscription') navigate('/settings/subscription');
    } else if (t.id === 'working_calendar') {
      if (location.pathname !== '/settings/working-calendar') navigate('/settings/working-calendar');
    } else if (t.id === 'attendance_policy') {
      if (location.pathname !== '/settings/attendance-policy') navigate('/settings/attendance-policy');
    } else if (
      ['/settings/subscription', '/settings/working-calendar', '/settings/attendance-policy'].includes(location.pathname)
    ) {
      navigate('/settings');
    }
  };

  if (
    ['/settings/subscription', '/settings/working-calendar', '/settings/attendance-policy'].includes(location.pathname) &&
    !['owner', 'hr', 'admin', 'manager'].includes(role)
  ) {
    return <Navigate to="/settings" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? 'Company Settings' : 'Settings'}
        subtitle={
          isAdmin
            ? 'Branding, email SMTP, subscription, and company-wide configuration'
            : 'Manage your account security and password'
        }
      />

      <div className="card">
        <div className="px-4 border-b border-slate-200 flex gap-4 overflow-x-auto">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t)}
              className={cn(
                'py-3 text-xs font-medium border-b-2 -mb-px whitespace-nowrap',
                tab === t.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === 'branding' && isAdmin && <BrandingSettingsTab />}

          {tab === 'smtp' && isAdmin && <SmtpSettingsTab />}

          {tab === 'subscription' && (role === 'owner' || role === 'hr') && (
            <SubscriptionSettingsTab />
          )}

          {tab === 'working_calendar' && ['owner', 'hr', 'admin', 'manager'].includes(role) && (
            <WorkingCalendarPage />
          )}

          {tab === 'attendance_policy' && ['owner', 'hr', 'admin'].includes(role) && (
            <AttendancePolicyPage />
          )}
        </div>
      </div>
    </div>
  );
}
