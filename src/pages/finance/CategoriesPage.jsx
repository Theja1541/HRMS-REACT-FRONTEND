import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Search, Trash2, Tags } from 'lucide-react';
import { financeApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import FinanceModuleGuide from '../../components/finance/FinanceModuleGuide';
import TablePagination from '../../components/shared/TablePagination';
import {
  CATEGORY_TYPES,
  CATEGORY_TYPE_LABELS,
  EMPTY_CATEGORY_FORM,
} from '../../constants/finance';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { useTablePagination } from '../../hooks/useTablePagination';

function categoryToForm(category) {
  return {
    name: category.name || '',
    type: category.type || 'expense',
    description: category.description || '',
    active: category.active !== false,
  };
}

function buildPayload(form) {
  return {
    name: form.name.trim(),
    type: form.type,
    description: form.description.trim() || null,
    active: form.active,
  };
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_CATEGORY_FORM);
  const [formError, setFormError] = useState('');
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [search, typeFilter, showInactive] });

  const listParams = useMemo(
    () => ({
      search: search || undefined,
      type: typeFilter || undefined,
      active_only: showInactive ? undefined : 'true',
    }),
    [search, typeFilter, showInactive]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['finance-categories', selectedTenantId, listParams],
    queryFn: () => financeApi.listCategories(listParams),
    enabled: !tenantRequired,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['finance-categories'] });
    queryClient.invalidateQueries({ queryKey: ['finance-coa-active'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => financeApi.createCategory(payload),
    onSuccess: () => {
      invalidate();
      setModal(null);
      setForm(EMPTY_CATEGORY_FORM);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to create category'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => financeApi.updateCategory(id, payload),
    onSuccess: () => {
      invalidate();
      setModal(null);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to update category'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => financeApi.deleteCategory(id),
    onSuccess: invalidate,
    onError: (err) => {
      window.alert(err.response?.data?.error?.message || 'Failed to delete category');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }) => financeApi.updateCategory(id, { active }),
    onSuccess: invalidate,
  });

  const categories = data?.data?.categories || [];
  const { items: visibleCategories, pagination } = paginateClient(categories);
  const incomeCount = categories.filter((c) => c.type === 'income').length;
  const expenseCount = categories.filter((c) => c.type === 'expense').length;

  const openCreate = () => {
    setForm(EMPTY_CATEGORY_FORM);
    setFormError('');
    setModal('create');
  };

  const openEdit = (category) => {
    setForm(categoryToForm(category));
    setFormError('');
    setModal({ mode: 'edit', id: category.id, type: category.type });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Category name is required');
      return;
    }

    const payload = buildPayload(form);
    if (modal === 'create') {
      createMutation.mutate(payload);
    } else if (modal?.mode === 'edit') {
      updateMutation.mutate({ id: modal.id, payload: { name: payload.name, description: payload.description, active: payload.active } });
    }
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to manage categories.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        subtitle="Income and expense labels used on transactions"
        actions={
          <button type="button" onClick={openCreate} className="btn-primary">
            <Plus size={14} /> Add Category
          </button>
        }
      />

      <FinanceModuleGuide page="categories" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Categories" value={categories.length} icon={Tags} />
        <StatCard label="Income" value={incomeCount} delta="Revenue heads" deltaType="neutral" />
        <StatCard label="Expense" value={expenseCount} delta="Cost heads" deltaType="neutral" />
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or description…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">All types</option>
            {CATEGORY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600 px-2">
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

      <div className="card overflow-x-auto overscroll-x-contain">
        {isLoading ? (
          <p className="text-center py-12 text-slate-400">Loading categories…</p>
        ) : error ? (
          <p className="text-center py-12 text-red-500">Failed to load categories</p>
        ) : categories.length === 0 ? (
          <p className="text-center py-12 text-slate-400">No categories found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Category</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Linked COA</th>
                  <th className="text-left px-4 py-3 font-semibold">Description</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleCategories.map((category) => (
                  <tr key={category.id} className={cn('hover:bg-slate-50', !category.active && 'opacity-60')}>
                    <td className="px-4 py-3 font-medium text-slate-900">{category.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                          category.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        )}
                      >
                        {CATEGORY_TYPE_LABELS[category.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {category.account ? (
                        <div>
                          <p className="font-mono text-slate-700">{category.account.code}</p>
                          <p className="text-slate-600">{category.account.name}</p>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{category.description || '—'}</td>
                    <td className="px-4 py-3">
                      <ActiveToggle
                        active={category.active}
                        disabled={toggleActiveMutation.isPending}
                        onChange={(active) => toggleActiveMutation.mutate({ id: category.id, active })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(category)}
                          className="p-1.5 text-slate-400 hover:text-brand-600"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete category "${category.name}" and deactivate its COA account?`)) {
                              deleteMutation.mutate(category.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {modal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
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

              <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />

              {modal === 'create' ? (
                <Select
                  label="Type"
                  value={form.type}
                  onChange={(v) => setForm({ ...form, type: v })}
                  options={CATEGORY_TYPES}
                />
              ) : (
                <div>
                  <label className="text-xs font-medium text-slate-600">Type</label>
                  <p className="mt-1 text-sm text-slate-700">{CATEGORY_TYPE_LABELS[modal.type]}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Type cannot be changed after creation</p>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-600">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Optional notes for this category"
                />
              </div>

              {modal?.mode === 'edit' && (
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Active category (syncs linked COA account)
                </label>
              )}

              {modal === 'create' && (
                <p className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                  A chart-of-accounts entry will be created automatically with a matching income/expense type.
                </p>
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
        </div>
      )}
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
      title={active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
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

function Field({ label, value, onChange, required }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
