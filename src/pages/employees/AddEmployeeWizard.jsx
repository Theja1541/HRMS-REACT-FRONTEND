import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { employeeApi, departmentApi, designationApi, branchApi, payrollApi, probationPolicyApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import {
  BLOOD_GROUPS,
  GENDERS,
  EMPLOYMENT_TYPES,
  SYSTEM_ROLES,
  EMPLOYEE_DOCUMENTS,
  WIZARD_STEPS,
  EMERGENCY_RELATIONSHIPS,
} from '../../constants/hr';
import { cn } from '../../utils/helpers';
import InternationalPhoneInput from '../../components/shared/InternationalPhoneInput';
import { INITIAL_FORM } from './employeeWizard/constants';
import { validateStep, validateAllSteps } from './employeeWizard/validation';
import { buildPayload } from './employeeWizard/buildPayload';
import { useEmployeeDraft } from './employeeWizard/useEmployeeDraft';
import WizardField, { inputClass, readOnlyClass } from './employeeWizard/WizardField';
import DocumentDropzone from './employeeWizard/DocumentDropzone';
import ReviewPanel from './employeeWizard/ReviewPanel';
import SalaryStructureEditor from './employeeWizard/SalaryStructureEditor';
import { buildSalaryAssignPayload, resolveSalaryEffectiveFrom } from './employeeWizard/salaryStructure';
import { mapEmployeeToForm } from './employeeWizard/mapEmployeeToForm';
import { useTenantCompanySlug } from '../../hooks/useTenantCompanySlug';

function documentMetaFromFiles(documents) {
  return Object.fromEntries(
    Object.entries(documents)
      .filter(([, f]) => f)
      .map(([k, f]) => [k, { name: f.name, size: f.size }])
  );
}

export default function AddEmployeeWizard({ employeeId, mode = 'add', onClose, onSuccess }) {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isAdd = mode === 'add';
  const loadEmployee = Boolean(employeeId);
  const { selectedTenantId } = useAuthStore();
  const { companySlug, isLoading: companySlugLoading, isSuperAdmin } = useTenantCompanySlug();
  const { loadDraft, saveDraft, clearDraft, scheduleAutoSave, draftNotice } = useEmployeeDraft(selectedTenantId);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [documents, setDocuments] = useState({});
  const [existingDocuments, setExistingDocuments] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);

  const { data: deptData } = useQuery({
    queryKey: ['departments', 'active', selectedTenantId],
    queryFn: () => departmentApi.list({ tenant_id: selectedTenantId, status: 'active' }),
  });
  const { data: desigData } = useQuery({
    queryKey: ['designations', 'active', selectedTenantId],
    queryFn: () => designationApi.list({ tenant_id: selectedTenantId, status: 'active' }),
  });
  const { data: branchData } = useQuery({ queryKey: ['branches'], queryFn: () => branchApi.list() });
  const { data: empData } = useQuery({
    queryKey: ['employees-managers'],
    queryFn: () => employeeApi.list({ limit: 200 }),
  });

  const { data: editEmployeeData, isLoading: loadingEmployee } = useQuery({
    queryKey: ['employee', employeeId, 'wizard', mode],
    queryFn: () => employeeApi.get(employeeId),
    enabled: loadEmployee,
  });

  const { data: salaryHistoryData } = useQuery({
    queryKey: ['employee-salary-history', employeeId],
    queryFn: () => payrollApi.salaryHistory(employeeId),
    enabled: loadEmployee,
  });

  const ro = isView;
  const ic = (err) => cn(inputClass(err), readOnlyClass(ro));

  const departments = deptData?.data?.departments || [];
  const allDesignations = desigData?.data?.designations || [];
  const designations = useMemo(() => {
    if (!form.department_id) return allDesignations;
    return allDesignations.filter(
      (d) => !d.department_id || String(d.department_id) === String(form.department_id)
    );
  }, [allDesignations, form.department_id]);
  const branches = branchData?.data?.branches || [];
  const managers = (empData?.data?.employees || []).filter((e) =>
    ['manager', 'hr', 'owner'].includes(e.system_role)
  );

  const lookups = useMemo(
    () => ({ departments, designations, branches, managers }),
    [departments, designations, branches, managers]
  );

  const { data: probationData } = useQuery({
    queryKey: ['probation-policies-preview', selectedTenantId],
    queryFn: () => probationPolicyApi.list({ status: 'active' }),
    enabled: isAdd,
    staleTime: 5 * 60 * 1000,
  });
  const probationPolicies = probationData?.data?.policies || [];

  const probationPreview = useMemo(() => {
    if (!isAdd || !form.date_of_joining || !probationPolicies.length) return null;

    const { department_id, designation_id, employment_type, date_of_joining } = form;

    let bestPolicy = null;
    let bestScore = -1;

    for (const policy of probationPolicies) {
      if (!policy.is_enabled) continue;

      let policyBest = -1;
      for (const a of policy.assignments || []) {
        if (a.employee_id != null) continue;

        let score = 0;
        let match = true;

        if (a.department_id != null) {
          if (String(a.department_id) !== String(department_id)) match = false;
          else score += 30;
        }
        if (a.designation_id != null) {
          if (String(a.designation_id) !== String(designation_id)) match = false;
          else score += 40;
        }
        if (a.employment_type != null) {
          if (a.employment_type !== employment_type) match = false;
          else score += 20;
        }

        if (!match) continue;
        if (score === 0) score = 10;
        if (score > policyBest) policyBest = score;
      }

      if (policyBest > bestScore) {
        bestScore = policyBest;
        bestPolicy = policy;
      }
    }

    if (!bestPolicy) {
      bestPolicy = probationPolicies.find((p) => p.is_enabled && p.is_default) ?? null;
    }

    if (!bestPolicy) return null;

    const d = new Date(date_of_joining + 'T00:00:00');
    d.setMonth(d.getMonth() + bestPolicy.default_duration_months);
    const endDate = d.toISOString().slice(0, 10);

    return {
      policy_name: bestPolicy.policy_name,
      duration_months: bestPolicy.default_duration_months,
      probation_start_date: date_of_joining,
      probation_end_date: endDate,
    };
  }, [
    isAdd,
    probationPolicies,
    form.department_id,
    form.designation_id,
    form.employment_type,
    form.date_of_joining,
  ]);

  useEffect(() => {
    if (!isAdd) return;
    const draft = loadDraft();
    if (draft?.form) {
      setShowDraftPrompt(true);
      setDraftSavedAt(draft.savedAt);
    }
  }, [loadDraft, isAdd]);

  useEffect(() => {
    if (!loadEmployee || !editEmployeeData?.data?.employee) return;
    const salaries = salaryHistoryData?.data?.salaries || [];
    const currentSalary = salaries.find((s) => !s.effective_to) || salaries[0] || null;
    setForm(mapEmployeeToForm(editEmployeeData.data.employee, currentSalary));
    const docMap = {};
    (editEmployeeData.data.employee.documents || []).forEach((d) => {
      docMap[d.document_type] = d;
    });
    setExistingDocuments(docMap);
    setStep(1);
  }, [loadEmployee, editEmployeeData, salaryHistoryData]);

  useEffect(() => {
    if (!isAdd) return;
    scheduleAutoSave(form, step, documentMetaFromFiles(documents));
  }, [form, step, documents, scheduleAutoSave, isAdd]);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setContact = (index, field, value) => {
    setForm((prev) => {
      const contacts = [...prev.emergency_contacts];
      contacts[index] = { ...contacts[index], [field]: value };
      if (field === 'is_primary' && value) {
        contacts.forEach((c, i) => {
          if (i !== index) contacts[i] = { ...c, is_primary: false };
        });
      }
      return { ...prev, emergency_contacts: contacts };
    });
    setErrors((prev) => ({ ...prev, [`emergency_contacts.${index}.${field}`]: undefined }));
  };

  const addContact = () => {
    setForm((prev) => ({
      ...prev,
      emergency_contacts: [
        ...prev.emergency_contacts,
        { contact_name: '', contact_phone: '', relationship: '', is_primary: false },
      ],
    }));
  };

  const removeContact = (index) => {
    setForm((prev) => {
      const contacts = prev.emergency_contacts.filter((_, i) => i !== index);
      if (contacts.length && !contacts.some((c) => c.is_primary)) {
        contacts[0] = { ...contacts[0], is_primary: true };
      }
      return { ...prev, emergency_contacts: contacts.length ? contacts : INITIAL_FORM.emergency_contacts };
    });
  };

  const restoreDraft = () => {
    const draft = loadDraft();
    if (!draft) return;
    setForm(draft.form);
    setStep(draft.step || 1);
    setShowDraftPrompt(false);
  };

  const discardDraft = () => {
    clearDraft();
    setShowDraftPrompt(false);
  };

  const handleNext = () => {
    if (!isView) {
      const stepErrors = validateStep(step, form);
      if (Object.keys(stepErrors).length) {
        setErrors(stepErrors);
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 6));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    const { errors: allErrors, firstInvalidStep } = validateAllSteps(form);
    if (Object.keys(allErrors).length) {
      setErrors(allErrors);
      if (firstInvalidStep) setStep(firstInvalidStep);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = buildPayload(form);

      if (isEdit) {
        await employeeApi.update(employeeId, payload);
        const uploads = Object.entries(documents).filter(([, file]) => file);
        for (const [docType, file] of uploads) {
          await employeeApi.uploadDocument(employeeId, file, docType);
        }
        if (!form.salary_structure?.skip_salary) {
          const salaries = salaryHistoryData?.data?.salaries || [];
          const currentSalary = salaries.find((s) => !s.effective_to) || salaries[0] || null;
          const salaryPayload = buildSalaryAssignPayload(
            employeeId,
            resolveSalaryEffectiveFrom(form, currentSalary),
            form.salary_structure,
            'Updated via employee wizard',
            form.salary_structure_template_id || null
          );
          await payrollApi.assignSalaryStructure(salaryPayload);
        }
      } else {
        const res = await employeeApi.create(payload);
        const newEmployeeId = res?.data?.employee?.id;
        let createResult = {
          email_sent: res?.data?.email_sent,
          temporary_password: res?.data?.temporary_password,
          message: res?.message,
        };

        if (newEmployeeId) {
          const uploads = Object.entries(documents).filter(([, file]) => file);
          for (const [docType, file] of uploads) {
            await employeeApi.uploadDocument(newEmployeeId, file, docType);
          }

          if (!form.salary_structure?.skip_salary) {
            const salaryPayload = buildSalaryAssignPayload(
              newEmployeeId,
              form.date_of_joining,
              form.salary_structure,
              'Initial assignment via employee wizard',
              form.salary_structure_template_id || null
            );
            await payrollApi.assignSalaryStructure(salaryPayload);
          }
        }

        clearDraft();
        onSuccess?.(createResult);
        return;
      }

      onSuccess?.();
    } catch (err) {
      const apiError = err.response?.data?.error;
      setSubmitError(apiError?.message || err.message || (isEdit ? 'Failed to update employee' : 'Failed to create employee'));
      if (apiError?.field) {
        setErrors({ [apiError.field]: apiError.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-3xl shadow-xl max-h-[100dvh] sm:max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900">
              {isView ? 'View Employee' : isEdit ? 'Edit Employee' : 'Add Employee'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Step {step} of 6 — {WIZARD_STEPS[step - 1].label}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {draftNotice && (
              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full hidden sm:inline">
                {draftNotice}
              </span>
            )}
            {!isView && !isEdit && (
              <button
                type="button"
                onClick={() => saveDraft(form, step, documentMetaFromFiles(documents))}
                className="btn-secondary text-xs py-1 px-2 hidden sm:inline-flex"
              >
                <Save size={13} /> Save Draft
              </button>
            )}
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Draft restore banner */}
        {showDraftPrompt && isAdd && (
          <div className="px-4 sm:px-6 py-3 bg-amber-50 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between shrink-0">
            <p className="text-xs text-amber-800">
              Saved draft found{draftSavedAt ? ` from ${new Date(draftSavedAt).toLocaleString()}` : ''}. Restore your progress?
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={restoreDraft} className="text-xs font-medium text-brand-600 hover:underline">
                Restore
              </button>
              <button type="button" onClick={discardDraft} className="text-xs font-medium text-slate-500 hover:underline">
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-[320px]">
            {WIZARD_STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => (isView || isEdit || s.id < step) && setStep(s.id)}
                  disabled={!isView && !isEdit && s.id > step}
                  className="flex flex-col items-center gap-1 min-w-0 disabled:cursor-default"
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold border-2 transition-colors',
                      step > s.id && 'bg-brand-600 border-brand-600 text-white',
                      step === s.id && 'border-brand-600 text-brand-600 bg-brand-50',
                      step < s.id && 'border-slate-200 text-slate-400'
                    )}
                  >
                    {step > s.id ? <Check size={14} /> : s.id}
                  </div>
                  <span
                    className={cn(
                      'text-[9px] font-medium text-center truncate max-w-[64px] sm:max-w-[80px]',
                      step === s.id ? 'text-brand-600' : 'text-slate-400'
                    )}
                  >
                    {s.short}
                  </span>
                </button>
                {i < WIZARD_STEPS.length - 1 && (
                  <div className={cn('h-0.5 flex-1 mx-0.5 sm:mx-1 mb-4', step > s.id ? 'bg-brand-600' : 'bg-slate-200')} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {loadEmployee && loadingEmployee && (
            <div className="py-16 text-center text-slate-400 text-sm">Loading employee…</div>
          )}

          {(!loadEmployee || !loadingEmployee) && (
          <fieldset disabled={ro} className="min-w-0 border-0 p-0 m-0">
          <>
          {submitError && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs border border-red-100">
              {submitError}
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <WizardField label="Employee ID" required error={errors.emp_code}>
                <input
                  value={form.emp_code}
                  onChange={(e) => set('emp_code', e.target.value)}
                  className={ic(errors.emp_code)}
                  placeholder="EMP004"
                  maxLength={20}
                  disabled={!isAdd}
                />
              </WizardField>
              <InternationalPhoneInput
                label="Mobile"
                value={form.phone}
                onChange={(v) => set('phone', v)}
                error={errors.phone}
                disabled={ro}
              />
              <WizardField label="First Name" required error={errors.first_name}>
                <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} className={ic(errors.first_name)} />
              </WizardField>
              <WizardField label="Last Name" required error={errors.last_name}>
                <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} className={ic(errors.last_name)} />
              </WizardField>
              <WizardField label="Official Email" required error={errors.email} className="sm:col-span-2">
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={ic(errors.email)} maxLength={150} />
              </WizardField>
              <WizardField label="Date of Birth" error={errors.date_of_birth}>
                <input type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} className={ic(errors.date_of_birth)} />
              </WizardField>
              <WizardField label="Gender" error={errors.gender}>
                <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className={ic(errors.gender)}>
                  <option value="">Select gender</option>
                  {GENDERS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </WizardField>
              <WizardField label="Blood Group" error={errors.blood_group}>
                <select value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)} className={ic(errors.blood_group)}>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </WizardField>
              <WizardField label="Address" error={errors.permanent_address} className="sm:col-span-2">
                <textarea rows={3} value={form.permanent_address} onChange={(e) => set('permanent_address', e.target.value)} className={ic(errors.permanent_address)} placeholder="Full residential address" />
              </WizardField>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <WizardField
                label="Company Slug"
                className="sm:col-span-2"
                hint={
                  isSuperAdmin
                    ? 'Managed in Tenants / Organizations. Updates here automatically when changed.'
                    : 'Set by Super Admin. Contact platform administrator to change.'
                }
              >
                <input
                  value={companySlugLoading ? 'Loading…' : companySlug || '—'}
                  readOnly
                  disabled
                  className={cn(inputClass(), 'bg-slate-50 text-slate-600 cursor-not-allowed font-mono')}
                />
                {companySlug && (
                  <p className="text-[10px] text-slate-400 mt-1">{companySlug}.hrms.app</p>
                )}
              </WizardField>
              <WizardField label="Role" required error={errors.system_role}>
                <select value={form.system_role} onChange={(e) => set('system_role', e.target.value)} className={ic(errors.system_role)}>
                  {SYSTEM_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </WizardField>
              <WizardField label="Employee Type" error={errors.employment_type}>
                <select value={form.employment_type} onChange={(e) => set('employment_type', e.target.value)} className={ic(errors.employment_type)}>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </WizardField>
              <WizardField label="Department" error={errors.department_id}>
                <select value={form.department_id} onChange={(e) => set('department_id', e.target.value)} className={ic(errors.department_id)}>
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </WizardField>
              <WizardField label="Designation" error={errors.designation_id}>
                <select value={form.designation_id} onChange={(e) => set('designation_id', e.target.value)} className={ic(errors.designation_id)}>
                  <option value="">Select designation</option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </WizardField>
              <WizardField label="Joining Date" required error={errors.date_of_joining}>
                <input type="date" value={form.date_of_joining} onChange={(e) => set('date_of_joining', e.target.value)} className={ic(errors.date_of_joining)} />
              </WizardField>
              <WizardField label="Work Location" error={errors.branch_id}>
                <select value={form.branch_id} onChange={(e) => set('branch_id', e.target.value)} className={ic(errors.branch_id)}>
                  <option value="">Select location</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}{b.city ? ` — ${b.city}` : ''}</option>
                  ))}
                </select>
              </WizardField>
              <WizardField label="Reporting Manager" error={errors.reporting_to} className="sm:col-span-2">
                <select value={form.reporting_to} onChange={(e) => set('reporting_to', e.target.value)} className={ic(errors.reporting_to)}>
                  <option value="">Select reporting manager</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.emp_code})</option>
                  ))}
                </select>
              </WizardField>
              <WizardField label="Work From Home" error={errors.work_from_home}>
                <select value={form.work_from_home ? 'yes' : 'no'} onChange={(e) => set('work_from_home', e.target.value === 'yes')} className={ic(errors.work_from_home)}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </WizardField>

              {isAdd && probationPreview && (
                <div className="sm:col-span-2 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <CalendarClock size={13} className="text-brand-600" />
                    <p className="text-xs font-semibold text-brand-700">Probation Preview</p>
                    <span className="ml-1 text-[10px] text-brand-400 font-medium">auto-resolved · read-only</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Policy</p>
                      <p className="text-sm text-slate-700 mt-0.5 font-medium">{probationPreview.policy_name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Duration</p>
                      <p className="text-sm text-slate-700 mt-0.5">{probationPreview.duration_months} months</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Start Date</p>
                      <p className="text-sm text-slate-700 mt-0.5">
                        {new Date(probationPreview.probation_start_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">End Date</p>
                      <p className="text-sm text-slate-700 mt-0.5">
                        {new Date(probationPreview.probation_end_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isAdd && !probationPreview && form.date_of_joining && !!probationData && (
                <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <CalendarClock size={13} className="text-slate-400" />
                    <p className="text-xs text-slate-400">
                      No active probation policy found — employee will be set to <span className="font-medium text-slate-500">active</span> on creation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <SalaryStructureEditor
              structure={form.salary_structure}
              onChange={(salary_structure) => setForm((prev) => ({ ...prev, salary_structure }))}
              templateId={form.salary_structure_template_id}
              onTemplateIdChange={(salary_structure_template_id) =>
                setForm((prev) => ({ ...prev, salary_structure_template_id }))
              }
              errors={errors}
              readOnly={ro}
              autoApplyDefault={isAdd}
              employeeId={employeeId}
              compliancePreview={{
                pf_applicable: form.pf_applicable,
                esi_applicable: form.esi_applicable,
                branch_id: form.branch_id || undefined,
              }}
            />
          )}

          {step === 4 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <p className="sm:col-span-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Government IDs</p>
              <WizardField label="PAN Number" error={errors.pan_number} hint="Format: ABCDE1234F · unique per organization">
                <input value={form.pan_number} onChange={(e) => set('pan_number', e.target.value.toUpperCase())} className={ic(errors.pan_number)} placeholder="ABCDE1234F" maxLength={10} />
              </WizardField>
              <WizardField label="Aadhaar Number" error={errors.aadhaar_number} hint="12 digits · unique per organization">
                <input value={form.aadhaar_number} onChange={(e) => set('aadhaar_number', e.target.value.replace(/\D/g, '').slice(0, 12))} className={ic(errors.aadhaar_number)} placeholder="12-digit Aadhaar" inputMode="numeric" maxLength={12} />
              </WizardField>

              <p className="sm:col-span-2 text-xs font-semibold text-slate-500 uppercase tracking-wide pt-2 border-t border-slate-100">Bank Details</p>
              <WizardField label="Bank Name" error={errors.bank_name}>
                <input value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} className={ic(errors.bank_name)} />
              </WizardField>
              <WizardField label="Account Number" error={errors.account_number} hint="9–18 digits · unique per organization">
                <input value={form.account_number} onChange={(e) => set('account_number', e.target.value.replace(/\D/g, '').slice(0, 18))} className={ic(errors.account_number)} placeholder="9–18 digits" inputMode="numeric" maxLength={18} />
              </WizardField>
              <WizardField label="IFSC Code" error={errors.ifsc_code} className="sm:col-span-2">
                <input value={form.ifsc_code} onChange={(e) => set('ifsc_code', e.target.value.toUpperCase())} className={ic(errors.ifsc_code)} placeholder="SBIN0001234" maxLength={11} />
              </WizardField>

              <div className="sm:col-span-2 space-y-3 pt-1 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Statutory Applicability</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.pf_applicable}
                    onChange={(e) => {
                      set('pf_applicable', e.target.checked);
                      if (!e.target.checked) set('uan_number', '');
                    }}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                  />
                  <span className="text-sm text-slate-700">PF Applicable</span>
                </label>
                {form.pf_applicable && (
                  <WizardField label="UAN Number" required error={errors.uan_number} hint="12 digits · unique per organization">
                    <input value={form.uan_number} onChange={(e) => set('uan_number', e.target.value.replace(/\D/g, '').slice(0, 12))} className={ic(errors.uan_number)} placeholder="12-digit UAN" inputMode="numeric" maxLength={12} />
                  </WizardField>
                )}
              </div>

              <div className="sm:col-span-2 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.esi_applicable} onChange={(e) => { set('esi_applicable', e.target.checked); if (!e.target.checked) set('esic_number', ''); }} className="rounded border-slate-300 text-brand-600 focus:ring-brand-600" />
                  <span className="text-sm text-slate-700">ESI Applicable</span>
                </label>
                {form.esi_applicable && (
                  <WizardField label="ESI Number" required error={errors.esic_number}>
                    <input value={form.esic_number} onChange={(e) => set('esic_number', e.target.value.replace(/\D/g, '').slice(0, 10))} className={ic(errors.esic_number)} placeholder="10-digit ESI" inputMode="numeric" maxLength={10} />
                  </WizardField>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isView ? (
                EMPLOYEE_DOCUMENTS.map((doc) => {
                  const existing = existingDocuments[doc.key];
                  return (
                    <div key={doc.key} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                      <p className="text-xs font-medium text-slate-500">{doc.label}</p>
                      {existing?.file_url ? (
                        <a
                          href={existing.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-brand-600 hover:underline mt-1 inline-block"
                        >
                          {existing.file_name}
                        </a>
                      ) : (
                        <p className="text-sm text-slate-400 mt-1">Not uploaded</p>
                      )}
                    </div>
                  );
                })
              ) : (
                <>
              {EMPLOYEE_DOCUMENTS.map((doc) => (
                <DocumentDropzone
                  key={doc.key}
                  label={doc.label}
                  accept={doc.accept}
                  file={documents[doc.key]}
                  onFile={(file) => setDocuments((prev) => ({ ...prev, [doc.key]: file }))}
                  onClear={() => setDocuments((prev) => {
                    const next = { ...prev };
                    delete next[doc.key];
                    return next;
                  })}
                />
              ))}
              <p className="col-span-full text-[11px] text-slate-400">Documents are optional. Drag & drop or browse. Max 10 MB per file.</p>
                </>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-800">Emergency Contacts</h4>
                  {!isView && (
                  <button type="button" onClick={addContact} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                    <Plus size={14} /> Add Contact
                  </button>
                  )}
                </div>
                <div className="space-y-4">
                  {form.emergency_contacts.map((contact, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50 relative">
                      {form.emergency_contacts.length > 1 && !isView && (
                        <button type="button" onClick={() => removeContact(index)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500" aria-label="Remove contact">
                          <Trash2 size={14} />
                        </button>
                      )}
                      <WizardField label="Contact Name" error={errors[`emergency_contacts.${index}.contact_name`]}>
                        <input value={contact.contact_name} onChange={(e) => setContact(index, 'contact_name', e.target.value)} className={ic(errors[`emergency_contacts.${index}.contact_name`])} />
                      </WizardField>
                      <InternationalPhoneInput
                        label="Contact Number"
                        value={contact.contact_phone}
                        onChange={(v) => setContact(index, 'contact_phone', v)}
                        error={errors[`emergency_contacts.${index}.contact_phone`]}
                        disabled={ro}
                      />
                      <WizardField label="Relationship" className="sm:col-span-2">
                        <select value={contact.relationship} onChange={(e) => setContact(index, 'relationship', e.target.value)} className={ic()}>
                          <option value="">Select relationship</option>
                          {EMERGENCY_RELATIONSHIPS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </WizardField>
                      <label className="sm:col-span-2 flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={contact.is_primary} onChange={(e) => setContact(index, 'is_primary', e.target.checked)} className="rounded border-slate-300 text-brand-600" />
                        <span className="text-xs text-slate-600">Primary emergency contact</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <WizardField label="Notes" error={errors.notes}>
                <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} className={ic(errors.notes)} placeholder="Any additional notes about this employee…" />
              </WizardField>

              <div className="border-t border-slate-200 pt-6">
                <h4 className="text-sm font-semibold text-slate-800 mb-4">
                  {isView ? 'Employee summary' : 'Review before submitting'}
                </h4>
                <ReviewPanel
                  form={form}
                  documents={documents}
                  existingDocuments={existingDocuments}
                  lookups={lookups}
                  onGoToStep={setStep}
                  readOnly={isView}
                  probationPreview={isAdd ? probationPreview : undefined}
                  companySlug={companySlug}
                  employeeId={employeeId}
                />
              </div>
            </div>
          )}
          </>
          </fieldset>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 safe-area-pb">
          <button type="button" onClick={step === 1 ? onClose : handleBack} className="btn-secondary" disabled={submitting}>
            {step === 1 ? (isView ? 'Close' : 'Cancel') : (<><ChevronLeft size={14} /> Back</>)}
          </button>

          <div className="flex items-center gap-2">
            {isAdd && (
              <button
                type="button"
                onClick={() => saveDraft(form, step, documentMetaFromFiles(documents))}
                className="btn-secondary sm:hidden"
              >
                <Save size={14} />
              </button>
            )}
            {isView ? (
              step < 6 ? (
                <button type="button" onClick={handleNext} className="btn-primary" disabled={loadingEmployee}>
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button type="button" onClick={onClose} className="btn-primary min-w-[100px]">
                  Close
                </button>
              )
            ) : step < 6 ? (
              <button type="button" onClick={handleNext} className="btn-primary" disabled={loadEmployee && loadingEmployee}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={submitting || (loadEmployee && loadingEmployee)} className="btn-primary min-w-[140px] justify-center">
                {submitting ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Employee')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
