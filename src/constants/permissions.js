import { NAV_ITEMS } from './routes';

export const ROLE_HIERARCHY = [
  { role: 'super_admin', label: 'Super Admin', description: 'Platform-wide access across all tenants' },
  { role: 'owner', label: 'Company Admin', description: 'Primary company administrator with full tenant control' },
  { role: 'hr', label: 'HR', description: 'HR and payroll operations for the organization' },
  { role: 'manager', label: 'Manager', description: 'Team management, approvals, and self-service' },
  { role: 'employee', label: 'Employee', description: 'Self-service portal access' },
  { role: 'pf_team', label: 'PF Team', description: 'Statutory compliance and PF/ESI reporting' },
  { role: 'auditor', label: 'Auditor', description: 'Read-only Day Book (payments) and finance dashboard' },
];

const MODULE_ACCESS = {
  super_admin: 'All modules + tenant management',
  owner: 'All tenant modules except platform tenants',
  hr: 'People, payroll, finance, and HR operations (no tenant settings or role management)',
  manager: 'Team HR, approvals, recruitment, performance, self-service',
  employee: 'Self-service: attendance, leaves, payslips, helpdesk, announcements',
  pf_team: 'Salaries (read), payslips (read), PF/ESI summary (read-only)',
  auditor: 'Day Book and finance dashboard (read-only; direct URLs blocked elsewhere)',
};

export function getRoleModules(role) {
  const modules = [];
  NAV_ITEMS.forEach((group) => {
    const items = group.items.filter((item) => item.roles === 'all' || item.roles.includes(role));
    if (items.length) modules.push({ section: group.section, items: items.map((i) => i.label) });
  });
  return modules;
}

export { MODULE_ACCESS };
