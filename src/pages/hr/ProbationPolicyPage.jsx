import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  CheckCircle2,
  Info,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  departmentApi,
  designationApi,
  employeeApi,
  probationPolicyApi,
} from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
  { value: 'consultant', label: 'Consultant' },
];

const EMPTY_POLICY_FORM = {
  policy_name: '',
  description: '',
  is_default: false,
  default_duration_months: 6,
  auto_confirm: false,
  allow_extension: true,
  max_extensions: 1,
  max_extension_duration_months: 3,
};

function policyToForm(policy) {
  return {
    policy_name: policy.policy_name || '',
    description: policy.description || '',
    is_default: !!policy.is_default,
    default_duration_months: policy.default_duration_months ?? 6,
    auto_confirm: !!policy.auto_confirm,
    allow_extension: policy.allow_extension !== false,
    max_extensions: policy.max_extensions ?? 1,
    max_extension_duration_months: policy.max_extension_duration_months ?? 3,
  };
}

function assignmentLabel(a) {
  if (a.employee) return `Employee: ${a.employee.first_name} ${a.employee.last_name}`;
  if (a.department) return `Dept: ${a.department.name}`;
  if (a.designation) return `Designation: ${a.designation.name}`;
  if (a.employment_type) return `Type: ${a.employment_type.replace(/_/g, ' ')}`;
  return 'All employees';
}

function StatPill({ icon: Icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    brand: 'bg-brand-50 text-brand-700 border-brand-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  };
  return (
    <div className={cn('rounded-xl border px-4 py-3 flex items-center gap-3', tones[tone])}>
      <div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center shrink-0">
        <Icon size={15} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
        <p className="text-lg font-semibold leading-tight">{value}</p>
      </div>
    </div>
  );
}

function PolicyModal({ mode, form, setForm, onClose, onSubmit, loading, error }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <UserCheck size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              {mode === 'create' ? 'Add Probation Policy' : 'Edit Probation Policy'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Policies appear in the Employees form when Has Probation is Yes.
            </p>
          </div>
        </div>

        <form
          className="mt-5 space-y-4"
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
              placeholder="e.g. Standard Probation"
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
              placeholder="Optional notes for HR"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Default probation duration (months)</label>
            <input
              type="number"
              min={1}
              max={24}
              value={form.default_duration_months}
              onChange={(e) =>
                setForm({ ...form, default_duration_months: parseInt(e.target.value, 10) || 6 })
              }
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              required
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Suggested when this policy is selected on the employee form. HR can still override duration per hire.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Rules</p>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.allow_extension}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm({
                    ...form,
                    allow_extension: checked,
                    max_extensions: checked ? (form.max_extensions || 1) : 0,
                    max_extension_duration_months: checked ? (form.max_extension_duration_months || 3) : 0,
                  });
                }}
              />
              Allow probation extension
            </label>

            {form.allow_extension && (
              <div className="grid grid-cols-2 gap-3 pl-1">
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Max extensions <span className="font-normal text-slate-400">(0 = unlimited)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={form.max_extensions}
                    onChange={(e) =>
                      setForm({ ...form, max_extensions: parseInt(e.target.value, 10) || 0 })
                    }
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Max months per extension</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={form.max_extension_duration_months}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        max_extension_duration_months: parseInt(e.target.value, 10) || 3,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.auto_confirm}
                onChange={(e) => setForm({ ...form, auto_confirm: e.target.checked })}
              />
              Auto-confirm when probation period ends
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                disabled={mode === 'edit' && form.is_default}
              />
              Tenant default policy
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
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
            Optional auto-match scopes. Employees can still pick this policy directly when Has Probation is Yes.
          </p>
          <div>
            <label className="text-xs font-medium text-slate-600">Assignment scope</label>
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value);
                setDepartmentId('');
                setDesignationId('');
                setEmploymentType('');
                setEmployeeId('');
              }}
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

