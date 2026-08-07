import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../../utils/helpers';
import {
  PLAN_CONFIG_ROLES,
  countSelectedInRole,
  getRoleCatalogSections,
  getRoleLabel,
  isEntrySelectedForRole,
  toggleCatalogEntryForRole,
} from '../../../constants/planRoleCatalog';
import { mergeRoleSelections } from '../../../constants/subscriptionPlans';

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function inputClass(extra = '') {
  return `w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 ${extra}`;
}

export default function PlanFormModal({
  open,
  form,
  isEdit,
  catalogModules,
  catalogLoading,
  catalogError,
  saving,
  error,
  onClose,
  onChange,
  onSave,
}) {
  const [localForm, setLocalForm] = useState(form);
  const [activeRole, setActiveRole] = useState(PLAN_CONFIG_ROLES[0]?.role ?? 'owner');
  const [search, setSearch] = useState('');

  const mergedSelections = useMemo(
    () => mergeRoleSelections(localForm.roleSelections),
    [localForm.roleSelections]
  );

  const roleSections = useMemo(
    () => getRoleCatalogSections(activeRole, catalogModules),
    [activeRole, catalogModules]
  );

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roleSections;

    return roleSections
      .map((section) => {
        const entries = section.entries.filter(
          (entry) =>
            entry.label.toLowerCase().includes(q) ||
            entry.path?.toLowerCase().includes(q) ||
            entry.module?.name?.toLowerCase().includes(q) ||
            entry.module?.code?.toLowerCase().includes(q)
        );
        return entries.length ? { ...section, entries } : null;
      })
      .filter(Boolean);
  }, [roleSections, search]);

  useEffect(() => {
    if (open) setLocalForm(form);
  }, [open, form]);

  useEffect(() => {
    if (open) {
      setActiveRole(PLAN_CONFIG_ROLES[0]?.role ?? 'owner');
      setSearch('');
    }
  }, [open]);

  if (!open) return null;

  const updateForm = (patch) => {
    const next = { ...localForm, ...patch };
    setLocalForm(next);
    onChange?.(next);
  };

  const toggleEntry = (entry, enabled) => {
    const nextRoleSelections = toggleCatalogEntryForRole(
      entry,
      activeRole,
      enabled,
      localForm.roleSelections
    );
    updateForm({ roleSelections: nextRoleSelections });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(localForm);
  };

  return (
    <div className="modal-backdrop !z-[110]">
      <div className="modal-panel sm:max-w-5xl">
        <div className="modal-panel-header">
          <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
            {isEdit ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="modal-panel-body grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4">
              <Field label="Plan Name" required>
                <input
                  required
                  value={localForm.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  className={inputClass()}
                  placeholder="e.g. Professional Tier"
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={localForm.description || ''}
                  onChange={(e) => updateForm({ description: e.target.value })}
                  rows={3}
                  maxLength={2000}
                  className={inputClass('resize-y min-h-[72px]')}
                  placeholder="Short summary shown to tenants when upgrading"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Monthly Price (₹)" required>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={localForm.monthly_price}
                    onChange={(e) => updateForm({ monthly_price: e.target.value })}
                    className={inputClass()}
                  />
                </Field>
                <Field label="Yearly Price (₹)" required>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={localForm.yearly_price}
                    onChange={(e) => updateForm({ yearly_price: e.target.value })}
                    className={inputClass()}
                  />
                </Field>
              </div>

              <Field label="Employee Limit">
                <input
                  type="number"
                  min="1"
                  value={localForm.employee_limit}
                  onChange={(e) => updateForm({ employee_limit: e.target.value })}
                  placeholder="Unlimited"
                  className={inputClass()}
                />
              </Field>

              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localForm.is_active}
                  onChange={(e) => updateForm({ is_active: e.target.checked })}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                />
                Plan is active
              </label>

              <p className="text-xs text-slate-500">
                {mergedSelections.moduleIds.length} module(s) · {mergedSelections.featureIds.length} page(s) selected
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Role coverage
                </p>
                <div className="space-y-1.5">
                  {PLAN_CONFIG_ROLES.map(({ role, label }) => {
                    const total = getRoleCatalogSections(role, catalogModules).reduce(
                      (sectionSum, section) => sectionSum + section.entries.filter((e) => e.selectable).length,
                      0
                    );
                    const selected = countSelectedInRole(role, catalogModules, localForm.roleSelections);
                    return (
                      <div key={role} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{label}</span>
                        <span className={cn('font-medium', selected > 0 ? 'text-brand-600' : 'text-slate-400')}>
                          {selected}/{total} pages
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col min-h-0">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Modules &amp; Pages by Role</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Browse the same nav matrix as Roles &amp; Permissions to pick pages included in this plan
                  </p>
                </div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
                {PLAN_CONFIG_ROLES.map(({ role, label }) => {
                  const selected = countSelectedInRole(role, catalogModules, localForm.roleSelections);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setActiveRole(role)}
                      className={cn(
                        'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        activeRole === role
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      )}
                    >
                      {label}
                      {selected > 0 && (
                        <span
                          className={cn(
                            'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
                            activeRole === role ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-700'
                          )}
                        >
                          {selected}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${getRoleLabel(activeRole)} modules or pages…`}
                  className={inputClass('pl-9')}
                />
              </div>

              <div className="border border-slate-200 rounded-xl overflow-y-auto flex-1 max-h-[420px] bg-slate-50/50 p-3 space-y-4">
                {catalogLoading ? (
                  <p className="text-xs text-slate-400 text-center py-8">Loading modules catalog…</p>
                ) : catalogError ? (
                  <p className="text-xs text-red-500 text-center py-8">{catalogError}</p>
                ) : catalogModules.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No modules in catalog</p>
                ) : filteredSections.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    {search ? 'No pages match your search' : `No pages defined for ${getRoleLabel(activeRole)}`}
                  </p>
                ) : (
                  filteredSections.map((section) => (
                    <div key={section.label}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-1 mb-2">
                        {section.label}
                        <span className="text-slate-400 font-normal normal-case ml-1">
                          ({section.entries.length})
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {section.entries.map((entry) => {
                          const selected = isEntrySelectedForRole(entry, activeRole, localForm.roleSelections);
                          return (
                            <button
                              key={entry.key}
                              type="button"
                              disabled={!entry.selectable}
                              onClick={() => entry.selectable && toggleEntry(entry, !selected)}
                              title={
                                entry.selectable
                                  ? entry.module
                                    ? `${entry.module.name}${entry.path ? ` · ${entry.path}` : ''}`
                                    : entry.path
                                  : 'Always included — not part of subscription catalog'
                              }
                              className={cn(
                                'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                                !entry.selectable &&
                                  'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed',
                                entry.selectable &&
                                  !selected &&
                                  'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-700',
                                entry.selectable &&
                                  selected &&
                                  'bg-brand-100 text-brand-800 border-brand-300 ring-1 ring-brand-200'
                              )}
                            >
                              {entry.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <p className="text-[10px] text-slate-400 mt-2">
                Role tabs organize the catalog for selection. The plan stores the combined module and page
                entitlements across all roles.
              </p>
            </div>
          </div>

          {error && (
            <div className="px-6 pb-2">
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            </div>
          )}

          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || catalogLoading || !localForm.catalogHydrated}
              className={cn('btn-primary', (saving || catalogLoading) && 'opacity-70')}
            >
              {saving ? 'Saving…' : catalogLoading ? 'Loading catalog…' : isEdit ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
