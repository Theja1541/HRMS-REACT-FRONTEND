import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/auth.store';
import { resolveAuthenticatedLanding } from './utils/portalNavigation';
import AuthBootstrap from './components/auth/AuthBootstrap';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import EmployeesPage from './pages/employees/EmployeesPage';
import EmployeeDetailPage from './pages/employees/EmployeeDetailPage';
import OrgStructurePage from './pages/people/OrgStructurePage';
import TenantsPage from './pages/admin/TenantsPage';
import BillingPage from './pages/admin/BillingPage';
import TenantSubscriptionsPage from './pages/admin/TenantSubscriptionsPage';
import PendingApprovalsPage from './pages/admin/PendingApprovalsPage';
import SettingsPage from './pages/admin/SettingsPage';
import WorkingCalendarPage from './pages/admin/WorkingCalendarPage';
import AttendancePage from './pages/attendance/AttendancePage';
import LeavesPage from './pages/leave/LeavesPage';
import LeaveSettingsPage from './pages/leave/LeaveSettingsPage';
import HolidayCalendarPage from './pages/holidays/HolidayCalendarPage';
import SalariesPage from './pages/payroll/SalariesPage';
import SalaryFeedPage from './pages/payroll/SalaryFeedPage';
import PayrollPreviewPage from './pages/payroll/PayrollPreviewPage';
import PayslipsPage from './pages/payroll/PayslipsPage';
import PFSummaryPage from './pages/finance/PFSummaryPage';
import FinanceSummaryPage from './pages/finance/FinanceSummaryPage';
import GSTPage from './pages/finance/GSTPage';
import VendorsPage from './pages/finance/VendorsPage';
import CategoriesPage from './pages/finance/CategoriesPage';
import TransactionsPage from './pages/finance/TransactionsPage';
import AddTransactionPage from './pages/finance/AddTransactionPage';
import TransactionViewPage from './pages/finance/TransactionViewPage';
import TransactionInvoicePage from './pages/finance/TransactionInvoicePage';
import TransactionReceiptPage from './pages/finance/TransactionReceiptPage';
import DaybookDashboardPage from './pages/finance/DaybookDashboardPage';
import QuotationsPage from './pages/finance/QuotationsPage';
import ViewQuotationPage from './pages/finance/ViewQuotationPage';
import RecruitmentPage from './pages/hr/RecruitmentPage';
import OnboardingPage from './pages/hr/OnboardingPage';
import SeparationPage from './pages/hr/SeparationPage';
import ResignationPage from './pages/hr/ResignationPage';
import NoticePeriodPolicyPage from './pages/hr/NoticePeriodPolicyPage';
import ClearanceTemplatePage from './pages/hr/ClearanceTemplatePage';
import ClearanceDashboardPage from './pages/hr/ClearanceDashboardPage';
import FnfSettlementsPage from './pages/hr/FnfSettlementsPage';
import ProbationPolicyPage from './pages/hr/ProbationPolicyPage';
import ProbationTrackerPage from './pages/hr/ProbationTrackerPage';
import PerformancePage from './pages/hr/PerformancePage';
import AssetsPage from './pages/hr/AssetsPage';
import AssetDashboardPage from './pages/hr/AssetDashboardPage';
import AssetCategoriesPage from './pages/hr/AssetCategoriesPage';
import AssetReturnRequestsPage from './pages/hr/AssetReturnRequestsPage';
import AssetMaintenancePage from './pages/hr/AssetMaintenancePage';
import HelpdeskPage from './pages/platform/HelpdeskPage';
import HelpdeskCategoriesPage from './pages/platform/HelpdeskCategoriesPage';
import AnnouncementsPage from './pages/platform/AnnouncementsPage';
import ReportsPage from './pages/platform/ReportsPage';
import AuditLogsPage from './pages/platform/AuditLogsPage';
import MeHomePage from './pages/me/MeHomePage';
import MeAttendancePage from './pages/me/MeAttendancePage';
import MeProfilePage from './pages/me/MeProfilePage';
import ChangePasswordPage from './pages/me/ChangePasswordPage';
import RolesPage from './pages/admin/RolesPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import MeTasksPage from './pages/me/MeTasksPage';
import MeDirectoryPage from './pages/me/MeDirectoryPage';
import MeAssetsPage from './pages/me/MeAssetsPage';
import MeJobOpeningsPage from './pages/me/MeJobOpeningsPage';
import CareersPage from './pages/careers/CareersPage';
import MePoliciesPage from './pages/me/MePoliciesPage';
import MeNotificationPreferencesPage from './pages/me/MeNotificationPreferencesPage';
import MeLeavesPage from './pages/me/MeLeavesPage';
import MeResignationPage from './pages/me/MeResignationPage';
import MeExitPage from './pages/me/MeExitPage';
import MeFnfPage from './pages/me/MeFnfPage';
import TaxDeclarationPage from './pages/me/TaxDeclarationPage';
import MeReimbursementsListPage from './pages/me/reimbursements/MeReimbursementsListPage';
import MeReimbursementFormPage from './pages/me/reimbursements/MeReimbursementFormPage';
import MeReimbursementViewPage from './pages/me/reimbursements/MeReimbursementViewPage';
import TaxSlabSettingsPage from './pages/payroll/TaxSlabSettingsPage';
import ReimbursementApprovalsPage from './pages/payroll/ReimbursementApprovalsPage';
import SalaryStructuresPage from './pages/payroll/SalaryStructuresPage';
import PwaUpdateNotifier from './components/pwa/PwaUpdateNotifier';
import SubscriptionExpiredPage from './pages/auth/SubscriptionExpiredPage';
import PlanAccessDeniedPage from './pages/auth/PlanAccessDeniedPage';
import PortalSelectionPage from './pages/auth/PortalSelectionPage';
import WorkspaceSelectionPage from './pages/auth/WorkspaceSelectionPage';
import { isTenantSubscriptionBlocked } from './utils/subscriptionAccess';
import { isPersonSessionToken } from './utils/jwt';
import ModuleAccessGuard from './components/auth/ModuleAccessGuard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children, allowPersonSession = false }) {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  if (!allowPersonSession && isPersonSessionToken(token)) {
    return <Navigate to="/select-workspace" replace />;
  }
  return children;
}

