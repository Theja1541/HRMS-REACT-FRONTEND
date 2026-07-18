import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  GripVertical,
  Pencil,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import { hrApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import { CLEARANCE_DEPARTMENT_LABELS, CLEARANCE_DEPARTMENTS } from '../../constants/hr';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';

// ─── Constants ────────────────────────────────────────────────────────────────

const EXIT_TYPE_OPTIONS = [
  { value: 'resignation', label: 'Resignation' },
  { value: 'termination', label: 'Termination' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'absconding', label: 'Absconding' },
];

const CATEGORY_OPTIONS = [
  { value: 'hr', label: 'HR' },
  { value: 'it', label: 'IT' },
  { value: 'finance', label: 'Finance' },
  { value: 'admin', label: 'Admin' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'assets', label: 'Assets' },
];

const ASSIGNEE_ROLE_OPTIONS = [
  { value: 'hr', label: 'HR' },
  { value: 'it', label: 'IT' },
  { value: 'finance', label: 'Finance' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
];

const DEPARTMENT_OPTIONS = CLEARANCE_DEPARTMENTS.map((value) => ({
  value,
  label: CLEARANCE_DEPARTMENT_LABELS[value],
}));

function inferDepartment(item) {
  if (item.department && CLEARANCE_DEPARTMENTS.includes(item.department)) return item.department;
  if (CLEARANCE_DEPARTMENTS.includes(item.default_assignee_role)) return item.default_assignee_role;
  if (item.category === 'it') return 'it';
  if (item.category === 'finance') return 'finance';
  if (item.category === 'admin' || item.category === 'assets') return 'admin';
  return 'hr';
}

const EMPTY_ITEM = {
  title: '',
  description: '',
  category: 'hr',
  department: 'hr',
  is_mandatory: true,
  default_assignee_role: 'hr',
  due_days_before_lwd: '',
};

const EMPTY_FORM = {
  name: '',
  description: '',
  exit_type: '',
  is_default: false,
  is_active: true,
  items: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function exitTypeLabel(value) {
  return EXIT_TYPE_OPTIONS.find((t) => t.value === value)?.label ?? value;
}

function itemsToForm(items = []) {
  return items.map((item) => ({
    id: item.id,
    title: item.title || '',
    description: item.description || '',
    category: item.category || 'hr',
    department: inferDepartment(item),
    is_mandatory: item.is_mandatory !== false,
    default_assignee_role: item.default_assignee_role || 'hr',
    due_days_before_lwd: item.due_days_before_lwd ?? '',
  }));
}

function buildPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    exit_type: form.exit_type || null,
    is_default: form.is_default,
    is_active: form.is_active,
    items: form.items.map((item, i) => ({
      ...(item.id ? { id: item.id } : {}),
      title: item.title.trim(),
      description: item.description?.trim() || null,
      category: item.category,
      department: item.department || inferDepartment(item),
      is_mandatory: item.is_mandatory,
      default_assignee_role: item.default_assignee_role,
      due_days_before_lwd:
        item.due_days_before_lwd !== '' && item.due_days_before_lwd != null
          ? Number(item.due_days_before_lwd)
          : null,
      sort_order: i,
    })),
  };
}

// ─── ItemRow (inside modal) ───────────────────────────────────────────────────

function ItemRow({ item, index, onChange, onRemove }) {
  return (
    <div className="flex gap-2 items-start py-2.5 border-b border-slate-100 last:border-0">
      <span className="mt-2 text-slate-300 shrink-0">
        <GripVertical size={13} />
      </span>
      <div className="flex-1 space-y-1.5">
        <div className="flex gap-2">
          <input
            value={item.title}
            onChange={(e) => onChange(index, { ...item, title: e.target.value })}
            placeholder="Item title *"
            className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
          />
          <select
            value={item.category}
            onChange={(e) => {
              const category = e.target.value;
              const next = { ...item, category };
              if (!item.department || item.department === inferDepartment(item)) {
                next.department = inferDepartment({ ...next, department: null });
              }
              onChange(index, next);
            }}
            className="w-28 px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
            title="Category"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            value={item.department || 'hr'}
            onChange={(e) => onChange(index, { ...item, department: e.target.value })}
            className="w-28 px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
            title="Approving department"
          >
            {DEPARTMENT_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
          <input
            value={item.description}
            onChange={(e) => onChange(index, { ...item, description: e.target.value })}
            placeholder="Description (optional)"
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
          />
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 shrink-0">Assign to</span>
            <select
              value={item.default_assignee_role}
              onChange={(e) => onChange(index, { ...item, default_assignee_role: e.target.value })}
              className="px-2 py-1 border border-slate-200 rounded-lg text-xs"
            >
              {ASSIGNEE_ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={365}
              value={item.due_days_before_lwd}
              onChange={(e) => onChange(index, { ...item, due_days_before_lwd: e.target.value })}
              placeholder="—"
              className="w-14 px-2 py-1 border border-slate-200 rounded-lg text-xs text-center"
            />
            <span className="text-[10px] text-slate-400 shrink-0">days before LWD</span>
          </div>
          <label className="flex items-center gap-1 text-xs text-slate-600 ml-auto">
            <input
              type="checkbox"
              checked={item.is_mandatory}
              onChange={(e) => onChange(index, { ...item, is_mandatory: e.target.checked })}
            />
            Mandatory
          </label>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="mt-2 p-1 text-slate-300 hover:text-red-500 shrink-0"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ─── ExpandedItems (read-only list in card) ───────────────────────────────────

function ExpandedItems({ templateId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['separation-clearance-template-detail', templateId],
    queryFn: () => hrApi.getSeparationClearanceTemplate(templateId),
    staleTime: 30_000,
  });

  const items = data?.data?.template?.items ?? [];

  if (isLoading) {
    return <p className="mt-3 text-xs text-slate-400">Loading items…</p>;
  }

  if (!items.length) {
    return <p className="mt-3 text-xs text-slate-400 italic">No checklist items defined</p>;
  }

  return (
    <div className="mt-3 border border-slate-100 rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase text-slate-400 tracking-wide">
            <th className="text-left px-3 py-2 w-6">#</th>
            <th className="text-left px-3 py-2">Title</th>
            <th className="text-left px-3 py-2 hidden sm:table-cell">Dept</th>
            <th className="text-left px-3 py-2 hidden sm:table-cell">Assigned to</th>
            <th className="text-left px-3 py-2 hidden md:table-cell">Due</th>
            <th className="text-left px-3 py-2">Required</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {items.map((item, i) => (
            <tr key={item.id} className="hover:bg-slate-50/50">
              <td className="px-3 py-2 text-slate-400">{i + 1}</td>
              <td className="px-3 py-2 text-slate-700 font-medium">{item.title}</td>
              <td className="px-3 py-2 text-slate-500 capitalize hidden sm:table-cell">
                {CLEARANCE_DEPARTMENT_LABELS[inferDepartment(item)] ?? item.department}
              </td>
              <td className="px-3 py-2 text-slate-500 capitalize hidden sm:table-cell">
                {ASSIGNEE_ROLE_OPTIONS.find((r) => r.value === item.default_assignee_role)?.label ??
                  item.default_assignee_role}
              </td>
              <td className="px-3 py-2 text-slate-400 hidden md:table-cell">
                {item.due_days_before_lwd != null ? `${item.due_days_before_lwd}d` : '—'}
              </td>
              <td className="px-3 py-2">
                {item.is_mandatory ? (
                  <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                    Mandatory
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Optional</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── TemplateModal ────────────────────────────────────────────────────────────

function TemplateModal({ mode, form, setForm, onClose, onSubmit, loading, error }) {
  const addItem = () => {
    setForm({ ...form, items: [...form.items, { ...EMPTY_ITEM, _key: Date.now() }] });
  };

  const updateItem = (index, updated) => {
    const items = [...form.items];
    items[index] = updated;
    setForm({ ...form, items });
  };

  const removeItem = (index) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <h3 className="font-semibold text-slate-900">
            {mode === 'create' ? 'New Clearance Template' : 'Edit Clearance Template'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Templates define the checklist automatically attached when a separation is approved.
          </p>
        </div>

        <form
          className="flex flex-col flex-1 min-h-0"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Template fields */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600">Template name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="e.g. Standard Exit Checklist"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600">Applies to exit type</label>
                  <select
                    value={form.exit_type}
                    onChange={(e) => setForm({ ...form, exit_type: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">All exit types</option>
                    {EXIT_TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col justify-end gap-3 pb-0.5">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.is_default}
                      onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                      disabled={mode === 'edit' && form.is_default}
                    />
                    Default template
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                  placeholder="Optional — describe when this template should be used"
                />
              </div>
            </div>

            {/* Items section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Checklist items
                  <span className="ml-1.5 font-normal text-slate-400 normal-case tracking-normal">
                    ({form.items.length})
                  </span>
                </p>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  <Plus size={12} /> Add item
                </button>
              </div>

              {form.items.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
                  onClick={addItem}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                >
                  <ClipboardList size={20} className="text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">Click to add the first checklist item</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl px-3">
                  {form.items.map((item, i) => (
                    <ItemRow
                      key={item.id ?? item._key ?? i}
                      item={item}
                      index={i}
                      onChange={updateItem}
                      onRemove={removeItem}
                    />
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary text-xs">
              {loading ? 'Saving…' : 'Save template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClearanceTemplatePage() {
  const queryClient = useQueryClient();
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;

  const [showInactive, setShowInactive] = useState(false);
  const [exitTypeFilter, setExitTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  const listParams = useMemo(
    () => ({
      status: showInactive ? undefined : 'active',
      exit_type: exitTypeFilter || undefined,
      search: search.trim() || undefined,
    }),
    [showInactive, exitTypeFilter, search]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['separation-clearance-templates', selectedTenantId, listParams],
    queryFn: () => hrApi.listSeparationClearanceTemplates(listParams),
    enabled: !tenantRequired,
  });

  const templates = data?.data?.templates ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['separation-clearance-templates'] });

  const createMutation = useMutation({
    mutationFn: (payload) => hrApi.createSeparationClearanceTemplate(payload),
    onSuccess: () => {
      invalidate();
      setModal(null);
      setFormError('');
    },
    onError: (err) =>
      setFormError(err.response?.data?.error?.message || 'Failed to create template'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => hrApi.updateSeparationClearanceTemplate(id, payload),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['separation-clearance-template-detail'] });
      setModal(null);
      setFormError('');
    },
    onError: (err) =>
      setFormError(err.response?.data?.error?.message || 'Failed to update template'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => hrApi.deleteSeparationClearanceTemplate(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['separation-clearance-template-detail'] });
    },
    onError: (err) =>
      window.alert(err.response?.data?.error?.message || 'Failed to delete template'),
  });

  const toggleActive = (template) => {
    updateMutation.mutate({
      id: template.id,
      payload: { is_active: !template.is_active },
    });
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setModal('create');
  };

  const openEdit = async (template) => {
    setFormError('');
    setDetailLoading(true);
    try {
      const res = await hrApi.getSeparationClearanceTemplate(template.id);
      const t = res?.data?.template ?? template;
      setForm({
        name: t.name || '',
        description: t.description || '',
        exit_type: t.exit_type || '',
        is_default: !!t.is_default,
        is_active: t.is_active !== false,
        items: itemsToForm(t.items || []),
      });
    } catch {
      setForm({
        name: template.name || '',
        description: template.description || '',
        exit_type: template.exit_type || '',
        is_default: !!template.is_default,
        is_active: template.is_active !== false,
        items: [],
      });
    } finally {
      setDetailLoading(false);
      setModal({ id: template.id });
    }
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setFormError('Template name is required');
      return;
    }
    if (form.items.some((item) => !item.title.trim())) {
      setFormError('All checklist items must have a title');
      return;
    }
    const payload = buildPayload(form);
    if (modal === 'create') {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: modal.id, payload });
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to manage clearance templates.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clearance Templates"
        subtitle="Define exit checklists that are automatically assigned when a separation is approved"
        actions={
          <button type="button" onClick={openCreate} className="btn-primary text-xs">
            <Plus size={14} /> New template
          </button>
        }
      />

      <div className="card">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs w-44"
          />
          <select
            value={exitTypeFilter}
            onChange={(e) => setExitTypeFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
          >
            <option value="">All exit types</option>
            {EXIT_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-slate-600 ml-auto">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
        </div>

        {/* Content */}
        {isLoading ? (
          <p className="p-8 text-center text-slate-400 text-sm">Loading templates…</p>
        ) : error ? (
          <p className="p-8 text-center text-red-500 text-sm">
            {error.response?.data?.error?.message || error.message}
          </p>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No clearance templates found</p>
            <button type="button" onClick={openCreate} className="btn-primary text-xs mt-4">
              <Plus size={13} /> Create first template
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {templates.map((t) => {
              const expanded = expandedIds.has(t.id);
              return (
                <div key={t.id} className={cn('px-4 py-4', !t.is_active && 'opacity-60')}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ClipboardList size={14} className="text-brand-600 shrink-0" />
                        <h3 className="font-medium text-slate-900 text-sm">{t.name}</h3>
                        {t.is_default && (
                          <span className="text-[10px] font-semibold uppercase bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                        {!t.is_active && (
                          <span className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            Inactive
                          </span>
                        )}
                        {t.exit_type ? (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                            {exitTypeLabel(t.exit_type)}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full">
                            All exit types
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-xs text-slate-500 mt-1">{t.description}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">
                        {t.item_count ?? t.items?.length ?? 0} checklist item
                        {(t.item_count ?? t.items?.length ?? 0) !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleExpand(t.id)}
                        title={expanded ? 'Collapse items' : 'Preview items'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                      >
                        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(t)}
                        title="Edit template"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(t)}
                        disabled={updateMutation.isPending}
                        title={t.is_active ? 'Deactivate' : 'Activate'}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors',
                          t.is_active
                            ? 'text-emerald-500 hover:text-slate-500 hover:bg-slate-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        )}
                      >
                        {t.is_active ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                      </button>
                      {!t.is_default && (
                        <button
                          type="button"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete template "${t.name}"? This cannot be undone.`
                              )
                            ) {
                              deleteMutation.mutate(t.id);
                            }
                          }}
                          title="Delete template"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {expanded && <ExpandedItems templateId={t.id} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal — only mount after detail fetch resolves to avoid flicker */}
      {modal && !detailLoading && (
        <TemplateModal
          mode={modal === 'create' ? 'create' : 'edit'}
          form={form}
          setForm={setForm}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
          error={formError}
        />
      )}

      {/* Detail-fetch loading overlay */}
      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30">
          <div className="bg-white rounded-xl px-6 py-4 text-sm text-slate-600 shadow-xl">
            Loading template…
          </div>
        </div>
      )}
    </div>
  );
}
