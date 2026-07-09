import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, ChevronDown, LayoutDashboard, Loader2, Repeat } from 'lucide-react';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { cn, getInitials } from '../../utils/helpers';
import {
  activateAndHydrateWorkspace,
  getWorkspaceLabel,
  getWorkspaceSublabel,
  resolveActiveWorkspaceId,
} from '../../utils/workspaceSession';
import { resolveAuthenticatedLanding } from '../../utils/portalNavigation';
import { isTenantSubscriptionBlocked } from '../../utils/subscriptionAccess';
import { isPersonSessionToken } from '../../utils/jwt';

function workspaceIcon(workspace) {
  if (workspace?.type === 'platform') {
    return { Icon: LayoutDashboard, className: 'bg-emerald-600' };
  }
  return { Icon: Building2, className: 'bg-brand-600' };
}

export default function WorkspaceSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const workspace = useAuthStore((s) => s.workspace);
  const login = useAuthStore((s) => s.login);
  const [open, setOpen] = useState(false);
  const isSuperAdminPortal = workspace?.type === 'platform';

  const canFetch = !!user && !!accessToken && !isPersonSessionToken(accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'workspaces'],
    queryFn: authApi.listWorkspaces,
    enabled: canFetch,
    staleTime: 60_000,
  });

  const workspaces = data?.data || [];
  const activeWorkspaceId = resolveActiveWorkspaceId(workspace, user, accessToken);
  const activeLabel =
    getWorkspaceLabel(workspaces.find((item) => item.id === activeWorkspaceId) || workspace);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const switchMutation = useMutation({
    mutationFn: (workspaceId) => activateAndHydrateWorkspace(workspaceId),
    onSuccess: async (session) => {
      const roles = session.roles?.length
        ? session.roles
        : [session.user?.role].filter(Boolean);

      login({
        accessToken: session.accessToken,
        workspace: session.workspace,
        user: session.user,
        entitlements: session.entitlements,
        roles,
        defaultRole: session.defaultRole,
        selectedRole: session.defaultRole,
      });

      await queryClient.invalidateQueries();

      if (isTenantSubscriptionBlocked(session.user, session.entitlements)) {
        navigate('/subscription-expired', { replace: true });
        return;
      }

      if (session.user?.must_change_password) {
        navigate('/me/change-password', { replace: true });
        return;
      }

      navigate(
        resolveAuthenticatedLanding({
          roles,
          defaultRole: session.defaultRole,
          selectedRole: session.defaultRole,
          userRole: session.user?.role,
          forcePortalSelection: roles.length > 1,
        }),
        { replace: true }
      );

      setOpen(false);
    },
  });

  if (isSuperAdminPortal || !canFetch || isLoading || workspaces.length <= 1) {
    return null;
  }

  const handleSwitch = (item) => {
    if (item.id === activeWorkspaceId || switchMutation.isPending) {
      setOpen(false);
      return;
    }
    switchMutation.mutate(item.id);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={switchMutation.isPending}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 max-w-[11rem] sm:max-w-[13rem] px-2.5 rounded-lg border text-xs font-medium transition-colors',
          open
            ? 'border-brand-300 bg-brand-50 text-brand-800'
            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
          switchMutation.isPending && 'opacity-70 cursor-wait'
        )}
        title="Switch workspace"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {switchMutation.isPending ? (
          <Loader2 size={13} className="shrink-0 animate-spin text-slate-500" />
        ) : (
          <Repeat size={13} className="shrink-0 text-slate-500" />
        )}
        <span className="truncate">{activeLabel}</span>
        <ChevronDown
          size={13}
          className={cn('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="absolute right-0 top-10 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
            role="listbox"
            aria-label="Switch workspace"
          >
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Switch workspace
              </p>
            </div>
            <ul className="py-1 max-h-80 overflow-y-auto">
              {workspaces.map((item) => {
                const isActive = item.id === activeWorkspaceId;
                const { Icon, className } = workspaceIcon(item);

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      disabled={switchMutation.isPending}
                      onClick={() => handleSwitch(item)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-slate-50 transition-colors disabled:opacity-60',
                        isActive && 'bg-brand-50/60'
                      )}
                    >
                      <span className="mt-0.5 w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-white">
                        <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center', className)}>
                          {item.type === 'platform' ? (
                            <Icon size={14} />
                          ) : (
                            <span className="text-[10px] font-semibold">{getInitials(item.label || 'Co')}</span>
                          )}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-slate-800 truncate">
                            {getWorkspaceLabel(item)}
                          </span>
                          {item.type === 'platform' && (
                            <span className="text-[9px] font-semibold uppercase tracking-wide text-emerald-600">
                              Platform
                            </span>
                          )}
                        </span>
                        <span className="block text-[11px] text-slate-500 mt-0.5 truncate">
                          {getWorkspaceSublabel(item)}
                        </span>
                      </span>
                      {isActive && <Check size={14} className="text-brand-600 shrink-0 mt-1" />}
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
