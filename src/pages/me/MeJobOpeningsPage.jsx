import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  MapPin,
  Building2,
  CheckCircle2,
  X,
  UserPlus,
  Users,
  Upload,
  Download,
  Paperclip,
} from 'lucide-react';
import { portalApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import InternationalPhoneInput from '../../components/shared/InternationalPhoneInput';
import { cn, formatINR, resolveAssetUrl } from '../../utils/helpers';
import { JOB_STATUSES, APPLICATION_STATUSES } from '../../constants/hr';
import {
  POSTING_TYPE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  APPLICATION_SOURCE_LABELS,
} from '../../constants/recruitment';
import { format, parseISO } from 'date-fns';
import { formatPhoneForStorage, isValidEmail, isValidInternationalPhone } from '../../utils/validation';

function StatusPill({ status, map }) {
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', map[status] || 'bg-slate-100 text-slate-600')}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function ApplyModal({ opening, onClose, onSuccess }) {
  const [form, setForm] = useState({ experience_years: '', expected_ctc: '', notes: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      portalApi.applyToJobOpening(opening.id, {
        experience_years: form.experience_years ? parseFloat(form.experience_years) : null,
        expected_ctc: form.expected_ctc ? parseFloat(form.expected_ctc) : null,
        notes: form.notes || null,
      }),
    onSuccess: () => onSuccess(),
    onError: (err) => setError(err.response?.data?.error?.message || 'Failed to submit application'),
  });

  return (
    <ModalShell title="Apply for internal role" onClose={onClose}>
      <p className="text-sm text-slate-600 mb-4">
        {opening.title}
        {opening.department?.name ? <span className="text-slate-400"> · {opening.department.name}</span> : null}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError('');
          mutation.mutate();
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Experience (years)" type="number" value={form.experience_years} onChange={(v) => setForm({ ...form, experience_years: v })} />
          <Field label="Expected CTC" type="number" value={form.expected_ctc} onChange={(v) => setForm({ ...form, expected_ctc: v })} />
        </div>
        <Field label="Why are you a good fit? (optional)" textarea value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} rows={3} />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <ModalActions onCancel={onClose} loading={mutation.isPending} submitLabel="Submit Application" />
      </form>
    </ModalShell>
  );
}

function ReferModal({ opening, onClose, onSuccess }) {
  const [form, setForm] = useState({
    candidate_name: '',
    email: '',
    phone: '',
    experience_years: '',
    expected_ctc: '',
    notes: '',
    resume: null,
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('candidate_name', form.candidate_name.trim());
      fd.append('email', form.email.trim());
      if (form.phone) fd.append('phone', formatPhoneForStorage(form.phone) || '');
      if (form.experience_years) fd.append('experience_years', form.experience_years);
      if (form.expected_ctc) fd.append('expected_ctc', form.expected_ctc);
      if (form.notes) fd.append('notes', form.notes);
      if (form.resume) fd.append('resume', form.resume);
      return portalApi.referToJobOpening(opening.id, fd);
    },
    onSuccess: () => onSuccess(),
    onError: (err) => setError(err.response?.data?.error?.message || 'Failed to submit referral'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.candidate_name.trim()) return setError('Candidate name is required');
    if (!isValidEmail(form.email)) return setError('Enter a valid candidate email');
    if (form.phone.trim() && !isValidInternationalPhone(form.phone)) {
      return setError('Enter a valid international phone number');
    }
    mutation.mutate();
  };

  return (
    <ModalShell title="Refer an external candidate" onClose={onClose}>
      <p className="text-sm text-slate-600 mb-1">{opening.title}</p>
      <p className="text-xs text-slate-500 mb-4">
        Refer a friend or professional contact. HR will review and contact them directly.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Candidate name" value={form.candidate_name} onChange={(v) => setForm({ ...form, candidate_name: v })} required />
        <Field label="Candidate email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
        <InternationalPhoneInput label="Candidate phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Experience (years)" type="number" value={form.experience_years} onChange={(v) => setForm({ ...form, experience_years: v })} />
          <Field label="Expected CTC" type="number" value={form.expected_ctc} onChange={(v) => setForm({ ...form, expected_ctc: v })} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Resume (optional)</label>
          <label className="mt-1 flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 cursor-pointer hover:bg-slate-50">
            <Upload size={14} />
            {form.resume ? form.resume.name : 'PDF, DOC, or image'}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              className="sr-only"
              onChange={(e) => setForm({ ...form, resume: e.target.files?.[0] || null })}
            />
          </label>
        </div>
        <Field label="Notes for HR (optional)" textarea value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} rows={2} />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <ModalActions onCancel={onClose} loading={mutation.isPending} submitLabel="Submit Referral" />
      </form>
    </ModalShell>
  );
}

