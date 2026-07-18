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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold">
            H
          </div>
          <p className="text-sm text-slate-500">Loading HRMS…</p>
        </div>
      </div>
    );
  }

  return children;
}
