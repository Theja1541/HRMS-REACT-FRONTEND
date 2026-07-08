import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Icons from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';
import { authApi, leaveApi, hrApi, portalApi, brandingApi } from '../../api';
import { NAV_ITEMS, getMostSpecificNavPath, isNavItemVisible, isNavPathActive } from '../../constants/routes';
import { Avatar, RoleBadge } from '../shared/StatusBadge';
import { cn, getInitials, resolveAssetUrl } from '../../utils/helpers';
// import TenantSwitcher from './TenantSwitcher'; // Super Admin org switcher hidden for now

const DESKTOP_MEDIA = '(min-width: 1024px)';
const EMPTY_MODULE_CODES = [];

function NavItemLink({ item, isIconOnly, showLabels, count, onNavigate, className, isActive }) {
  const Icon = Icons[item.icon] || Icons.Circle;

  return (
    <NavLink
      to={item.path}
      end={item.path === '/dashboard' || item.path === '/me'}
      title={isIconOnly ? item.label : undefined}
      onClick={onNavigate}
      className={() =>
        cn(
          'flex items-center text-xs font-normal relative transition-colors',
          isIconOnly ? 'justify-center px-2 py-2.5 mx-2 rounded-lg' : 'gap-2.5 px-4 py-2',
          isActive
            ? 'bg-blue-900 text-white before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-sky-400'
            : 'text-slate-400 hover:bg-sidebar-hover hover:text-slate-200',
          isIconOnly && isActive && 'before:left-1 before:rounded-full',
          className
        )
      }
    >
      <span className="relative shrink-0">
        <Icon size={15} />
        {isIconOnly && count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </span>
      {showLabels && <span className="flex-1 truncate">{item.label}</span>}
      {showLabels && count > 0 && (
        <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
          {count}
        </span>
      )}
      {isIconOnly && <span className="sr-only">{item.label}</span>}
    </NavLink>
  );
}

function CollapsedSectionFlyout({ visibleItems, sectionLabel, SectionIcon, badgeCount, onNavigate }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const sectionBadgeTotal = visibleItems.reduce((sum, item) => sum + badgeCount(item), 0);
  const activeItemPath = getMostSpecificNavPath(
    location.pathname,
    visibleItems.map((item) => item.path)
  );

  return (
    <div ref={rootRef} className="relative mx-2 mb-1">
      <button
        type="button"
        title={sectionLabel}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'w-full flex items-center justify-center px-2 py-2.5 rounded-lg text-slate-400 hover:bg-sidebar-hover hover:text-slate-200 transition-colors relative',
          open && 'bg-sidebar-hover text-slate-200'
        )}
      >
        <SectionIcon size={15} />
        {sectionBadgeTotal > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
            {sectionBadgeTotal > 9 ? '9+' : sectionBadgeTotal}
          </span>
        )}
        <span className="sr-only">{sectionLabel}</span>
      </button>

      {open && (
        <div className="absolute left-full top-0 ml-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-[110] py-2 max-h-[70vh] overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-2 border-b border-slate-800">
            {sectionLabel}
          </p>
          {visibleItems.map((item) => {
            const count = badgeCount(item);
            return (
              <NavItemLink
                key={item.path}
                item={item}
                isIconOnly={false}
                showLabels
                count={count}
                isActive={activeItemPath === item.path}
                onNavigate={() => {
                  setOpen(false);
                  onNavigate?.(item);
                }}
                className="px-3"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { user, selectedTenantId, setSelectedTenantId, entitlements } = useAuthStore();
  const {
    sidebarCollapsed,
    toggleSidebarCollapsed,
    mobileSidebarOpen,
    closeMobileSidebar,
    expandedNavSections,
    toggleNavSection,
    setNavSectionExpanded,
  } = useUiStore();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role || user?.system_role;
  const moduleCodes = entitlements?.module_codes ?? EMPTY_MODULE_CODES;
  const moduleCodesKey = useMemo(() => moduleCodes.join(','), [moduleCodes]);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_MEDIA).matches);

  const { data: leaveData } = useQuery({
    queryKey: ['leave-badge', role],
    queryFn: () => leaveApi.listRequests({ status: 'pending', limit: 50 }),
    enabled: !!role && role !== 'super_admin',
    staleTime: 60_000,
  });
  const pendingLeaves = leaveData?.pagination?.total ?? leaveData?.data?.requests?.length ?? 0;

  const canApproveReimbursements = !!role && ['super_admin', 'owner', 'hr'].includes(role);
  const tenantReady = role !== 'super_admin' || !!selectedTenantId;
  const { data: reimbData } = useQuery({
    queryKey: ['reimbursement-badge', role, selectedTenantId],
    queryFn: hrApi.listPendingReimbursements,
    enabled: canApproveReimbursements && tenantReady,
    staleTime: 60_000,
  });
  const pendingReimbursements = reimbData?.data?.claims?.length ?? 0;

  const canSeePolicies = !!role && ['super_admin', 'owner', 'hr', 'manager', 'employee'].includes(role);
  const { data: pendingPolicyData } = useQuery({
    queryKey: ['pending-policies', role, selectedTenantId],
    queryFn: portalApi.listPendingPolicies,
    enabled: canSeePolicies && tenantReady,
    staleTime: 60_000,
  });
  const pendingPolicies = pendingPolicyData?.data?.policies?.length ?? 0;

  const navBadges = {
    pendingLeaves: pendingLeaves > 0 ? pendingLeaves : 0,
    pendingReimbursements: pendingReimbursements > 0 ? pendingReimbursements : 0,
    pendingPolicies: pendingPolicies > 0 ? pendingPolicies : 0,
  };

  const isSuperAdmin = role === 'super_admin';

  const handleNavItemNavigate = (item) => {
    if (isSuperAdmin && item?.path === '/dashboard') {
      setSelectedTenantId(null);
    }
    closeMobileSidebar();
  };

  // Super Admin portal: only Admin module visible for now (other modules hidden)
  const navGroups = useMemo(
    () => (isSuperAdmin ? NAV_ITEMS.filter((group) => group.section === 'Admin') : NAV_ITEMS),
    [isSuperAdmin]
  );

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_MEDIA);

    const handleChange = (event) => {
      setIsDesktop(event.matches);
      if (event.matches) closeMobileSidebar();
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [closeMobileSidebar]);

  useEffect(() => {
    if (!mobileSidebarOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') closeMobileSidebar();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileSidebarOpen, closeMobileSidebar]);

  useEffect(() => {
    closeMobileSidebar();
  }, [location.pathname, closeMobileSidebar]);

  useEffect(() => {
    navGroups.forEach((group) => {
      if (group.collapsible === false) return;
      const visibleItems = group.items.filter((item) => isNavItemVisible(item, role, moduleCodes));
      const isActive = visibleItems.some((item) => isNavPathActive(location.pathname, item.path));
      if (isActive && !expandedNavSections[group.section]) {
        setNavSectionExpanded(group.section, true);
      }
    });
  }, [location.pathname, role, moduleCodesKey, expandedNavSections, setNavSectionExpanded, navGroups]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      useAuthStore.getState().logout();
      navigate('/login');
    }
  };

  const tenantName =
    user?.tenant?.name ||
    user?.Tenant?.name ||
    (role === 'super_admin' ? 'All Organizations' : 'HRMS');

  const { data: platformBrandingData } = useQuery({
    queryKey: ['platform-branding'],
    queryFn: brandingApi.getPlatformBranding,
    enabled: isSuperAdmin,
    staleTime: 5 * 60_000,
  });

  const platformBranding = platformBrandingData?.data?.branding;
  const platformLogo = resolveAssetUrl(platformBranding?.logo_url || '');
  const platformName = platformBranding?.platform_name || 'HRMS';
  const tenantLogo = resolveAssetUrl(user?.tenant?.logo_url || '');
  const brandLogo = isSuperAdmin ? platformLogo : tenantLogo;
  const brandTitle = isSuperAdmin ? platformName : tenantName;

  const showLabels = isDesktop ? !sidebarCollapsed : true;
  const isIconOnly = isDesktop && sidebarCollapsed;
  const badgeCount = (item) => item.badge || (item.badgeKey && navBadges[item.badgeKey] > 0 ? navBadges[item.badgeKey] : 0);

  return (
    <>
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-[90] bg-slate-900/50 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <aside
        className={cn(
          'bg-sidebar-bg flex flex-col h-screen overflow-y-auto z-[100] transition-[width,transform] duration-300 ease-in-out',
          'fixed inset-y-0 left-0 w-[240px]',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          sidebarCollapsed ? 'lg:w-16 lg:min-w-[64px]' : 'lg:w-[240px] lg:min-w-[240px]'
        )}
        aria-label="Main navigation"
      >
        <div className={cn('border-b border-slate-800', isIconOnly ? 'p-3' : 'p-4')}>
          <div
            className={cn(
              'flex mb-3',
              isIconOnly ? 'flex-col items-center gap-2' : 'items-center gap-2'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={brandTitle}
                  className="w-8 h-8 rounded-lg object-contain bg-white/10 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {isSuperAdmin ? 'H' : getInitials(tenantName)}
                </div>
              )}
              <span
                className={cn(
                  'text-white font-semibold text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out',
                  showLabels ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'
                )}
              >
                {brandTitle}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className={cn(
                'hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors duration-200 shrink-0',
                !isIconOnly && 'ml-auto'
              )}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!sidebarCollapsed}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>

            <button
              type="button"
              onClick={closeMobileSidebar}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:hidden shrink-0',
                !isIconOnly && 'ml-auto'
              )}
              aria-label="Close sidebar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Super Admin: organizations dropdown hidden for now
          {isSuperAdmin ? (
            <TenantSwitcher showLabels={showLabels} isIconOnly={isIconOnly} />
          ) : */}
          {!isSuperAdmin && !isIconOnly && (
            <div className="w-full flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2">
              {tenantLogo ? (
                <img src={tenantLogo} alt="" className="w-5 h-5 rounded object-contain shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-brand-600 text-[9px] font-semibold text-white flex items-center justify-center shrink-0">
                  {getInitials(tenantName)}
                </div>
              )}
              <span className="text-slate-300 text-xs font-medium flex-1 text-left truncate">{tenantName}</span>
            </div>
          )}
          {/* } */}
        </div>

        <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => isNavItemVisible(item, role, moduleCodes));
            if (!visibleItems.length) return null;

            const sectionLabel =
              role === 'auditor' && group.section === 'Finance' ? 'Day Book' : group.section;
            const SectionIcon = Icons[group.icon] || Icons[group.items[0]?.icon] || Icons.Circle;
            const isCollapsible = group.collapsible !== false;
            const isExpanded = expandedNavSections[group.section] ?? false;
            const activeItemPath = getMostSpecificNavPath(
              location.pathname,
              visibleItems.map((item) => item.path)
            );
            const sectionActive = Boolean(activeItemPath);
            const sectionBadgeTotal = visibleItems.reduce((sum, item) => sum + badgeCount(item), 0);

            if (!isCollapsible) {
              return (
                <div key={group.section} className="mb-1">
                  {visibleItems.map((item) => (
                    <NavItemLink
                      key={item.path}
                      item={item}
                      isIconOnly={isIconOnly}
                      showLabels={showLabels}
                      count={badgeCount(item)}
                      isActive={activeItemPath === item.path}
                      onNavigate={() => handleNavItemNavigate(item)}
                    />
                  ))}
                </div>
              );
            }

            if (isIconOnly) {
              return (
                <CollapsedSectionFlyout
                  key={group.section}
                  visibleItems={visibleItems}
                  sectionLabel={sectionLabel}
                  SectionIcon={SectionIcon}
                  badgeCount={badgeCount}
                  onNavigate={handleNavItemNavigate}
                />
              );
            }

            return (
              <div key={group.section} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleNavSection(group.section)}
                  aria-expanded={isExpanded}
                  className={cn(
                    'w-full flex items-center gap-2 px-4 py-2 text-left transition-colors',
                    sectionActive
                      ? 'text-slate-200'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-sidebar-hover/50'
                  )}
                >
                  <SectionIcon size={14} className="shrink-0" />
                  <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider truncate">
                    {sectionLabel}
                  </span>
                  {sectionBadgeTotal > 0 && !isExpanded && (
                    <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                      {sectionBadgeTotal > 9 ? '9+' : sectionBadgeTotal}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown size={14} className="shrink-0 text-slate-500" />
                  ) : (
                    <ChevronRight size={14} className="shrink-0 text-slate-500" />
                  )}
                </button>

                {isExpanded && (
                  <div className="pb-1">
                    {visibleItems.map((item) => (
                      <NavItemLink
                        key={item.path}
                        item={item}
                        isIconOnly={false}
                        showLabels
                        count={badgeCount(item)}
                        isActive={activeItemPath === item.path}
                        onNavigate={() => handleNavItemNavigate(item)}
                        className="pl-8"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className={cn('border-t border-slate-800', isIconOnly ? 'p-2' : 'p-4')}>
          <div className={cn('flex items-center', isIconOnly ? 'flex-col gap-2' : 'gap-2')}>
            <Avatar name={user?.name || user?.first_name || 'User'} size="md" />
            {showLabels && (
              <div className="min-w-0 flex-1">
                <p className="text-slate-300 text-xs font-medium truncate">
                  {user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()}
                </p>
                <div className="mt-1">
                  <RoleBadge role={role} />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-colors shrink-0"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