function OpeningCard({ opening, action }) {
  return (
    <div className="card p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
            <Briefcase size={18} className="text-brand-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{opening.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{opening.designation?.name || '—'}</p>
          </div>
        </div>
        <StatusPill status={opening.status} map={JOB_STATUSES} />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <Building2 size={13} className="text-slate-400" />
          {opening.department?.name || '—'}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin size={13} className="text-slate-400" />
          {opening.location || '—'}
        </span>
        {opening.employment_type && (
          <span>{EMPLOYMENT_TYPE_LABELS[opening.employment_type] || opening.employment_type}</span>
        )}
        {opening.max_ctc ? <span className="font-mono">Up to {formatINR(opening.max_ctc)}</span> : null}
      </div>

      {opening.description && (
        <p className="mt-3 text-xs text-slate-600 whitespace-pre-wrap">{opening.description}</p>
      )}
      {opening.attachment_url && (
        <a
          href={resolveAssetUrl(opening.attachment_url)}
          target="_blank"
          rel="noopener noreferrer"
          download={opening.attachment_name || undefined}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
        >
          <Paperclip size={13} />
          {opening.attachment_name || 'Download job description'}
          <Download size={12} className="opacity-70" />
        </a>
      )}

      <div className="mt-auto pt-4">{action}</div>
    </div>
  );
}

