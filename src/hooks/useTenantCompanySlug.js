import { useQuery } from '@tanstack/react-query';
import { authApi, tenantApi } from '../api';
import { useAuthStore } from '../store/auth.store';

/**
 * Resolves the current tenant company slug from the server so it stays in sync
 * when Super Admin updates it in Tenants / Organizations.
 */
export function useTenantCompanySlug() {
  const { user, selectedTenantId } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const tenantId = isSuperAdmin ? selectedTenantId : (user?.tenant?.id ?? user?.tenant_id ?? null);

  const query = useQuery({
    queryKey: ['tenant-company-slug', isSuperAdmin ? tenantId : user?.id],
    queryFn: async () => {
      if (isSuperAdmin) {
        if (!tenantId) return '';
        const res = await tenantApi.get(tenantId);
        return res?.data?.tenant?.slug || '';
      }
      const res = await authApi.me();
      return res?.data?.user?.tenant?.slug || '';
    },
    enabled: isSuperAdmin ? Boolean(tenantId) : Boolean(user?.id),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  return {
    companySlug: query.data || '',
    isLoading: query.isLoading,
    isSuperAdmin,
  };
}
