import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api';
import { isPersonSessionToken } from '../../utils/jwt';
import {
  promoteToWorkspaceAccessToken,
  workspaceFromAccessToken,
} from '../../utils/workspaceSession';

function normalizeUser(raw) {
  if (!raw) return null;
  return {
    ...raw,
    name: raw.name || `${raw.first_name || ''} ${raw.last_name || ''}`.trim(),
    role: raw.role || raw.system_role,
    tenant: raw.tenant || raw.Tenant,
    must_change_password: !!raw.must_change_password,
  };
}

function isPublicUnauthedPath(pathname = window.location.pathname) {
  return (
    pathname.startsWith('/careers/') ||
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/mfa-verify'
  );
}

export default function AuthBootstrap({ children }) {
  const [ready, setReady] = useState(() => isPublicUnauthedPath());
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const beginPersonSession = useAuthStore((s) => s.beginPersonSession);
  const login = useAuthStore((s) => s.login);
  const setHasHydrated = useAuthStore((s) => s.setHasHydrated);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHasHydrated(true);
    }
    return useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
  }, [setHasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return undefined;

    let cancelled = false;

    async function hydrateSession() {
      try {
        let token = useAuthStore.getState().accessToken;

        if (!token) {
          // Public pages should not wait on refresh cookie round-trips.
          if (isPublicUnauthedPath()) {
            return;
          }
          const res = await authApi.refresh();
          token = res?.data?.accessToken;
        }

        if (!token) {
          if (!cancelled) useAuthStore.getState().logout();
          return;
        }

        if (isPersonSessionToken(token)) {
          if (!cancelled) {
            const { pendingWorkspaces } = useAuthStore.getState();
            beginPersonSession(token, pendingWorkspaces);
          }
          return;
        }

        token = await promoteToWorkspaceAccessToken(token);

        const me = await authApi.me(token);
        if (!cancelled) {
          const state = useAuthStore.getState();
          const tokenWorkspace = workspaceFromAccessToken(token);
          const workspace = tokenWorkspace
            ? { ...(state.workspace || {}), ...tokenWorkspace }
            : state.workspace;
          const roles = me.data.roles?.length ? me.data.roles : workspace?.roles;
          const defaultRole = me.data.defaultRole || workspace?.defaultRole;
          const selectedRole =
            state.selectedRole && roles?.includes(state.selectedRole)
              ? state.selectedRole
              : defaultRole;

          login({
            accessToken: token,
            workspace,
            user: normalizeUser(me.data.user),
            entitlements: me.data.entitlements || null,
            roles,
            defaultRole,
            selectedRole,
          });
        }
      } catch {
        if (!cancelled) {
          useAuthStore.getState().logout();
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    hydrateSession();
    return () => {
      cancelled = true;
    };
  }, [hasHydrated, beginPersonSession, login]);

  if (!hasHydrated || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="flex flex-col items-center max-w-sm w-full p-8 relative">
          <div className="absolute inset-0 bg-brand-500/5 dark:bg-brand-500/10 blur-3xl rounded-full" />
          
          <div className="relative flex flex-col items-center gap-6 z-10">
            <div className="relative flex items-center justify-center w-16 h-16">
              <svg 
                className="absolute inset-0 w-full h-full text-slate-200 dark:text-slate-800 animate-spin" 
                style={{ animationDuration: '2s' }}
                viewBox="0 0 64 64" fill="none"
              >
                <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="3" />
                <path d="M32 2 A30 30 0 0 1 62 32" className="stroke-brand-600 dark:stroke-brand-500" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <div className="w-10 h-10 bg-brand-600 dark:bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
                H
              </div>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                HRMS
              </h1>
              <div className="flex items-center">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading workspace</span>
                <span className="flex gap-[3px] ml-1.5 items-center justify-center mt-1">
                  <span className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                  <span className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
