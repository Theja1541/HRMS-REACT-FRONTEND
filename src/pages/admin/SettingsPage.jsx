import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import SmtpSettingsTab from './SmtpSettingsTab';
import SubscriptionSettingsTab from './SubscriptionSettingsTab';
import BrandingSettingsTab from './BrandingSettingsTab';
import ChangePasswordForm from '../../components/auth/ChangePasswordForm';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../utils/helpers';

const ADMIN_ROLES = ['super_admin', 'owner', 'hr'];

const TABS = [
  { id: 'change_password', label: 'Change Password' },
  { id: 'branding', label: 'Branding', roles: ADMIN_ROLES },
  { id: 'smtp', label: 'Email / SMTP', roles: ADMIN_ROLES },
  { id: 'subscription', label: 'Subscription', path: '/settings/subscription', roles: ['owner', 'hr'] },
];

function tabFromPath(pathname, role) {
  if (pathname.includes('/settings/subscription')) return 'subscription';
  if (ADMIN_ROLES.includes(role)) return 'branding';
  return 'change_password';
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
    } else if (location.pathname === '/settings/subscription') {
      navigate('/settings');
    }
  };

  if (location.pathname === '/settings/subscription' && role !== 'owner' && role !== 'hr') {
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
          {tab === 'change_password' && (
            <div className="max-w-md">
              <ChangePasswordForm />
            </div>
          )}

          {tab === 'branding' && isAdmin && <BrandingSettingsTab />}

          {tab === 'smtp' && isAdmin && <SmtpSettingsTab />}

          {tab === 'subscription' && (role === 'owner' || role === 'hr') && (
            <SubscriptionSettingsTab />
          )}
        </div>
      </div>
    </div>
  );
}
