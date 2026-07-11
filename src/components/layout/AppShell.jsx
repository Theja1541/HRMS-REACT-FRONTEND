import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import RouteAccessGuard from '../auth/RouteAccessGuard';
import MustChangePasswordGuard from '../auth/MustChangePasswordGuard';
import SubscriptionAccessGuard from '../auth/SubscriptionAccessGuard';
import RouteErrorBoundary from '../shared/RouteErrorBoundary';
import { MAIN_MODAL_ROOT_ID } from '../shared/MainContentModal';
import { useUiStore } from '../../store/ui.store';
import { cn } from '../../utils/helpers';

export default function AppShell() {
  const location = useLocation();
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const closeMobileSidebar = useUiStore((s) => s.closeMobileSidebar);

  useEffect(() => {
    closeMobileSidebar();
  }, [location.pathname, closeMobileSidebar]);

  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div
        className={cn(
          'flex h-screen flex-col overflow-hidden min-w-0 transition-[padding-left] duration-300 ease-in-out',
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
        )}
      >
        <Topbar />
        <main className="relative flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-w-0">
          <div id={MAIN_MODAL_ROOT_ID} className="absolute inset-0 z-50 pointer-events-none [&>*]:pointer-events-auto" />
          <SubscriptionAccessGuard>
            <RouteAccessGuard>
              <MustChangePasswordGuard>
                {/* Keyed by path so a crash on one page is contained here and
                    auto-recovers when the user navigates elsewhere. */}
                <RouteErrorBoundary key={location.pathname}>
                  <Outlet />
                </RouteErrorBoundary>
              </MustChangePasswordGuard>
            </RouteAccessGuard>
          </SubscriptionAccessGuard>
        </main>
      </div>
    </div>
  );
}
