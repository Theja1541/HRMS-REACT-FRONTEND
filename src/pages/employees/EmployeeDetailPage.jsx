import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarClock, CheckCircle2, Save, FileText, ExternalLink, XCircle, Mail } from 'lucide-react';
import { employeeApi, departmentApi, designationApi, leaveApi, payrollApi } from '../../api';
import { EMPLOYEE_DOCUMENTS } from '../../constants/hr';
import { formatINR } from '../../utils/helpers';
import StatusBadge, { Avatar } from '../../components/shared/StatusBadge';
import { cn } from '../../utils/helpers';
import { format, parseISO, isValid } from 'date-fns';
import DocumentDropzone from './employeeWizard/DocumentDropzone';
import { buildUpdatePayload } from './employeeWizard/buildUpdatePayload';
import { validateOfficialEmail, validateGovernmentIds, validateBankingAndStatutory } from './employeeWizard/validation';
import SalaryStructureStep from './employeeWizard/SalaryStructureStep';
import {
  mapSalaryRecordToStructure,
  computeSalaryTotals,
  formatSalaryINR,
} from './employeeWizard/salaryStructure';
import EmployeeTaxDeclarationPanel from '../../components/payroll/EmployeeTaxDeclarationPanel';
import Form16Panel from '../../components/payroll/Form16Panel';
import LeaveBalanceBreakdownDrawer from '../../components/leave/LeaveBalanceBreakdownDrawer';
import { formatLeaveDays, leaveBalanceSubtitle } from '../../utils/leaveFormat';
import InternationalPhoneInput from '../../components/shared/InternationalPhoneInput';
import ProbationHistoryPanel from '../../components/probation/ProbationHistoryPanel';
import GenerateOfferLetterAction from '../../components/employees/GenerateOfferLetterAction';
import GenerateExperienceLetterAction from '../../components/employees/GenerateExperienceLetterAction';
import { ROLE_LABELS } from '../../constants/routes';
import { isValidInternationalPhone } from '../../utils/validation';
import { useTenantCompanySlug } from '../../hooks/useTenantCompanySlug';

function formatDate(value) {
  if (!value) return null;
  try {
    const d = parseISO(String(value).slice(0, 10));
    return isValid(d) ? format(d, 'dd MMM yyyy') : value;
  } catch {
    return value;
  }
}

function toDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

const TABS = [
  { id: 'personal', label: 'Personal' },
  { id: 'employment', label: 'Employment' },
  { id: 'probation', label: 'Probation' },
  { id: 'salary', label: 'Salary & CTC' },
  { id: 'bank', label: 'Bank & Statutory' },
  { id: 'address', label: 'Address' },
  { id: 'documents', label: 'Documents' },
  { id: 'leave', label: 'Leave Balances' },
  { id: 'tax', label: 'Tax Declaration' },
];

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800 mt-0.5">{value || '—'}</p>
    </div>
  );
}

function InputField({ label, name, value, onChange, type = 'text', error }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        className={cn(
          'mt-1 w-full px-3 py-2 border rounded-lg text-sm',
          error ? 'border-red-300' : 'border-slate-200'
        )}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}


