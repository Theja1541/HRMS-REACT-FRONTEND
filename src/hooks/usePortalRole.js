import { useAuthStore } from '../store/auth.store';
import { resolvePortalRole } from '../utils/portalContext';

/**
 * Active portal role for UI RBAC — same resolution as RouteAccessGuard and Sidebar.
 */
export function usePortalRole() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const workspace = useAuthStore((s) => s.workspace);
  const roles = useAuthStore((s) => s.roles);
  const selectedRole = useAuthStore((s) => s.selectedRole);

  return resolvePortalRole({
    accessToken,
    workspace,
    user,
    roles,
    selectedRole,
  });
}
