import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Pencil, Plus, Trash2, Users } from 'lucide-react';
import {
  departmentApi,
  designationApi,
  employeeApi,
  noticePeriodPolicyApi,
} from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
  { value: 'consultant', label: 'Consultant' },
];

const EMPTY_POLICY_FORM = {
  policy_name: '',
  notice_period_days: 30,
  description: '',
  early_release_allowed: true,
  notice_buyout_enabled: false,
  buyout_salary_basis: 'ctc_monthly',
  buyout_days_divisor: 30,
  is_default: false,
  is_active: true,
};

function policyToForm(policy) {
  return {
    policy_name: policy.policy_name || '',
    notice_period_days: policy.notice_period_days ?? 30,
    description: policy.description || '',
    early_release_allowed: policy.early_release_allowed !== false,
    notice_buyout_enabled: !!policy.notice_buyout_enabled,
    buyout_salary_basis: policy.buyout_salary_basis || 'ctc_monthly',
    buyout_days_divisor: policy.buyout_days_divisor ?? 30,
    is_default: !!policy.is_default,
    is_active: policy.is_active !== false,
  };
}

function assignmentLabel(a) {
  if (a.employee) return `Employee: ${a.employee.first_name} ${a.employee.last_name}`;
  if (a.department) return `Dept: ${a.department.name}`;
  if (a.designation) return `Designation: ${a.designation.name}`;
  if (a.employment_type) return `Type: ${a.employment_type.replace(/_/g, ' ')}`;
  return 'All employees';
}

