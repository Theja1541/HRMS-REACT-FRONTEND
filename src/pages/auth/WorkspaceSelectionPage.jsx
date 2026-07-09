import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  LayoutDashboard,
  Loader2,
} from 'lucide-react';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { ROLE_LABELS } from '../../constants/routes';
import { cn } from '../../utils/helpers';
import { resolveAuthenticatedLanding } from '../../utils/portalNavigation';
import { isTenantSubscriptionBlocked } from '../../utils/subscriptionAccess';
import { isPersonSessionToken } from '../../utils/jwt';
import AuthBrandPanel from '../../components/auth/AuthBrandPanel';

import {
  activateAndHydrateWorkspace,
  getWorkspaceLabel,
} from '../../utils/workspaceSession';

function workspaceMeta(workspace) {
  if (workspace.type === 'platform') {
    return {
      title: getWorkspaceLabel(workspace),
      subtitle: 'Platform workspace',
      description: 'Manage tenants, billing, and platform-wide settings.',
      Icon: LayoutDashboard,
      badge: ROLE_LABELS.super_admin,
    };
  }

  return {
    title: getWorkspaceLabel(workspace),
    subtitle: workspace.slug ? `@${workspace.slug}` : 'Company workspace',
    description: workspace.primaryRoleLabel
      ? `Continue as ${workspace.primaryRoleLabel}`
      : 'Access your company HRMS workspace.',
    Icon: Building2,
    badge: workspace.primaryRoleLabel || ROLE_LABELS[workspace.defaultRole] || workspace.defaultRole,
  };
}

export default function WorkspaceSelectionPage() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const pendingWorkspaces = useAuthStore((s) => s.pendingWorkspaces);
  const login = useAuthStore((s) => s.login);
  const beginPersonSession = useAuthStore((s) => s.beginPersonSession);
  const [error, setError] = useState('');
  const [activatingId, setActivatingId] = useState(null);

  const isPersonSession = !!accessToken && isPersonSessionToken(accessToken);
  const hasPendingWorkspaces = (pendingWorkspaces?.length ?? 0) > 0;

  const {
    data: workspacesRes,
    isLoading,
    isError,
    error: fetchError,
  } = useQuery({
    queryKey: ['auth', 'workspaces'],
    queryFn: authApi.listWorkspaces,
    enabled: isPersonSession,
    retry: 1,
  });

  const workspaces =
    workspacesRes?.data?.length > 0 ? workspacesRes.data : pendingWorkspaces || [];

  useEffect(() => {
    if (!accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    if (!isPersonSessionToken(accessToken)) {
      const state = useAuthStore.getState();
      navigate(
        resolveAuthenticatedLanding({
          roles: state.roles,
          defaultRole: state.defaultRole,
          selectedRole: state.selectedRole,
          userRole: state.user?.role,
          mustChangePassword: state.user?.must_change_password,
        }),
        { replace: true }
      );
      return;
    }

    const state = useAuthStore.getState();
    if (state.user || state.workspace || state.roles?.length) {
      beginPersonSession(accessToken, state.pendingWorkspaces);
    }
  }, [accessToken, navigate, beginPersonSession]);

  const activateMutation = useMutation({
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
    },
    onError: (err) => {
      setError(err.response?.data?.error?.message || 'Could not activate workspace.');
      setActivatingId(null);
    },
  });

  const handleSelect = (workspace) => {
    setError('');
    setActivatingId(workspace.id);
    activateMutation.mutate(workspace.id);
  };

  if (!accessToken || !isPersonSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Redirecting…
      </div>
    );
  }

  const fetchMessage = fetchError?.response?.data?.error?.message;
  const showLoading = isLoading && !hasPendingWorkspaces && !workspaces.length;

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
              Your account can access more than one workspace. Select where you want to work today.
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
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Signed in</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Select a workspace</h1>
            <p className="mt-2 text-sm text-slate-500">
              Platform and company workspaces tied to your account are listed below.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {showLoading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading workspaces…
            </div>
          )}

          {isError && !workspaces.length && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-700">
              {fetchMessage || 'Unable to load workspaces. Please sign in again.'}
            </div>
          )}

          {!showLoading && (!isError || workspaces.length > 0) && (
            <div className="grid gap-3">
              {workspaces.map((workspace) => {
                const { title, subtitle, description, Icon, badge } = workspaceMeta(workspace);
                const isDefault = workspace.id === workspaces.find((ws) => ws.type === 'platform')?.id
                  ? workspace.type === 'platform'
                  : workspace.defaultRole === workspace.roles?.[0];
                const isActivating = activatingId === workspace.id;

                return (
                  <button
                    key={workspace.id}
                    type="button"
                    disabled={!!activatingId}
                    onClick={() => handleSelect(workspace)}
                    className={cn(
                      'group w-full text-left rounded-2xl border bg-white p-4 sm:p-5 transition-all',
                      'hover:border-brand-300 hover:shadow-md hover:shadow-brand-600/5',
                      'focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600',
                      'disabled:cursor-not-allowed disabled:opacity-70',
                      workspace.type === 'platform' ? 'border-brand-200 ring-1 ring-brand-100' : 'border-slate-200'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          'shrink-0 w-11 h-11 rounded-xl flex items-center justify-center',
                          workspace.type === 'platform'
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-700'
                        )}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                          {workspace.type === 'platform' && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                              Platform
                            </span>
                          )}
                          {isDefault && workspace.type !== 'platform' && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs font-medium text-slate-400">{subtitle}</p>
                        <p className="mt-2 text-sm text-slate-500 leading-relaxed">{description}</p>
                        {badge && (
                          <p className="mt-2 text-xs font-medium text-slate-400">
                            Role: {badge}
                          </p>
                        )}
                      </div>
                      {isActivating ? (
                        <Loader2 className="shrink-0 mt-1 h-5 w-5 animate-spin text-brand-600" />
                      ) : (
                        <ArrowRight
                          size={18}
                          className="shrink-0 mt-1 text-slate-300 group-hover:text-brand-600 transition-colors"
                        />
                      )}
                    </div>
                  </button>
                );
              })}

              {!workspaces.length && !showLoading && (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No workspaces are available for this account.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