export default function ProbationPolicyPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;

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
    queryKey: ['probation-policies', selectedTenantId, listParams],
    queryFn: () => probationPolicyApi.list(listParams),
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

  const stats = useMemo(() => {
    const active = policies.filter((p) => p.is_enabled).length;
    const inactive = policies.filter((p) => !p.is_enabled).length;
    const defaults = policies.filter((p) => p.is_default && p.is_enabled).length;
    const assignments = policies.reduce((sum, p) => sum + (p.assignments?.length || 0), 0);
    return { active, inactive, defaults, assignments, total: policies.length };
  }, [policies]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['probation-policies'] });

  const createMutation = useMutation({
    mutationFn: (payload) => probationPolicyApi.create(payload),
    onSuccess: () => {
      invalidate();
      setPolicyModal(null);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to create policy'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => probationPolicyApi.update(id, payload),
    onSuccess: () => {
      invalidate();
      setPolicyModal(null);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to update policy'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => probationPolicyApi.deactivate(id),
    onSuccess: invalidate,
    onError: (err) => window.alert(err.response?.data?.error?.message || 'Failed to deactivate policy'),
  });

  const activateMutation = useMutation({
    mutationFn: (id) => probationPolicyApi.update(id, { is_enabled: true }),
    onSuccess: invalidate,
    onError: (err) => window.alert(err.response?.data?.error?.message || 'Failed to activate policy'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, payload }) => probationPolicyApi.assign(id, payload),
    onSuccess: () => {
      invalidate();
      setAssignTarget(null);
      setAssignError('');
    },
    onError: (err) => setAssignError(err.response?.data?.error?.message || 'Failed to assign policy'),
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: ({ policyId, assignmentId }) =>
      probationPolicyApi.removeAssignment(policyId, assignmentId),
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
    if (form.default_duration_months < 1 || form.default_duration_months > 24) {
      setFormError('Duration must be between 1 and 24 months');
      return;
    }

    const payload = {
      policy_name: form.policy_name.trim(),
      description: form.description.trim() || null,
      is_default: form.is_default,
      default_duration_months: Number(form.default_duration_months),
      auto_confirm: form.auto_confirm,
      allow_extension: form.allow_extension,
      max_extensions: form.allow_extension ? Number(form.max_extensions) : 0,
      max_extension_duration_months: form.allow_extension
        ? Number(form.max_extension_duration_months)
        : 0,
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
        Select a tenant from the header to configure probation policies.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="People · Probation"
        title="Probation Policies"
        subtitle="Define probation rules, then select them on the Employees page when an employee has a probation period"
        actions={
          <button type="button" onClick={openCreate} className="btn-primary text-xs">
            <Plus size={14} /> Add policy
          </button>
        }
      />

      <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 via-white to-slate-50 px-5 py-4 flex gap-3">
        <div className="w-9 h-9 rounded-xl bg-white border border-brand-100 text-brand-600 flex items-center justify-center shrink-0">
          <Info size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">How probation policies work</p>
          <ol className="mt-1.5 text-xs text-slate-600 space-y-1 list-decimal list-inside">
            <li>Create one or more policies with duration, extension, and auto-confirm rules.</li>
            <li>Optionally assign by department, designation, employment type, or employee for auto-match.</li>
            <li>
              On <span className="font-medium text-slate-800">Employees → Add / Edit</span>, set Has Probation to Yes
              and choose the policy from the dropdown.
            </li>
          </ol>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatPill icon={ShieldCheck} label="Active policies" value={stats.active} tone="brand" />
        <StatPill icon={CheckCircle2} label="Default" value={stats.defaults} tone="emerald" />
        <StatPill icon={Users} label="Assignments" value={stats.assignments} tone="slate" />
        <StatPill icon={RefreshCw} label="Inactive" value={showInactive ? stats.inactive : '—'} tone="amber" />
      </div>

      <div className="card overflow-hidden">
        <div className="ds-toolbar flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Policy catalogue</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Active policies are selectable on the employee form. Auto-match order: employee → designation →
              department → employment type → tenant-wide → default.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 shrink-0">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
        </div>

        {isLoading ? (
          <p className="p-10 text-center text-slate-400 text-sm">Loading policies…</p>
        ) : error ? (
          <p className="p-10 text-center text-red-500 text-sm">
            {error.response?.data?.error?.message || error.message}
          </p>
        ) : !policies.length ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <UserCheck size={22} />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-800">No probation policies yet</h3>
            <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto">
              Create your first policy so HR can select it when adding employees with a probation period.
            </p>
            <button type="button" onClick={openCreate} className="btn-primary text-xs mt-5">
              <Plus size={14} /> Add first policy
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {policies.map((p) => (
              <div key={p.id} className={cn('px-4 py-4 hover:bg-slate-50/60 transition-colors', !p.is_enabled && 'opacity-60')}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                        <UserCheck size={14} />
                      </div>
                      <h3 className="font-medium text-slate-900 text-sm">{p.policy_name}</h3>
                      {p.is_default && (
                        <span className="text-[10px] font-semibold uppercase bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full border border-brand-100">
                          Default
                        </span>
                      )}
                      {!p.is_enabled && (
                        <span className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                        <CalendarClock size={10} />
                        {p.default_duration_months} months
                      </span>
                    </div>

                    {p.description && (
                      <p className="text-xs text-slate-500 mt-2 ml-10">{p.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2 mt-2.5 ml-10">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                        {p.allow_extension
                          ? `Extensions: ${p.max_extensions === 0 ? 'unlimited' : `up to ${p.max_extensions}`}` +
                            ` · max ${p.max_extension_duration_months}mo each`
                          : 'No extensions'}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-md border',
                          p.auto_confirm
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-500'
                        )}
                      >
                        {p.auto_confirm ? 'Auto-confirm on end date' : 'Manual confirmation'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500">
                        {(p.assignments || []).length} assignment{(p.assignments || []).length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {p.is_enabled ? (
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
                          title="Edit policy"
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
                            title="Deactivate policy"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Reactivate "${p.policy_name}"?`)) {
                            activateMutation.mutate(p.id);
                          }
                        }}
                        disabled={activateMutation.isPending}
                        className="btn-secondary text-xs py-1.5 px-2"
                        title="Reactivate policy"
                      >
                        <Power size={13} /> Activate
                      </button>
                    )}
                  </div>
                </div>

                {(p.assignments || []).length > 0 && (
                  <div className="mt-3 ml-10 flex flex-wrap gap-2">
                    {p.assignments.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 text-[10px] bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 text-slate-600"
                      >
                        {assignmentLabel(a)}
                        {p.is_enabled && (
                          <button
                            type="button"
                            disabled={removeAssignmentMutation.isPending}
                            onClick={() =>
                              removeAssignmentMutation.mutate({ policyId: p.id, assignmentId: a.id })
                            }
                            className="text-slate-400 hover:text-red-500 ml-0.5"
                            title="Remove assignment"
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