function PolicyModal({ mode, form, setForm, onClose, onSubmit, loading, error }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-xl p-6">
        <h3 className="font-semibold text-slate-900">
          {mode === 'create' ? 'Add Notice Period Policy' : 'Edit Notice Period Policy'}
        </h3>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div>
            <label className="text-xs font-medium text-slate-600">Policy name</label>
            <input
              value={form.policy_name}
              onChange={(e) => setForm({ ...form, policy_name: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Notice period (days)</label>
            <input
              type="number"
              min={0}
              max={365}
              value={form.notice_period_days}
              onChange={(e) => setForm({ ...form, notice_period_days: parseInt(e.target.value, 10) || 0 })}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.early_release_allowed}
              onChange={(e) => setForm({ ...form, early_release_allowed: e.target.checked })}
            />
            Allow early release (HR/Admin)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.notice_buyout_enabled}
              onChange={(e) => setForm({ ...form, notice_buyout_enabled: e.target.checked })}
            />
            Enable notice buyout for shortfall
          </label>
          {form.notice_buyout_enabled && (
            <div className="grid grid-cols-2 gap-3 pl-1">
              <div>
                <label className="text-xs font-medium text-slate-600">Buyout salary basis</label>
                <select
                  value={form.buyout_salary_basis}
                  onChange={(e) => setForm({ ...form, buyout_salary_basis: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="ctc_monthly">CTC monthly</option>
                  <option value="basic">Basic</option>
                  <option value="gross_estimated">Gross (est.)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Days per month</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.buyout_days_divisor}
                  onChange={(e) =>
                    setForm({ ...form, buyout_days_divisor: parseInt(e.target.value, 10) || 30 })
                  }
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              disabled={mode === 'edit' && form.is_default}
            />
            Tenant default policy
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary text-xs">
              {loading ? 'Saving…' : 'Save policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignModal({ policy, departments, designations, employees, onClose, onSubmit, loading, error }) {
  const [scope, setScope] = useState('tenant');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  const buildPayload = () => {
    if (scope === 'tenant') return {};
    if (scope === 'department') return { department_id: parseInt(departmentId, 10) };
    if (scope === 'designation') return { designation_id: parseInt(designationId, 10) };
    if (scope === 'employment_type') return { employment_type: employmentType };
    if (scope === 'employee') return { employee_id: parseInt(employeeId, 10) };
    return {};
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-xl p-6">
        <h3 className="font-semibold text-slate-900">Assign — {policy.policy_name}</h3>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(buildPayload());
          }}
        >
          <p className="text-xs text-slate-500">
            Assign this policy ({policy.notice_period_days} days) to a scope. Tenant-wide applies when all fields are empty.
          </p>
          <div>
            <label className="text-xs font-medium text-slate-600">Assignment scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="tenant">All employees (tenant-wide)</option>
              <option value="department">Specific department</option>
              <option value="designation">Specific designation</option>
              <option value="employment_type">Employment type</option>
              <option value="employee">Individual employee</option>
            </select>
          </div>
          {scope === 'department' && (
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              required
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          {scope === 'designation' && (
            <select
              value={designationId}
              onChange={(e) => setDesignationId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              required
            >
              <option value="">Select designation</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          {scope === 'employment_type' && (
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              required
            >
              <option value="">Select type</option>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          )}
          {scope === 'employee' && (
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              required
            >
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name} ({e.emp_code})
                </option>
              ))}
            </select>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary text-xs">
              {loading ? 'Assigning…' : 'Assign policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NoticePeriodPolicyPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;

  const [showInactive, setShowInactive] = useState(false);
  const [policyModal, setPolicyModal] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_POLICY_FORM);
  const [formError, setFormError] = useState('');
  const [assignError, setAssignError] = useState('');

  const listParams = useMemo(
    () => ({ status: showInactive ? undefined : 'active' }),
    [showInactive]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['notice-period-policies', selectedTenantId, listParams],
    queryFn: () => noticePeriodPolicyApi.list(listParams),
    enabled: !tenantRequired,
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments', selectedTenantId],
    queryFn: () => departmentApi.list({ status: 'active' }),
    enabled: !tenantRequired,
  });

  const { data: desigData } = useQuery({
    queryKey: ['designations', selectedTenantId],
    queryFn: () => designationApi.list({ status: 'active' }),
    enabled: !tenantRequired,
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-select', selectedTenantId],
    queryFn: () => employeeApi.list({ limit: 500, status: 'active' }),
    enabled: !tenantRequired && !!assignTarget,
  });

  const policies = data?.data?.policies || [];
  const departments = deptData?.data?.departments || [];
  const designations = desigData?.data?.designations || [];
  const employees = empData?.data?.employees || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notice-period-policies'] });
    queryClient.invalidateQueries({ queryKey: ['employee-self'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => noticePeriodPolicyApi.create(payload),
    onSuccess: () => {
      invalidate();
      setPolicyModal(null);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to create policy'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => noticePeriodPolicyApi.update(id, payload),
    onSuccess: () => {
      invalidate();
      setPolicyModal(null);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to update policy'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => noticePeriodPolicyApi.deactivate(id),
    onSuccess: invalidate,
    onError: (err) => window.alert(err.response?.data?.error?.message || 'Failed to deactivate policy'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, payload }) => noticePeriodPolicyApi.assign(id, payload),
    onSuccess: () => {
      invalidate();
      setAssignTarget(null);
      setAssignError('');
    },
    onError: (err) => setAssignError(err.response?.data?.error?.message || 'Failed to assign policy'),
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: ({ policyId, assignmentId }) =>
      noticePeriodPolicyApi.removeAssignment(policyId, assignmentId),
    onSuccess: invalidate,
    onError: (err) => window.alert(err.response?.data?.error?.message || 'Failed to remove assignment'),
  });

  const openCreate = () => {
    setForm(EMPTY_POLICY_FORM);
    setFormError('');
    setPolicyModal('create');
  };

  const openEdit = (policy) => {
    setForm(policyToForm(policy));
    setFormError('');
    setPolicyModal({ mode: 'edit', id: policy.id });
  };

  const handlePolicySubmit = () => {
    if (!form.policy_name.trim()) {
      setFormError('Policy name is required');
      return;
    }
    const payload = {
      policy_name: form.policy_name.trim(),
      notice_period_days: Number(form.notice_period_days),
      description: form.description.trim() || null,
      early_release_allowed: form.early_release_allowed,
      notice_buyout_enabled: form.notice_buyout_enabled,
      buyout_salary_basis: form.buyout_salary_basis,
      buyout_days_divisor: Number(form.buyout_days_divisor) || 30,
      is_default: form.is_default,
      is_active: form.is_active,
    };
    if (policyModal === 'create') {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: policyModal.id, payload });
    }
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to configure notice period policies.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notice Period Policies"
        subtitle="Configure notice period days for resignations and separations by scope"
        actions={
          <button type="button" onClick={openCreate} className="btn-primary text-xs">
            <Plus size={14} /> Add policy
          </button>
        }
      />

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Policies are matched by specificity: employee → designation → department → employment type → tenant-wide → default.
          </p>
          <label className="flex items-center gap-2 text-xs text-slate-600 shrink-0">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Show inactive
          </label>
        </div>

        {isLoading ? (
          <p className="p-8 text-center text-slate-400 text-sm">Loading policies…</p>
        ) : error ? (
          <p className="p-8 text-center text-red-500 text-sm">
            {error.response?.data?.error?.message || error.message}
          </p>
        ) : !policies.length ? (
          <p className="p-8 text-center text-slate-400 text-sm">No policies configured</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {policies.map((p) => (
              <div key={p.id} className={cn('px-4 py-4', !p.is_active && 'opacity-60')}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Clock size={14} className="text-brand-600" />
                      <h3 className="font-medium text-slate-900 text-sm">{p.policy_name}</h3>
                      {p.is_default && (
                        <span className="text-[10px] font-semibold uppercase bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                      <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {p.notice_period_days} days
                      </span>
                    </div>
                    {p.description && <p className="text-xs text-slate-500 mt-1">{p.description}</p>}
                    <p className="text-[11px] text-slate-500 mt-1">
                      {p.early_release_allowed !== false ? 'Early release allowed' : 'No early release'}
                      {p.notice_buyout_enabled ? ' · Buyout enabled' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.is_active && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setAssignError('');
                            setAssignTarget(p);
                          }}
                          className="btn-secondary text-xs py-1.5 px-2"
                        >
                          <Users size={13} /> Assign
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                        >
                          <Pencil size={15} />
                        </button>
                        {!p.is_default && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Deactivate "${p.policy_name}"?`)) {
                                deactivateMutation.mutate(p.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {(p.assignments || []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.assignments.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 text-[10px] bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 text-slate-600"
                      >
                        {assignmentLabel(a)}
                        {p.is_active && (
                          <button
                            type="button"
                            disabled={removeAssignmentMutation.isPending}
                            onClick={() => removeAssignmentMutation.mutate({ policyId: p.id, assignmentId: a.id })}
                            className="text-slate-400 hover:text-red-500 ml-0.5"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {policyModal && (
        <PolicyModal
          mode={policyModal === 'create' ? 'create' : 'edit'}
          form={form}
          setForm={setForm}
          onClose={() => setPolicyModal(null)}
          onSubmit={handlePolicySubmit}
          loading={createMutation.isPending || updateMutation.isPending}
          error={formError}
        />
      )}

      {assignTarget && (
        <AssignModal
          policy={assignTarget}
          departments={departments}
          designations={designations}
          employees={employees}
          onClose={() => setAssignTarget(null)}
          onSubmit={(payload) => assignMutation.mutate({ id: assignTarget.id, payload })}
          loading={assignMutation.isPending}
          error={assignError}
        />
      )}
    </div>
  );
}
