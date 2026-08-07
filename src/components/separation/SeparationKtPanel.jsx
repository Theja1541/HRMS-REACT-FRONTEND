import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Check, ExternalLink, FileText, Loader2, MessageSquare, Plus, Trash2, Upload, X } from 'lucide-react';
import { hrApi } from '../../api';
import {
  KT_CREDENTIAL_STATUS_LABELS,
  KT_CREDENTIAL_STATUSES,
  KT_DOC_TYPES,
  KT_PLAN_STATUSES,
  KT_PLAN_STATUS_LABELS,
  KT_REPO_TYPES,
  KT_SESSION_STATUS_LABELS,
  KT_SESSION_STATUSES,
  KT_TASK_CATEGORIES,
  KT_TASK_STATUSES,
  KT_TASK_STATUS_LABELS,
} from '../../constants/hr';
import { usePortalRole } from '../../hooks/usePortalRole';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../utils/helpers';

const LOCKED = new Set(['approved', 'cancelled']);
const HR_ROLES = new Set(['super_admin', 'owner', 'hr', 'admin']);
const DONE = new Set(['completed', 'waived', 'not_applicable']);

function fmtDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

function fmtPerson(user) {
  if (!user) return '—';
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.emp_code || '—';
}

function apiErr(err, fallback) {
  return err?.response?.data?.error?.message || fallback;
}

function ProgressBar({ pct, detail }) {
  return (
    <div className="min-w-[140px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-700">{pct ?? 0}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-brand-500' : 'bg-slate-300'
          )}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
      {detail && <p className="text-[10px] text-slate-400 mt-1">{detail}</p>}
    </div>
  );
}

