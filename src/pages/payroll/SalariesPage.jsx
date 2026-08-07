import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, IndianRupee, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { payrollApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { useTablePagination } from '../../hooks/useTablePagination';
import SalaryStructureEditor from '../employees/employeeWizard/SalaryStructureEditor';
import {
  INITIAL_SALARY_STRUCTURE,
  buildSalaryAssignPayload,
  mapSalaryRecordToStructure,
  validateWizardStructure,
} from '../employees/employeeWizard/salaryStructure';
import { formatINR } from '../../utils/helpers';
import { usePortalRole } from '../../hooks/usePortalRole';
import { ADMIN_ROLES } from '../../constants/routeAccess';

const EMPTY_STRUCTURE = { ...INITIAL_SALARY_STRUCTURE, skip_salary: false };

function firstOfCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const INITIAL_STRUCTURE_FORM = {
  employee_id: '',
  effective_from: firstOfCurrentMonth(),
  revision_reason: '',
  salary_structure: { ...EMPTY_STRUCTURE },
  salary_structure_template_id: '',
};

export default function SalariesPage() {
  const queryClient = useQueryClient();
  const role = usePortalRole();
  const canWrite = ADMIN_ROLES.includes(role);
  const [showAssign, setShowAssign] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [structureForm, setStructureForm] = useState(INITIAL_STRUCTURE_FORM);
  const [formError, setFormError] = useState('');
  const { setPage, setLimit, paginateClient } = useTablePagination();

  const { data, isLoading } = useQuery({
    queryKey: ['salaries'],
    queryFn: () => payrollApi.listSalaries(),
  });

  const closeAssign = () => {
    setShowAssign(false);
    setIsEditMode(false);
    setFormError('');
    setStructureForm({
      ...INITIAL_STRUCTURE_FORM,
      effective_from: firstOfCurrentMonth(),
      salary_structure: { ...EMPTY_STRUCTURE },
    });
  };

  const openAssign = () => {
    setIsEditMode(false);
    setFormError('');
    setStructureForm({
      ...INITIAL_STRUCTURE_FORM,
      effective_from: firstOfCurrentMonth(),
      salary_structure: { ...EMPTY_STRUCTURE },
    });
    setShowAssign(true);
  };

  const openEdit = (emp) => {
    const s = emp.salary;
    setIsEditMode(!!s);
    setFormError('');
    setStructureForm({
      employee_id: String(emp.id),
      effective_from: s?.effective_from
        ? String(s.effective_from).slice(0, 10)
        : firstOfCurrentMonth(),
      revision_reason: s ? 'Salary revision' : '',
      salary_structure: s ? mapSalaryRecordToStructure(s) : { ...EMPTY_STRUCTURE },
      salary_structure_template_id: '',
    });
    setShowAssign(true);
  };

  const assignStructureMutation = useMutation({
    mutationFn: payrollApi.assignSalaryStructure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      queryClient.invalidateQueries({ queryKey: ['salaries-registry'] });
      closeAssign();
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to save salary structure'),
  });

  const employees = data?.data?.employees || [];
  const { items: visibleEmployees, pagination } = paginateClient(employees);
  const isSaving = assignStructureMutation.isPending;

  const handleAssignStructure = () => {
    setFormError('');
    if (!structureForm.employee_id) {
      setFormError('Employee is required');
      return;
    }

    const validationError = validateWizardStructure(structureForm.salary_structure);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = buildSalaryAssignPayload(
      parseInt(structureForm.employee_id, 10),
      structureForm.effective_from,
      structureForm.salary_structure,
      structureForm.revision_reason || (isEditMode ? 'Salary revision' : 'Salary assignment'),
      structureForm.salary_structure_template_id || null
    );

    assignStructureMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Payroll · Salaries"
        title="Salaries"
        subtitle="Employee CTC registry and salary assignments"
        actions={
          canWrite && (
            <button type="button" onClick={openAssign} className="btn-primary">
              <Plus size={14} /> Assign Salary
            </button>
          )
        }
      />

      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading salaries…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Employee</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">CTC (Annual)</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Basic</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Net (Est.)</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Effective</th>
                {canWrite && (
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleEmployees.map((emp) => {
                const s = emp.salary;
                let netEst = null;
                if (s) {
                  const gross =
                    s.other_allowances?.gross_monthly ??
                    parseFloat(s.basic || 0) +
                      parseFloat(s.hra || 0) +
                      parseFloat(s.conveyance || 0) +
                      parseFloat(s.medical_allowance || 0) +
                      parseFloat(s.special_allowance || 0);
                  netEst =
                    s.other_allowances?.net_monthly ??
                    gross -
                      parseFloat(s.tds_monthly || 0) -
                      parseFloat(s.other_allowances?.medical_insurance || 0);
                }
                return (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/employees/${emp.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                        {emp.first_name} {emp.last_name}
                      </Link>
                      <p className="text-xs text-slate-400 font-mono">{emp.emp_code}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {s ? formatINR(s.ctc_annual) : <span className="text-amber-600">Not assigned</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{s ? formatINR(s.basic) : '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-emerald-700">{netEst ? formatINR(netEst) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{s?.effective_from || '—'}</td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(emp)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil size={12} />
                          {s ? 'Edit' : 'Assign'}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
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

      {canWrite && showAssign && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[92dvh] sm:max-h-[90vh] shadow-xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="font-semibold flex items-center gap-2">
                <IndianRupee size={16} /> {isEditMode ? 'Edit Salary' : 'Assign Salary'}
              </h3>
              <button type="button" onClick={closeAssign} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600">Employee</label>
                  <select
                    value={structureForm.employee_id}
                    onChange={(e) => setStructureForm({ ...structureForm, employee_id: e.target.value })}
                    disabled={isEditMode}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-600"
                  >
                    <option value="">Select employee</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.emp_code} — {e.first_name} {e.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Effective From</label>
                  <input
                    type="date"
                    value={structureForm.effective_from}
                    onChange={(e) => setStructureForm({ ...structureForm, effective_from: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  {isEditMode && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Same date updates the current record. A new date creates a salary revision.
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600">Revision reason (optional)</label>
                  <input
                    type="text"
                    value={structureForm.revision_reason}
                    onChange={(e) => setStructureForm({ ...structureForm, revision_reason: e.target.value })}
                    placeholder="e.g. Annual increment, promotion"
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <SalaryStructureEditor
                structure={structureForm.salary_structure}
                onChange={(salary_structure) =>
                  setStructureForm((prev) => ({ ...prev, salary_structure }))
                }
                templateId={structureForm.salary_structure_template_id}
                onTemplateIdChange={(salary_structure_template_id) =>
                  setStructureForm((prev) => ({
                    ...prev,
                    salary_structure_template_id,
                    ...(salary_structure_template_id
                      ? {}
                      : { salary_structure: { ...EMPTY_STRUCTURE } }),
                  }))
                }
                employeeId={structureForm.employee_id}
                showSkipOption={false}
              />
            </div>

            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2 shrink-0 bg-white">
              <button type="button" onClick={closeAssign} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleAssignStructure}
                className="btn-primary"
              >
                {isSaving ? 'Saving…' : isEditMode ? 'Save Changes' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