export default function MeJobOpeningsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('internal');
  const [applyOpening, setApplyOpening] = useState(null);
  const [referOpening, setReferOpening] = useState(null);

  const { data: openingsData, isLoading: internalLoading } = useQuery({
    queryKey: ['portal-job-openings'],
    queryFn: portalApi.listJobOpenings,
  });
  const { data: referralData, isLoading: referralLoading } = useQuery({
    queryKey: ['portal-referral-openings'],
    queryFn: portalApi.listReferralOpenings,
  });
  const { data: appsData } = useQuery({
    queryKey: ['portal-my-applications'],
    queryFn: portalApi.listMyJobApplications,
  });
  const { data: referralsData } = useQuery({
    queryKey: ['portal-my-referrals'],
    queryFn: portalApi.listMyJobReferrals,
  });

  const internalOpenings = openingsData?.data?.openings || [];
  const referralOpenings = referralData?.data?.openings || [];
  const applications = appsData?.data?.applications || [];
  const referrals = referralsData?.data?.referrals || [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['portal-job-openings'] });
    queryClient.invalidateQueries({ queryKey: ['portal-referral-openings'] });
    queryClient.invalidateQueries({ queryKey: ['portal-my-applications'] });
    queryClient.invalidateQueries({ queryKey: ['portal-my-referrals'] });
    queryClient.invalidateQueries({ queryKey: ['job-applications'] });
  };

  const tabs = [
    { key: 'internal', label: 'Internal Openings', count: internalOpenings.length },
    { key: 'refer', label: 'Refer a Candidate', count: referralOpenings.length },
    { key: 'applications', label: 'My Applications', count: applications.length },
    { key: 'referrals', label: 'My Referrals', count: referrals.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="My Work · Careers"
        title="Careers & Referrals"
        subtitle="Apply for internal roles or refer external candidates to open positions"
      />

      <div className="card p-4 border border-slate-200 bg-slate-50/80 text-sm text-slate-600">
        <p className="font-medium text-slate-800">How it works</p>
        <ul className="mt-2 space-y-1 text-xs list-disc list-inside">
          <li><strong>Internal openings</strong> — roles published for existing employees (internal mobility).</li>
          <li><strong>Refer a candidate</strong> — refer an external friend or professional; HR tracks your referral.</li>
          <li>External candidates can also apply on the company careers page (no login required).</li>
        </ul>
      </div>

      <div className="ds-tabs scroll-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(tab === t.key && 'ds-tab-active')}
          >
            {t.label}{t.count ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {tab === 'internal' && (
        internalLoading ? (
          <div className="card p-12 text-center text-slate-400">Loading…</div>
        ) : internalOpenings.length === 0 ? (
          <EmptyState icon={Briefcase} message="No internal openings right now." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {internalOpenings.map((o) => (
              <OpeningCard
                key={o.id}
                opening={o}
                action={
                  o.has_applied ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                      <CheckCircle2 size={14} /> Already applied
                    </span>
                  ) : (
                    <button type="button" onClick={() => setApplyOpening(o)} className="btn-primary text-xs">
                      Apply internally
                    </button>
                  )
                }
              />
            ))}
          </div>
        )
      )}

      {tab === 'refer' && (
        referralLoading ? (
          <div className="card p-12 text-center text-slate-400">Loading…</div>
        ) : referralOpenings.length === 0 ? (
          <EmptyState icon={UserPlus} message="No referral-eligible openings at the moment." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {referralOpenings.map((o) => (
              <OpeningCard
                key={o.id}
                opening={o}
                action={
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500">
                      {POSTING_TYPE_LABELS[o.posting_type] || 'External'}
                      {o.my_referral_count > 0 ? ` · ${o.my_referral_count} referred by you` : ''}
                    </span>
                    <button type="button" onClick={() => setReferOpening(o)} className="btn-primary text-xs">
                      <UserPlus size={12} className="inline mr-1" />
                      Refer someone
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        )
      )}

      {tab === 'applications' && (
        <ApplicationsTable
          rows={applications}
          emptyMessage="You haven't applied to any internal openings yet."
          nameCol="Role"
          getTitle={(a) => a.jobOpening?.title}
          getDept={(a) => a.jobOpening?.department?.name}
        />
      )}

      {tab === 'referrals' && (
        <ApplicationsTable
          rows={referrals}
          emptyMessage="You haven't referred anyone yet."
          nameCol="Candidate"
          getTitle={(a) => a.candidate_name}
          getDept={(a) => a.jobOpening?.title}
          showEmail
        />
      )}

      {applyOpening && (
        <ApplyModal
          opening={applyOpening}
          onClose={() => setApplyOpening(null)}
          onSuccess={() => {
            invalidateAll();
            setApplyOpening(null);
          }}
        />
      )}

      {referOpening && (
        <ReferModal
          opening={referOpening}
          onClose={() => setReferOpening(null)}
          onSuccess={() => {
            invalidateAll();
            setReferOpening(null);
            setTab('referrals');
          }}
        />
      )}
    </div>
  );
}

function ApplicationsTable({ rows, emptyMessage, nameCol, getTitle, getDept, showEmail }) {
  if (rows.length === 0) {
    return <div className="card p-12 text-center text-slate-400">{emptyMessage}</div>;
  }

  return (
    <div className="card overflow-x-auto overscroll-x-contain">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">{nameCol}</th>
            <th className="text-left px-4 py-3 font-semibold">{showEmail ? 'Role' : 'Department'}</th>
            {showEmail && <th className="text-left px-4 py-3 font-semibold">Email</th>}
            <th className="text-left px-4 py-3 font-semibold">Applied On</th>
            <th className="text-left px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium">{getTitle(a)}</td>
              <td className="px-4 py-3">{getDept(a) || '—'}</td>
              {showEmail && <td className="px-4 py-3 text-slate-500">{a.email}</td>}
              <td className="px-4 py-3">
                {a.applied_at ? format(parseISO(a.applied_at), 'dd MMM yyyy') : '—'}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={a.status} map={APPLICATION_STATUSES} />
                {showEmail && (
                  <p className="text-[10px] text-slate-400 mt-0.5">{APPLICATION_SOURCE_LABELS[a.source] || a.source}</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="card p-12 text-center">
      <Icon size={32} className="mx-auto text-slate-300 mb-3" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function ModalShell({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required, textarea, rows = 3 }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      ) : (
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      )}
    </div>
  );
}

function ModalActions({ onCancel, loading, submitLabel }) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="submit" disabled={loading} className="btn-primary text-xs">
        {loading ? 'Submitting…' : submitLabel}
      </button>
      <button type="button" onClick={onCancel} className="btn-secondary text-xs">Cancel</button>
    </div>
  );
}
