import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { X, Mail, Phone, FileText, ExternalLink, User, Briefcase } from 'lucide-react';
import { hrApi } from '../../api';
import { APPLICATION_STATUSES } from '../../constants/hr';
import {
  APPLICATION_SOURCE_LABELS,
  POSTING_TYPE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
} from '../../constants/recruitment';
import { formatINR, cn, resolveAssetUrl } from '../../utils/helpers';

function formatDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy, h:mm a');
  } catch {
    return value;
  }
}

function DetailRow({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="text-sm text-slate-800 mt-0.5">{children}</div>
    </div>
  );
}

export default function CandidateDetailDrawer({ applicationId, onClose, onUpdated }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['job-application', applicationId],
    queryFn: () => hrApi.getApplication(applicationId),
    enabled: !!applicationId,
  });

  const application = data?.data?.application;

  useEffect(() => {
    if (application) {
      setNotes(application.notes || '');
      setStatus(application.status);
    }
  }, [application?.id, application?.notes, application?.status]);

  const updateMutation = useMutation({
    mutationFn: (payload) => hrApi.updateApplicationStatus(applicationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-application', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      onUpdated?.();
    },
  });

  const opening = application?.jobOpening;
  const resumeHref = application?.resume_url ? resolveAssetUrl(application.resume_url) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white w-full max-w-xl h-full shadow-xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">Candidate Details</h2>
            {application && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {application.candidate_name} · {application.email}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <p className="text-center text-slate-400 py-12">Loading candidate…</p>
          ) : error ? (
            <p className="text-center text-red-500 py-12">Failed to load candidate details</p>
          ) : !application ? (
            <p className="text-center text-slate-400 py-12">Candidate not found</p>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-lg shrink-0">
                  {application.candidate_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{application.candidate_name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', APPLICATION_STATUSES[application.status])}>
                      {application.status?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {APPLICATION_SOURCE_LABELS[application.source] || application.source}
                    </span>
                    {application.applicant && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                        Internal · {application.applicant.emp_code || 'Employee'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <section className="grid grid-cols-2 gap-4">
                <DetailRow label="Email">
                  <a href={`mailto:${application.email}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                    <Mail size={12} /> {application.email}
                  </a>
                </DetailRow>
                <DetailRow label="Phone">
                  {application.phone ? (
                    <a href={`tel:${application.phone}`} className="inline-flex items-center gap-1">
                      <Phone size={12} /> {application.phone}
                    </a>
                  ) : '—'}
                </DetailRow>
                <DetailRow label="Experience">{application.experience_years != null ? `${application.experience_years} years` : '—'}</DetailRow>
                <DetailRow label="Expected CTC">{application.expected_ctc ? formatINR(application.expected_ctc) : '—'}</DetailRow>
                <DetailRow label="Applied on">{formatDate(application.applied_at)}</DetailRow>
                <DetailRow label="Resume">
                  {resumeHref ? (
                    <a href={resumeHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                      <FileText size={12} /> View resume <ExternalLink size={10} />
                    </a>
                  ) : '—'}
                </DetailRow>
              </section>

              {application.referrer && (
                <section className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                  <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                    <User size={12} /> Referred by employee
                  </p>
                  <p className="text-sm text-slate-800 mt-1">
                    {application.referrer.first_name} {application.referrer.last_name}
                    {application.referrer.emp_code && <span className="text-slate-500"> · {application.referrer.emp_code}</span>}
                  </p>
                  {application.referrer.email && <p className="text-xs text-slate-500 mt-0.5">{application.referrer.email}</p>}
                </section>
              )}

              {opening && (
                <section className="rounded-lg border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Briefcase size={12} /> Applied for
                  </p>
                  <p className="font-medium text-slate-900">{opening.title}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <DetailRow label="Department">{opening.department?.name || '—'}</DetailRow>
                    <DetailRow label="Designation">{opening.designation?.name || '—'}</DetailRow>
                    <DetailRow label="Location">{opening.location || '—'}</DetailRow>
                    <DetailRow label="Employment">{EMPLOYMENT_TYPE_LABELS[opening.employment_type] || opening.employment_type || '—'}</DetailRow>
                    <DetailRow label="Channel">{POSTING_TYPE_LABELS[opening.posting_type] || opening.posting_type || '—'}</DetailRow>
                    <DetailRow label="Max CTC">{opening.max_ctc ? formatINR(opening.max_ctc) : '—'}</DetailRow>
                  </div>
                  {opening.description && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Job description</p>
                      <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{opening.description}</p>
                    </div>
                  )}
                </section>
              )}

              <section className="space-y-3">
                <p className="text-xs font-semibold text-slate-700">Pipeline status</p>
                <select
                  value={status || application.status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {Object.keys(APPLICATION_STATUSES).map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </section>

              <section className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">HR notes</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Interview feedback, screening notes, offer details…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </section>
            </>
          )}
        </div>

        {application && (
          <div className="px-5 py-4 border-t border-slate-200 flex gap-2 justify-end shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary">Close</button>
            <button
              type="button"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate({
                status: status || application.status,
                notes,
              })}
              className="btn-primary"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
