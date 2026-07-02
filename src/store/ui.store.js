import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUiStore = create(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      expandedNavSections: {},
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
      toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
      closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
      toggleNavSection: (section) =>
        set((state) => ({
          expandedNavSections: {
            ...state.expandedNavSections,
            [section]: !state.expandedNavSections[section],
          },
        })),
      setNavSectionExpanded: (section, expanded) =>
        set((state) => {
          if (state.expandedNavSections[section] === expanded) return state;
          return {
            expandedNavSections: {
              ...state.expandedNavSections,
              [section]: expanded,
            },
          };
        }),
      isNavSectionExpanded: (section) => !!get().expandedNavSections[section],
    }),
    {
      name: 'hrms-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        expandedNavSections: state.expandedNavSections,
      }),
    }
  )
);
