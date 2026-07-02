import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Clock, AlertCircle } from 'lucide-react';
import { employeeApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import ChangePasswordForm from '../../components/auth/ChangePasswordForm';
import InternationalPhoneInput from '../../components/shared/InternationalPhoneInput';
import { formatPhoneForStorage, isValidInternationalPhone } from '../../utils/validation';
import { Avatar } from '../../components/shared/StatusBadge';
import { ROLE_LABELS } from '../../constants/routes';
import { cn } from '../../utils/helpers';
import { format, parseISO } from 'date-fns';

const TABS = [
  { id: 'personal', label: 'Personal' },
  { id: 'employment', label: 'Employment' },
  { id: 'probation', label: 'Probation' },
  { id: 'bank', label: 'Bank & Statutory' },
  { id: 'security', label: 'Security' },
  { id: 'requests', label: 'Edit Requests' },
];

const PERSONAL_FIELDS = [
  { key: 'phone', label: 'Phone' },
  { key: 'personal_email', label: 'Personal Email', type: 'email' },
  { key: 'emergency_name', label: 'Emergency Contact Name' },
  { key: 'emergency_contact', label: 'Emergency Phone' },
  { key: 'blood_group', label: 'Blood Group' },
  { key: 'marital_status', label: 'Marital Status' },
  { key: 'address_line1', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'pincode', label: 'Pincode' },
];

const BANK_FIELDS = [
  { key: 'bank_name', label: 'Bank Name', sensitive: true },
  { key: 'account_number', label: 'Account Number', sensitive: true },
  { key: 'ifsc_code', label: 'IFSC Code', sensitive: true },
  { key: 'account_type', label: 'Account Type', sensitive: true },
  { key: 'pan_number', label: 'PAN', sensitive: true },
  { key: 'aadhaar_number', label: 'Aadhaar', sensitive: true },
  { key: 'uan_number', label: 'UAN', sensitive: true },
];

const REQUEST_STATUS = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
};

const PHONE_FIELD_KEYS = new Set(['phone', 'emergency_contact']);

