import { PLAN_CONFIG_ROLES, getRoleCatalogSections } from './planRoleCatalog';

export function emptyRoleSelections() {
  return Object.fromEntries(
    PLAN_CONFIG_ROLES.map(({ role }) => [role, { featureIds: [], moduleIds: [] }])
  );
}

export function mergeRoleSelections(roleSelections = {}) {
  const featureIds = new Set();
  const moduleIds = new Set();

  Object.values(roleSelections).forEach((selection) => {
    (selection?.featureIds || []).forEach((id) => featureIds.add(id));
    (selection?.moduleIds || []).forEach((id) => moduleIds.add(id));
  });

  return {
    featureIds: [...featureIds],
    moduleIds: [...moduleIds],
  };
}

export function distributePlanToRoleSelections(plan, catalogModules = []) {
  const planFeatureIds = new Set((plan.features || []).map((f) => f.id));
  const planModuleIds = new Set((plan.modules || []).map((m) => m.id));
  const roleSelections = emptyRoleSelections();

  for (const { role } of PLAN_CONFIG_ROLES) {
    const featureIds = [];
    const moduleIds = [];

    for (const section of getRoleCatalogSections(role, catalogModules)) {
      for (const entry of section.entries) {
        if (!entry.selectable) continue;
        if (entry.feature && planFeatureIds.has(entry.feature.id)) {
          featureIds.push(entry.feature.id);
        } else if (!entry.feature && entry.module && planModuleIds.has(entry.module.id)) {
          moduleIds.push(entry.module.id);
        }
      }
    }

    roleSelections[role] = { featureIds, moduleIds };
  }

  return roleSelections;
}

export function emptyPlanForm() {
  return {
    name: '',
    monthly_price: '',
    yearly_price: '',
    employee_limit: '',
    is_active: true,
    roleSelections: emptyRoleSelections(),
  };
}

export function planToForm(plan, catalogModules = []) {
  const roleSelections =
    catalogModules.length > 0
      ? distributePlanToRoleSelections(plan, catalogModules)
      : emptyRoleSelections();

  return {
    name: plan.name || '',
    monthly_price: String(plan.monthly_price ?? ''),
    yearly_price: String(plan.yearly_price ?? ''),
    employee_limit: plan.employee_limit != null ? String(plan.employee_limit) : '',
    is_active: plan.is_active !== false,
    roleSelections,
  };
}

export function formToPayload(form, catalogModules = []) {
  const { featureIds, moduleIds } = mergeRoleSelections(form.roleSelections);

  const modulesWithoutFeatures = moduleIds.filter((moduleId) => {
    const mod = catalogModules.find((m) => m.id === moduleId);
    return !mod?.features?.length;
  });

  return {
    name: form.name.trim(),
    monthly_price: parseFloat(form.monthly_price) || 0,
    yearly_price: parseFloat(form.yearly_price) || 0,
    employee_limit: form.employee_limit ? parseInt(form.employee_limit, 10) : null,
    is_active: form.is_active,
    feature_ids: featureIds,
    module_ids: modulesWithoutFeatures,
  };
}
