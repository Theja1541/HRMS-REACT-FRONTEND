import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Search, Trash2, Tags } from 'lucide-react';
import { Link } from 'react-router-dom';
import { platformApi, employeeApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import MainContentModal from '../../components/shared/MainContentModal';
import TablePagination from '../../components/shared/TablePagination';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';
import { useTablePagination } from '../../hooks/useTablePagination';

const EMPTY_FORM = {
  name: '',
  code: '',
  is_active: true,
  default_assignee_id: '',
  sort_order: '0',
};

function categoryToForm(category) {
  return {
    name: category.name || '',
    code: category.code || '',
    is_active: category.is_active !== false,
    default_assignee_id: category.default_assignee_id ? String(category.default_assignee_id) : '',
    sort_order: String(category.sort_order ?? 0),
  };
}

function buildPayload(form) {
  return {
    name: form.name.trim(),
    code: form.code.trim().toLowerCase(),
    is_active: form.is_active,
    default_assignee_id: form.default_assignee_id ? parseInt(form.default_assignee_id, 10) : null,
    sort_order: parseInt(form.sort_order, 10) || 0,
  };
}

function slugifyCode(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
}

function assigneeLabel(category) {
  const assignee = category.defaultAssignee;
  if (!assignee) return '—';
  return `${assignee.first_name} ${assignee.last_name}${assignee.emp_code ? ` (${assignee.emp_code})` : ''}`;
}

export default function HelpdeskCategoriesPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;

  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [search, showInactive] });

  const listParams = useMemo(
    () => ({
      search: search || undefined,
      status: showInactive ? undefined : 'active',
    }),
    [search, showInactive]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['helpdesk-categories-admin', selectedTenantId, listParams],
    queryFn: () => platformApi.listHelpdeskCategories(listParams),
    enabled: !tenantRequired,
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-helpdesk-categories'],
    queryFn: () => employeeApi.list({ limit: 500, status: 'active' }),
    enabled: !tenantRequired,
  });

  const employees = useMemo(() => {
    const list = empData?.data?.employees || [];
    return [...list].sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    );
  }, [empData]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['helpdesk-categories-admin'] });
    queryClient.invalidateQueries({ queryKey: ['helpdesk-categories'] });
    queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => platformApi.createHelpdeskCategory(payload),
    onSuccess: () => {
      invalidate();
      setModal(null);
      setForm(EMPTY_FORM);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to create category'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => platformApi.updateHelpdeskCategory(id, payload),
    onSuccess: () => {
      invalidate();
      setModal(null);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to update category'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => platformApi.deleteHelpdeskCategory(id),
    onSuccess: invalidate,
    onError: (err) => {
      window.alert(err.response?.data?.error?.message || 'Failed to delete category');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => platformApi.updateHelpdeskCategory(id, { is_active }),
    onSuccess: invalidate,
  });

  const categories = data?.data?.categories || [];
  const { items: visibleCategories, pagination } = paginateClient(categories);
  const activeCount = categories.filter((c) => c.is_active).length;
  const inUseCount = categories.filter((c) => (c.ticket_count || 0) > 0).length;

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setModal('create');
  };

  const openEdit = (category) => {
    setForm(categoryToForm(category));
    setFormError('');
    setModal({ mode: 'edit', id: category.id });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) {
      setFormError('Category name is required');
      return;
    }
    if (!form.code.trim()) {
      setFormError('Category code is required');
      return;
    }
    const payload = buildPayload(form);
    if (modal === 'create') {
      createMutation.mutate(payload);
    } else if (modal?.mode === 'edit') {
      updateMutation.mutate({ id: modal.id, payload });
    }
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to manage helpdesk categories.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Platform · Helpdesk"
        title="Helpdesk Categories"
        subtitle="Manage ticket categories, default assignees, and availability"
        actions={(
          <div className="flex items-center gap-2">
            <Link to="/helpdesk" className="btn-secondary text-sm">Back to Helpdesk</Link>
            <button type="button" onClick={openCreate} className="btn-primary">
              <Plus size={14} /> Add Category
            </button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Categories" value={categories.length} icon={Tags} />
        <StatCard label="Active" value={activeCount} delta={`${categories.length - activeCount} inactive`} deltaType="neutral" />
        <StatCard label="In Use" value={inUseCount} delta="Categories with tickets" deltaType="neutral" />
      </div>

      <div className="card overflow-hidden">
        <div className="ds-toolbar">
          <div className="toolbar-row">
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or code…"
              className="ds-input pl-9 w-full"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600 px-2 whitespace-nowrap">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-slate-300"
            />
            Show inactive
          </label>
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        {isLoading ? (
          <p className="text-center py-12 text-slate-400">Loading categories…</p>
        ) : error ? (
          <p className="text-center py-12 text-red-500">Failed to load categories</p>
        ) : categories.length === 0 ? (
          <p className="text-center py-12 text-slate-400">No categories found</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Category</th>
                <th className="text-left px-4 py-3 font-semibold">Code</th>
                <th className="text-left px-4 py-3 font-semibold">Default Assignee</th>
                <th className="text-right px-4 py-3 font-semibold">Tickets</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleCategories.map((category) => (
                <tr key={category.id} className={cn('hover:bg-slate-50', !category.is_active && 'opacity-60')}>
                  <td className="px-4 py-3 font-medium text-slate-900">{category.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{category.code}</td>
                  <td className="px-4 py-3 text-slate-600">{assigneeLabel(category)}</td>
                  <td className="px-4 py-3 text-right font-mono">{category.ticket_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <ActiveToggle
                      active={category.is_active}
                      disabled={toggleActiveMutation.isPending}
                      onChange={(is_active) => toggleActiveMutation.mutate({ id: category.id, is_active })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openEdit(category)} className="p-1.5 text-slate-400 hover:text-brand-600" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={(category.ticket_count || 0) > 0}
                        onClick={() => {
                          if (window.confirm(`Delete category "${category.name}"?`)) {
                            deleteMutation.mutate(category.id);
                          }
                        }}
                        className={cn(
                          'p-1.5',
                          (category.ticket_count || 0) > 0
                            ? 'text-slate-200 cursor-not-allowed'
                            : 'text-slate-400 hover:text-red-500'
                        )}
                        title={(category.ticket_count || 0) > 0 ? 'Category has linked tickets' : 'Delete'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && categories.length > 0 && (
        <TablePagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      <MainContentModal open={Boolean(modal)} onClose={() => setModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl mx-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">
                {modal === 'create' ? 'Add Category' : 'Edit Category'}
              </h3>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs border border-red-100">{formError}</div>
              )}

              <Field
                label="Name"
                value={form.name}
                onChange={(v) => {
                  const next = { ...form, name: v };
                  if (modal === 'create' && (!form.code || form.code === slugifyCode(form.name))) {
                    next.code = slugifyCode(v);
                  }
                  setForm(next);
                }}
                required
              />

              <Field
                label="Code"
                value={form.code}
                onChange={(v) => setForm({ ...form, code: v.toLowerCase().replace(/\s+/g, '_') })}
                required
                hint="Lowercase identifier (e.g. it_support)"
                mono
              />

              <div>
                <label className="text-xs font-medium text-slate-600">Default Assignee</label>
                <select
                  value={form.default_assignee_id}
                  onChange={(e) => setForm({ ...form, default_assignee_id: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">No auto-assign</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}{emp.emp_code ? ` (${emp.emp_code})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">New tickets in this category are assigned automatically.</p>
              </div>

              <Field
                label="Sort Order"
                value={form.sort_order}
                onChange={(v) => setForm({ ...form, sort_order: v.replace(/\D/g, '') })}
                hint="Lower numbers appear first in dropdowns"
              />

              {modal?.mode === 'edit' && (
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Active category
                </label>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
      </MainContentModal>
    </div>
  );
}

function ActiveToggle({ active, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!active)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50',
        active ? 'bg-emerald-500' : 'bg-slate-300'
      )}
      title={active ? 'Active — click to disable' : 'Disabled — click to enable'}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          active ? 'translate-x-4' : 'translate-x-0'
        )}
      />
      <span className="sr-only">{active ? 'Active' : 'Inactive'}</span>
    </button>
  );
}

function Field({ label, value, onChange, required, hint, mono = false }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm', mono && 'font-mono')}
      />
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
