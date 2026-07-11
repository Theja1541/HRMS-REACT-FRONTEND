export const PLAN_MODULES = [
  {
    key: 'attendance',
    label: 'Attendance',
    icon: 'CalendarCheck',
    description: 'Monitor check-in logs and monthly attendance statistics.',
    pages: [
      { key: 'daily', label: 'Attendance Log' },
      { key: 'monthly', label: 'Monthly Report' },
    ],
  },
  {
    key: 'leaves',
    label: 'Leaves',
    icon: 'Palmtree',
    description: 'Review and approve/reject employee leave requests.',
    pages: [
      { key: 'dashboard', label: 'Leave Requests' },
      { key: 'settings', label: 'Settings' },
    ],
  },
  {
    key: 'employees',
    label: 'Employees',
    icon: 'Users',
    description: 'Manage employee records, profiles, and lifecycle.',
    pages: [
      { key: 'directory', label: 'Employee Directory' },
      { key: 'add', label: 'Add Employee' },
      { key: 'documents', label: 'Documents' },
    ],
  },
  {
    key: 'org_structure',
    label: 'Org Structure',
    icon: 'Building',
    description: 'Departments, designations, and branches.',
    pages: [
      { key: 'departments', label: 'Departments' },
      { key: 'designations', label: 'Designations' },
      { key: 'branches', label: 'Branches' },
    ],
  },
  {
    key: 'recruitment',
    label: 'Recruitment',
    icon: 'UserPlus',
    description: 'Job openings and applicant tracking.',
    pages: [
      { key: 'openings', label: 'Job Openings' },
      { key: 'applications', label: 'Applications' },
      { key: 'pipeline', label: 'Pipeline' },
    ],
  },
  {
    key: 'onboarding',
    label: 'Onboarding',
    icon: 'ClipboardList',
    description: 'New hire onboarding checklists and tasks.',
    pages: [
      { key: 'tasks', label: 'Onboarding Tasks' },
      { key: 'templates', label: 'Templates' },
    ],
  },
  {
    key: 'separation',
    label: 'Separation',
    icon: 'DoorOpen',
    description: 'Exit requests and full & final processing.',
    pages: [
      { key: 'requests', label: 'Exit Requests' },
      { key: 'clearance', label: 'Clearance' },
    ],
  },
  {
    key: 'performance',
    label: 'Performance',
    icon: 'Target',
    description: 'Review cycles, goals, and appraisals.',
    pages: [
      { key: 'cycles', label: 'Review Cycles' },
      { key: 'reviews', label: 'Reviews' },
      { key: 'goals', label: 'Goals' },
    ],
  },
  {
    key: 'salaries',
    label: 'Salaries',
    icon: 'Banknote',
    description: 'Salary structures and payroll runs.',
    pages: [
      { key: 'structures', label: 'Salary Structures' },
      { key: 'runs', label: 'Payroll Runs' },
    ],
  },
  {
    key: 'payslips',
    label: 'Payslips',
    icon: 'FileText',
    description: 'Generate and distribute employee payslips.',
    pages: [
      { key: 'list', label: 'Payslip List' },
      { key: 'download', label: 'Download' },
    ],
  },
  {
    key: 'salary_feed',
    label: 'Salary Feed',
    icon: 'PenLine',
    description: 'Variable pay and ad-hoc salary adjustments.',
    pages: [{ key: 'entries', label: 'Feed Entries' }],
  },
  {
    key: 'assets',
    label: 'Assets',
    icon: 'Laptop',
    description: 'Asset registry and employee assignments.',
    pages: [
      { key: 'registry', label: 'Asset Registry' },
      { key: 'assignments', label: 'Assignments' },
    ],
  },
  {
    key: 'daybook',
    label: 'Day Book',
    icon: 'BookOpen',
    description: 'Payments and receipts (simple day book).',
    pages: [{ key: 'entries', label: 'Day Book Entries' }],
  },
  {
    key: 'finance',
    label: 'Finance',
    icon: 'TrendingUp',
    description: 'Day book and payroll combined financial view.',
    pages: [{ key: 'summary', label: 'Financial Summary' }],
  },
  {
    key: 'gst',
    label: 'GST',
    icon: 'Receipt',
    description: 'GST monthly register.',
    pages: [{ key: 'returns', label: 'GST' }],
  },
  {
    key: 'pf_summary',
    label: 'PF / ESI Summary',
    icon: 'Landmark',
    description: 'Provident fund and ESI statutory reports.',
    pages: [
      { key: 'pf', label: 'PF Summary' },
      { key: 'esi', label: 'ESI Summary' },
    ],
  },
  {
    key: 'announcements',
    label: 'Announcements',
    icon: 'Megaphone',
    description: 'Company-wide notices and updates.',
    pages: [
      { key: 'list', label: 'Announcements' },
      { key: 'create', label: 'Create' },
    ],
  },
  {
    key: 'helpdesk',
    label: 'Helpdesk',
    icon: 'LifeBuoy',
    description: 'Support tickets and issue resolution.',
    pages: [
      { key: 'tickets', label: 'Tickets' },
      { key: 'create', label: 'Raise Ticket' },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: 'BarChart3',
    description: 'HR and payroll analytics reports.',
    pages: [
      { key: 'hr', label: 'HR Reports' },
      { key: 'payroll', label: 'Payroll Reports' },
    ],
  },
  {
    key: 'audit_logs',
    label: 'Audit Logs',
    icon: 'ScrollText',
    description: 'Immutable trail of system actions.',
    pages: [{ key: 'logs', label: 'Audit Logs' }],
  },
  {
    key: 'projects',
    label: 'Projects & Tasks',
    icon: 'Kanban',
    description: 'Project management and task tracking.',
    pages: [
      { key: 'projects', label: 'Projects' },
      { key: 'tasks', label: 'Tasks' },
      { key: 'kanban', label: 'Kanban Board' },
    ],
  },
];

export function buildDefaultModulesConfig(enabled = true) {
  const config = {};
  for (const mod of PLAN_MODULES) {
    config[mod.key] = {
      enabled,
      pages: Object.fromEntries(mod.pages.map((p) => [p.key, enabled])),
    };
  }
  return config;
}

export function emptyPlanForm() {
  return {
    name: '',
    slug: '',
    description: '',
    price_monthly: '',
    price_yearly: '',
    gst_rate: '18.00',
    payment_mode: 'online',
    max_staff_limit: '',
    is_active: true,
    modules: buildDefaultModulesConfig(true),
  };
}

export function planToForm(plan) {
  return {
    name: plan.name || '',
    slug: plan.slug || '',
    description: plan.description || '',
    price_monthly: String(plan.price_monthly ?? ''),
    price_yearly: String(plan.price_yearly ?? ''),
    gst_rate: String(plan.gst_rate ?? '18.00'),
    payment_mode: plan.payment_mode || 'online',
    max_staff_limit: plan.max_staff_limit != null ? String(plan.max_staff_limit) : '',
    is_active: plan.is_active !== false,
    modules: plan.modules || buildDefaultModulesConfig(true),
  };
}

export function formToPayload(form) {
  return {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    description: form.description.trim() || null,
    price_monthly: parseFloat(form.price_monthly) || 0,
    price_yearly: parseFloat(form.price_yearly) || 0,
    gst_rate: parseFloat(form.gst_rate) || 18,
    payment_mode: form.payment_mode,
    max_staff_limit: form.max_staff_limit ? parseInt(form.max_staff_limit, 10) : null,
    is_active: form.is_active,
    modules: form.modules,
  };
}
