import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Building2,
  ClipboardCheck,
  LayoutDashboard,
  Shield,
  User,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { ROLE_LABELS } from '../../constants/routes';
import { cn } from '../../utils/helpers';
import {
  getPortalHomeRoute,
  needsPortalSelection,
  PORTAL_CONFIG,
} from '../../utils/portalNavigation';
import AuthBrandPanel from '../../components/auth/AuthBrandPanel';

const PORTAL_ICONS = {
  employee: User,
  manager: Users,
  hr: Briefcase,
  owner: Building2,
  pf_team: ClipboardCheck,
  auditor: Shield,
  super_admin: LayoutDashboard,
};

function portalMeta(role) {
  const config = PORTAL_CONFIG[role] || {};
  return {
    title: config.title || ROLE_LABELS[role] || role,
    description: config.description || `Continue as ${ROLE_LABELS[role] || role}.`,
    Icon: PORTAL_ICONS[role] || LayoutDashboard,
  };
}

export default function PortalSelectionPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const defaultRole = useAuthStore((s) => s.defaultRole);
  const setSelectedRole = useAuthStore((s) => s.setSelectedRole);

  const assignedRoles = roles?.length ? roles : user?.role ? [user.role] : [];

  useEffect(() => {
    const list = roles?.length ? roles : user?.role ? [user.role] : [];
    if (!list.length) {
      navigate('/login', { replace: true });
      return;
    }
    if (!needsPortalSelection(list)) {
      const role = list[0];
      setSelectedRole(role);
      navigate(getPortalHomeRoute(role), { replace: true });
    }
  }, [roles, user?.role, navigate, setSelectedRole]);

  if (!needsPortalSelection(assignedRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Redirecting…
      </div>
    );
  }

  const handleSelect = (role) => {
    setSelectedRole(role);
    navigate(getPortalHomeRoute(role), { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="relative hidden lg:flex lg:w-[42%] overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-slate-900 to-slate-950" />
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          <AuthBrandPanel variant="dark" />
          <div className="max-w-md">
            <h2 className="text-3xl font-bold leading-tight">Choose your workspace</h2>
            <p className="mt-4 text-md text-white/70 leading-relaxed">
              Your account has access to multiple portals. Pick how you want to work in HRMS today.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-xl">
          <div className="mb-8 lg:hidden">
            <AuthBrandPanel />
          </div>

          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Welcome back</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              {user?.name || 'Select a portal'}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {user?.tenant?.name ? `${user.tenant.name} · ` : ''}
              Choose a portal to continue.
              {defaultRole ? ` Your default role is ${ROLE_LABELS[defaultRole] || defaultRole}.` : ''}
            </p>
          </div>

          <div className="grid gap-3">
            {assignedRoles.map((role) => {
              const { title, description, Icon } = portalMeta(role);
              const isDefault = role === defaultRole;

              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleSelect(role)}
                  className={cn(
                    'group w-full text-left rounded-2xl border bg-white p-4 sm:p-5 transition-all',
                    'hover:border-brand-300 hover:shadow-md hover:shadow-brand-600/5',
                    'focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600',
                    isDefault ? 'border-brand-200 ring-1 ring-brand-100' : 'border-slate-200'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'shrink-0 w-11 h-11 rounded-xl flex items-center justify-center',
                        isDefault ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-700'
                      )}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                        {isDefault && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500 leading-relaxed">{description}</p>
                      <p className="mt-2 text-xs font-medium text-slate-400">
                        Role: {ROLE_LABELS[role] || role}
                      </p>
                    </div>
                    <ArrowRight
                      size={18}
                      className="shrink-0 mt-1 text-slate-300 group-hover:text-brand-600 transition-colors"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
