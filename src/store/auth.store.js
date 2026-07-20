import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Normalize multi-role fields while keeping user.role for legacy callers. */
export function normalizeRoleState({
  user,
  roles,
  defaultRole,
  selectedRole,
  workspace = null,
} = {}) {
  const legacyRole = user?.role || user?.system_role || null;
  let resolvedDefault = defaultRole || legacyRole || 'employee';
  let resolvedRoles =
    Array.isArray(roles) && roles.length > 0
      ? roles
      : legacyRole
        ? [legacyRole]
        : [];

  if (workspace?.type === 'platform') {
    resolvedDefault = 'super_admin';
    resolvedRoles = ['super_admin'];
  } else if (workspace?.type === 'company') {
    resolvedRoles = resolvedRoles.filter((role) => role !== 'super_admin');
    if (workspace.defaultRole) {
      resolvedDefault = workspace.defaultRole;
    }
    if (!resolvedRoles.length) {
      resolvedRoles = workspace.roles?.length ? workspace.roles : [resolvedDefault];
    }
    if (legacyRole === 'super_admin' && resolvedDefault) {
      resolvedRoles = resolvedRoles.length ? resolvedRoles : [resolvedDefault];
    }
  }

  const resolvedSelected =
    selectedRole && resolvedRoles.includes(selectedRole)
      ? selectedRole
      : resolvedDefault;

  return {
    roles: resolvedRoles,
    defaultRole: resolvedDefault,
    selectedRole: resolvedSelected,
    user: user
      ? {
          ...user,
          role:
            workspace?.type === 'platform'
              ? 'super_admin'
              : legacyRole === 'super_admin'
                ? resolvedDefault
                : legacyRole || resolvedDefault,
          ...(workspace?.type === 'platform'
            ? { type: 'super_admin' }
            : user.type === 'super_admin'
              ? { type: 'employee' }
              : {}),
        }
      : null,
  };
}

function reconcilePersistedSession(state) {
  if (!state?.user && !state?.workspace) return;

  const roleState = normalizeRoleState({
    user: state.user,
    roles: state.roles,
    defaultRole: state.defaultRole,
    selectedRole: state.selectedRole,
    workspace: state.workspace,
  });

  state.roles = roleState.roles;
  state.defaultRole = roleState.defaultRole;
  state.selectedRole = roleState.selectedRole;
  state.user = roleState.user;

  if (state.workspace?.type === 'platform') {
    state.selectedTenantId = null;
  } else if (state.workspace?.type === 'company') {
    state.selectedTenantId = state.workspace.tenantId || state.selectedTenantId || null;
  }
}

export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      workspace: null,
      entitlements: null,
      roles: [],
      defaultRole: null,
      selectedRole: null,
      selectedTenantId: null,
      pendingWorkspaces: null,
      _hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setWorkspace: (workspace) => set({ workspace }),
      setUser: (user) =>
        set((state) => {
          const sameUser =
            user &&
            state.user &&
            String(state.user.id) === String(user.id) &&
            (state.user.type || 'employee') === (user.type || 'employee');
          const roleState = normalizeRoleState({
            user,
            roles: sameUser ? state.roles : Array.isArray(user?.roles) ? user.roles : undefined,
            defaultRole: sameUser ? state.defaultRole : user?.defaultRole,
            selectedRole: sameUser ? state.selectedRole : undefined,
            workspace: state.workspace,
          });
          return {
            user: roleState.user,
            roles: roleState.roles,
            defaultRole: roleState.defaultRole,
            selectedRole: roleState.selectedRole,
          };
        }),
      setEntitlements: (entitlements) => set({ entitlements }),
      setSelectedTenantId: (selectedTenantId) => set({ selectedTenantId }),
      setPendingWorkspaces: (pendingWorkspaces) => set({ pendingWorkspaces }),
      /** Person logged in but workspace not chosen yet — wipe stale portal context. */
      beginPersonSession: (accessToken, pendingWorkspaces = null) =>
        set({
          accessToken,
          user: null,
          workspace: null,
          entitlements: null,
          roles: [],
          defaultRole: null,
          selectedRole: null,
          selectedTenantId: null,
          pendingWorkspaces,
        }),
      setSelectedRole: (selectedRole) =>
        set((state) => {
          if (!selectedRole || !state.roles.includes(selectedRole)) {
            return state;
          }
          return { selectedRole };
        }),
      login: ({ accessToken, user, entitlements, roles, defaultRole, selectedRole, workspace = null }) => {
        const roleState = normalizeRoleState({ user, roles, defaultRole, selectedRole, workspace });
        const isPlatformWorkspace = workspace?.type === 'platform';
        set({
          accessToken,
          workspace: workspace || null,
          user: roleState.user,
          roles: roleState.roles,
          defaultRole: roleState.defaultRole,
          selectedRole: roleState.selectedRole,
          entitlements: entitlements || null,
          pendingWorkspaces: null,
          selectedTenantId: isPlatformWorkspace
            ? null
            : workspace?.tenantId || user?.tenant?.id || user?.tenant_id || null,
        });
      },
      logout: () =>
        set({
          accessToken: null,
          user: null,
          workspace: null,
          entitlements: null,
          roles: [],
          defaultRole: null,
          selectedRole: null,
          selectedTenantId: null,
          pendingWorkspaces: null,
        }),
    }),
    {
      name: 'hrms-auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        user: s.user,
        workspace: s.workspace,
        entitlements: s.entitlements,
        roles: s.roles,
        defaultRole: s.defaultRole,
        selectedRole: s.selectedRole,
        selectedTenantId: s.selectedTenantId,
      }),
      onRehydrateStorage: () => (state) => {
        reconcilePersistedSession(state);
        state?.setHasHydrated(true);
      },
    }
  )
);
