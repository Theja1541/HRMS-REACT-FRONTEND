import { NAV_ITEMS, ROLE_LABELS, canAccessNavItem } from './routes';
import { ROLE_HIERARCHY } from './permissions';

/** Tenant roles shown in Plans & Pricing (excludes platform super_admin). */
export const PLAN_CONFIG_ROLES = ROLE_HIERARCHY.filter((r) => r.role !== 'super_admin');

export function buildCatalogLookups(catalogModules = []) {
  const featureByRoute = new Map();
  const moduleByCode = new Map();

  for (const mod of catalogModules) {
    moduleByCode.set(mod.code, mod);
    for (const feature of mod.features || []) {
      if (feature.route_path) {
        featureByRoute.set(feature.route_path, { module: mod, feature });
      }
    }
  }

  return { featureByRoute, moduleByCode };
}

/**
 * Maps a role's nav access (same source as Roles & Permissions) to billable catalog entries.
 * Each entry is one selectable page aligned with sidebar labels.
 */
export function getRoleCatalogSections(role, catalogModules = []) {
  const { featureByRoute, moduleByCode } = buildCatalogLookups(catalogModules);
  const seenFeatureIds = new Set();
  const sections = [];

  for (const group of NAV_ITEMS) {
    const entries = [];

    for (const item of group.items) {
      if (!canAccessNavItem(item, role)) continue;

      const byRoute = featureByRoute.get(item.path);
      if (byRoute) {
        if (seenFeatureIds.has(byRoute.feature.id)) continue;
        seenFeatureIds.add(byRoute.feature.id);
        entries.push({
          key: `feature-${byRoute.feature.id}`,
          label: item.label,
          path: item.path,
          module: byRoute.module,
          feature: byRoute.feature,
          selectable: true,
        });
        continue;
      }

      if (item.moduleCode && moduleByCode.has(item.moduleCode)) {
        const mod = moduleByCode.get(item.moduleCode);
        const pathFeatures = (mod.features || []).filter((f) => f.route_path === item.path);
        if (pathFeatures.length) {
          for (const feature of pathFeatures) {
            if (seenFeatureIds.has(feature.id)) continue;
            seenFeatureIds.add(feature.id);
            entries.push({
              key: `feature-${feature.id}`,
              label: item.label,
              path: item.path,
              module: mod,
              feature,
              selectable: true,
            });
          }
          continue;
        }

        entries.push({
          key: `module-${mod.id}-${item.path}`,
          label: item.label,
          path: item.path,
          module: mod,
          feature: null,
          selectable: true,
        });
        continue;
      }

      entries.push({
        key: `nav-${item.path}`,
        label: item.label,
        path: item.path,
        module: null,
        feature: null,
        selectable: false,
      });
    }

    if (entries.length) {
      sections.push({ label: group.section, entries });
    }
  }

  return sections;
}

export function getRoleCatalogEntryCount(role, catalogModules = []) {
  return getRoleCatalogSections(role, catalogModules).reduce(
    (sum, section) => sum + section.entries.filter((e) => e.selectable).length,
    0
  );
}

export function getRoleSelection(roleSelections, role) {
  return roleSelections?.[role] || { featureIds: [], moduleIds: [] };
}

export function countSelectedInRole(role, catalogModules, roleSelections) {
  let count = 0;

  for (const section of getRoleCatalogSections(role, catalogModules)) {
    for (const entry of section.entries) {
      if (entry.selectable && isEntrySelectedForRole(entry, role, roleSelections)) {
        count += 1;
      }
    }
  }

  return count;
}

export function isEntrySelectedForRole(entry, role, roleSelections) {
  if (!entry.selectable) return false;
  const { featureIds, moduleIds } = getRoleSelection(roleSelections, role);
  if (entry.feature) return featureIds.includes(entry.feature.id);
  if (entry.module) return moduleIds.includes(entry.module.id);
  return false;
}

export function toggleCatalogEntryForRole(entry, role, enabled, roleSelections) {
  const current = getRoleSelection(roleSelections, role);
  const nextFeatureIds = new Set(current.featureIds);
  const nextModuleIds = new Set(current.moduleIds);

  if (!entry.selectable) {
    return roleSelections;
  }

  if (entry.feature) {
    if (enabled) {
      nextFeatureIds.add(entry.feature.id);
      if (entry.module) nextModuleIds.add(entry.module.id);
    } else {
      nextFeatureIds.delete(entry.feature.id);
      if (entry.module) {
        const modFeatureIds = (entry.module.features || []).map((f) => f.id);
        const anyLeft = modFeatureIds.some((id) => nextFeatureIds.has(id));
        if (!anyLeft) nextModuleIds.delete(entry.module.id);
      }
    }
  } else if (entry.module) {
    const modFeatureIds = (entry.module.features || []).map((f) => f.id);
    if (enabled) {
      nextModuleIds.add(entry.module.id);
      modFeatureIds.forEach((id) => nextFeatureIds.add(id));
    } else {
      nextModuleIds.delete(entry.module.id);
      modFeatureIds.forEach((id) => nextFeatureIds.delete(id));
    }
  }

  return {
    ...roleSelections,
    [role]: {
      featureIds: [...nextFeatureIds],
      moduleIds: [...nextModuleIds],
    },
  };
}

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role;
}
