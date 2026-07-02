import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      entitlements: null,
      selectedTenantId: null,
      _hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      setEntitlements: (entitlements) => set({ entitlements }),
      setSelectedTenantId: (selectedTenantId) => set({ selectedTenantId }),
      login: ({ accessToken, user, entitlements }) =>
        set({
          accessToken,
          user,
          entitlements: entitlements || null,
          selectedTenantId:
            user?.role === 'super_admin' || user?.type === 'super_admin'
              ? null
              : user?.tenant?.id || user?.tenant_id || null,
        }),
      logout: () => set({ accessToken: null, user: null, entitlements: null, selectedTenantId: null }),
    }),
    {
      name: 'hrms-auth',
      partialize: (s) => ({ user: s.user, entitlements: s.entitlements, selectedTenantId: s.selectedTenantId }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
