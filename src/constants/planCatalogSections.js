/** Groups subscription catalog modules by sidebar section for Plans & Pricing UI. */
export const PLAN_CATALOG_SECTIONS = [
  {
    label: 'People',
    moduleCodes: [
      'org_structure',
      'employees',
      'attendance',
      'leaves',
      'recruitment',
      'onboarding',
      'probation',
      'separation',
      'performance',
    ],
  },
  {
    label: 'Payroll',
    moduleCodes: ['salaries', 'payslips', 'salary_feed'],
  },
  {
    label: 'Assets',
    moduleCodes: ['assets'],
  },
  {
    label: 'Finance',
    moduleCodes: ['daybook', 'finance', 'gst', 'pf_summary'],
  },
  {
    label: 'Platform',
    moduleCodes: ['announcements', 'helpdesk', 'reports', 'audit_logs'],
  },
  {
    label: 'Projects',
    moduleCodes: ['projects'],
  },
  {
    label: 'Employee Portal',
    moduleCodes: ['employee_portal'],
  },
];

export function groupCatalogModules(catalogModules = []) {
  const byCode = Object.fromEntries(catalogModules.map((m) => [m.code, m]));
  const used = new Set();

  const sections = PLAN_CATALOG_SECTIONS.map((section) => {
    const modules = section.moduleCodes.map((code) => byCode[code]).filter(Boolean);
    modules.forEach((m) => used.add(m.code));
    return { ...section, modules };
  }).filter((section) => section.modules.length > 0);

  const uncategorized = catalogModules.filter((m) => !used.has(m.code));
  if (uncategorized.length) {
    sections.push({ label: 'Other', moduleCodes: [], modules: uncategorized });
  }

  return sections;
}