export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(searchParams.get('tab') || 'personal');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [balanceBreakdown, setBalanceBreakdown] = useState(null);
  const [probationModal, setProbationModal] = useState(null); // 'confirm' | 'extend' | 'unsuccessful'
  const [probationForm, setProbationForm] = useState({ extension_months: 1, remarks: '' });
  const [probationError, setProbationError] = useState('');
  const [credentialsNotice, setCredentialsNotice] = useState(null);
  const { companySlug, isLoading: companySlugLoading } = useTenantCompanySlug();

  const { data, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeApi.get(id),
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments', 'active'],
    queryFn: () => departmentApi.list({ status: 'active' }),
  });
  const { data: desigData } = useQuery({
    queryKey: ['designations', 'active'],
    queryFn: () => designationApi.list({ status: 'active' }),
  });
  const { data: salaryHistory } = useQuery({
    queryKey: ['salary-history', id],
    queryFn: () => payrollApi.salaryHistory(id),
    enabled: tab === 'salary',
  });
  const { data: balanceData } = useQuery({
    queryKey: ['leave-balances', id],
    queryFn: () => leaveApi.getBalances({ employee_id: id }),
    enabled: tab === 'leave',
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => employeeApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setEditing(false);
      setForm(null);
      setSaveError('');
      setFieldErrors({});
      setSearchParams(tab !== 'personal' ? { tab } : {});
    },
    onError: (err) => {
      const apiError = err.response?.data?.error;
      setSaveError(apiError?.message || err.message || 'Failed to save employee');
      if (apiError?.field) {
        setFieldErrors({ [apiError.field]: apiError.message });
      }
    },
  });

  const resendWelcomeMutation = useMutation({
    mutationFn: () => employeeApi.resendWelcome(id),
    onSuccess: (res) => {
      setCredentialsNotice({
        email_sent: res?.data?.email_sent,
        temporary_password: res?.data?.temporary_password,
      });
    },
    onError: (err) => {
      setCredentialsNotice({
        email_sent: false,
        error: err.response?.data?.error?.message || 'Failed to resend welcome email',
      });
    },
  });

  const invalidateEmployee = () => {
    queryClient.invalidateQueries({ queryKey: ['employee', id] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  const closeProbationModal = () => {
    setProbationModal(null);
    setProbationForm({ extension_months: 1, remarks: '' });
    setProbationError('');
  };

  const confirmMutation = useMutation({
    mutationFn: (payload) => employeeApi.confirmProbation(id, payload),
    onSuccess: () => { invalidateEmployee(); closeProbationModal(); },
    onError: (err) => setProbationError(err.response?.data?.error?.message || 'Failed to confirm probation'),
  });

  const extendMutation = useMutation({
    mutationFn: (payload) => employeeApi.extendProbation(id, payload),
    onSuccess: () => { invalidateEmployee(); closeProbationModal(); },
    onError: (err) => setProbationError(err.response?.data?.error?.message || 'Failed to extend probation'),
  });

  const unsuccessfulMutation = useMutation({
    mutationFn: (payload) => employeeApi.probationUnsuccessful(id, payload),
    onSuccess: () => { invalidateEmployee(); closeProbationModal(); },
    onError: (err) => setProbationError(err.response?.data?.error?.message || 'Failed to mark probation unsuccessful'),
  });

  const handleProbationSubmit = (e) => {
    e.preventDefault();
    setProbationError('');
    const remarks = probationForm.remarks.trim() || undefined;
    if (probationModal === 'confirm') {
      confirmMutation.mutate({ remarks });
    } else if (probationModal === 'extend') {
      const months = parseInt(probationForm.extension_months, 10);
      if (!months || months < 1 || months > 24) {
        setProbationError('Extension must be between 1 and 24 months');
        return;
      }
      extendMutation.mutate({ extension_months: months, remarks });
    } else if (probationModal === 'unsuccessful') {
      unsuccessfulMutation.mutate({ remarks });
    }
  };

  const probationMutationPending =
    confirmMutation.isPending || extendMutation.isPending || unsuccessfulMutation.isPending;

  const emp = data?.data?.employee;
  const hasProbation = emp?.has_probation === true;
  const visibleTabs = useMemo(
    () => TABS.filter((t) => t.id !== 'probation' || hasProbation),
    [hasProbation]
  );

  useEffect(() => {
    if (!emp) return;
    const wantsEdit = searchParams.get('edit') === '1';
    if (wantsEdit) {
      setForm({ ...emp });
      setEditing(true);
    } else {
      setEditing(false);
      setForm(null);
    }
  }, [emp, searchParams]);

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && TABS.some((t) => t.id === urlTab)) {
      setTab(urlTab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (emp && tab === 'probation' && !hasProbation) {
      setTab('personal');
      const params = {};
      if (editing) params.edit = '1';
      setSearchParams(params);
    }
  }, [emp, tab, hasProbation, editing, setSearchParams]);

  const departmentOptions = useMemo(() => {
    const list = [...(deptData?.data?.departments || [])];
    const current = emp?.department;
    if (current && !list.some((d) => d.id === current.id)) {
      list.push(current);
    }
    return list;
  }, [deptData, emp?.department]);

  const designationOptions = useMemo(() => {
    const list = [...(desigData?.data?.designations || [])];
    const current = emp?.designation;
    if (current && !list.some((d) => d.id === current.id)) {
      list.push(current);
    }
    return list;
  }, [desigData, emp?.designation]);

  if (isLoading) return <div className="p-12 text-center text-slate-400">Loading profile…</div>;
  if (error || !emp) {
    const message = error?.response?.data?.error?.message || error?.message || 'Employee not found';
    return <div className="p-12 text-center text-red-500">{message}</div>;
  }

  const isEditReady = editing && form && String(form.id) === String(emp.id);

  const startEdit = () => {
    setForm({ ...emp });
    setEditing(true);
    setSearchParams({ edit: '1', tab });
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
    setSearchParams(tab !== 'personal' ? { tab } : {});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === 'checkbox' ? checked : value;
    setForm((prev) => {
      const next = { ...prev, [name]: nextValue };
      if (name === 'pf_applicable' && !checked) {
        next.uan_number = '';
      }
      if (name === 'esi_applicable' && !checked) {
        next.esic_number = '';
      }
      return next;
    });
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSave = () => {
    if (!form) return;
    const code = form.emp_code?.trim() ?? '';
    const errors = {};
    if (!code) errors.emp_code = 'Employee ID is required';
    else if (code.length > 20) errors.emp_code = 'Employee ID must be 20 characters or fewer';
    const emailError = validateOfficialEmail(form.email);
    if (emailError) errors.email = emailError;
    if (form.phone?.trim() && !isValidInternationalPhone(form.phone)) {
      errors.phone = 'Enter a valid international mobile number';
    }
    Object.assign(errors, validateGovernmentIds(form));
    Object.assign(errors, validateBankingAndStatutory(form));
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setSaveError('');
      return;
    }
    setSaveError('');
    setFieldErrors({});
    updateMutation.mutate(buildUpdatePayload(form));
  };

  const handleTabChange = (tabId) => {
    setTab(tabId);
    const params = {};
    if (editing) params.edit = '1';
    if (tabId !== 'personal') params.tab = tabId;
    setSearchParams(params);
  };

  const handleDocumentUpload = async (docType, file) => {
    setUploadingDoc(docType);
    try {
      await employeeApi.uploadDocument(id, file, docType);
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
    } finally {
      setUploadingDoc(null);
    }
  };

  const documentsByType = Object.fromEntries((emp.documents || []).map((d) => [d.document_type, d]));

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-brand-700 to-sky-500 p-5 sm:p-6 text-white shadow-lg shadow-brand-600/25">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #fff 0.8px, transparent 1px), radial-gradient(circle at 80% 60%, #fff 0.8px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden
        />
        <div className="relative flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="p-2 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors"
            aria-label="Back to employees"
          >
            <ArrowLeft size={14} />
          </button>
          <Avatar name={`${emp.first_name} ${emp.last_name}`} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-sky-100/90 mb-0.5">People · Employee</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {emp.first_name} {emp.last_name}
            </h1>
            <p className="text-sm text-sky-100/90">
              {emp.emp_code} · {emp.designation?.name || 'No designation'} · {emp.department?.name || 'No department'}
            </p>
            {!emp.is_portal_active && (
              <p className="text-xs text-rose-200 font-medium mt-0.5">Portal access deactivated</p>
            )}
          </div>
          <StatusBadge status={emp.status} />
          <div className="page-hero-actions flex flex-wrap items-center gap-2">
            {!editing ? (
              <>
                {emp.status === 'separated' || emp.exit_date ? (
                  <GenerateExperienceLetterAction employeeId={emp.id} employeeCode={emp.emp_code} />
                ) : (
                  <GenerateOfferLetterAction employeeId={emp.id} employeeCode={emp.emp_code} />
                )}
                <button
                  type="button"
                  onClick={() => resendWelcomeMutation.mutate()}
                  disabled={resendWelcomeMutation.isPending || !emp.email}
                  className="btn-secondary"
                  title="Resend welcome email with new temporary password"
                >
                  <Mail size={14} /> {resendWelcomeMutation.isPending ? 'Sending…' : 'Resend Login'}
                </button>
                <button type="button" onClick={startEdit} className="btn-primary">Edit Profile</button>
              </>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={cancelEdit} className="btn-secondary">Cancel</button>
                <button type="button" onClick={handleSave} disabled={updateMutation.isPending} className="btn-primary">
                  <Save size={14} /> {updateMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {credentialsNotice && (
        <div
          className={
            credentialsNotice.email_sent
              ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'
              : 'rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'
          }
        >
          {credentialsNotice.error ? (
            <p>{credentialsNotice.error}</p>
          ) : credentialsNotice.email_sent ? (
            <p>Welcome email with a new temporary password was sent to {emp.email}.</p>
          ) : (
            <p>
              Email could not be sent. Temporary password:{' '}
              <span className="font-mono font-semibold">{credentialsNotice.temporary_password}</span>
            </p>
          )}
          <button type="button" onClick={() => setCredentialsNotice(null)} className="mt-2 text-xs font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="card">
        <div className="ds-toolbar">
          <div className="ds-tabs scroll-tabs" role="tablist">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => handleTabChange(t.id)}
                className={cn(tab === t.id && 'ds-tab-active')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {saveError && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs border border-red-100">
              {saveError}
            </div>
          )}
          {editing && !isEditReady ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading editor…</div>
          ) : (
            <>
          {tab === 'personal' && !editing && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <Field label="Official Email" value={emp.email} />
              <Field label="Personal Email" value={emp.personal_email} />
              <Field label="Phone" value={emp.phone} />
              <Field label="Gender" value={emp.gender} />
              <Field label="Date of Birth" value={formatDate(emp.date_of_birth)} />
              <Field label="Blood Group" value={emp.blood_group} />
              <Field label="Marital Status" value={emp.marital_status} />
              {emp.emergencyContacts?.length > 0 ? (
                <div className="col-span-2 md:col-span-3">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Emergency Contacts</p>
                  <div className="mt-2 space-y-2">
                    {emp.emergencyContacts.map((c) => (
                      <p key={c.id} className="text-sm text-slate-800">
                        {c.contact_name} — {c.contact_phone}
                        {c.relationship ? ` (${c.relationship})` : ''}
                        {c.is_primary && <span className="ml-2 text-[10px] font-semibold text-brand-600">Primary</span>}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <Field label="Emergency Contact" value={emp.emergency_name && `${emp.emergency_name} (${emp.emergency_contact})`} />
              )}
              {emp.notes && (
                <div className="col-span-2 md:col-span-3">
                  <Field label="Notes" value={emp.notes} />
                </div>
              )}
            </div>
          )}
          {tab === 'personal' && isEditReady && (
            <div className="grid grid-cols-2 gap-4">
              <InputField label="First Name" name="first_name" value={form.first_name} onChange={handleChange} />
              <InputField label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} />
              <div>
                <label className="text-xs font-medium text-slate-600">Official Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email || ''}
                  onChange={handleChange}
                  maxLength={150}
                  className={cn(
                    'mt-1 w-full px-3 py-2 border rounded-lg text-sm',
                    fieldErrors.email ? 'border-red-300' : 'border-slate-200'
                  )}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
                )}
              </div>
              <InternationalPhoneInput
                label="Phone"
                value={form.phone}
                onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
                error={fieldErrors.phone}
              />
              <InputField label="Personal Email" name="personal_email" type="email" value={form.personal_email} onChange={handleChange} />
              <InputField label="Date of Birth" name="date_of_birth" type="date" value={toDateInput(form.date_of_birth)} onChange={handleChange} />
              <div>
                <label className="text-xs font-medium text-slate-600">Gender</label>
                <select name="gender" value={form.gender || ''} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="">Select</option>
                  {['male', 'female', 'other', 'prefer_not_to_say'].map((g) => (
                    <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {tab === 'employment' && !editing && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <Field label="Company Slug" value={companySlug ? `${companySlug} (${companySlug}.hrms.app)` : '—'} />
              <Field label="Employee ID" value={emp.emp_code} />
              <Field label="Department" value={emp.department?.name} />
              <Field label="Designation" value={emp.designation?.name} />
              <Field label="Manager" value={emp.manager && `${emp.manager.first_name} ${emp.manager.last_name}`} />
              <Field label="Date of Joining" value={formatDate(emp.date_of_joining)} />
              <Field label="Employment Type" value={emp.employment_type?.replace(/_/g, ' ')} />
              <Field label="System Role" value={ROLE_LABELS[emp.system_role] || emp.system_role} />
              <Field label="Branch" value={emp.branch?.name} />
              <Field
                label="Work Mode"
                value={
                  emp.work_mode === 'hybrid'
                    ? 'Hybrid'
                    : emp.work_mode === 'remote'
                      ? 'Remote'
                      : emp.work_from_home
                        ? 'Remote'
                        : 'Office (On-site)'
                }
              />
            </div>
          )}
          {tab === 'employment' && isEditReady && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600">Company Slug</label>
                <input
                  type="text"
                  value={companySlugLoading ? 'Loading…' : companySlug || '—'}
                  readOnly
                  disabled
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600 cursor-not-allowed font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Set by Super Admin in Tenants / Organizations. Changes apply automatically.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Employee ID</label>
                <input
                  type="text"
                  name="emp_code"
                  value={form.emp_code || ''}
                  onChange={(e) => {
                    handleChange(e);
                    setFieldErrors((prev) => ({ ...prev, emp_code: undefined }));
                  }}
                  maxLength={20}
                  className={cn(
                    'mt-1 w-full px-3 py-2 border rounded-lg text-sm font-mono',
                    fieldErrors.emp_code ? 'border-red-300' : 'border-slate-200'
                  )}
                />
                {fieldErrors.emp_code && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.emp_code}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Department</label>
                <select name="department_id" value={form.department_id || ''} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="">None</option>
                  {(departmentOptions).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Designation</label>
                <select name="designation_id" value={form.designation_id || ''} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="">None</option>
                  {(designationOptions).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <InputField label="Date of Joining" name="date_of_joining" type="date" value={toDateInput(form.date_of_joining)} onChange={handleChange} />
              <div>
                <label className="text-xs font-medium text-slate-600">Status</label>
                <select name="status" value={form.status} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  {['active', 'probation', 'on_notice', 'on_leave', 'separated'].map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {tab === 'probation' && hasProbation && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <Field label="Policy" value={emp.probationPolicy?.policy_name} />
                <Field
                  label="Duration"
                  value={
                    emp.probation_duration_months
                      ? `${emp.probation_duration_months} months`
                      : emp.probationPolicy
                        ? `${emp.probationPolicy.default_duration_months} months`
                        : null
                  }
                />
                <Field label="Probation Start" value={formatDate(emp.probation_start_date)} />
                <Field label="Probation End" value={formatDate(emp.probation_end_date)} />
                <Field label="Confirmation Date" value={formatDate(emp.confirmation_date)} />
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Current Status</p>
                  <div className="mt-1.5">
                    <StatusBadge status={emp.status} />
                  </div>
                </div>
              </div>

              {emp.status === 'probation' && (
                <>
                  <div className="border-t border-slate-100" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Actions</p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => { setProbationModal('extend'); setProbationError(''); setProbationForm({ extension_months: 1, remarks: '' }); }}
                        className="btn-secondary text-xs"
                      >
                        <CalendarClock size={14} /> Extend Probation
                      </button>
                      <button
                        type="button"
                        onClick={() => { setProbationModal('confirm'); setProbationError(''); setProbationForm({ extension_months: 1, remarks: '' }); }}
                        className="btn-primary text-xs"
                      >
                        <CheckCircle2 size={14} /> Confirm Probation
                      </button>
                      <button
                        type="button"
                        onClick={() => { setProbationModal('unsuccessful'); setProbationError(''); setProbationForm({ extension_months: 1, remarks: '' }); }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                      >
                        <XCircle size={14} /> Separate
                      </button>
                    </div>
                  </div>
                </>
              )}

              {emp.status !== 'probation' && (
                <p className="text-xs text-slate-400">
                  {emp.status === 'active' && emp.confirmation_date
                    ? 'Probation completed — employee confirmed.'
                    : emp.status === 'separated'
                    ? 'Employee is no longer active.'
                    : 'No probation actions available for this employee\'s current status.'}
                </p>
              )}

              <div className="border-t border-slate-100 pt-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">History</p>
                <ProbationHistoryPanel history={emp.probationHistory || []} />
              </div>
            </div>
          )}

          {tab === 'bank' && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Government IDs</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {isEditReady ? (
                    <>
                      <InputField label="PAN Number" name="pan_number" value={form.pan_number} onChange={(e) => handleChange({ target: { name: 'pan_number', value: e.target.value.toUpperCase() } })} error={fieldErrors.pan_number} />
                      <InputField label="Aadhaar Number" name="aadhaar_number" value={form.aadhaar_number} onChange={(e) => handleChange({ target: { name: 'aadhaar_number', value: e.target.value.replace(/\D/g, '').slice(0, 12) } })} error={fieldErrors.aadhaar_number} />
                    </>
                  ) : (
                    <>
                      <Field label="PAN Number" value={emp.pan_number} />
                      <Field label="Aadhaar Number" value={emp.aadhaar_number} />
                    </>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Bank Details</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {isEditReady ? (
                    <>
                      <InputField label="Bank Name" name="bank_name" value={form.bank_name} onChange={handleChange} />
                      <InputField label="Account Number" name="account_number" value={form.account_number} onChange={(e) => handleChange({ target: { name: 'account_number', value: e.target.value.replace(/\D/g, '').slice(0, 18) } })} error={fieldErrors.account_number} />
                      <InputField label="IFSC Code" name="ifsc_code" value={form.ifsc_code} onChange={(e) => handleChange({ target: { name: 'ifsc_code', value: e.target.value.toUpperCase() } })} error={fieldErrors.ifsc_code} />
                    </>
                  ) : (
                    <>
                      <Field label="Bank Name" value={emp.bank_name} />
                      <Field label="Account Number" value={emp.account_number && `****${emp.account_number.slice(-4)}`} />
                      <Field label="IFSC Code" value={emp.ifsc_code} />
                    </>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Statutory Applicability</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {isEditReady ? (
                    <>
                      <div className="col-span-2 md:col-span-3 space-y-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="pf_applicable"
                            checked={!!form.pf_applicable}
                            onChange={handleChange}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                          />
                          <span className="text-sm text-slate-700">PF Applicable</span>
                        </label>
                        {form.pf_applicable && (
                          <InputField
                            label="UAN Number"
                            name="uan_number"
                            value={form.uan_number}
                            onChange={(e) => handleChange({ target: { name: 'uan_number', value: e.target.value.replace(/\D/g, '').slice(0, 12) } })}
                            error={fieldErrors.uan_number}
                          />
                        )}
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="esi_applicable"
                            checked={!!form.esi_applicable}
                            onChange={handleChange}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                          />
                          <span className="text-sm text-slate-700">ESI Applicable</span>
                        </label>
                        {form.esi_applicable && (
                          <InputField
                            label="ESI Number"
                            name="esic_number"
                            value={form.esic_number}
                            onChange={(e) => handleChange({ target: { name: 'esic_number', value: e.target.value.replace(/\D/g, '').slice(0, 10) } })}
                            error={fieldErrors.esic_number}
                          />
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <Field label="PF Applicable" value={emp.pf_applicable ? 'Yes' : 'No'} />
                      <Field label="UAN Number" value={emp.pf_applicable ? emp.uan_number : '—'} />
                      <Field label="ESI Applicable" value={emp.esi_applicable ? 'Yes' : 'No'} />
                      <Field label="ESI Number" value={emp.esi_applicable ? emp.esic_number : '—'} />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'address' && (
            <div className="grid grid-cols-2 gap-6">
              {isEditReady ? (
                <>
                  <InputField label="Address" name="address_line1" value={form.address_line1} onChange={handleChange} />
                  <InputField label="City" name="city" value={form.city} onChange={handleChange} />
                  <InputField label="State" name="state" value={form.state} onChange={handleChange} />
                  <InputField label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} />
                </>
              ) : (
                <>
                  <Field label="Current Address" value={[emp.address_line1, emp.city, emp.state, emp.pincode].filter(Boolean).join(', ')} />
                  <Field label="Permanent Address" value={emp.permanent_address} />
                </>
              )}
            </div>
          )}

          {tab === 'documents' && !editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {EMPLOYEE_DOCUMENTS.map((docType) => {
                const doc = documentsByType[docType.key];
                return (
                  <div key={docType.key} className="flex items-start gap-3 p-4 rounded-xl border border-slate-200">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-700">{docType.label}</p>
                      {doc ? (
                        <>
                          <p className="text-sm text-slate-800 truncate mt-0.5">{doc.file_name}</p>
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline mt-1"
                          >
                            View / Download <ExternalLink size={12} />
                          </a>
                        </>
                      ) : (
                        <p className="text-sm text-slate-400 mt-0.5">Not uploaded</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {!emp.documents?.length && (
                <p className="col-span-full text-sm text-slate-400 text-center py-4">No documents uploaded yet</p>
              )}
            </div>
          )}

          {tab === 'documents' && editing && isEditReady && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {EMPLOYEE_DOCUMENTS.map((docType) => {
                const existing = documentsByType[docType.key];
                return (
                  <div key={docType.key} className="space-y-2">
                    {existing && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
                        <FileText size={12} />
                        <span className="truncate">Current: {existing.file_name}</span>
                        <a href={existing.file_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 shrink-0">View</a>
                      </div>
                    )}
                    <DocumentDropzone
                      label={existing ? `Replace ${docType.label}` : docType.label}
                      accept={docType.accept}
                      file={null}
                      onFile={(file) => handleDocumentUpload(docType.key, file)}
                      onClear={() => {}}
                    />
                    {uploadingDoc === docType.key && (
                      <p className="text-[11px] text-brand-600">Uploading…</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'salary' && (
            <div className="space-y-6">
              {(salaryHistory?.data?.salaries || []).length === 0 ? (
                <p className="text-sm text-slate-400">No salary assigned yet</p>
              ) : (
                salaryHistory.data.salaries.map((s) => {
                  const structure = mapSalaryRecordToStructure(s);
                  const totals = computeSalaryTotals(structure);

                  return (
                    <div key={s.id} className="border border-slate-200 rounded-xl p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-slate-900">
                            CTC {formatSalaryINR(totals.ctcYearly)} / year
                            <span className="text-slate-500 font-normal text-sm ml-2">
                              ({formatSalaryINR(totals.ctcMonthly)} / month)
                            </span>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Effective from {s.effective_from}
                            {s.effective_to ? ` to ${s.effective_to}` : ' (current)'}
                          </p>
                        </div>
                        {s.revision_reason && (
                          <span className="text-xs bg-slate-100 px-2 py-1 rounded">{s.revision_reason}</span>
                        )}
                      </div>
                      <SalaryStructureStep
                        structure={structure}
                        readOnly
                        onChange={() => {}}
                        employeeId={id}
                      />
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'leave' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(balanceData?.data?.balances || []).map((b) => (
                <button
                  key={b.leave_type}
                  type="button"
                  onClick={() =>
                    setBalanceBreakdown({
                      employeeId: parseInt(id, 10),
                      leaveTypeId: b.leave_type_id,
                      leaveTypeLabel: b.leave_type,
                      year: balanceData?.data?.year,
                    })
                  }
                  className="bg-slate-50 rounded-xl p-4 text-center w-full hover:ring-2 hover:ring-brand-200 transition-shadow cursor-pointer"
                  title="View balance breakdown"
                >
                  <p className="text-xs text-slate-500">{b.leaveType?.name || b.leave_type}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{formatLeaveDays(b.available)}</p>
                  <p className="text-[10px] text-slate-400">{leaveBalanceSubtitle(b)}</p>
                </button>
              ))}
              {!balanceData?.data?.balances?.length && (
                <p className="text-sm text-slate-400 col-span-4">No leave balances yet</p>
              )}
            </div>
          )}

          {tab === 'tax' && (
            <div className="space-y-8">
              <EmployeeTaxDeclarationPanel
                employeeId={id}
                employeeName={`${emp.first_name} ${emp.last_name}`.trim()}
              />
              <div className="border-t border-slate-100 pt-6">
                <Form16Panel employeeId={Number(id)} mode="admin" />
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {probationModal && hasProbation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={closeProbationModal} aria-label="Close" />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-semibold text-slate-900">
              {probationModal === 'confirm' && 'Confirm Probation'}
              {probationModal === 'extend' && 'Extend Probation'}
              {probationModal === 'unsuccessful' && 'Separate Employee'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {probationModal === 'confirm' && `${emp.first_name} ${emp.last_name} will be set to active and probation will be closed.`}
              {probationModal === 'extend' && `Current end date: ${formatDate(emp.probation_end_date) || '—'}. The new end date will be recalculated from the current end date.`}
              {probationModal === 'unsuccessful' && `${emp.first_name} ${emp.last_name} will be marked as separated (probation unsuccessful). This action cannot be undone.`}
            </p>
            <form className="mt-4 space-y-4" onSubmit={handleProbationSubmit}>
              {probationModal === 'extend' && (
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Extension months <span className="text-slate-400 font-normal">(1–24)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={probationForm.extension_months}
                    onChange={(e) => setProbationForm((p) => ({ ...p, extension_months: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    required
                    autoFocus
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-600">Remarks <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  rows={3}
                  value={probationForm.remarks}
                  onChange={(e) => setProbationForm((p) => ({ ...p, remarks: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                  placeholder="Add a note for the record…"
                  maxLength={500}
                />
              </div>
              {probationError && <p className="text-sm text-red-600">{probationError}</p>}
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={closeProbationModal} className="btn-secondary text-xs" disabled={probationMutationPending}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={probationMutationPending}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50',
                    probationModal === 'unsuccessful'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'btn-primary'
                  )}
                >
                  {probationMutationPending
                    ? 'Saving…'
                    : probationModal === 'confirm'
                    ? 'Confirm'
                    : probationModal === 'extend'
                    ? 'Extend'
                    : 'Separate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <LeaveBalanceBreakdownDrawer
        employeeId={balanceBreakdown?.employeeId}
        leaveTypeId={balanceBreakdown?.leaveTypeId}
        leaveTypeLabel={balanceBreakdown?.leaveTypeLabel}
        year={balanceBreakdown?.year}
        onClose={() => setBalanceBreakdown(null)}
      />
    </div>
  );
}
