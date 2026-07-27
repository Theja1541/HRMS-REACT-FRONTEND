import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Icons from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';
import { leaveApi, hrApi, portalApi, brandingApi } from '../../api';
import { NAV_ITEMS, getMostSpecificNavPath, isNavItemVisible, isNavPathActive } from '../../constants/routes';
import { cn, getInitials, resolveAssetUrl } from '../../utils/helpers';
import { isPlatformPortal, resolvePortalRole } from '../../utils/portalContext';
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
          'group/nav flex items-center text-xs font-medium relative transition-all duration-200',
          isIconOnly ? 'justify-center mx-2 px-2 py-2.5 rounded-xl' : 'gap-2.5 mx-2 px-3 py-2 rounded-xl',
          isActive
            ? 'bg-gradient-to-r from-brand-600/90 to-sky-600/80 text-white shadow-md shadow-brand-600/20'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
          className
        )
      }
    >
      <span
        className={cn(
          'relative shrink-0 flex items-center justify-center rounded-lg transition-colors',
          isIconOnly ? 'w-8 h-8' : 'w-7 h-7',
          isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover/nav:text-sky-300'
        )}
      >
        <Icon size={15} strokeWidth={isActive ? 2.25 : 2} />
        {isIconOnly && count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-0.5 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-950">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </span>
      {showLabels && <span className="flex-1 truncate tracking-tight">{item.label}</span>}
      {showLabels && count > 0 && (
        <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 shadow-sm shadow-rose-500/30">
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
  const sectionActive = Boolean(activeItemPath);

  return (
    <div ref={rootRef} className="relative mx-2 mb-1">
      <button
        type="button"
        title={sectionLabel}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'w-full flex items-center justify-center px-2 py-2.5 rounded-xl transition-all duration-200 relative',
          open || sectionActive
            ? 'bg-white/10 text-white'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        )}
      >
        <span
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg',
            open || sectionActive ? 'bg-brand-600/40 text-sky-200' : ''
          )}
        >
          <SectionIcon size={15} />
        </span>
        {sectionBadgeTotal > 0 && (
          <span className="absolute top-1 right-1 min-w-[15px] h-3.5 px-0.5 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-950">
            {sectionBadgeTotal > 9 ? '9+' : sectionBadgeTotal}
          </span>
        )}
        <span className="sr-only">{sectionLabel}</span>
      </button>

      {open && (
        <div className="absolute left-full top-0 ml-2 w-56 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-md shadow-2xl shadow-black/40 z-[110] py-2 max-h-[70vh] overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-300/80 px-3.5 py-2 border-b border-white/5">
            {sectionLabel}
          </p>
          <div className="py-1 space-y-0.5">
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
                  className="mx-1.5"
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { user, workspace, roles, selectedRole, selectedTenantId, setSelectedTenantId, entitlements, accessToken } = useAuthStore();
  const {
    sidebarCollapsed,
    toggleSidebarCollapsed,
    mobileSidebarOpen,
    closeMobileSidebar,
    expandedNavSections,
    toggleNavSection,
    setNavSectionExpanded,
  } = useUiStore();
  const location = useLocation();
  const role = resolvePortalRole({ accessToken, workspace, user, roles, selectedRole });
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

  const isSuperAdmin = isPlatformPortal(accessToken, workspace);

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
    // Managers / employees: keep self-service + people sections open by default
    if (['manager', 'employee'].includes(role)) {
      ['My Work', 'People', 'Projects', 'Platform', 'Overview'].forEach((section) => {
        if (expandedNavSections[section] === undefined) {
          setNavSectionExpanded(section, true);
        }
      });
    }
  }, [role, expandedNavSections, setNavSectionExpanded]);

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
          className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-[2px] lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <aside
        className={cn(
          'sidebar-shell flex flex-col h-screen overflow-hidden z-[100] transition-[width,transform] duration-300 ease-in-out',
          'fixed inset-y-0 left-0 w-[240px]',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          sidebarCollapsed ? 'lg:w-16 lg:min-w-[64px]' : 'lg:w-[240px] lg:min-w-[240px]'
        )}
        aria-label="Main navigation"
      >
        {/* Ambient brand glow */}
        <div
          className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-brand-600/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-20 -left-10 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl"
          aria-hidden
        />

        <div className={cn('relative border-b border-white/5', isIconOnly ? 'p-3' : 'p-4')}>
          <div
            className={cn(
              'flex mb-3',
              isIconOnly ? 'flex-col items-center gap-2' : 'items-center gap-2'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={brandTitle}
                  className="w-9 h-9 rounded-xl object-contain bg-white/10 ring-1 ring-white/10 shrink-0 shadow-lg shadow-black/20"
                />
              ) : (
                <div className="w-9 h-9 bg-gradient-to-br from-brand-600 to-sky-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg shadow-brand-600/30 ring-1 ring-white/10">
                  {isSuperAdmin ? 'H' : getInitials(tenantName)}
                </div>
              )}
              <div
                className={cn(
                  'min-w-0 overflow-hidden transition-all duration-300 ease-in-out',
                  showLabels ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'
                )}
              >
                <p className="text-white font-semibold text-sm truncate tracking-tight">{brandTitle}</p>
                <p className="text-[10px] text-slate-400 truncate">HR Management</p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className={cn(
                'hidden lg:flex items-center justify-center w-8 h-8 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors duration-200 shrink-0',
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
                'w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white lg:hidden shrink-0',
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
            <div className="w-full flex items-center gap-2.5 rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 backdrop-blur-sm">
              {tenantLogo ? (
                <img src={tenantLogo} alt="" className="w-6 h-6 rounded-lg object-contain shrink-0 bg-white/10" />
              ) : (
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-600 to-sky-500 text-[9px] font-semibold text-white flex items-center justify-center shrink-0">
                  {getInitials(tenantName)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-medium">Organization</p>
                <p className="text-slate-200 text-xs font-medium truncate">{tenantName}</p>
              </div>
            </div>
          )}
          {/* } */}
        </div>

        <nav className="relative flex-1 py-3 overflow-y-auto overflow-x-hidden sidebar-nav-scroll space-y-0.5">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => isNavItemVisible(item, role, moduleCodes));
            if (!visibleItems.length) return null;

            const sectionLabel =
              role === 'auditor' && group.section === 'Finance' ? 'Finance' : group.section;
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
                <div key={group.section} className="mb-1 space-y-0.5">
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
                    'w-full flex items-center gap-2 mx-2 px-3 py-2 rounded-xl text-left transition-all duration-200',
                    'max-w-[calc(100%-1rem)]',
                    sectionActive
                      ? 'text-sky-200 bg-white/5'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  )}
                >
                  <span
                    className={cn(
                      'flex items-center justify-center w-6 h-6 rounded-md shrink-0',
                      sectionActive ? 'bg-brand-600/30 text-sky-300' : 'text-slate-500'
                    )}
                  >
                    <SectionIcon size={13} />
                  </span>
                  <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider truncate">
                    {sectionLabel}
                  </span>
                  {sectionBadgeTotal > 0 && !isExpanded && (
                    <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
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
                  <div className="pb-1 pt-0.5 space-y-0.5">
                    {visibleItems.map((item) => (
                      <NavItemLink
                        key={item.path}
                        item={item}
                        isIconOnly={false}
                        showLabels
                        count={badgeCount(item)}
                        isActive={activeItemPath === item.path}
                        onNavigate={() => handleNavItemNavigate(item)}
                        className="pl-4"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
