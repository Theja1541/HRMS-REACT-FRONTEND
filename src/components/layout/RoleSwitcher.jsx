import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Repeat } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { ROLE_LABELS } from '../../constants/routes';
import {
  getPortalHomeRoute,
  needsPortalSelection,
  PORTAL_CONFIG,
} from '../../utils/portalNavigation';
import { cn } from '../../utils/helpers';

function roleLabel(role) {
  return PORTAL_CONFIG[role]?.title || ROLE_LABELS[role] || role;
}

export default function RoleSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const roles = useAuthStore((s) => s.roles);
  const selectedRole = useAuthStore((s) => s.selectedRole);
  const defaultRole = useAuthStore((s) => s.defaultRole);
  const setSelectedRole = useAuthStore((s) => s.setSelectedRole);
  const [open, setOpen] = useState(false);

  const assignedRoles = roles?.length ? roles : [];
  const activeRole = selectedRole || defaultRole || assignedRoles[0];

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (!needsPortalSelection(assignedRoles)) {
    return null;
  }

  const handleSwitch = (role) => {
    if (role === activeRole) {
      setOpen(false);
      return;
    }
    setSelectedRole(role);
    navigate(getPortalHomeRoute(role), { replace: true });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 max-w-[10.5rem] sm:max-w-[12rem] px-2.5 rounded-lg border text-xs font-medium transition-colors',
          open
            ? 'border-brand-300 bg-brand-50 text-brand-800'
            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
        )}
        title="Switch portal"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Repeat size={13} className="shrink-0 text-slate-500" />
        <span className="truncate">{roleLabel(activeRole)}</span>
        <ChevronDown size={13} className={cn('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="absolute right-0 top-10 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
            role="listbox"
            aria-label="Switch portal"
          >
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Switch portal
              </p>
            </div>
            <ul className="py-1">
              {assignedRoles.map((role) => {
                const isActive = role === activeRole;
                const isDefault = role === defaultRole;

                return (
                  <li key={role}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleSwitch(role)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-slate-50 transition-colors',
                        isActive && 'bg-brand-50/60'
                      )}
                    >
                      <span className="mt-0.5 w-4 shrink-0 flex justify-center">
                        {isActive ? <Check size={14} className="text-brand-600" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-slate-800">{roleLabel(role)}</span>
                          {isDefault && (
                            <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                              Default
                            </span>
                          )}
                        </span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                          {ROLE_LABELS[role] || role}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
