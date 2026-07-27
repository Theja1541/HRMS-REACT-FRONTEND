import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import SmtpSettingsTab from './SmtpSettingsTab';
import SubscriptionSettingsTab from './SubscriptionSettingsTab';
import BrandingSettingsTab from './BrandingSettingsTab';
import WorkingCalendarPage from './WorkingCalendarPage';
import AttendancePolicyPage from './AttendancePolicyPage';
import ChangePasswordForm from '../../components/auth/ChangePasswordForm';
import MfaSettings from '../../components/auth/MfaSettings';
import { usePortalRole } from '../../hooks/usePortalRole';
import { cn } from '../../utils/helpers';

const ADMIN_ROLES = ['super_admin', 'owner', 'hr'];
const SECURITY_ROLES = ['employee', 'manager', 'pf_team', 'auditor'];

const TABS = [
  { id: 'security', label: 'Security', roles: SECURITY_ROLES },
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
  if (SECURITY_ROLES.includes(role)) return 'security';
  return 'branding';
}

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = usePortalRole();
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
        badge="Admin · Settings"
        title={isAdmin ? 'Company Settings' : 'Settings'}
        subtitle={
          isAdmin
            ? 'Branding, email SMTP, subscription, and company-wide configuration'
            : 'Manage your account security and password'
        }
      />

      <div className="ds-tabs scroll-tabs" role="tablist">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => selectTab(t)}
            className={cn(tab === t.id && 'ds-tab-active')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="p-4">
          {tab === 'security' && SECURITY_ROLES.includes(role) && (
            <div className="max-w-lg space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b pb-2">Password Settings</h3>
                <ChangePasswordForm showIntro submitLabel="Update Password" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b pb-2">Multi-Factor Authentication</h3>
                <MfaSettings />
              </div>
            </div>
          )}

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
