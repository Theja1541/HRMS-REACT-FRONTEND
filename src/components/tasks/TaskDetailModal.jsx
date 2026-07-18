import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Send, Clock, Trash2, Upload, FileText, Download, ExternalLink, Plus, Tag, ChevronRight, Pencil } from 'lucide-react';
import { hrApi, employeeApi } from '../../api';
import LabelBadge from './LabelBadge';
import { TASK_STATUS, PRIORITY_BADGE, TASK_TYPES } from '../../constants/hr';
import { cn, resolveAssetUrl, formatStoryPoints } from '../../utils/helpers';
import { format, parseISO } from 'date-fns';
import { useAuthStore } from '../../store/auth.store';

const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024;
const ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,image/jpeg,image/png,image/webp,application/pdf';

const TASK_TABS = ['details', 'dependencies', 'comments', 'attachments', 'activity'];

const LABEL_COLOR_PRESETS = ['#2563eb', '#7c3aed', '#dc2626', '#059669', '#d97706', '#64748b'];
const MENTION_TOKEN_RE = /(@[A-Za-z0-9_-]+)/g;
const MENTION_QUERY_RE = /(?:^|[\s([{])@([A-Za-z0-9_-]*)$/;

function formatFileSize(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderCommentWithMentions(body) {
  if (!body) return null;
  const parts = String(body).split(MENTION_TOKEN_RE);
  return parts.map((part, index) => {
    if (part.startsWith('@') && part.length > 1) {
      return (
        <span
          key={`${part}-${index}`}
          className="inline-flex items-center px-1 py-0.5 rounded bg-brand-50 text-brand-700 font-medium"
        >
          {part}
        </span>
      );
    }
    return <span key={`${index}-${part.slice(0, 8)}`}>{part}</span>;
  });
}

function getActiveMentionQuery(text) {
  const match = String(text || '').match(MENTION_QUERY_RE);
  return match ? match[1] : null;
}

function insertMention(text, empCode) {
  const value = String(text || '');
  const match = value.match(MENTION_QUERY_RE);
  if (!match) {
    const needsSpace = value.length > 0 && !/\s$/.test(value);
    return `${value}${needsSpace ? ' ' : ''}@${empCode} `;
  }
  const atIndex = match.index + match[0].lastIndexOf('@');
  return `${value.slice(0, atIndex)}@${empCode} `;
}

const ACTIVITY_LABELS = {
  created: 'Task created',
  status_change: 'Status changed',
  assigned: 'Assignee changed',
  edited: 'Field edited',
  commented: 'Comment added',
  comment_edited: 'Comment edited',
  comment_deleted: 'Comment deleted',
  attachment_added: 'Attachment added',
  attachment_deleted: 'Attachment deleted',
};

export default function TaskDetailModal({ taskId, projectId, onClose, onUpdated, onNavigateTask }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canManage = ['super_admin', 'owner', 'hr', 'manager'].includes(user?.role);
  const [comment, setComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentBody, setEditCommentBody] = useState('');
  const [commentActionError, setCommentActionError] = useState('');
  const [tab, setTab] = useState('details');
  const [depTaskId, setDepTaskId] = useState('');
  const [depRelation, setDepRelation] = useState('blocked_by');
  const [depError, setDepError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [labelActionError, setLabelActionError] = useState('');
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [newLabel, setNewLabel] = useState({ name: '', color: '#64748b' });
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [subtaskForm, setSubtaskForm] = useState({ title: '', estimate_points: '' });
  const [subtaskError, setSubtaskError] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const fileInputRef = useRef(null);
  const commentInputRef = useRef(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => hrApi.getTask(taskId),
    enabled: !!taskId,
  });

  const { data: projectTasksData } = useQuery({
    queryKey: ['project-tasks-picker', projectId],
    queryFn: () => hrApi.listProjectTasks(projectId, { limit: 200 }),
    enabled: !!projectId && tab === 'dependencies',
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-task-detail'],
    queryFn: () => employeeApi.list({ limit: 200, status: 'active' }),
    enabled: !!taskId,
  });

  const { data: membersData } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => hrApi.listProjectMembers(projectId),
    enabled: !!projectId,
  });

  const {
    data: attachmentsData,
    isLoading: attachmentsLoading,
    isError: attachmentsError,
    error: attachmentsQueryError,
    refetch: refetchAttachments,
  } = useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: () => hrApi.listTaskAttachments(taskId),
    enabled: !!taskId && tab === 'attachments',
  });

  const {
    data: labelsData,
    isLoading: labelsLoading,
    isError: labelsError,
    error: labelsQueryError,
    refetch: refetchLabels,
  } = useQuery({
    queryKey: ['project-labels', projectId],
    queryFn: () => hrApi.listProjectLabels(projectId),
    enabled: !!projectId,
  });

  const task = data?.data?.task;
  const linkedDepIds = new Set(
    (task?.dependencies || []).map((d) => d.other_task_id || d.depends_on_task_id).filter(Boolean)
  );
  const pickerTasks = (projectTasksData?.data?.tasks || []).filter(
    (t) => t.id !== taskId && !linkedDepIds.has(t.id)
  );
  const blockedByDeps = (task?.dependencies || []).filter((d) => d.direction === 'blocked_by');
  const blocksDeps = (task?.dependencies || []).filter((d) => d.direction === 'blocks');
  const employees = empData?.data?.employees || [];
  const projectMembers = (membersData?.data?.members || [])
    .map((m) => m.employee)
    .filter(Boolean);

  const mentionPeople = useMemo(() => {
    const byId = new Map();
    [...projectMembers, ...employees].forEach((emp) => {
      if (emp?.id) byId.set(emp.id, emp);
    });
    if (task?.assignee?.id) byId.set(task.assignee.id, task.assignee);
    if (task?.reporter?.id) byId.set(task.reporter.id, task.reporter);
    return Array.from(byId.values()).sort((a, b) =>
      String(a.emp_code || a.first_name).localeCompare(String(b.emp_code || b.first_name))
    );
  }, [projectMembers, employees, task?.assignee, task?.reporter]);

  const assigneeOptions = useMemo(() => {
    const byId = new Map();
    mentionPeople.forEach((emp) => byId.set(emp.id, emp));
    if (task?.assignee?.id && !byId.has(task.assignee.id)) {
      byId.set(task.assignee.id, task.assignee);
    }
    return Array.from(byId.values()).sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    );
  }, [mentionPeople, task?.assignee]);

  const activeMentionQuery = getActiveMentionQuery(editingCommentId ? editCommentBody : comment);
  const mentionSuggestions = useMemo(() => {
    if (activeMentionQuery == null) return [];
    const q = activeMentionQuery.toLowerCase();
    return mentionPeople
      .filter((emp) => emp.emp_code)
      .filter((emp) => {
        const code = String(emp.emp_code || '').toLowerCase();
        const name = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
        return !q || code.includes(q) || name.includes(q);
      })
      .slice(0, 8);
  }, [activeMentionQuery, mentionPeople]);

  const attachments = attachmentsData?.data?.attachments || [];
  const attachmentCount = attachments.length || task?.attachments?.length || 0;
  const projectLabels = labelsData?.data?.labels || [];
  const assignedLabelIds = new Set((task?.labels || []).map((l) => l.id));
  const availableLabels = projectLabels.filter((l) => !assignedLabelIds.has(l.id));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    queryClient.invalidateQueries({ queryKey: ['project-board'] });
    queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-dependencies', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks-picker', projectId] });
    }
    onUpdated?.();
  };

  const invalidateLabels = () => {
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['project-labels', projectId] });
    }
    invalidate();
  };

  const updateMutation = useMutation({
    mutationFn: (payload) => hrApi.updateTask(taskId, payload),
    onSuccess: invalidate,
  });

  const assignMutation = useMutation({
    mutationFn: (assignee_id) => hrApi.assignTask(taskId, { assignee_id }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => hrApi.deleteTask(taskId),
    onSuccess: () => {
      setDeleteError('');
      queryClient.invalidateQueries({ queryKey: ['project-board'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
        queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
      }
      onUpdated?.();
      onClose();
    },
    onError: (err) => {
      setDeleteError(err.response?.data?.error?.message || 'Failed to delete task');
    },
  });

  const commentMutation = useMutation({
    mutationFn: (body) => hrApi.addTaskComment(taskId, { body }),
    onSuccess: () => {
      setComment('');
      setCommentActionError('');
      invalidate();
    },
    onError: (err) => {
      setCommentActionError(err.response?.data?.error?.message || 'Failed to add comment');
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, body }) => hrApi.updateTaskComment(taskId, commentId, { body }),
    onSuccess: () => {
      setEditingCommentId(null);
      setEditCommentBody('');
      setCommentActionError('');
      invalidate();
    },
    onError: (err) => {
      setCommentActionError(err.response?.data?.error?.message || 'Failed to update comment');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => hrApi.deleteTaskComment(taskId, commentId),
    onSuccess: () => {
      if (editingCommentId) {
        setEditingCommentId(null);
        setEditCommentBody('');
      }
      setCommentActionError('');
      invalidate();
    },
    onError: (err) => {
      setCommentActionError(err.response?.data?.error?.message || 'Failed to delete comment');
    },
  });

  const canManageComment = (c) => {
    if (!user?.id || !c) return false;
    if (c.commenter_id === user.id) return true;
    return canManage;
  };

  const startEditComment = (c) => {
    setCommentActionError('');
    setEditingCommentId(c.id);
    setEditCommentBody(c.body || '');
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentBody('');
    setCommentActionError('');
  };

  const handleDeleteComment = (c) => {
    const preview = (c.body || '').slice(0, 60);
    if (!window.confirm(`Delete this comment?\n\n"${preview}${c.body?.length > 60 ? '…' : ''}"`)) return;
    deleteCommentMutation.mutate(c.id);
  };

  const applyMention = (emp, target = 'new') => {
    const code = emp.emp_code;
    if (!code) return;
    if (target === 'edit') {
      setEditCommentBody((prev) => insertMention(prev, code));
    } else {
      setComment((prev) => insertMention(prev, code));
    }
    setMentionIndex(0);
    requestAnimationFrame(() => commentInputRef.current?.focus());
  };

  const handleCommentKeyDown = (e, target = 'new') => {
    if (!mentionSuggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex((i) => (i + 1) % mentionSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex((i) => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      applyMention(mentionSuggestions[mentionIndex], target);
    } else if (e.key === 'Escape') {
      setMentionIndex(0);
    }
  };

  const addDepMutation = useMutation({
    mutationFn: (depends_on_task_id) =>
      hrApi.addTaskDependency(taskId, { depends_on_task_id, relation_type: depRelation }),
    onSuccess: () => {
      setDepTaskId('');
      setDepError('');
      invalidate();
    },
    onError: (err) => {
      setDepError(err.response?.data?.error?.message || 'Failed to add dependency');
    },
  });

  const removeDepMutation = useMutation({
    mutationFn: (depId) => hrApi.deleteTaskDependency(taskId, depId),
    onSuccess: () => {
      setDepError('');
      invalidate();
    },
    onError: (err) => {
      setDepError(err.response?.data?.error?.message || 'Failed to remove dependency');
    },
  });

  const assignLabelMutation = useMutation({
    mutationFn: (label_id) => hrApi.assignTaskLabel(taskId, { label_id }),
    onSuccess: () => {
      setLabelActionError('');
      invalidateLabels();
    },
    onError: (err) => {
      setLabelActionError(err.response?.data?.error?.message || 'Failed to add label');
    },
  });

  const removeLabelMutation = useMutation({
    mutationFn: (labelId) => hrApi.removeTaskLabel(taskId, labelId),
    onSuccess: () => {
      setLabelActionError('');
      invalidateLabels();
    },
    onError: (err) => {
      setLabelActionError(err.response?.data?.error?.message || 'Failed to remove label');
    },
  });

  const createLabelMutation = useMutation({
    mutationFn: (payload) => hrApi.createProjectLabel(projectId, payload),
    onSuccess: (res) => {
      setLabelActionError('');
      setShowCreateLabel(false);
      setNewLabel({ name: '', color: '#64748b' });
      queryClient.invalidateQueries({ queryKey: ['project-labels', projectId] });
      const createdId = res?.data?.label?.id;
      if (createdId) {
        assignLabelMutation.mutate(createdId);
      }
    },
    onError: (err) => {
      setLabelActionError(err.response?.data?.error?.message || 'Failed to create label');
    },
  });

  const createSubtaskMutation = useMutation({
    mutationFn: (payload) => hrApi.createProjectTask(projectId, payload),
    onSuccess: () => {
      setSubtaskError('');
      setShowSubtaskForm(false);
      setSubtaskForm({ title: '', estimate_points: '' });
      invalidate();
    },
    onError: (err) => {
      setSubtaskError(err.response?.data?.error?.message || 'Failed to create subtask');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => hrApi.addTaskAttachment(taskId, file),
    onSuccess: (res) => {
      const name = res?.data?.attachment?.file_name || 'File';
      setUploadError('');
      setUploadSuccess(`${name} uploaded successfully`);
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err) => {
      setUploadSuccess('');
      setUploadError(err.response?.data?.error?.message || 'Failed to upload attachment');
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId) => hrApi.deleteTaskAttachment(taskId, attachmentId),
    onSuccess: () => {
      setUploadError('');
      setUploadSuccess('Attachment deleted');
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err) => {
      setUploadSuccess('');
      setUploadError(err.response?.data?.error?.message || 'Failed to delete attachment');
    },
  });

  const canManageAttachment = (att) => {
    if (!user?.id || !att) return false;
    if (att.uploaded_by === user.id) return true;
    return canManage;
  };

  const handleDeleteAttachment = (att) => {
    if (!window.confirm(`Delete attachment "${att.file_name}"?\n\nThe file will be removed permanently.`)) {
      return;
    }
    setUploadError('');
    setUploadSuccess('');
    deleteAttachmentMutation.mutate(att.id);
  };

  const handleUploadFile = (file) => {
    if (!file || uploadMutation.isPending) return;
    setUploadError('');
    setUploadSuccess('');
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setUploadError('File must be 15 MB or smaller');
      return;
    }
    uploadMutation.mutate(file);
  };

  const handleDelete = () => {
    if (!task) return;
    const label = task.task_key ? `${task.task_key} — ${task.title}` : task.title;
    if (!window.confirm(`Delete task "${label}"? This cannot be undone.`)) return;
    setDeleteError('');
    deleteMutation.mutate();
  };

  if (!taskId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-xl bg-white shadow-xl h-full max-h-[100dvh] flex flex-col overflow-hidden">
        <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between gap-3 z-20">
          <div className="min-w-0">
            {task?.task_key && (
              <p className="text-xs font-mono text-brand-600 mb-1">{task.task_key}</p>
            )}
            <h2 className="text-lg font-semibold text-slate-900 leading-tight">
              {isLoading ? 'Loading…' : task?.title || 'Task'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X size={20} />
          </button>
        </div>

        {deleteError && (
          <div className="shrink-0 mx-5 mt-3 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">
            {deleteError}
          </div>
        )}

        {isLoading ? (
          <p className="p-8 text-center text-slate-400">Loading task…</p>
        ) : error || !task ? (
          <p className="p-8 text-center text-red-500">Failed to load task</p>
        ) : (
          <>
            <div className="shrink-0 flex gap-1 border-b border-slate-200 px-4 sm:px-5 scroll-tabs bg-white z-10">
              {TASK_TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    'px-3 py-2.5 text-xs font-medium border-b-2 -mb-px capitalize',
                    tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                  )}
                >
                  {t}
                  {t === 'comments' && task.comments?.length > 0 && (
                    <span className="ml-1 text-[9px] bg-slate-100 px-1.5 rounded-full">{task.comments.length}</span>
                  )}
                  {t === 'dependencies' && (task.dependencies?.length > 0 || task.dependency_summary) && (
                    <span className="ml-1 text-[9px] bg-slate-100 px-1.5 rounded-full">
                      {task.dependencies?.length
                        || ((task.dependency_summary?.blocked_by || 0) + (task.dependency_summary?.blocks || 0))}
                    </span>
                  )}
                  {t === 'attachments' && attachmentCount > 0 && (
                    <span className="ml-1 text-[9px] bg-slate-100 px-1.5 rounded-full">{attachmentCount}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-5">
              {tab === 'details' && (
                <>
                  {task.parentTask && (
                    <button
                      type="button"
                      onClick={() => onNavigateTask?.(task.parentTask.id)}
                      className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1"
                    >
                      Parent: <span className="font-mono">{task.parentTask.task_key}</span> — {task.parentTask.title}
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase text-slate-400 font-medium">Status</label>
                      <select
                        value={task.status}
                        onChange={(e) => updateMutation.mutate({ status: e.target.value })}
                        disabled={updateMutation.isPending}
                        className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5"
                      >
                        {Object.entries(TASK_STATUS).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-slate-400 font-medium">Priority</label>
                      {canManage ? (
                        <select
                          value={task.priority}
                          onChange={(e) => updateMutation.mutate({ priority: e.target.value })}
                          disabled={updateMutation.isPending}
                          className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5"
                        >
                          {['low', 'medium', 'high', 'urgent'].map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="mt-1">
                          <span className={cn('text-xs px-2 py-0.5 rounded capitalize', PRIORITY_BADGE[task.priority])}>
                            {task.priority}
                          </span>
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-slate-400 font-medium">Type</label>
                      <p className="text-sm mt-1 capitalize">{TASK_TYPES[task.task_type] || task.task_type || 'Task'}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-slate-400 font-medium">Due date</label>
                      {canManage ? (
                        <input
                          type="date"
                          value={task.due_date ? task.due_date.slice(0, 10) : ''}
                          onChange={(e) => updateMutation.mutate({ due_date: e.target.value || null })}
                          className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5"
                        />
                      ) : (
                        <p className="text-sm mt-1 text-slate-700">
                          {task.due_date ? format(parseISO(task.due_date), 'dd MMM yyyy') : '—'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-slate-400 font-medium">Story points</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        key={`points-${task.id}-${task.estimate_points}`}
                        defaultValue={task.estimate_points ?? ''}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const next = raw === '' ? null : parseFloat(raw);
                          const current = task.estimate_points == null || task.estimate_points === ''
                            ? null
                            : parseFloat(task.estimate_points);
                          if (next !== current && !(Number.isNaN(next) && current === null)) {
                            updateMutation.mutate({ estimate_points: Number.isNaN(next) ? null : next });
                          }
                        }}
                        placeholder="—"
                        className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-slate-400 font-medium">Description</label>
                    <textarea
                      defaultValue={task.description || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (task.description || '')) {
                          updateMutation.mutate({ description: e.target.value });
                        }
                      }}
                      rows={4}
                      className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                      placeholder="Add a description…"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg text-sm">
                    <div>
                      <label className="text-[10px] uppercase text-slate-400 font-medium">Assignee</label>
                      {canManage ? (
                        <select
                          value={task.assignee_id ? String(task.assignee_id) : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            assignMutation.mutate(value ? parseInt(value, 10) : null);
                          }}
                          disabled={assignMutation.isPending}
                          className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                        >
                          <option value="">Unassigned</option>
                          {assigneeOptions.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.first_name} {emp.last_name}
                              {emp.emp_code ? ` (${emp.emp_code})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="mt-1">
                          {task.assignee ? `${task.assignee.first_name} ${task.assignee.last_name}` : 'Unassigned'}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400">Reporter</p>
                      <p>{task.reporter ? `${task.reporter.first_name} ${task.reporter.last_name}` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400">Project</p>
                      <p>{task.project?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400">Column</p>
                      <p>{task.boardColumn?.name || TASK_STATUS[task.status]?.label}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="text-[10px] uppercase text-slate-400 font-medium">Labels</label>
                      {canManage && projectId && !showCreateLabel && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateLabel(true);
                            setLabelActionError('');
                          }}
                          className="text-[10px] text-brand-600 hover:underline inline-flex items-center gap-1"
                        >
                          <Plus size={12} /> New label
                        </button>
                      )}
                    </div>

                    {!projectId ? (
                      <p className="text-xs text-slate-400">Labels unavailable</p>
                    ) : labelsLoading ? (
                      <p className="text-xs text-slate-400">Loading labels…</p>
                    ) : labelsError ? (
                      <div className="space-y-2">
                        <p className="text-xs text-red-600">
                          {labelsQueryError?.response?.data?.error?.message || 'Failed to load labels'}
                        </p>
                        <button type="button" onClick={() => refetchLabels()} className="btn-secondary text-xs">
                          Retry
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                          {(task.labels || []).length === 0 ? (
                            <span className="text-xs text-slate-400">No labels assigned</span>
                          ) : (
                            task.labels.map((label) => (
                              <LabelBadge
                                key={label.id}
                                label={label}
                                removable
                                onRemove={(l) => removeLabelMutation.mutate(l.id)}
                              />
                            ))
                          )}
                        </div>

                        {availableLabels.length > 0 && (
                          <div className="flex gap-2">
                            <select
                              defaultValue=""
                              disabled={assignLabelMutation.isPending}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (!value) return;
                                assignLabelMutation.mutate(parseInt(value, 10));
                                e.target.value = '';
                              }}
                              className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5"
                            >
                              <option value="">Add label…</option>
                              {availableLabels.map((label) => (
                                <option key={label.id} value={label.id}>{label.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {canManage && showCreateLabel && (
                          <div className="p-3 border border-slate-200 rounded-lg space-y-2 bg-slate-50">
                            <p className="text-xs font-medium text-slate-700 inline-flex items-center gap-1">
                              <Tag size={12} /> Create label
                            </p>
                            <input
                              value={newLabel.name}
                              onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
                              placeholder="Label name"
                              maxLength={60}
                              className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                            />
                            <div className="flex flex-wrap gap-2">
                              {LABEL_COLOR_PRESETS.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => setNewLabel({ ...newLabel, color })}
                                  className={cn(
                                    'w-6 h-6 rounded-full border-2',
                                    newLabel.color === color ? 'border-slate-800' : 'border-transparent'
                                  )}
                                  style={{ backgroundColor: color }}
                                  aria-label={`Color ${color}`}
                                />
                              ))}
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowCreateLabel(false);
                                  setNewLabel({ name: '', color: '#64748b' });
                                }}
                                className="btn-secondary text-xs"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={!newLabel.name.trim() || createLabelMutation.isPending}
                                onClick={() => {
                                  createLabelMutation.mutate({
                                    name: newLabel.name.trim(),
                                    color: newLabel.color,
                                  });
                                }}
                                className="btn-primary text-xs"
                              >
                                {createLabelMutation.isPending ? 'Creating…' : 'Create & assign'}
                              </button>
                            </div>
                          </div>
                        )}

                        {projectLabels.length === 0 && !showCreateLabel && (
                          <p className="text-xs text-slate-400">
                            {canManage ? 'No project labels yet. Create one to tag this task.' : 'No project labels defined.'}
                          </p>
                        )}

                        {labelActionError && (
                          <p className="text-xs text-red-600">{labelActionError}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {!task.parent_task_id && projectId && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[10px] uppercase text-slate-400 font-medium">
                          Subtasks ({task.subtasks?.length || 0})
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowSubtaskForm(!showSubtaskForm);
                            setSubtaskError('');
                          }}
                          className="text-[10px] text-brand-600 hover:underline inline-flex items-center gap-1"
                        >
                          <Plus size={12} /> Add subtask
                        </button>
                      </div>

                      {(task.subtasks || []).length === 0 && !showSubtaskForm ? (
                        <p className="text-xs text-slate-400">No subtasks yet</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {(task.subtasks || []).map((sub) => (
                            <li key={sub.id}>
                              <button
                                type="button"
                                onClick={() => onNavigateTask?.(sub.id)}
                                className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-left text-sm transition-colors"
                              >
                                <span className={cn(
                                  'text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0',
                                  TASK_STATUS[sub.status]?.color
                                )}>
                                  {TASK_STATUS[sub.status]?.label}
                                </span>
                                <span className="font-mono text-[10px] text-brand-600 shrink-0">{sub.task_key}</span>
                                <span className="flex-1 truncate text-slate-800">{sub.title}</span>
                                {sub.estimate_points != null && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 shrink-0">
                                    {formatStoryPoints(sub.estimate_points)} pts
                                  </span>
                                )}
                                <ChevronRight size={14} className="text-slate-400 shrink-0" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {showSubtaskForm && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            setSubtaskError('');
                            if (!subtaskForm.title.trim()) {
                              setSubtaskError('Title is required');
                              return;
                            }
                            createSubtaskMutation.mutate({
                              title: subtaskForm.title.trim(),
                              parent_task_id: taskId,
                              task_type: 'subtask',
                              sprint_id: task.sprint_id || undefined,
                              estimate_points: subtaskForm.estimate_points
                                ? parseFloat(subtaskForm.estimate_points)
                                : null,
                            });
                          }}
                          className="p-3 border border-slate-200 rounded-lg space-y-2 bg-slate-50"
                        >
                          <input
                            required
                            placeholder="Subtask title"
                            value={subtaskForm.title}
                            onChange={(e) => setSubtaskForm({ ...subtaskForm, title: e.target.value })}
                            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="Story points (optional)"
                            value={subtaskForm.estimate_points}
                            onChange={(e) => setSubtaskForm({ ...subtaskForm, estimate_points: e.target.value })}
                            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                          />
                          {subtaskError && <p className="text-xs text-red-600">{subtaskError}</p>}
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setShowSubtaskForm(false);
                                setSubtaskForm({ title: '', estimate_points: '' });
                                setSubtaskError('');
                              }}
                              className="btn-secondary text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={createSubtaskMutation.isPending}
                              className="btn-primary text-xs"
                            >
                              {createSubtaskMutation.isPending ? 'Adding…' : 'Add Subtask'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs px-2 py-0.5 rounded capitalize', PRIORITY_BADGE[task.priority])}>
                        {task.priority}
                      </span>
                      <span className={cn('text-xs px-2 py-0.5 rounded', TASK_STATUS[task.status]?.color)}>
                        {TASK_STATUS[task.status]?.label}
                      </span>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg px-3 py-1.5"
                      >
                        <Trash2 size={14} />
                        {deleteMutation.isPending ? 'Deleting…' : 'Delete Task'}
                      </button>
                    )}
                  </div>
                </>
              )}

              {tab === 'dependencies' && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
                      Blocked by ({blockedByDeps.length})
                    </h4>
                    {blockedByDeps.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-3 bg-slate-50 rounded-lg">
                        Not waiting on any task
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {blockedByDeps.map((dep) => {
                          const other = dep.other_task || dep.dependsOnTask;
                          return (
                            <li key={dep.id} className="flex items-center justify-between gap-2 p-3 bg-amber-50/60 border border-amber-100 rounded-lg text-sm">
                              <button
                                type="button"
                                className="text-left min-w-0"
                                onClick={() => other?.id && onNavigateTask?.(other.id)}
                              >
                                <p className="font-mono text-xs text-brand-600">
                                  {other?.task_key || `#${dep.other_task_id || dep.depends_on_task_id}`}
                                </p>
                                <p className="text-slate-700 truncate">{other?.title || '—'}</p>
                                <p className="text-[10px] text-slate-400 capitalize mt-0.5">{other?.status || ''}</p>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeDepMutation.mutate(dep.id)}
                                disabled={removeDepMutation.isPending || !canManage}
                                className={cn(
                                  'text-xs shrink-0',
                                  canManage ? 'text-red-600 hover:underline' : 'text-slate-300 cursor-not-allowed'
                                )}
                              >
                                Remove
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-2">
                      Blocks ({blocksDeps.length})
                    </h4>
                    {blocksDeps.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-3 bg-slate-50 rounded-lg">
                        Not blocking any task
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {blocksDeps.map((dep) => {
                          const other = dep.other_task || dep.dependsOnTask;
                          return (
                            <li key={dep.id} className="flex items-center justify-between gap-2 p-3 bg-red-50/50 border border-red-100 rounded-lg text-sm">
                              <button
                                type="button"
                                className="text-left min-w-0"
                                onClick={() => other?.id && onNavigateTask?.(other.id)}
                              >
                                <p className="font-mono text-xs text-brand-600">
                                  {other?.task_key || `#${dep.other_task_id}`}
                                </p>
                                <p className="text-slate-700 truncate">{other?.title || '—'}</p>
                                <p className="text-[10px] text-slate-400 capitalize mt-0.5">{other?.status || ''}</p>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeDepMutation.mutate(dep.id)}
                                disabled={removeDepMutation.isPending || !canManage}
                                className={cn(
                                  'text-xs shrink-0',
                                  canManage ? 'text-red-600 hover:underline' : 'text-slate-300 cursor-not-allowed'
                                )}
                              >
                                Remove
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <label className="text-xs font-medium text-slate-600">Add dependency</label>
                    <select
                      value={depRelation}
                      onChange={(e) => setDepRelation(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5"
                    >
                      <option value="blocked_by">This task is blocked by…</option>
                      <option value="blocks">This task blocks…</option>
                    </select>
                    <div className="flex gap-2">
                      <select
                        value={depTaskId}
                        onChange={(e) => setDepTaskId(e.target.value)}
                        className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5"
                      >
                        <option value="">Select task…</option>
                        {pickerTasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.task_key || `#${t.id}`} — {t.title}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!depTaskId || addDepMutation.isPending}
                        onClick={() => addDepMutation.mutate(parseInt(depTaskId, 10))}
                        className="btn-primary text-xs"
                      >
                        {addDepMutation.isPending ? 'Adding…' : 'Add'}
                      </button>
                    </div>
                    {pickerTasks.length === 0 && (
                      <p className="text-[11px] text-slate-400">No other tasks available to link.</p>
                    )}
                    {depError && <p className="text-xs text-red-600">{depError}</p>}
                  </div>
                </div>
              )}

              {tab === 'comments' && (
                <div className="space-y-4">
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                    {(task.comments || []).length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-6">No comments yet</p>
                    ) : (
                      task.comments.map((c) => {
                        const isEditing = editingCommentId === c.id;
                        const allowManage = canManageComment(c);
                        const isBusy =
                          updateCommentMutation.isPending || deleteCommentMutation.isPending;
                        return (
                          <div key={c.id} className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-medium text-slate-700">
                                {c.commenter?.first_name} {c.commenter?.last_name}
                                <span className="text-slate-400 font-normal ml-2">
                                  {c.created_at ? format(parseISO(c.created_at), 'dd MMM h:mm a') : ''}
                                </span>
                                {c.updated_at && c.updated_at !== c.created_at && (
                                  <span className="text-slate-400 font-normal ml-1">(edited)</span>
                                )}
                              </p>
                              {allowManage && !isEditing && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => startEditComment(c)}
                                    disabled={isBusy}
                                    className="p-1 text-slate-400 hover:text-brand-600 disabled:opacity-50"
                                    title="Edit comment"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(c)}
                                    disabled={isBusy}
                                    className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-50"
                                    title="Delete comment"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                            {isEditing ? (
                              <div className="mt-2 space-y-2 relative">
                                <textarea
                                  value={editCommentBody}
                                  onChange={(e) => {
                                    setEditCommentBody(e.target.value);
                                    setMentionIndex(0);
                                  }}
                                  onKeyDown={(e) => handleCommentKeyDown(e, 'edit')}
                                  rows={3}
                                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
                                />
                                {activeMentionQuery != null && editingCommentId === c.id && (
                                  <div className="absolute left-0 right-0 top-full z-20 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {mentionSuggestions.length === 0 ? (
                                      <p className="px-3 py-2 text-xs text-slate-400">No matching people</p>
                                    ) : (
                                      mentionSuggestions.map((emp, idx) => (
                                        <button
                                          key={emp.id}
                                          type="button"
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            applyMention(emp, 'edit');
                                          }}
                                          className={cn(
                                            'w-full text-left px-3 py-2 text-sm hover:bg-slate-50',
                                            idx === mentionIndex && 'bg-brand-50'
                                          )}
                                        >
                                          <span className="font-mono text-brand-700 text-xs">@{emp.emp_code}</span>
                                          <span className="text-slate-600 ml-2">
                                            {emp.first_name} {emp.last_name}
                                          </span>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={cancelEditComment}
                                    disabled={updateCommentMutation.isPending}
                                    className="btn-secondary text-xs"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      !editCommentBody.trim()
                                      || editCommentBody.trim() === (c.body || '')
                                      || updateCommentMutation.isPending
                                    }
                                    onClick={() =>
                                      updateCommentMutation.mutate({
                                        commentId: c.id,
                                        body: editCommentBody.trim(),
                                      })
                                    }
                                    className="btn-primary text-xs"
                                  >
                                    {updateCommentMutation.isPending ? 'Saving…' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">
                                {renderCommentWithMentions(c.body)}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  {commentActionError && (
                    <p className="text-xs text-red-600">{commentActionError}</p>
                  )}
                  <div className="relative">
                    <div className="flex gap-2">
                      <textarea
                        ref={commentInputRef}
                        value={comment}
                        onChange={(e) => {
                          setComment(e.target.value);
                          setMentionIndex(0);
                        }}
                        onKeyDown={(e) => handleCommentKeyDown(e, 'new')}
                        placeholder="Write a comment… Type @ to mention someone"
                        rows={2}
                        className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2"
                      />
                      <button
                        type="button"
                        disabled={!comment.trim() || commentMutation.isPending}
                        onClick={() => commentMutation.mutate(comment.trim())}
                        className="btn-primary self-end px-3"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                    {activeMentionQuery != null && !editingCommentId && (
                      <div className="absolute left-0 right-12 bottom-full z-20 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {mentionSuggestions.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-slate-400">No matching people</p>
                        ) : (
                          mentionSuggestions.map((emp, idx) => (
                            <button
                              key={emp.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                applyMention(emp, 'new');
                              }}
                              className={cn(
                                'w-full text-left px-3 py-2 text-sm hover:bg-slate-50',
                                idx === mentionIndex && 'bg-brand-50'
                              )}
                            >
                              <span className="font-mono text-brand-700 text-xs">@{emp.emp_code || emp.id}</span>
                              <span className="text-slate-600 ml-2">
                                {emp.first_name} {emp.last_name}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      Mentions use employee codes (e.g. @EMP003). Arrow keys + Enter to select.
                    </p>
                  </div>
                </div>
              )}

              {tab === 'attachments' && (
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      handleUploadFile(e.dataTransfer.files?.[0]);
                    }}
                    className={cn(
                      'rounded-xl border-2 border-dashed transition-colors',
                      dragOver
                        ? 'border-brand-500 bg-brand-50/50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    )}
                  >
                    <label className="flex flex-col items-center justify-center gap-2 p-6 cursor-pointer text-center">
                      <Upload size={20} className="text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {uploadMutation.isPending ? 'Uploading…' : 'Drag & drop a file here'}
                      </span>
                      <span className="text-xs text-slate-500">
                        or <span className="text-brand-600 font-medium">browse</span> to upload
                      </span>
                      <span className="text-[10px] text-slate-400">
                        JPG, PNG, WEBP, PDF, DOC, DOCX — max 15 MB
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ATTACHMENT_ACCEPT}
                        className="hidden"
                        disabled={uploadMutation.isPending}
                        onChange={(e) => handleUploadFile(e.target.files?.[0])}
                      />
                    </label>
                  </div>

                  {uploadError && (
                    <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">
                      {uploadError}
                    </div>
                  )}

                  {uploadSuccess && (
                    <div className="bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded-lg border border-emerald-100">
                      {uploadSuccess}
                    </div>
                  )}

                  {attachmentsLoading ? (
                    <p className="text-sm text-slate-400 text-center py-8">Loading attachments…</p>
                  ) : attachmentsError ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-red-600 mb-3">
                        {attachmentsQueryError?.response?.data?.error?.message || 'Failed to load attachments'}
                      </p>
                      <button type="button" onClick={() => refetchAttachments()} className="btn-secondary text-xs">
                        Retry
                      </button>
                    </div>
                  ) : attachments.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText size={36} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-400">No attachments yet</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {attachments.map((att) => {
                        const fileUrl = resolveAssetUrl(att.file_url);
                        const uploaderName = att.uploader
                          ? `${att.uploader.first_name} ${att.uploader.last_name}`
                          : '—';
                        return (
                          <li
                            key={att.id}
                            className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100"
                          >
                            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                              <FileText size={16} className="text-brand-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-800 truncate" title={att.file_name}>
                                {att.file_name}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {formatFileSize(att.file_size)}
                                <span className="mx-1.5">·</span>
                                {uploaderName}
                                {att.created_at && (
                                  <>
                                    <span className="mx-1.5">·</span>
                                    {format(parseISO(att.created_at), 'dd MMM yyyy h:mm a')}
                                  </>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-white border border-transparent hover:border-slate-200"
                                title="Open"
                                aria-label={`Open ${att.file_name}`}
                              >
                                <ExternalLink size={14} />
                              </a>
                              <a
                                href={fileUrl}
                                download={att.file_name}
                                className="p-2 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-white border border-transparent hover:border-slate-200"
                                title="Download"
                                aria-label={`Download ${att.file_name}`}
                              >
                                <Download size={14} />
                              </a>
                              {canManageAttachment(att) && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAttachment(att)}
                                  disabled={deleteAttachmentMutation.isPending}
                                  className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-50"
                                  title="Delete attachment"
                                  aria-label={`Delete ${att.file_name}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {tab === 'activity' && (
                <div className="space-y-2">
                  {(task.activityLog || []).length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No activity yet</p>
                  ) : (
                    task.activityLog.map((log) => (
                      <div key={log.id} className="flex gap-3 text-sm py-2 border-b border-slate-50 last:border-0">
                        <Clock size={14} className="text-slate-300 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-slate-700">
                            <span className="font-medium">
                              {log.actor?.first_name} {log.actor?.last_name}
                            </span>
                            <span className="text-slate-500">
                              {' '}— {ACTIVITY_LABELS[log.action_type] || log.action_type}
                            </span>
                            {log.old_value && log.new_value && (
                              <span className="text-slate-500"> · {log.old_value} → {log.new_value}</span>
                            )}
                            {log.old_value && !log.new_value && (log.action_type === 'comment_deleted' || log.action_type === 'attachment_deleted') && (
                              <span className="text-slate-500"> · “{log.old_value}”</span>
                            )}
                            {!log.old_value && log.new_value && (log.action_type === 'commented' || log.action_type === 'attachment_added') && (
                              <span className="text-slate-500"> · “{log.new_value}”</span>
                            )}
                          </p>
                          {log.created_at && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {format(parseISO(log.created_at), 'dd MMM yyyy h:mm a')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
