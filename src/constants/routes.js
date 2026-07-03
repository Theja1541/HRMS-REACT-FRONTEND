export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  OWNER: 'owner',
  HR: 'hr',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  PF_TEAM: 'pf_team',
  AUDITOR: 'auditor',
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  owner: 'Company Admin',
  hr: 'HR',
  manager: 'Manager',
  employee: 'Employee',
  pf_team: 'PF Team',
  auditor: 'Auditor',
};

export const NAV_ITEMS = [
  {
    section: 'Overview',
    collapsible: false,
    items: [{ label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', roles: ['super_admin', 'owner', 'admin', 'hr', 'manager'] }],
  },
  {
    section: 'My Work',
    icon: 'Briefcase',
    collapsible: true,
    items: [
      { label: 'My Dashboard', path: '/me', icon: 'Home', roles: ['employee', 'manager'] },
      { label: 'My Attendance', path: '/me/attendance', icon: 'CalendarCheck', roles: ['employee', 'manager'], moduleCode: 'attendance' },
      { label: 'My Leaves', path: '/me/leaves', icon: 'Palmtree', roles: ['employee', 'manager'], moduleCode: 'leaves' },
      { label: 'Resignation', path: '/me/resignation', icon: 'DoorOpen', roles: ['employee', 'manager'], moduleCode: 'separation' },
      { label: 'My Exit Status', path: '/me/exit-status', icon: 'LogOut', roles: ['employee', 'manager'], moduleCode: 'separation' },
      { label: 'Full & Final', path: '/me/fnf', icon: 'IndianRupee', roles: ['employee', 'manager'], moduleCode: 'separation' },
      { label: 'My Profile', path: '/me/profile', icon: 'User', roles: ['employee', 'manager'] },
      { label: 'Directory', path: '/me/directory', icon: 'Users', roles: ['employee', 'manager'], moduleCode: 'employees' },
      { label: 'My Tasks', path: '/me/tasks', icon: 'CheckSquare', roles: ['employee', 'manager'], moduleCode: 'projects' },
      { label: 'My Payslips', path: '/me/payslips', icon: 'FileText', roles: ['employee', 'manager'], moduleCode: 'payslips' },
      { label: 'Tax Declaration', path: '/me/tax-declaration', icon: 'Receipt', roles: ['employee', 'manager'], moduleCode: 'payslips' },
      { label: 'My Assets', path: '/me/assets', icon: 'Laptop', roles: ['employee', 'manager'], moduleCode: 'assets' },
      { label: 'Careers & Referrals', path: '/me/job-openings', icon: 'Briefcase', roles: ['employee', 'manager'], moduleCode: 'recruitment' },
      { label: 'Company Policies', path: '/me/policies', icon: 'ScrollText', badgeKey: 'pendingPolicies', roles: ['employee', 'manager'] },
      { label: 'My Reimbursements', path: '/me/reimbursements', icon: 'Wallet', roles: ['employee', 'manager'], moduleCode: 'salaries' },
      { label: 'Announcements', path: '/me/announcements', icon: 'Megaphone', roles: ['employee', 'manager'], moduleCode: 'announcements' },
      { label: 'Helpdesk', path: '/me/helpdesk', icon: 'LifeBuoy', roles: ['employee', 'manager'], moduleCode: 'helpdesk' },
      { label: 'Settings', path: '/settings', icon: 'Settings', roles: ['employee', 'manager'] },
    ],
  },
  {
    section: 'People',
    icon: 'Users',
    collapsible: true,
    items: [
      { label: 'Organization Structure', path: '/people/org-structure', icon: 'Building', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'org_structure' },
      { label: 'Employees', path: '/employees', icon: 'Users', roles: ['super_admin', 'owner', 'hr', 'manager'], moduleCode: 'employees' },
      { label: 'Attendance', path: '/attendance', icon: 'CalendarCheck', roles: ['super_admin', 'owner', 'hr', 'manager'], moduleCode: 'attendance' },
      { label: 'Leaves', path: '/leaves', icon: 'Palmtree', badgeKey: 'pendingLeaves', roles: ['super_admin', 'owner', 'hr', 'manager', 'employee'], moduleCode: 'leaves' },
      { label: 'Leave Settings', path: '/leaves/settings', icon: 'Settings2', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'leaves' },
      { label: 'Holiday Calendar', path: '/holidays', icon: 'CalendarDays', roles: ['super_admin', 'owner', 'hr', 'manager', 'employee'], moduleCode: 'leaves' },
      { label: 'Recruitment', path: '/recruitment', icon: 'UserPlus', roles: ['super_admin', 'owner', 'hr', 'manager'], moduleCode: 'recruitment' },
      { label: 'Onboarding', path: '/onboarding', icon: 'ClipboardList', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'onboarding' },
      { label: 'Probation', path: '/probation-policies', icon: 'UserCheck', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'probation' },
      { label: 'Probation Tracker', path: '/probation-tracker', icon: 'CalendarClock', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'probation' },
      { label: 'Policy Documents', path: '/people/policy-documents', icon: 'ScrollText', roles: ['super_admin', 'owner', 'hr'] },
      { label: 'Resignations', path: '/resignations', icon: 'LogOut', roles: ['super_admin', 'owner', 'hr', 'manager'], moduleCode: 'separation' },
      { label: 'Notice Period', path: '/notice-period-policies', icon: 'Clock', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'separation' },
      { label: 'Separation', path: '/separation', icon: 'DoorOpen', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'separation' },
      { label: 'Clearance Dashboard', path: '/clearance-dashboard', icon: 'ShieldCheck', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'separation' },
      { label: 'Clearance Templates', path: '/clearance-templates', icon: 'ClipboardList', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'separation' },
      { label: 'F&F Settlements', path: '/fnf-settlements', icon: 'Banknote', roles: ['super_admin', 'owner', 'hr', 'pf_team'], moduleCode: 'separation' },
      { label: 'Performance', path: '/performance', icon: 'Target', roles: ['super_admin', 'owner', 'hr', 'manager', 'employee'], moduleCode: 'performance' },
    ],
  },
  {
    section: 'Payroll',
    icon: 'Banknote',
    collapsible: true,
    items: [
      { label: 'Salaries', path: '/salaries', icon: 'Banknote', roles: ['super_admin', 'owner', 'hr', 'pf_team'], moduleCode: 'salaries' },
      { label: 'Salary Structures', path: '/payroll/structures', icon: 'Layers', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'salaries' },
      { label: 'Payslips', path: '/payslips', icon: 'FileText', roles: ['super_admin', 'owner', 'hr', 'pf_team'], moduleCode: 'payslips' },
      { label: 'Salary Feed', path: '/salary-feed', icon: 'PenLine', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'salary_feed' },
      { label: 'Reimbursement Claims', path: '/payroll/reimbursements', icon: 'Wallet', badgeKey: 'pendingReimbursements', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'salaries' },
      { label: 'Tax Settings', path: '/payroll/tax-settings', icon: 'Receipt', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'salaries' },
    ],
  },
  {
    section: 'Assets',
    icon: 'Laptop',
    collapsible: true,
    items: [
      { label: 'Asset Dashboard', path: '/assets/dashboard', icon: 'LayoutDashboard', roles: ['super_admin', 'owner', 'hr', 'manager'], moduleCode: 'assets' },
      { label: 'Asset Registry', path: '/assets', icon: 'Laptop', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'assets' },
      { label: 'Maintenance', path: '/assets/maintenance', icon: 'Wrench', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'assets' },
      { label: 'Return Requests', path: '/assets/returns', icon: 'RotateCcw', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'assets' },
      { label: 'Asset Categories', path: '/assets/categories', icon: 'Tags', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'assets' },
    ],
  },
  {
    section: 'Finance',
    icon: 'TrendingUp',
    collapsible: true,
    items: [
      { label: 'Day Book Dashboard', path: '/daybook/dashboard', icon: 'LayoutDashboard', roles: ['super_admin', 'owner', 'hr', 'auditor'], moduleCode: 'daybook' },
      { label: 'Day Book', path: '/daybook', icon: 'BookOpen', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'daybook' },
      { label: 'Account Ledger', path: '/account-ledger', icon: 'NotebookText', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'finance' },
      { label: 'Trial Balance', path: '/trial-balance', icon: 'Scale', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'finance' },
      { label: 'Financial Summary', path: '/finance', icon: 'TrendingUp', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'finance' },
      { label: 'GST Monthly', path: '/gst', icon: 'Receipt', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'gst' },
      { label: 'Vendors', path: '/vendors', icon: 'Truck', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'finance' },
      { label: 'Categories', path: '/categories', icon: 'Tags', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'finance' },
      { label: 'Transactions', path: '/transactions', icon: 'ArrowLeftRight', roles: ['super_admin', 'owner', 'hr', 'auditor'], moduleCode: 'finance' },
      { label: 'Payment Modes', path: '/finance/payment-modes', icon: 'Wallet', roles: ['super_admin', 'owner', 'hr'], moduleCode: 'finance' },
      { label: 'PF / ESI Summary', path: '/pf-summary', icon: 'Landmark', roles: ['super_admin', 'owner', 'hr', 'pf_team'], moduleCode: 'pf_summary' },
    ],
  },
  {
    section: 'Platform',
    icon: 'Layers',
    collapsible: true,
    items: [
      { label: 'Announcements', path: '/announcements', icon: 'Megaphone', roles: ['super_admin', 'owner', 'admin', 'hr', 'manager', 'employee'], moduleCode: 'announcements' },
      { label: 'Helpdesk', path: '/helpdesk', icon: 'LifeBuoy', roles: ['super_admin', 'owner', 'admin', 'hr', 'manager', 'employee'], moduleCode: 'helpdesk' },
      { label: 'Helpdesk Categories', path: '/helpdesk/categories', icon: 'Tags', roles: ['super_admin', 'owner', 'admin', 'hr'], moduleCode: 'helpdesk' },
      { label: 'Reports', path: '/reports', icon: 'BarChart3', roles: ['super_admin', 'owner', 'admin', 'hr', 'manager'], moduleCode: 'reports' },
      { label: 'Audit Logs', path: '/audit-logs', icon: 'ScrollText', roles: ['super_admin', 'owner', 'admin', 'hr'], moduleCode: 'audit_logs' },
    ],
  },
  {
    section: 'Projects',
    icon: 'Kanban',
    collapsible: true,
    items: [
      { label: 'Projects & Tasks', path: '/projects', icon: 'Kanban', roles: ['super_admin', 'owner', 'hr', 'manager', 'employee'], moduleCode: 'projects' },
    ],
  },
  {
    section: 'Admin',
    icon: 'ShieldCheck',
    collapsible: true,
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', roles: ['super_admin'] },
      { label: 'Tenants / Orgs', path: '/tenants', icon: 'Building2', roles: ['super_admin'] },
      { label: 'Tenant Subscriptions', path: '/subscriptions', icon: 'Layers', roles: ['super_admin'] },
      { label: 'Pending Approvals', path: '/pending-approvals', icon: 'ClipboardCheck', roles: ['super_admin'] },
      { label: 'Plans & Pricing', path: '/billing', icon: 'CreditCard', roles: ['super_admin'] },
      { label: 'Roles & Permissions', path: '/roles', icon: 'ShieldCheck', roles: ['super_admin', 'owner', 'hr'] },
      { label: 'Company Settings', path: '/settings', icon: 'Settings', roles: ['super_admin', 'owner', 'hr', 'pf_team', 'auditor'] },
    ],
  },
];

export function canAccessNavItem(item, role) {
  if (item.roles === 'all') return true;
  return item.roles.includes(role);
}

/** Plan entitlement gate — super_admin bypasses; items without moduleCode are always allowed. */
export function canAccessNavItemByPlan(item, role, moduleCodes) {
  if (role === 'super_admin') return true;
  if (!item.moduleCode) return true;
  if (!moduleCodes || !Array.isArray(moduleCodes)) return true;
  return moduleCodes.includes(item.moduleCode);
}

export function isNavItemVisible(item, role, moduleCodes) {
  return canAccessNavItem(item, role) && canAccessNavItemByPlan(item, role, moduleCodes);
}

/** Whether a nav path is active (exact or nested child route). */
export function isNavPathActive(pathname, itemPath) {
  if (pathname === itemPath) return true;
  if (itemPath === '/dashboard' || itemPath === '/me') return pathname === itemPath;
  return pathname.startsWith(`${itemPath}/`);
}

/** Flatten all nav items for page titles and route rules. */
export function flattenNavItems(navItems = NAV_ITEMS) {
  return navItems.flatMap((group) => group.items);
}
