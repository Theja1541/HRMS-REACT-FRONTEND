import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Briefcase, Building2, MapPin, Upload, CheckCircle2, Download, Paperclip } from 'lucide-react';
import { careersApi } from '../../api';
import { formatINR, resolveAssetUrl } from '../../utils/helpers';
import { EMPLOYMENT_TYPE_LABELS } from '../../constants/recruitment';
import InternationalPhoneInput from '../../components/shared/InternationalPhoneInput';
import { formatPhoneForStorage, isValidEmail, isValidInternationalPhone } from '../../utils/validation';

export default function CareersPage() {
  const { tenantSlug } = useParams();
  const [selectedOpening, setSelectedOpening] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['careers', tenantSlug],
    queryFn: () => careersApi.listOpenings(tenantSlug),
    enabled: Boolean(tenantSlug),
  });

  const tenant = data?.data?.tenant;
  const openings = data?.data?.openings || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-8">
          {isLoading ? (
            <p className="text-slate-400">Loading careers…</p>
          ) : error ? (
            <p className="text-red-600">Careers page not found.</p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">We're hiring</p>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">{tenant?.name}</h1>
              <p className="text-sm text-slate-500 mt-2">Explore open positions and apply directly — no account required.</p>
            </>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {submitted && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm border border-emerald-100">
            <CheckCircle2 size={18} />
            Application submitted. Our HR team will contact you if your profile is shortlisted.
          </div>
        )}

        {!isLoading && !error && openings.length === 0 && (
          <div className="card p-12 text-center text-slate-500">
            <Briefcase size={36} className="mx-auto text-slate-300 mb-3" />
            No open positions at this time. Please check back later.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {openings.map((o) => (
            <article key={o.id} className="card p-5 flex flex-col">
              <h2 className="text-base font-semibold text-slate-900">{o.title}</h2>
              <p className="text-xs text-slate-500 mt-1">{o.designation?.name}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <Building2 size={13} className="text-slate-400" />
                  {o.department?.name || '—'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} className="text-slate-400" />
                  {o.location || '—'}
                </span>
                {o.employment_type && (
                  <span>{EMPLOYMENT_TYPE_LABELS[o.employment_type] || o.employment_type}</span>
                )}
                {o.max_ctc ? <span className="font-mono">Up to {formatINR(o.max_ctc)}</span> : null}
              </div>
              {o.description && <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{o.description}</p>}
              {o.attachment_url && (
                <a
                  href={resolveAssetUrl(o.attachment_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={o.attachment_name || undefined}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
                >
                  <Paperclip size={13} />
                  {o.attachment_name || 'Download job description'}
                  <Download size={12} className="opacity-70" />
                </a>
              )}
              <div className="mt-auto pt-4">
                <button type="button" onClick={() => { setSubmitted(false); setSelectedOpening(o); }} className="btn-primary text-xs">
                  Apply now
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>

      {selectedOpening && (
        <CareersApplyModal
          tenantSlug={tenantSlug}
          opening={selectedOpening}
          onClose={() => setSelectedOpening(null)}
          onSuccess={() => {
            setSelectedOpening(null);
            setSubmitted(true);
          }}
        />
      )}
    </div>
  );
}

function CareersApplyModal({ tenantSlug, opening, onClose, onSuccess }) {
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
      return careersApi.apply(tenantSlug, opening.id, fd);
    },
    onSuccess: () => onSuccess(),
    onError: (err) => setError(err.response?.data?.error?.message || 'Failed to submit application'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-sm font-semibold">Apply — {opening.title}</h3>
        {opening.description && (
          <p className="mt-2 text-xs text-slate-600 whitespace-pre-wrap">{opening.description}</p>
        )}
        {opening.attachment_url && (
          <a
            href={resolveAssetUrl(opening.attachment_url)}
            target="_blank"
            rel="noopener noreferrer"
            download={opening.attachment_name || undefined}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
          >
            <Paperclip size={13} />
            {opening.attachment_name || 'Download job description'}
            <Download size={12} className="opacity-70" />
          </a>
        )}
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            if (!form.candidate_name.trim()) return setError('Name is required');
            if (!isValidEmail(form.email)) return setError('Enter a valid email');
            if (form.phone.trim() && !isValidInternationalPhone(form.phone)) {
              return setError('Enter a valid phone number');
            }
            mutation.mutate();
          }}
        >
          <Input label="Full name" required value={form.candidate_name} onChange={(v) => setForm({ ...form, candidate_name: v })} />
          <Input label="Email" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <InternationalPhoneInput label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Experience (years)" type="number" value={form.experience_years} onChange={(v) => setForm({ ...form, experience_years: v })} />
            <Input label="Expected CTC" type="number" value={form.expected_ctc} onChange={(v) => setForm({ ...form, expected_ctc: v })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Resume</label>
            <label className="mt-1 flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm cursor-pointer hover:bg-slate-50">
              <Upload size={14} />
              {form.resume ? form.resume.name : 'Upload PDF or DOC'}
              <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => setForm({ ...form, resume: e.target.files?.[0] || null })} />
            </label>
          </div>
          <Input label="Cover note (optional)" textarea value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={mutation.isPending} className="btn-primary text-xs">
              {mutation.isPending ? 'Submitting…' : 'Submit application'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary text-xs">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required, textarea }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
      ) : (
        <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
      )}
    </div>
  );
}
