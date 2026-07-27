import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { MessageSquareQuote, Star } from 'lucide-react';
import { hrApi } from '../../api';
import {
  EXIT_INTERVIEW_STATUS_LABELS,
  EXIT_INTERVIEW_STATUSES,
  EXIT_RESIGNATION_REASON_LABELS,
  EXIT_RESIGNATION_REASONS,
} from '../../constants/hr';
import { usePortalRole } from '../../hooks/usePortalRole';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../utils/helpers';

const HR_ROLES = ['super_admin', 'owner', 'hr'];
const TERMINAL = ['completed', 'waived', 'cancelled'];

function fmtDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

function fmtName(emp) {
  if (!emp) return '—';
  return `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.emp_code || '—';
}

function apiError(err, fallback) {
  return err?.response?.data?.error?.message || fallback;
}

function RatingSelect({ value, onChange, disabled, scale }) {
  const min = Number(scale?.min ?? 1);
  const max = Number(scale?.max ?? 5);
  const values = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  return (
    <select
      className="input text-xs w-full"
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
    >
      <option value="">Select…</option>
      {values.map((n) => (
        <option key={n} value={n}>
          {n}
          {scale?.labels?.[n] ? ` — ${scale.labels[n]}` : ''}
        </option>
      ))}
    </select>
  );
}

function RatingDisplay({ label, value, scale }) {
  if (value == null) return null;
  return (
    <div className="bg-slate-50 rounded-lg p-2.5">
      <p className="text-[10px] uppercase text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
        <Star size={12} className="text-amber-500" /> {Number(value).toFixed(1)} /{' '}
        {scale?.max ?? 5}
      </p>
    </div>
  );
}

export default function SeparationExitInterviewPanel({
  separationRequestId,
  interviewId: interviewIdProp,
  enabled = true,
}) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const role = usePortalRole();
  const isHr = HR_ROLES.includes(role) || user?.type === 'super_admin';

  const bySeparationQuery = useQuery({
    queryKey: ['exit-interview-by-separation', separationRequestId],
    queryFn: () => hrApi.getExitInterviewBySeparation(separationRequestId),
    enabled: enabled && !!separationRequestId && !interviewIdProp,
  });

  const interviewId =
    interviewIdProp || bySeparationQuery.data?.data?.interview?.id || null;

  const detailQuery = useQuery({
    queryKey: ['exit-interview', interviewId],
    queryFn: () => hrApi.getExitInterview(interviewId),
    enabled: enabled && !!interviewId,
  });

  const interview = detailQuery.data?.data?.interview || bySeparationQuery.data?.data?.interview;
  const loading = bySeparationQuery.isLoading || detailQuery.isLoading;

  const questions = interview?.questionnaire || [];
  const ratingScale = interview?.rating_scale || { min: 1, max: 5, labels: {} };
  const [empForm, setEmpForm] = useState(null);
  const [mgrForm, setMgrForm] = useState({
    manager_rating: '',
    manager_feedback: '',
    manager_rehire_eligible: true,
  });
  const [hrForm, setHrForm] = useState({ hr_feedback: '', hr_rating: '', hr_notes: '' });
  const [waiveReason, setWaiveReason] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!interview) return;
    const answers = {};
    for (const q of interview.questionnaire || []) {
      const existing = (interview.employee_answers || []).find((a) => a.key === q.key);
      answers[q.key] = existing?.answer ?? (q.type === 'multi_choice' ? [] : '');
    }
    setEmpForm({
      primary_reason: interview.primary_reason || '',
      secondary_reasons: interview.secondary_reasons || [],
      reason_details: interview.reason_details || '',
      would_recommend: interview.would_recommend ?? true,
      overall_rating: interview.overall_rating ?? '',
      culture_rating: interview.culture_rating ?? '',
      management_rating: interview.management_rating ?? '',
      compensation_rating: interview.compensation_rating ?? '',
      growth_rating: interview.growth_rating ?? '',
      work_life_rating: interview.work_life_rating ?? '',
      employee_comments: interview.employee_comments || '',
      answers,
    });
    if (interview.manager_rating != null) {
      setMgrForm({
        manager_rating: Number(interview.manager_rating),
        manager_feedback: interview.manager_feedback || '',
        manager_rehire_eligible: interview.manager_rehire_eligible ?? true,
      });
    }
    if (interview.hr_feedback || interview.hr_rating) {
      setHrForm({
        hr_feedback: interview.hr_feedback || '',
        hr_rating: interview.hr_rating != null ? Number(interview.hr_rating) : '',
        hr_notes: interview.hr_notes || '',
      });
    }
  }, [interview?.id, interview?.status]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['exit-interview'] });
    queryClient.invalidateQueries({ queryKey: ['exit-interview-by-separation'] });
    queryClient.invalidateQueries({ queryKey: ['exit-interviews'] });
    queryClient.invalidateQueries({ queryKey: ['my-exit-interviews'] });
    queryClient.invalidateQueries({ queryKey: ['exit-interview-analytics'] });
  };

  const empMutation = useMutation({
    mutationFn: (payload) => hrApi.submitExitInterviewEmployee(interview.id, payload),
    onSuccess: () => {
      setFormError('');
      invalidate();
    },
    onError: (err) => setFormError(apiError(err, 'Failed to submit questionnaire')),
  });

  const mgrMutation = useMutation({
    mutationFn: (payload) => hrApi.submitExitInterviewManager(interview.id, payload),
    onSuccess: () => {
      setFormError('');
      invalidate();
    },
    onError: (err) => setFormError(apiError(err, 'Failed to submit manager feedback')),
  });

  const hrMutation = useMutation({
    mutationFn: (payload) => hrApi.submitExitInterviewHr(interview.id, payload),
    onSuccess: () => {
      setFormError('');
      invalidate();
    },
    onError: (err) => setFormError(apiError(err, 'Failed to complete exit interview')),
  });

  const waiveMutation = useMutation({
    mutationFn: (payload) => hrApi.waiveExitInterview(interview.id, payload),
    onSuccess: () => {
      setFormError('');
      setWaiveReason('');
      invalidate();
    },
    onError: (err) => setFormError(apiError(err, 'Failed to waive')),
  });

  const canEmployeeEdit =
    interview &&
    interview.status === 'pending' &&
    (isHr || interview.employee_id === user?.id);

  const canManagerEdit =
    interview &&
    !TERMINAL.includes(interview.status) &&
    (isHr || interview.manager_id === user?.id);

  const canHrAct = interview && isHr && !TERMINAL.includes(interview.status);

  const answerSummary = useMemo(() => {
    if (!interview?.employee_answers?.length) return [];
    return interview.employee_answers;
  }, [interview]);

  if (loading) {
    return <p className="text-center text-slate-400 py-12 text-sm">Loading exit interview…</p>;
  }

  if (!interview) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
        <MessageSquareQuote size={24} className="mx-auto text-slate-300 mb-2" />
        <p className="text-sm font-medium text-slate-700">Exit interview not started</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Approve the separation to auto-create the exit interview questionnaire.
        </p>
      </div>
    );
  }

  const submitEmployee = () => {
    if (!empForm?.primary_reason || !empForm.overall_rating) {
      setFormError('Primary reason and overall rating are required');
      return;
    }
    empMutation.mutate({
      primary_reason: empForm.primary_reason,
      secondary_reasons: empForm.secondary_reasons?.length ? empForm.secondary_reasons : null,
      reason_details: empForm.reason_details || null,
      would_recommend: empForm.would_recommend,
      overall_rating: Number(empForm.overall_rating),
      culture_rating: empForm.culture_rating ? Number(empForm.culture_rating) : null,
      management_rating: empForm.management_rating ? Number(empForm.management_rating) : null,
      compensation_rating: empForm.compensation_rating ? Number(empForm.compensation_rating) : null,
      growth_rating: empForm.growth_rating ? Number(empForm.growth_rating) : null,
      work_life_rating: empForm.work_life_rating ? Number(empForm.work_life_rating) : null,
      employee_comments: empForm.employee_comments || null,
      employee_answers: questions.map((q) => ({
        key: q.key,
        answer: empForm.answers?.[q.key] ?? '',
      })),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">Exit interview status</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                EXIT_INTERVIEW_STATUSES[interview.status]
              )}
            >
              {EXIT_INTERVIEW_STATUS_LABELS[interview.status]}
            </span>
            <span className="text-[11px] text-slate-400">Due {fmtDate(interview.due_date)}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {fmtName(interview.employee)} · Manager {fmtName(interview.manager)}
          </p>
        </div>
        {canHrAct && (
          <div className="flex gap-2 items-end">
            <input
              className="input text-xs w-44"
              placeholder="Waiver reason"
              value={waiveReason}
              onChange={(e) => setWaiveReason(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={!waiveReason.trim() || waiveMutation.isPending}
              onClick={() => waiveMutation.mutate({ reason: waiveReason.trim() })}
            >
              Waive
            </button>
          </div>
        )}
      </div>

      {formError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}

      {/* Employee section */}
      <section className="border border-slate-200 rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
          Employee questionnaire
        </h3>

        {canEmployeeEdit && empForm ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500">Primary resignation reason *</label>
                <select
                  className="input text-xs w-full mt-1"
                  value={empForm.primary_reason}
                  onChange={(e) => setEmpForm({ ...empForm, primary_reason: e.target.value })}
                >
                  <option value="">Select…</option>
                  {EXIT_RESIGNATION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {EXIT_RESIGNATION_REASON_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Would recommend employer? *</label>
                <select
                  className="input text-xs w-full mt-1"
                  value={empForm.would_recommend ? 'yes' : 'no'}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, would_recommend: e.target.value === 'yes' })
                  }
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                ['overall_rating', 'Overall *'],
                ['culture_rating', 'Culture'],
                ['management_rating', 'Management'],
                ['compensation_rating', 'Compensation'],
                ['growth_rating', 'Growth'],
                ['work_life_rating', 'Work-life'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="text-[10px] text-slate-500">{label}</label>
                  <div className="mt-1">
                    <RatingSelect
                      value={empForm[key]}
                      onChange={(v) => setEmpForm({ ...empForm, [key]: v })}
                      scale={ratingScale}
                    />
                  </div>
                </div>
              ))}
            </div>

            {questions.map((q) => (
              <div key={q.key}>
                <label className="text-[10px] text-slate-500">
                  {q.label}
                  {q.required ? ' *' : ''}
                </label>
                {q.type === 'rating' ? (
                  <div className="mt-1">
                    <RatingSelect
                      value={empForm.answers?.[q.key]}
                      scale={q.rating_scale || ratingScale}
                      onChange={(value) =>
                        setEmpForm({
                          ...empForm,
                          answers: { ...empForm.answers, [q.key]: value },
                        })
                      }
                    />
                  </div>
                ) : q.type === 'boolean' ? (
                  <select
                    className="input text-xs w-full mt-1"
                    value={
                      empForm.answers?.[q.key] === true
                        ? 'yes'
                        : empForm.answers?.[q.key] === false
                          ? 'no'
                          : ''
                    }
                    onChange={(e) =>
                      setEmpForm({
                        ...empForm,
                        answers: {
                          ...empForm.answers,
                          [q.key]: e.target.value === '' ? '' : e.target.value === 'yes',
                        },
                      })
                    }
                  >
                    <option value="">Select…</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                ) : q.type === 'single_choice' ? (
                  <select
                    className="input text-xs w-full mt-1"
                    value={empForm.answers?.[q.key] ?? ''}
                    onChange={(e) =>
                      setEmpForm({
                        ...empForm,
                        answers: { ...empForm.answers, [q.key]: e.target.value },
                      })
                    }
                  >
                    <option value="">Select…</option>
                    {(q.options || []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : q.type === 'multi_choice' ? (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(q.options || []).map((option) => {
                      const selected = (empForm.answers?.[q.key] || []).includes(option);
                      return (
                        <label
                          key={option}
                          className="inline-flex items-center gap-1.5 text-xs text-slate-600"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              const current = empForm.answers?.[q.key] || [];
                              const value = e.target.checked
                                ? [...current, option]
                                : current.filter((entry) => entry !== option);
                              setEmpForm({
                                ...empForm,
                                answers: { ...empForm.answers, [q.key]: value },
                              });
                            }}
                          />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                ) : q.type === 'text' ? (
                  <input
                    className="input text-xs w-full mt-1"
                    value={empForm.answers?.[q.key] ?? ''}
                    onChange={(e) =>
                      setEmpForm({
                        ...empForm,
                        answers: { ...empForm.answers, [q.key]: e.target.value },
                      })
                    }
                  />
                ) : (
                  <textarea
                    rows={2}
                    className="input text-xs w-full mt-1 resize-none"
                    value={empForm.answers?.[q.key] ?? ''}
                    onChange={(e) =>
                      setEmpForm({
                        ...empForm,
                        answers: { ...empForm.answers, [q.key]: e.target.value },
                      })
                    }
                  />
                )}
              </div>
            ))}

            <div>
              <label className="text-[10px] text-slate-500">Additional comments</label>
              <textarea
                rows={2}
                className="input text-xs w-full mt-1 resize-none"
                value={empForm.employee_comments}
                onChange={(e) => setEmpForm({ ...empForm, employee_comments: e.target.value })}
              />
            </div>

            <button
              type="button"
              className="btn-primary text-xs"
              disabled={empMutation.isPending}
              onClick={submitEmployee}
            >
              {empMutation.isPending ? 'Submitting…' : 'Submit questionnaire'}
            </button>
          </>
        ) : (
          <div className="space-y-3">
            {interview.primary_reason && (
              <p className="text-xs text-slate-700">
                <span className="text-slate-400">Reason:</span>{' '}
                {EXIT_RESIGNATION_REASON_LABELS[interview.primary_reason] || interview.primary_reason}
                {interview.would_recommend != null && (
                  <span className="ml-2 text-slate-400">
                    · Recommend: {interview.would_recommend ? 'Yes' : 'No'}
                  </span>
                )}
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <RatingDisplay label="Overall" value={interview.overall_rating} scale={ratingScale} />
              <RatingDisplay label="Culture" value={interview.culture_rating} scale={ratingScale} />
              <RatingDisplay label="Management" value={interview.management_rating} scale={ratingScale} />
              <RatingDisplay label="Compensation" value={interview.compensation_rating} scale={ratingScale} />
              <RatingDisplay label="Growth" value={interview.growth_rating} scale={ratingScale} />
              <RatingDisplay label="Work-life" value={interview.work_life_rating} scale={ratingScale} />
            </div>
            {answerSummary.map((a) => {
              const q = questions.find((x) => x.key === a.key);
              return (
                <div key={a.key} className="text-xs">
                  <p className="text-slate-400">{q?.label || a.key}</p>
                  <p className="text-slate-700 mt-0.5 bg-slate-50 rounded-lg p-2.5">
                    {Array.isArray(a.answer)
                      ? a.answer.join(', ') || '—'
                      : typeof a.answer === 'boolean'
                        ? a.answer
                          ? 'Yes'
                          : 'No'
                        : a.answer || '—'}
                  </p>
                </div>
              );
            })}
            {!interview.employee_submitted_at && (
              <p className="text-xs text-slate-400 italic">Awaiting employee submission</p>
            )}
          </div>
        )}
      </section>

      {/* Manager section */}
      <section className="border border-slate-200 rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
          Manager feedback
        </h3>
        {canManagerEdit && !interview.manager_submitted_at ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500">Manager rating *</label>
                <div className="mt-1">
                  <RatingSelect
                    value={mgrForm.manager_rating}
                    onChange={(v) => setMgrForm({ ...mgrForm, manager_rating: v })}
                    scale={ratingScale}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Rehire eligible? *</label>
                <select
                  className="input text-xs w-full mt-1"
                  value={mgrForm.manager_rehire_eligible ? 'yes' : 'no'}
                  onChange={(e) =>
                    setMgrForm({ ...mgrForm, manager_rehire_eligible: e.target.value === 'yes' })
                  }
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Feedback</label>
              <textarea
                rows={3}
                className="input text-xs w-full mt-1 resize-none"
                value={mgrForm.manager_feedback}
                onChange={(e) => setMgrForm({ ...mgrForm, manager_feedback: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="btn-primary text-xs"
              disabled={mgrMutation.isPending || !mgrForm.manager_rating}
              onClick={() =>
                mgrMutation.mutate({
                  manager_rating: Number(mgrForm.manager_rating),
                  manager_feedback: mgrForm.manager_feedback || null,
                  manager_rehire_eligible: mgrForm.manager_rehire_eligible,
                })
              }
            >
              {mgrMutation.isPending ? 'Submitting…' : 'Submit manager feedback'}
            </button>
          </>
        ) : (
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <RatingDisplay label="Manager rating" value={interview.manager_rating} scale={ratingScale} />
              {interview.manager_rehire_eligible != null && (
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-[10px] uppercase text-slate-400">Rehire eligible</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">
                    {interview.manager_rehire_eligible ? 'Yes' : 'No'}
                  </p>
                </div>
              )}
            </div>
            {interview.manager_feedback && (
              <p className="text-slate-700 bg-slate-50 rounded-lg p-2.5">{interview.manager_feedback}</p>
            )}
            {!interview.manager_submitted_at && (
              <p className="text-slate-400 italic">Awaiting manager feedback</p>
            )}
          </div>
        )}
      </section>

      {/* HR section */}
      <section className="border border-slate-200 rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">HR feedback</h3>
        {canHrAct ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500">HR rating</label>
                <div className="mt-1">
                  <RatingSelect
                    value={hrForm.hr_rating}
                    onChange={(v) => setHrForm({ ...hrForm, hr_rating: v })}
                    scale={ratingScale}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500">HR feedback</label>
              <textarea
                rows={3}
                className="input text-xs w-full mt-1 resize-none"
                value={hrForm.hr_feedback}
                onChange={(e) => setHrForm({ ...hrForm, hr_feedback: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Internal notes</label>
              <textarea
                rows={2}
                className="input text-xs w-full mt-1 resize-none"
                value={hrForm.hr_notes}
                onChange={(e) => setHrForm({ ...hrForm, hr_notes: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="btn-primary text-xs"
              disabled={hrMutation.isPending}
              onClick={() =>
                hrMutation.mutate({
                  hr_feedback: hrForm.hr_feedback || null,
                  hr_rating: hrForm.hr_rating ? Number(hrForm.hr_rating) : null,
                  hr_notes: hrForm.hr_notes || null,
                })
              }
            >
              {hrMutation.isPending ? 'Saving…' : 'Complete exit interview'}
            </button>
          </>
        ) : (
          <div className="space-y-2 text-xs">
            <RatingDisplay label="HR rating" value={interview.hr_rating} scale={ratingScale} />
            {interview.hr_feedback && (
              <p className="text-slate-700 bg-slate-50 rounded-lg p-2.5">{interview.hr_feedback}</p>
            )}
            {interview.status === 'completed' && (
              <p className="text-slate-400">Completed {fmtDate(interview.hr_completed_at)}</p>
            )}
            {interview.status === 'waived' && (
              <p className="text-amber-700 bg-amber-50 rounded-lg p-2.5">
                Waived: {interview.waiver_reason || '—'}
              </p>
            )}
            {!TERMINAL.includes(interview.status) && !isHr && (
              <p className="text-slate-400 italic">HR will close this interview after review</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