function FieldGrid({ fields, emp, editing, form, setForm, pendingFields }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {fields.map(({ key, label, type = 'text', sensitive }) => {
        const isPending = pendingFields?.includes(key);
        return (
          <div key={key}>
            <label className="text-xs font-medium text-slate-600 flex items-center gap-2">
              {label}
              {sensitive && (
                <span className="text-[9px] font-semibold uppercase tracking-wide text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                  HR approval
                </span>
              )}
              {isPending && (
                <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                  <Clock size={10} /> Pending
                </span>
              )}
            </label>
            {editing ? (
              PHONE_FIELD_KEYS.has(key) ? (
                <InternationalPhoneInput
                  value={form[key] || ''}
                  onChange={(v) => setForm({ ...form, [key]: v })}
                />
              ) : (
                <input
                  type={type}
                  value={form[key] || ''}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              )
            ) : (
              <p className="text-sm text-slate-800 mt-0.5">{emp[key] || '—'}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(String(value).slice(0, 10)), 'dd MMM yyyy');
  } catch {
    return String(value).slice(0, 10);
  }
}

function getDaysRemaining(endDate) {
  if (!endDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${String(endDate).slice(0, 10)}T00:00:00`);
  return Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function MeProfilePage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('personal');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: employeeApi.getSelf,
  });

  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['my-edit-requests'],
    queryFn: () => employeeApi.listMyEditRequests(),
    enabled: tab === 'requests',
  });

  const updateMutation = useMutation({
    mutationFn: employeeApi.updateSelf,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['my-edit-requests'] });
      queryClient.invalidateQueries({ queryKey: ['portal-summary'] });
      setEditing(false);
      setSaveError('');
      setSaveMessage(res?.message || 'Profile updated');
    },
    onError: (err) => {
      const code = err.response?.data?.error?.code;
      const msg = err.response?.data?.error?.message || 'Failed to save profile';
      setSaveError(code === 'DUPLICATE_REQUEST' ? `${msg} — check Edit Requests tab` : msg);
    },
  });

  const emp = data?.data?.employee;
  const editRequests = requestsData?.data?.requests || [];
  const pendingFields = editRequests.filter((r) => r.status === 'pending').map((r) => r.field_name);

  if (isLoading) return <div className="p-12 text-center text-slate-400">Loading profile…</div>;
  if (!emp) return <div className="p-12 text-center text-red-500">Profile not found</div>;

  const allEditableFields = [...PERSONAL_FIELDS, ...BANK_FIELDS];

  const startEdit = () => {
    const initial = {};
    allEditableFields.forEach(({ key }) => { initial[key] = emp[key] || ''; });
    setForm(initial);
    setEditing(true);
    setSaveMessage('');
    setSaveError('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaveError('');
    setSaveMessage('');

    if (form.phone?.trim() && !isValidInternationalPhone(form.phone)) {
      setSaveError('Enter a valid international mobile number');
      return;
    }
    if (form.emergency_contact?.trim() && !isValidInternationalPhone(form.emergency_contact)) {
      setSaveError('Enter a valid emergency contact number');
      return;
    }

    updateMutation.mutate({
      ...form,
      phone: formatPhoneForStorage(form.phone),
      emergency_contact: formatPhoneForStorage(form.emergency_contact),
    });
  };

  const canEdit = tab !== 'requests' && tab !== 'employment' && tab !== 'security';

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle={`${emp.emp_code} · ${ROLE_LABELS[emp.system_role] || emp.system_role}`}
        actions={
          canEdit && !editing ? (
            <button type="button" onClick={startEdit} className="btn-primary text-xs">Edit Profile</button>
          ) : canEdit && editing ? (
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-xs">Cancel</button>
          ) : null
        }
      />

      {saveMessage && (
        <div className="card p-4 flex items-start gap-2 border-emerald-200 bg-emerald-50/50 text-sm text-emerald-800">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {saveMessage}
        </div>
      )}
      {saveError && (
        <div className="card p-4 text-sm text-red-600 border-red-200 bg-red-50/50">{saveError}</div>
      )}

      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={`${emp.first_name} ${emp.last_name}`} size="lg" />
          <div>
            <h2 className="text-lg font-semibold">{emp.first_name} {emp.last_name}</h2>
            <p className="text-sm text-slate-500">{emp.email}</p>
            <p className="text-xs text-slate-400 mt-1">
              {emp.department?.name || '—'} · {emp.designation?.name || '—'}
            </p>
          </div>
        </div>

        <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setEditing(false);
                setSaveMessage('');
                setSaveError('');
              }}
              className={cn(
                'px-4 py-2 text-xs font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                tab === t.id
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              {t.label}
              {t.id === 'requests' && pendingFields.length > 0 && (
                <span className="ml-1.5 bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingFields.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'personal' && (
          editing ? (
            <form onSubmit={handleSave}>
              <FieldGrid
                fields={PERSONAL_FIELDS}
                emp={emp}
                editing
                form={form}
                setForm={setForm}
                pendingFields={pendingFields}
              />
              <div className="mt-6">
                <button type="submit" disabled={updateMutation.isPending} className="btn-primary inline-flex items-center gap-2 text-xs">
                  <Save size={14} /> {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <FieldGrid fields={PERSONAL_FIELDS} emp={emp} pendingFields={pendingFields} />
          )
        )}

        {tab === 'employment' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="text-[10px] uppercase text-slate-400">Joined</p>
              <p className="text-sm">{emp.date_of_joining ? format(parseISO(emp.date_of_joining), 'dd MMM yyyy') : '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400">Employment</p>
              <p className="text-sm capitalize">{emp.employment_type?.replace('_', ' ') || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400">Status</p>
              <p className="text-sm capitalize">{emp.status?.replace('_', ' ') || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400">Manager</p>
              <p className="text-sm">
                {emp.manager ? `${emp.manager.first_name} ${emp.manager.last_name}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400">Branch</p>
              <p className="text-sm">{emp.branch?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400">Department</p>
              <p className="text-sm">{emp.department?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400">Designation</p>
              <p className="text-sm">{emp.designation?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400">Employee Code</p>
              <p className="text-sm">{emp.emp_code}</p>
            </div>
          </div>
        )}

        {tab === 'probation' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-[10px] uppercase text-slate-400">Current Status</p>
                <p className="text-sm capitalize">{emp.status?.replace('_', ' ') || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400">Policy Name</p>
                <p className="text-sm">{emp.probationPolicy?.policy_name || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400">Probation Start Date</p>
                <p className="text-sm">{formatDate(emp.probation_start_date)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400">Probation End Date</p>
                <p className="text-sm">{formatDate(emp.probation_end_date)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400">Days Remaining</p>
                <p className="text-sm">
                  {(() => {
                    const days = getDaysRemaining(emp.probation_end_date);
                    if (days == null) return '—';
                    if (days < 0) return `${Math.abs(days)} day(s) overdue`;
                    if (days === 0) return 'Due today';
                    return `${days} day(s)`;
                  })()}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400">Confirmation Date</p>
                <p className="text-sm">{formatDate(emp.confirmation_date)}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              This section is read-only. Probation actions are managed by HR/Admin only.
            </p>
          </div>
        )}

        {tab === 'bank' && (
          <>
            <p className="text-xs text-slate-500 mb-4">
              Changes to bank and statutory fields require HR approval before they take effect.
            </p>
            {editing ? (
              <form onSubmit={handleSave}>
                <FieldGrid
                  fields={BANK_FIELDS}
                  emp={emp}
                  editing
                  form={form}
                  setForm={setForm}
                  pendingFields={pendingFields}
                />
                <div className="mt-6">
                  <button type="submit" disabled={updateMutation.isPending} className="btn-primary inline-flex items-center gap-2 text-xs">
                    <Save size={14} /> {updateMutation.isPending ? 'Submitting…' : 'Submit for Approval'}
                  </button>
                </div>
              </form>
            ) : (
              <FieldGrid fields={BANK_FIELDS} emp={emp} pendingFields={pendingFields} />
            )}
          </>
        )}

        {tab === 'requests' && (
          <div>
            {requestsLoading ? (
              <p className="text-sm text-slate-400 text-center py-8">Loading requests…</p>
            ) : editRequests.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No profile edit requests</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Field</th>
                      <th className="px-4 py-3">Requested Value</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {editRequests.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 font-medium capitalize">{r.field_name?.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-slate-600">{r.new_value || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded capitalize', REQUEST_STATUS[r.status])}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {r.created_at ? format(parseISO(r.created_at), 'dd MMM yyyy') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'security' && <ChangePasswordForm />}
      </div>
    </div>
  );
}
