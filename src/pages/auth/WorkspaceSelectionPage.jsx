import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  LayoutDashboard,
  Loader2,
  ShieldCheck,
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
    }
  }, [accessToken, navigate]);

  const activateMutation = useMutation({
    mutationFn: (workspaceId) => activateAndHydrateWorkspace(workspaceId),
    onSuccess: async (session) => {
      setActivatingId(null);
      if (session.requiresMfa) {
        sessionStorage.setItem('mfa_temp_token', session.tempToken);
        navigate('/mfa-verify', { replace: true });
        return;
      }

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
      console.error('[WorkspaceSelection] activate error:', err.response?.data || err.message);
      setError(err.response?.data?.error?.message || 'Could not activate workspace.');
      setActivatingId(null);
    },
  });

  const handleSelect = (workspace) => {
    setError('');
    setActivatingId(workspace.id);
    activateMutation.mutate(workspace.id);
  };

  const handleBack = async () => {
    try {
      await authApi.logout();
    } catch {
      // Continue to local logout even if the cookie/session is already gone.
    } finally {
      useAuthStore.getState().logout();
      sessionStorage.removeItem('mfa_temp_token');
      navigate('/login', { replace: true });
    }
  };

  if (!accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Redirecting...
      </div>
    );
  }

  const fetchMessage = fetchError?.response?.data?.error?.message;
  const showLoading = isLoading && !hasPendingWorkspaces && !workspaces.length;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="relative hidden lg:flex lg:w-[43%] overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-slate-900 to-slate-950" />
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div className="relative z-10 flex min-h-screen w-full flex-col justify-between p-12 xl:p-16 text-white">
          <AuthBrandPanel variant="dark" size="large" />

          <div className="max-w-lg">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure workspace access
            </div>
            <h2 className="text-4xl font-bold leading-tight tracking-normal">Choose your workspace</h2>
            <p className="mt-5 text-base text-white/75 leading-7">
              Pick the portal you want to enter. Each workspace keeps its users, settings, and access rules separate.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-white/75">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-sky-300" />
              Platform and company access in one account
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-sky-300" />
              Role based entry for every workspace
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-2xl">
          <div className="mb-8 lg:hidden">
            <AuthBrandPanel variant="light" />
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <button
              type="button"
              onClick={handleBack}
              disabled={!!activatingId}
              className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </button>

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Signed in</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-950">Select a workspace</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Choose where you want to continue. Your permissions and menu will adjust automatically.
                </p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified
              </div>
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
                Loading workspaces...
              </div>
            )}

            {isError && !workspaces.length && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-700">
                {fetchMessage || 'Unable to load workspaces. Please sign in again.'}
              </div>
            )}

            {!showLoading && (!isError || workspaces.length > 0) && (
              <div className="grid gap-4">
                {workspaces.map((workspace) => {
                  const { title, subtitle, description, Icon, badge } = workspaceMeta(workspace);
                  const platformWorkspace = workspaces.find((ws) => ws.type === 'platform');
                  const isDefault = workspace.id === platformWorkspace?.id
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
                        'group w-full text-left rounded-xl border p-4 transition-all sm:p-5',
                        'hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-600/10',
                        'focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600',
                        'disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0',
                        workspace.type === 'platform'
                          ? 'border-brand-200 bg-brand-50/60 ring-1 ring-brand-100'
                          : 'border-slate-200 bg-white'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'shrink-0 h-14 w-14 rounded-xl flex items-center justify-center transition-colors',
                            workspace.type === 'platform'
                              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-700'
                          )}
                        >
                          <Icon size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base font-bold text-slate-950">{title}</h2>
                            {workspace.type === 'platform' && (
                              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-100">
                                Platform
                              </span>
                            )}
                            {isDefault && workspace.type !== 'platform' && (
                              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-100">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-400">{subtitle}</p>
                          <p className="mt-2 text-sm text-slate-600 leading-6">{description}</p>
                          {badge && (
                            <p className="mt-2 text-xs font-medium text-slate-400">
                              Role: <span className="text-slate-600">{badge}</span>
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {isActivating ? (
                            <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                          ) : (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                              <ArrowRight size={18} />
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {!workspaces.length && !showLoading && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    No workspaces are available for this account.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
