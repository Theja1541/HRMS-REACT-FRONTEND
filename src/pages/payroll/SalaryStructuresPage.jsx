import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Copy, Trash2, Layers } from 'lucide-react';
import { payrollApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { useTablePagination } from '../../hooks/useTablePagination';
import SalaryStructureStep from '../employees/employeeWizard/SalaryStructureStep';
import {
  INITIAL_SALARY_STRUCTURE,
  componentsToWizardStructure,
  computeComponentsTotals,
  validateWizardStructure,
  wizardStructureToComponents,
} from '../employees/employeeWizard/salaryStructure';
import { formatINR } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';

const EMPTY_FORM = {
  name: '',
  is_default: false,
  wizard: { ...INITIAL_SALARY_STRUCTURE, skip_salary: false },
};

function structureToForm(structure) {
  return {
    name: structure.name || '',
    is_default: !!structure.is_default,
    wizard: componentsToWizardStructure(structure.components),
  };
}

export default function SalaryStructuresPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;
  const canWrite = ['super_admin', 'owner', 'hr'].includes(role);

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [search] });

  const { data, isLoading, error } = useQuery({
    queryKey: ['salary-structures', selectedTenantId],
    queryFn: () => payrollApi.listStructures(),
    enabled: !tenantRequired,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['salary-structures'] });

  const createMutation = useMutation({
    mutationFn: (payload) => payrollApi.createStructure(payload),
    onSuccess: () => {
      invalidate();
      setModal(null);
      setForm(EMPTY_FORM);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to create structure'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => payrollApi.updateStructure(id, payload),
    onSuccess: () => {
      invalidate();
      setModal(null);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to update structure'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => payrollApi.deleteStructure(id),
    onSuccess: invalidate,
    onError: (err) => {
      window.alert(err.response?.data?.error?.message || 'Failed to delete structure');
    },
  });

  const structures = data?.data?.structures || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return structures;
    return structures.filter((s) => s.name?.toLowerCase().includes(q));
  }, [structures, search]);
  const { items: visibleStructures, pagination } = paginateClient(filtered);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (structure) => {
    setForm(structureToForm(structure));
    setFormError('');
    setModal({ mode: 'edit', id: structure.id });
  };

  const openDuplicate = (structure) => {
    const base = structureToForm(structure);
    setForm({
      ...base,
      name: `Copy of ${structure.name}`,
      is_default: false,
    });
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openView = (structure) => {
    setForm(structureToForm(structure));
    setFormError('');
    setModal({ mode: 'view', id: structure.id });
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    is_default: form.is_default,
    components: wizardStructureToComponents(form.wizard),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Structure name is required');
      return;
    }

    const validationError = validateWizardStructure(form.wizard);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = buildPayload();
    if (modal?.mode === 'edit') {
      updateMutation.mutate({ id: modal.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (structure) => {
    if (!window.confirm(`Delete salary structure "${structure.name}"?`)) return;
    deleteMutation.mutate(structure.id);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isReadOnly = modal?.mode === 'view';

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Payroll · Structures"
        title="Salary Structures"
        subtitle="Create and manage reusable salary templates for employee assignment"
        actions={
          canWrite && (
            <button type="button" onClick={openCreate} className="btn-primary">
              <Plus size={14} /> New Structure
            </button>
          )
        }
      />

      {tenantRequired && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
          Select a tenant to manage salary structures.
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="ds-toolbar">
          <div className="toolbar-row">
        <input
          type="search"
          placeholder="Search structures…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ds-input flex-1 sm:max-w-sm"
        />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <p className="py-16 text-center text-slate-400 text-sm">Loading structures…</p>
        ) : error ? (
          <p className="py-16 text-center text-red-600 text-sm">Failed to load salary structures</p>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Layers size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">No salary structures yet</p>
            {canWrite && (
              <button type="button" onClick={openCreate} className="btn-primary text-sm mt-4">
                <Plus size={14} /> Create first structure
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-600">Name</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-right">Gross / mo</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-right">Net / mo</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-right">CTC / yr</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-center">Default</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleStructures.map((structure) => {
                  const totals = computeComponentsTotals(structure.components);
                  return (
                    <tr key={structure.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => openView(structure)}
                          className="font-medium text-slate-900 hover:text-brand-600 text-left"
                        >
                          {structure.name}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right font-mono">{formatINR(totals.grossMonthly)}</td>
                      <td className="px-5 py-3 text-right font-mono text-emerald-700">{formatINR(totals.netMonthly)}</td>
                      <td className="px-5 py-3 text-right font-mono font-semibold">{formatINR(totals.ctcYearly)}</td>
                      <td className="px-5 py-3 text-center">
                        {structure.is_default ? (
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                            Default
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          {canWrite && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(structure)}
                                className="p-1.5 text-slate-400 hover:text-brand-600 rounded"
                                title="Edit"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDuplicate(structure)}
                                className="p-1.5 text-slate-400 hover:text-brand-600 rounded"
                                title="Duplicate"
                              >
                                <Copy size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(structure)}
                                disabled={deleteMutation.isPending}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <TablePagination
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-3xl max-h-[92dvh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-slate-900">
                {modal.mode === 'create' && 'New Salary Structure'}
                {modal.mode === 'edit' && 'Edit Salary Structure'}
                {modal.mode === 'view' && 'Salary Structure'}
              </h2>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {formError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Structure name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      disabled={isReadOnly}
                      placeholder="e.g. Standard — L1"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50"
                      maxLength={100}
                    />
                  </div>
                  {!isReadOnly && (
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer sm:pt-6">
                      <input
                        type="checkbox"
                        checked={form.is_default}
                        onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                      />
                      Set as default structure
                    </label>
                  )}
                </div>

                <SalaryStructureStep
                  structure={form.wizard}
                  onChange={(wizard) => setForm({ ...form, wizard })}
                  readOnly={isReadOnly}
                  showSkipOption={false}
                />
              </div>

              <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2 shrink-0 bg-white">
                <button type="button" onClick={() => setModal(null)} className="btn-secondary">
                  {isReadOnly ? 'Close' : 'Cancel'}
                </button>
                {!isReadOnly && (
                  <button type="submit" disabled={isSaving} className="btn-primary">
                    {isSaving ? 'Saving…' : modal.mode === 'edit' ? 'Save changes' : 'Create structure'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