export default function SeparationKtPanel({ separationRequestId, planId: planIdProp, enabled = true }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const role = usePortalRole();
  const isHr = HR_ROLES.has(role);
  const [tab, setTab] = useState('tasks');
  const [successorId, setSuccessorId] = useState('');
  const [taskForm, setTaskForm] = useState({ title: '', category: 'process', is_mandatory: true });
  const [sessionForm, setSessionForm] = useState({ title: '', session_date: '', status: 'scheduled' });
  const [repoForm, setRepoForm] = useState({ title: '', url: '', repo_type: 'git' });
  const [credForm, setCredForm] = useState({ system_name: '', access_type: '', is_mandatory: true });
  const [docType, setDocType] = useState('handover');
  const [reviewForm, setReviewForm] = useState({ manager_score: 4, review_notes: '' });
  const [commentBody, setCommentBody] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [showAddCred, setShowAddCred] = useState(false);
  const [actionError, setActionError] = useState('');

  const queryKey = ['separation-kt', separationRequestId || planIdProp];

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: enabled && Boolean(separationRequestId || planIdProp),
    queryFn: async () => {
      if (planIdProp) return hrApi.getKtPlan(planIdProp);
      return hrApi.getKtPlanBySeparation(separationRequestId);
    },
    retry: false,
  });

  const { data: empData } = useQuery({
    queryKey: ['separation-eligible-employees'],
    queryFn: () => hrApi.listSeparationEligibleEmployees({ limit: 500 }),
    enabled: enabled && isHr,
  });

  const plan = data?.data?.plan;
  const progress = data?.data?.progress;
  const planId = plan?.id;
  const employees = empData?.data?.employees || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['kt-plans'] });
    queryClient.invalidateQueries({ queryKey: ['kt-analytics'] });
  };

  const canEdit = plan && !LOCKED.has(plan.status) && plan.status !== 'pending_manager';
  const canApprove = plan?.status === 'pending_manager' && (isHr || plan.manager_id === user?.id);
  const canAcceptSuccessor =
    plan?.successor_id === user?.id && !plan?.successor_accepted_at && !LOCKED.has(plan?.status);
  const canReview = (isHr || plan?.manager_id === user?.id) && plan?.status === 'approved';

  const onErr = (fallback) => (err) => setActionError(apiErr(err, fallback));

  const updatePlanMut = useMutation({
    mutationFn: (payload) => hrApi.updateKtPlan(planId, payload),
    onSuccess: () => {
      setActionError('');
      invalidate();
    },
    onError: onErr('Failed to update plan'),
  });
  const submitMut = useMutation({
    mutationFn: () => hrApi.submitKtPlan(planId),
    onSuccess: () => {
      setActionError('');
      invalidate();
    },
    onError: onErr('Failed to submit'),
  });
  const approveMut = useMutation({
    mutationFn: () => hrApi.approveKtPlan(planId),
    onSuccess: () => {
      setActionError('');
      invalidate();
    },
    onError: onErr('Failed to approve'),
  });
  const rejectMut = useMutation({
    mutationFn: () => hrApi.rejectKtPlan(planId, { reason: rejectReason }),
    onSuccess: () => {
      setShowReject(false);
      setRejectReason('');
      invalidate();
    },
    onError: onErr('Failed to reject'),
  });
  const cancelMut = useMutation({
    mutationFn: () => hrApi.cancelKtPlan(planId, { reason: cancelReason }),
    onSuccess: () => {
      setShowCancel(false);
      setCancelReason('');
      invalidate();
    },
    onError: onErr('Failed to cancel'),
  });
  const acceptMut = useMutation({
    mutationFn: () => hrApi.acceptKtSuccessor(planId, {}),
    onSuccess: () => invalidate(),
    onError: onErr('Failed to accept successor'),
  });
  const reviewMut = useMutation({
    mutationFn: () => hrApi.submitKtManagerReview(planId, reviewForm),
    onSuccess: () => invalidate(),
    onError: onErr('Failed to save review'),
  });
  const addTaskMut = useMutation({
    mutationFn: (payload) => hrApi.addKtTask(planId, payload),
    onSuccess: () => {
      setShowAddTask(false);
      setTaskForm({ title: '', category: 'process', is_mandatory: true });
      invalidate();
    },
    onError: onErr('Failed to add task'),
  });
  const updateTaskMut = useMutation({
    mutationFn: ({ taskId, ...payload }) => hrApi.updateKtTask(planId, taskId, payload),
    onSuccess: () => invalidate(),
    onError: onErr('Failed to update task'),
  });
  const deleteTaskMut = useMutation({
    mutationFn: (taskId) => hrApi.deleteKtTask(planId, taskId),
    onSuccess: () => invalidate(),
  });
  const commentMut = useMutation({
    mutationFn: (body) => hrApi.addKtComment(planId, { body }),
    onSuccess: () => {
      setCommentBody('');
      invalidate();
    },
  });
  const uploadMut = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', file.name);
      fd.append('doc_type', docType);
      return hrApi.uploadKtDocument(planId, fd);
    },
    onSuccess: () => invalidate(),
    onError: onErr('Upload failed'),
  });
  const ackDocMut = useMutation({
    mutationFn: (docId) => hrApi.acknowledgeKtDocument(planId, docId),
    onSuccess: () => invalidate(),
    onError: onErr('Acknowledge failed'),
  });
  const deleteDocMut = useMutation({
    mutationFn: (docId) => hrApi.deleteKtDocument(planId, docId),
    onSuccess: () => invalidate(),
  });
  const addSessionMut = useMutation({
    mutationFn: (payload) => hrApi.addKtSession(planId, payload),
    onSuccess: () => {
      setShowAddSession(false);
      setSessionForm({ title: '', session_date: '', status: 'scheduled' });
      invalidate();
    },
    onError: onErr('Failed to add session'),
  });
  const updateSessionMut = useMutation({
    mutationFn: ({ sessionId, ...payload }) => hrApi.updateKtSession(planId, sessionId, payload),
    onSuccess: () => invalidate(),
    onError: onErr('Failed to update session'),
  });
  const deleteSessionMut = useMutation({
    mutationFn: (sessionId) => hrApi.deleteKtSession(planId, sessionId),
    onSuccess: () => invalidate(),
  });
  const addRepoMut = useMutation({
    mutationFn: (payload) => hrApi.addKtRepository(planId, payload),
    onSuccess: () => {
      setShowAddRepo(false);
      setRepoForm({ title: '', url: '', repo_type: 'git' });
      invalidate();
    },
    onError: onErr('Failed to add repository'),
  });
  const updateRepoMut = useMutation({
    mutationFn: ({ repoId, ...payload }) => hrApi.updateKtRepository(planId, repoId, payload),
    onSuccess: () => invalidate(),
  });
  const deleteRepoMut = useMutation({
    mutationFn: (repoId) => hrApi.deleteKtRepository(planId, repoId),
    onSuccess: () => invalidate(),
  });
  const addCredMut = useMutation({
    mutationFn: (payload) => hrApi.addKtCredential(planId, payload),
    onSuccess: () => {
      setShowAddCred(false);
      setCredForm({ system_name: '', access_type: '', is_mandatory: true });
      invalidate();
    },
    onError: onErr('Failed to add credential'),
  });
  const updateCredMut = useMutation({
    mutationFn: ({ credentialId, ...payload }) => hrApi.updateKtCredential(planId, credentialId, payload),
    onSuccess: () => invalidate(),
  });
  const deleteCredMut = useMutation({
    mutationFn: (credentialId) => hrApi.deleteKtCredential(planId, credentialId),
    onSuccess: () => invalidate(),
  });

  const tasks = useMemo(() => plan?.tasks || [], [plan]);
  const documents = plan?.documents || [];
  const comments = plan?.comments || [];
  const sessions = plan?.sessions || [];
  const repositories = plan?.repositoryLinks || [];
  const credentials = plan?.credentials || [];
  const history = plan?.historyEvents || [];

  const progressDetail = progress
    ? `Tasks ${progress.completed_tasks || 0}/${progress.total_tasks || 0} · Sessions ${progress.completed_sessions || 0}/${progress.total_sessions || 0} · Creds ${progress.completed_credentials || 0}/${progress.total_credentials || 0}`
    : null;

  const tabs = [
    { id: 'tasks', label: `Tasks (${tasks.length})` },
    { id: 'sessions', label: `Sessions (${sessions.length})` },
    { id: 'docs', label: `Docs (${documents.length})` },
    { id: 'repos', label: `Repos (${repositories.length})` },
    { id: 'creds', label: `Access (${credentials.length})` },
    { id: 'history', label: 'History' },
    { id: 'comments', label: `Comments (${comments.length})` },
  ];

  if (!enabled) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400 gap-2 text-xs">
        <Loader2 size={14} className="animate-spin" /> Loading knowledge transfer…
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-10 text-slate-400 text-xs">
        No KT plan yet. Approve the separation to auto-create one, or create it from Knowledge Transfer.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="rounded-lg bg-red-50 text-red-700 text-xs px-3 py-2">{actionError}</div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{plan.title}</h3>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', KT_PLAN_STATUSES[plan.status])}>
              {KT_PLAN_STATUS_LABELS[plan.status] || plan.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Leaving: {fmtPerson(plan.employee)} · Successor: {fmtPerson(plan.successor)}
            {plan.successor_accepted_at ? ' (accepted)' : plan.successor_id ? ' (pending accept)' : ''} · Due:{' '}
            {fmtDate(plan.due_date)}
          </p>
        </div>
        <ProgressBar pct={progress?.completion_percentage ?? plan.progress_percent} detail={progressDetail} />
      </div>

      {canEdit && isHr && (
        <div className="flex flex-wrap items-end gap-2 p-3 bg-slate-50 rounded-lg">
          <div className="flex-1 min-w-[180px]">
            <label className="text-[10px] uppercase text-slate-400 font-semibold">Successor</label>
            <select
              className="input mt-1 text-xs"
              value={successorId || plan.successor_id || ''}
              onChange={(e) => setSuccessorId(e.target.value)}
            >
              <option value="">Select successor…</option>
              {employees
                .filter((e) => e.id !== plan.employee_id)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.first_name} {e.last_name} ({e.emp_code})
                  </option>
                ))}
            </select>
          </div>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={updatePlanMut.isPending || !successorId}
            onClick={() => updatePlanMut.mutate({ successor_id: Number(successorId) })}
          >
            Save Successor
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canAcceptSuccessor && (
          <button type="button" className="btn-primary text-xs" disabled={acceptMut.isPending} onClick={() => acceptMut.mutate()}>
            Accept as Successor
          </button>
        )}
        {canEdit && (
          <button type="button" className="btn-primary text-xs" disabled={submitMut.isPending} onClick={() => submitMut.mutate()}>
            Submit for Manager Approval
          </button>
        )}
        {canApprove && (
          <>
            <button type="button" className="btn-primary text-xs" disabled={approveMut.isPending} onClick={() => approveMut.mutate()}>
              <Check size={12} /> Approve KT
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={() => setShowReject(true)}>
              Reject
            </button>
          </>
        )}
        {isHr && !LOCKED.has(plan.status) && plan.status !== 'approved' && (
          <button type="button" className="btn-secondary text-xs text-red-600" onClick={() => setShowCancel(true)}>
            Waive / Cancel
          </button>
        )}
      </div>

      {canReview && (
        <div className="p-3 border border-slate-100 rounded-lg space-y-2">
          <p className="text-xs font-semibold text-slate-700">Manager review</p>
          <div className="flex flex-wrap gap-2">
            <select
              className="input text-xs w-28"
              value={reviewForm.manager_score}
              onChange={(e) => setReviewForm((f) => ({ ...f, manager_score: Number(e.target.value) }))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  Score {n}/5
                </option>
              ))}
            </select>
            <input
              className="input text-xs flex-1 min-w-[160px]"
              placeholder="Review notes"
              value={reviewForm.review_notes}
              onChange={(e) => setReviewForm((f) => ({ ...f, review_notes: e.target.value }))}
            />
            <button type="button" className="btn-secondary text-xs" disabled={reviewMut.isPending} onClick={() => reviewMut.mutate()}>
              Save Review
            </button>
          </div>
          {plan.manager_score != null && (
            <p className="text-[11px] text-slate-500">
              Current score: {plan.manager_score}/5 {plan.review_notes ? `— ${plan.review_notes}` : ''}
            </p>
          )}
        </div>
      )}

      {plan.rejection_reason && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">Rejection reason: {plan.rejection_reason}</p>
      )}

      <div className="flex gap-3 border-b border-slate-100 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'py-2 text-xs font-medium border-b-2 -mb-px whitespace-nowrap',
              tab === t.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <div className="space-y-2">
          {canEdit && (
            <button type="button" className="btn-secondary text-xs" onClick={() => setShowAddTask(true)}>
              <Plus size={12} /> Add Task
            </button>
          )}
          {tasks.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No tasks yet</p>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
              {tasks.map((task) => (
                <li key={task.id} className="p-3 flex items-start gap-3 bg-white">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-medium text-slate-800">{task.title}</p>
                      {task.is_mandatory && (
                        <span className="text-[9px] font-semibold uppercase text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                          Mandatory
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">{KT_TASK_CATEGORIES[task.category] || task.category}</span>
                    </div>
                    {task.description && <p className="text-[11px] text-slate-500 mt-0.5">{task.description}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">
                      Assignee: {fmtPerson(task.assignee)} · Due: {fmtDate(task.due_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', KT_TASK_STATUSES[task.status])}>
                      {KT_TASK_STATUS_LABELS[task.status]}
                    </span>
                    {canEdit && !DONE.has(task.status) && (
                      <select
                        className="text-[10px] border border-slate-200 rounded px-1.5 py-1"
                        value={task.status}
                        onChange={(e) => updateTaskMut.mutate({ taskId: task.id, status: e.target.value })}
                      >
                        {Object.keys(KT_TASK_STATUS_LABELS).map((s) => (
                          <option key={s} value={s}>
                            {KT_TASK_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    )}
                    {canEdit && isHr && (
                      <button type="button" className="p-1 text-slate-400 hover:text-red-600" onClick={() => deleteTaskMut.mutate(task.id)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-2">
          {canEdit && (
            <button type="button" className="btn-secondary text-xs" onClick={() => setShowAddSession(true)}>
              <Plus size={12} /> Schedule Session
            </button>
          )}
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No KT sessions scheduled</p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li key={s.id} className="p-3 border border-slate-100 rounded-lg text-xs flex justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">{s.title}</p>
                    <p className="text-slate-500 mt-0.5">
                      {fmtDate(s.session_date)}
                      {s.start_time ? ` · ${s.start_time}` : ''}
                      {s.location ? ` · ${s.location}` : ''}
                      {s.meeting_link ? (
                        <>
                          {' · '}
                          <a href={s.meeting_link} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                            Join
                          </a>
                        </>
                      ) : null}
                    </p>
                    {s.minutes && <p className="text-slate-500 mt-1 whitespace-pre-wrap">{s.minutes}</p>}
                  </div>
                  <div className="flex items-start gap-1.5 shrink-0">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', KT_SESSION_STATUSES[s.status])}>
                      {KT_SESSION_STATUS_LABELS[s.status]}
                    </span>
                    {canEdit && s.status === 'scheduled' && (
                      <button
                        type="button"
                        className="btn-secondary text-[10px] px-2 py-1"
                        onClick={() => updateSessionMut.mutate({ sessionId: s.id, status: 'completed' })}
                      >
                        Complete
                      </button>
                    )}
                    {canEdit && isHr && (
                      <button type="button" className="p-1 text-slate-400 hover:text-red-600" onClick={() => deleteSessionMut.mutate(s.id)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'docs' && (
        <div className="space-y-3">
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <select className="input text-xs w-36" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {Object.entries(KT_DOC_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <label className="btn-secondary text-xs inline-flex cursor-pointer">
                <Upload size={12} /> Upload Document
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadMut.mutate(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          )}
          {documents.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No documents uploaded</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-2 p-2.5 border border-slate-100 rounded-lg text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <a href={doc.file_url} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline truncate block">
                        {doc.title || doc.file_name}
                      </a>
                      <p className="text-[10px] text-slate-400">
                        {KT_DOC_TYPES[doc.doc_type] || doc.doc_type || 'Other'} · {doc.handover_status || 'pending'} · by{' '}
                        {fmtPerson(doc.uploader)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {doc.handover_status === 'pending' && (plan.successor_id === user?.id || isHr) && (
                      <button type="button" className="btn-secondary text-[10px] px-2 py-1" onClick={() => ackDocMut.mutate(doc.id)}>
                        Acknowledge
                      </button>
                    )}
                    {canEdit && (
                      <button type="button" className="p-1 text-slate-400 hover:text-red-600" onClick={() => deleteDocMut.mutate(doc.id)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'repos' && (
        <div className="space-y-2">
          {canEdit && (
            <button type="button" className="btn-secondary text-xs" onClick={() => setShowAddRepo(true)}>
              <Plus size={12} /> Add Repository Link
            </button>
          )}
          {repositories.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No repository links yet</p>
          ) : (
            <ul className="space-y-2">
              {repositories.map((r) => (
                <li key={r.id} className="p-3 border border-slate-100 rounded-lg text-xs flex justify-between gap-2">
                  <div className="min-w-0">
                    <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline inline-flex items-center gap-1">
                      {r.title} <ExternalLink size={11} />
                    </a>
                    <p className="text-slate-500 mt-0.5">
                      {KT_REPO_TYPES[r.repo_type] || r.repo_type}
                      {r.access_notes ? ` · ${r.access_notes}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {canEdit && (
                      <button
                        type="button"
                        className="btn-secondary text-[10px] px-2 py-1"
                        onClick={() =>
                          updateRepoMut.mutate({
                            repoId: r.id,
                            ownership_transferred: !r.ownership_transferred,
                          })
                        }
                      >
                        {r.ownership_transferred ? 'Mark Pending' : 'Mark Transferred'}
                      </button>
                    )}
                    {canEdit && isHr && (
                      <button type="button" className="p-1 text-slate-400 hover:text-red-600" onClick={() => deleteRepoMut.mutate(r.id)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'creds' && (
        <div className="space-y-2">
          {canEdit && (
            <button type="button" className="btn-secondary text-xs" onClick={() => setShowAddCred(true)}>
              <Plus size={12} /> Add Access Item
            </button>
          )}
          {credentials.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No credentials checklist items</p>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
              {credentials.map((c) => (
                <li key={c.id} className="p-3 flex items-center justify-between gap-2 bg-white text-xs">
                  <div>
                    <p className="font-medium text-slate-800">
                      {c.system_name}
                      {c.is_mandatory ? (
                        <span className="ml-1 text-[9px] font-semibold uppercase text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                          Mandatory
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {c.access_type || 'access'} · Owner: {fmtPerson(c.owner)} · To: {fmtPerson(c.transferee)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', KT_CREDENTIAL_STATUSES[c.status])}>
                      {KT_CREDENTIAL_STATUS_LABELS[c.status]}
                    </span>
                    {canEdit && (
                      <select
                        className="text-[10px] border border-slate-200 rounded px-1.5 py-1"
                        value={c.status}
                        onChange={(e) => updateCredMut.mutate({ credentialId: c.id, status: e.target.value })}
                      >
                        {Object.keys(KT_CREDENTIAL_STATUS_LABELS).map((s) => (
                          <option key={s} value={s}>
                            {KT_CREDENTIAL_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    )}
                    {canEdit && isHr && (
                      <button type="button" className="p-1 text-slate-400 hover:text-red-600" onClick={() => deleteCredMut.mutate(c.id)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No completion history yet</p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="p-2.5 bg-slate-50 rounded-lg text-xs">
                  <div className="flex justify-between gap-2">
                    <p className="font-medium text-slate-700">{h.summary}</p>
                    <span className="text-[10px] text-slate-400 shrink-0">{fmtDate(h.created_at)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {h.action} · {fmtPerson(h.actor)}
                    {h.progress_percent != null ? ` · ${h.progress_percent}%` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'comments' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              className="input text-xs flex-1"
              placeholder="Add a comment…"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary text-xs"
              disabled={!commentBody.trim() || commentMut.isPending}
              onClick={() => commentMut.mutate(commentBody.trim())}
            >
              <MessageSquare size={12} /> Post
            </button>
          </div>
          {comments.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No comments yet</p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="p-2.5 bg-slate-50 rounded-lg text-xs">
                  <p className="font-medium text-slate-700">{fmtPerson(c.author)}</p>
                  <p className="text-slate-600 mt-0.5 whitespace-pre-wrap">{c.body}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{fmtDate(c.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showAddTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">Add KT Task</h4>
              <button type="button" onClick={() => setShowAddTask(false)}>
                <X size={16} />
              </button>
            </div>
            <input
              className="input text-xs"
              placeholder="Task title"
              value={taskForm.title}
              onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
            />
            <select
              className="input text-xs"
              value={taskForm.category}
              onChange={(e) => setTaskForm((f) => ({ ...f, category: e.target.value }))}
            >
              {Object.entries(KT_TASK_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={taskForm.is_mandatory}
                onChange={(e) => setTaskForm((f) => ({ ...f, is_mandatory: e.target.checked }))}
              />
              Mandatory
            </label>
            <button
              type="button"
              className="btn-primary text-xs w-full"
              disabled={!taskForm.title.trim() || addTaskMut.isPending}
              onClick={() => addTaskMut.mutate(taskForm)}
            >
              Add Task
            </button>
          </div>
        </div>
      )}

      {showAddSession && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">Schedule KT Session</h4>
              <button type="button" onClick={() => setShowAddSession(false)}>
                <X size={16} />
              </button>
            </div>
            <input
              className="input text-xs"
              placeholder="Session title"
              value={sessionForm.title}
              onChange={(e) => setSessionForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              type="date"
              className="input text-xs"
              value={sessionForm.session_date}
              onChange={(e) => setSessionForm((f) => ({ ...f, session_date: e.target.value }))}
            />
            <button
              type="button"
              className="btn-primary text-xs w-full"
              disabled={!sessionForm.title.trim() || !sessionForm.session_date || addSessionMut.isPending}
              onClick={() => addSessionMut.mutate(sessionForm)}
            >
              Schedule
            </button>
          </div>
        </div>
      )}

      {showAddRepo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">Add Repository Link</h4>
              <button type="button" onClick={() => setShowAddRepo(false)}>
                <X size={16} />
              </button>
            </div>
            <input
              className="input text-xs"
              placeholder="Title"
              value={repoForm.title}
              onChange={(e) => setRepoForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              className="input text-xs"
              placeholder="https://..."
              value={repoForm.url}
              onChange={(e) => setRepoForm((f) => ({ ...f, url: e.target.value }))}
            />
            <select
              className="input text-xs"
              value={repoForm.repo_type}
              onChange={(e) => setRepoForm((f) => ({ ...f, repo_type: e.target.value }))}
            >
              {Object.entries(KT_REPO_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-primary text-xs w-full"
              disabled={!repoForm.title.trim() || !repoForm.url.trim() || addRepoMut.isPending}
              onClick={() => addRepoMut.mutate(repoForm)}
            >
              Add Link
            </button>
          </div>
        </div>
      )}

      {showAddCred && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">Add Access Checklist Item</h4>
              <button type="button" onClick={() => setShowAddCred(false)}>
                <X size={16} />
              </button>
            </div>
            <input
              className="input text-xs"
              placeholder="System name"
              value={credForm.system_name}
              onChange={(e) => setCredForm((f) => ({ ...f, system_name: e.target.value }))}
            />
            <input
              className="input text-xs"
              placeholder="Access type (optional)"
              value={credForm.access_type}
              onChange={(e) => setCredForm((f) => ({ ...f, access_type: e.target.value }))}
            />
            <button
              type="button"
              className="btn-primary text-xs w-full"
              disabled={!credForm.system_name.trim() || addCredMut.isPending}
              onClick={() => addCredMut.mutate(credForm)}
            >
              Add Item
            </button>
          </div>
        </div>
      )}

      {showReject && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5 space-y-3">
            <h4 className="font-semibold text-sm">Reject KT Plan</h4>
            <textarea
              className="input text-xs min-h-[80px]"
              placeholder="Reason required"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary text-xs" onClick={() => setShowReject(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary text-xs"
                disabled={!rejectReason.trim() || rejectMut.isPending}
                onClick={() => rejectMut.mutate()}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5 space-y-3">
            <h4 className="font-semibold text-sm">Waive / Cancel KT</h4>
            <p className="text-xs text-slate-500">
              Use for absconding/termination cases where KT cannot be completed. This allows separation completion.
            </p>
            <textarea
              className="input text-xs min-h-[80px]"
              placeholder="Reason required"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary text-xs" onClick={() => setShowCancel(false)}>
                Back
              </button>
              <button
                type="button"
                className="btn-primary text-xs"
                disabled={!cancelReason.trim() || cancelMut.isPending}
                onClick={() => cancelMut.mutate()}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