const SUBSCRIPTION_SELF_SERVICE_PATH = '/settings/subscription';

function SubscriptionBlockedRedirect({ children }) {
  const user = useAuthStore((s) => s.user);
  const entitlements = useAuthStore((s) => s.entitlements);
  const location = useLocation();
  const isSelfServiceSubscription =
    location.pathname === SUBSCRIPTION_SELF_SERVICE_PATH &&
    (user?.role === 'owner' || user?.role === 'hr');

  if (
    !isSelfServiceSubscription &&
    isTenantSubscriptionBlocked(user, entitlements)
  ) {
    return <Navigate to="/subscription-expired" replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const entitlements = useAuthStore((s) => s.entitlements);
  const roles = useAuthStore((s) => s.roles);
  const defaultRole = useAuthStore((s) => s.defaultRole);
  const selectedRole = useAuthStore((s) => s.selectedRole);
  const mustChangePassword = user?.must_change_password;
  if (token && isPersonSessionToken(token)) {
    return <Navigate to="/select-workspace" replace />;
  }
  if (token && user && !isPersonSessionToken(token)) {
    if (isTenantSubscriptionBlocked(user, entitlements)) {
      return <Navigate to="/subscription-expired" replace />;
    }
    const landing = resolveAuthenticatedLanding({
      roles,
      defaultRole,
      selectedRole,
      userRole: user?.role,
      mustChangePassword,
    });
    return <Navigate to={landing} replace />;
  }
  return children;
}

function HomeRedirect() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const entitlements = useAuthStore((s) => s.entitlements);
  const roles = useAuthStore((s) => s.roles);
  const defaultRole = useAuthStore((s) => s.defaultRole);
  const selectedRole = useAuthStore((s) => s.selectedRole);

  if (accessToken && isPersonSessionToken(accessToken)) {
    return <Navigate to="/select-workspace" replace />;
  }

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  const landing = resolveAuthenticatedLanding({
    roles,
    defaultRole,
    selectedRole,
    userRole: user?.role,
    mustChangePassword: user?.must_change_password,
  });
  if (isTenantSubscriptionBlocked(user, entitlements)) {
    return <Navigate to="/subscription-expired" replace />;
  }
  return <Navigate to={landing} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PwaUpdateNotifier />
      <AuthBootstrap>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/careers/:tenantSlug" element={<CareersPage />} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/subscription-expired"
              element={
                <ProtectedRoute>
                  <SubscriptionExpiredPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/access-denied"
              element={
                <ProtectedRoute>
                  <PlanAccessDeniedPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/select-workspace"
              element={
                <ProtectedRoute allowPersonSession>
                  <WorkspaceSelectionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/select-portal"
              element={
                <ProtectedRoute>
                  <PortalSelectionPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<ProtectedRoute><SubscriptionBlockedRedirect><AppShell /></SubscriptionBlockedRedirect></ProtectedRoute>}>
              <Route index element={<HomeRedirect />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="employees" element={<ModuleAccessGuard module="employees"><EmployeesPage /></ModuleAccessGuard>} />
              <Route path="employees/:id" element={<ModuleAccessGuard module="employees"><EmployeeDetailPage /></ModuleAccessGuard>} />
              <Route path="people/org-structure" element={<OrgStructurePage />} />
              <Route path="people/policy-documents" element={<MePoliciesPage />} />
              <Route path="people/departments" element={<Navigate to="/people/org-structure" replace />} />
              <Route path="people/designations" element={<Navigate to="/people/org-structure?tab=designations" replace />} />
              <Route path="people/branches" element={<Navigate to="/people/org-structure?tab=branches" replace />} />
              <Route path="attendance" element={<ModuleAccessGuard module="attendance"><AttendancePage /></ModuleAccessGuard>} />
              <Route path="leaves" element={<ModuleAccessGuard module="leaves"><LeavesPage /></ModuleAccessGuard>} />
              <Route path="holidays" element={<ModuleAccessGuard module="leaves"><HolidayCalendarPage /></ModuleAccessGuard>} />
              <Route path="leaves/settings" element={<ModuleAccessGuard module="leaves"><LeaveSettingsPage /></ModuleAccessGuard>} />
              <Route path="salaries" element={<ModuleAccessGuard module="payroll"><SalariesPage /></ModuleAccessGuard>} />
              <Route path="payroll/run" element={<ModuleAccessGuard module="payroll"><PayrollPreviewPage /></ModuleAccessGuard>} />
              <Route path="payslips" element={<ModuleAccessGuard module="payroll"><PayslipsPage /></ModuleAccessGuard>} />
              <Route path="salary-feed" element={<ModuleAccessGuard module="payroll"><SalaryFeedPage /></ModuleAccessGuard>} />
              <Route path="payroll/reimbursements" element={<ModuleAccessGuard module="payroll"><ReimbursementApprovalsPage /></ModuleAccessGuard>} />
              <Route path="payroll/structures" element={<ModuleAccessGuard module="payroll"><SalaryStructuresPage /></ModuleAccessGuard>} />
              <Route path="payroll/tax-settings" element={<ModuleAccessGuard module="payroll"><TaxSlabSettingsPage /></ModuleAccessGuard>} />
              <Route path="me" element={<MeHomePage />} />
              <Route path="me/attendance" element={<ModuleAccessGuard module="attendance"><MeAttendancePage /></ModuleAccessGuard>} />
              <Route path="me/leaves" element={<ModuleAccessGuard module="leaves"><MeLeavesPage /></ModuleAccessGuard>} />
              <Route path="me/resignation" element={<ModuleAccessGuard module="separation"><MeResignationPage /></ModuleAccessGuard>} />
              <Route path="me/exit-status" element={<ModuleAccessGuard module="separation"><MeExitPage /></ModuleAccessGuard>} />
              <Route path="me/fnf" element={<ModuleAccessGuard module="separation"><MeFnfPage /></ModuleAccessGuard>} />
              <Route path="me/profile" element={<MeProfilePage />} />
              <Route path="me/change-password" element={<ChangePasswordPage />} />
              <Route path="me/directory" element={<ModuleAccessGuard module="employees"><MeDirectoryPage /></ModuleAccessGuard>} />
              <Route path="me/tasks" element={<ModuleAccessGuard module="projects"><MeTasksPage /></ModuleAccessGuard>} />
              <Route path="me/payslips" element={<ModuleAccessGuard module="payroll"><PayslipsPage /></ModuleAccessGuard>} />
              <Route path="me/assets" element={<ModuleAccessGuard module="assets"><MeAssetsPage /></ModuleAccessGuard>} />
              <Route path="me/job-openings" element={<ModuleAccessGuard module="recruitment"><MeJobOpeningsPage /></ModuleAccessGuard>} />
              <Route path="me/policies" element={<MePoliciesPage />} />
              <Route path="policies" element={<MePoliciesPage />} />
              <Route path="me/announcements" element={<AnnouncementsPage />} />
              <Route path="me/helpdesk" element={<HelpdeskPage />} />
              <Route path="me/notifications" element={<MeNotificationPreferencesPage />} />
              <Route path="me/tax-declaration" element={<ModuleAccessGuard module="payroll"><TaxDeclarationPage /></ModuleAccessGuard>} />
              <Route path="me/reimbursements" element={<ModuleAccessGuard module="payroll"><MeReimbursementsListPage /></ModuleAccessGuard>} />
              <Route path="me/reimbursements/new" element={<ModuleAccessGuard module="payroll"><MeReimbursementFormPage /></ModuleAccessGuard>} />
              <Route path="me/reimbursements/:id/edit" element={<ModuleAccessGuard module="payroll"><MeReimbursementFormPage /></ModuleAccessGuard>} />
              <Route path="me/reimbursements/:id" element={<ModuleAccessGuard module="payroll"><MeReimbursementViewPage /></ModuleAccessGuard>} />
              <Route path="pf-summary" element={<PFSummaryPage />} />
              <Route path="daybook" element={<Navigate to="/transactions" replace />} />
              <Route path="daybook/dashboard" element={<ModuleAccessGuard module="daybook"><DaybookDashboardPage /></ModuleAccessGuard>} />
              <Route path="finance/payment-modes" element={<Navigate to="/transactions" replace />} />
              <Route path="finance" element={<FinanceSummaryPage />} />
              <Route path="gst" element={<GSTPage />} />
              <Route path="vendors" element={<VendorsPage />} />
              <Route path="quotations" element={<QuotationsPage />} />
              <Route path="quotations/:id" element={<ViewQuotationPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="transactions/add" element={<AddTransactionPage />} />
              <Route path="transactions/:id/receipt" element={<TransactionReceiptPage />} />
              <Route path="transactions/:id/invoice" element={<TransactionInvoicePage />} />
              <Route path="transactions/:id/edit" element={<AddTransactionPage />} />
              <Route path="transactions/:id" element={<TransactionViewPage />} />
              <Route path="recruitment" element={<ModuleAccessGuard module="recruitment"><RecruitmentPage /></ModuleAccessGuard>} />
              <Route path="onboarding" element={<OnboardingPage />} />
              <Route path="resignations" element={<ModuleAccessGuard module="separation"><ResignationPage /></ModuleAccessGuard>} />
              <Route path="notice-period-policies" element={<ModuleAccessGuard module="separation"><NoticePeriodPolicyPage /></ModuleAccessGuard>} />
              <Route path="clearance-templates" element={<ModuleAccessGuard module="separation"><ClearanceTemplatePage /></ModuleAccessGuard>} />
              <Route path="clearance-dashboard" element={<ModuleAccessGuard module="separation"><ClearanceDashboardPage /></ModuleAccessGuard>} />
              <Route path="fnf-settlements" element={<ModuleAccessGuard module="separation"><FnfSettlementsPage /></ModuleAccessGuard>} />
              <Route path="probation-policies" element={<ModuleAccessGuard module="probation"><ProbationPolicyPage /></ModuleAccessGuard>} />
              <Route path="probation-tracker" element={<ModuleAccessGuard module="probation"><ProbationTrackerPage /></ModuleAccessGuard>} />
              <Route path="separation" element={<ModuleAccessGuard module="separation"><SeparationPage /></ModuleAccessGuard>} />
              <Route path="performance" element={<PerformancePage />} />
              <Route path="assets/dashboard" element={<ModuleAccessGuard module="assets"><AssetDashboardPage /></ModuleAccessGuard>} />
              <Route path="assets/categories" element={<ModuleAccessGuard module="assets"><AssetCategoriesPage /></ModuleAccessGuard>} />
              <Route path="assets/maintenance" element={<ModuleAccessGuard module="assets"><AssetMaintenancePage /></ModuleAccessGuard>} />
              <Route path="assets/returns" element={<ModuleAccessGuard module="assets"><AssetReturnRequestsPage /></ModuleAccessGuard>} />
              <Route path="assets" element={<ModuleAccessGuard module="assets"><AssetsPage /></ModuleAccessGuard>} />
              <Route path="projects" element={<ModuleAccessGuard module="projects"><ProjectsPage /></ModuleAccessGuard>} />
              <Route path="helpdesk" element={<HelpdeskPage />} />
              <Route path="helpdesk/categories" element={<HelpdeskCategoriesPage />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="tenants" element={<TenantsPage />} />
              <Route path="subscriptions" element={<TenantSubscriptionsPage />} />
              <Route path="pending-approvals" element={<PendingApprovalsPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/subscription" element={<SettingsPage />} />
              <Route path="settings/working-calendar" element={<WorkingCalendarPage />} />
              <Route path="settings/attendance-policy" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthBootstrap>
    </QueryClientProvider>
  );
}
