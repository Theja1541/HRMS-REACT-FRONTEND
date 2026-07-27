import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, Link } from 'react-router-dom';
import { Plus, MessageSquare, Search, FileText, ExternalLink, X, LifeBuoy, CircleDot, Loader, CheckCircle2, XCircle, Clock, Tags, BookOpen } from 'lucide-react';
import { platformApi, employeeApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import MainContentModal from '../../components/shared/MainContentModal';
import TablePagination from '../../components/shared/TablePagination';
import DocumentDropzone from '../employees/employeeWizard/DocumentDropzone';
import TicketActivityTimeline from '../../components/helpdesk/TicketActivityTimeline';
import HelpdeskSlaSettings from '../../components/helpdesk/HelpdeskSlaSettings';
import { TicketSatisfactionDisplay, TicketSatisfactionForm } from '../../components/helpdesk/TicketSatisfactionSection';
import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_ESCALATED_BADGE,
  HELPDESK_ATTACHMENT_ACCEPT,
  HELPDESK_ATTACHMENT_HINT,
} from '../../constants/platform';
import { cn, resolveAssetUrl, localDateString } from '../../utils/helpers';
import { getSlaDisplay, isActiveSlaOverdue } from '../../utils/helpdeskSla';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';
import { useTablePagination } from '../../hooks/useTablePagination';
import { buildTicketTimeline } from '../../utils/helpdeskTimeline';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

function formatFileSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTicketDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

function formatCategory(category) {
  if (!category) return '—';
  if (typeof category === 'object') return category.name || category.code || '—';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function DetailField({ label, children }) {
  return (
    <div>
      <dt className="text-[10px] uppercase text-slate-500 font-medium tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

function EscalatedBadge() {
  return (
    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0', TICKET_ESCALATED_BADGE)}>
      Escalated
    </span>
  );
}

function SlaBadge({ ticket, now }) {
  const sla = getSlaDisplay(ticket, now);
  if (sla.status === 'none') return null;
  return (
    <span
      className={cn(
        'text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0',
        sla.overdue ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
      )}
    >
      {sla.label}
    </span>
  );
}

const EMPTY_SAVED_REPLY_FORM = { title: '', body: '', is_active: true };
const EMPTY_TAG_FORM = { name: '' };

export default function HelpdeskPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const isSelfService = location.pathname.startsWith('/me/');
  const { user } = useAuthStore();
  const role = usePortalRole();
  const canAssign = !isSelfService && ['super_admin', 'owner', 'admin', 'hr'].includes(role);
  const canPostInternalNote = canAssign;
  const isAdmin = canAssign;
  const isHelpdeskStaffUser = ['super_admin', 'owner', 'hr', 'manager'].includes(role);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [ratingError, setRatingError] = useState('');
  const [showSlaSettings, setShowSlaSettings] = useState(false);
  const [showSavedReplyManager, setShowSavedReplyManager] = useState(false);
  const [showKbManager, setShowKbManager] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);
  const [bulkAssigneeId, setBulkAssigneeId] = useState('');
  const [bulkPriority, setBulkPriority] = useState('medium');
  const [exportError, setExportError] = useState('');
  const [savedReplyForm, setSavedReplyForm] = useState(EMPTY_SAVED_REPLY_FORM);
  const [editingSavedReplyId, setEditingSavedReplyId] = useState(null);
  const [selectedSavedReplyId, setSelectedSavedReplyId] = useState('');
  const [kbForm, setKbForm] = useState({ title: '', content: '', is_active: true });
  const [editingKbArticleId, setEditingKbArticleId] = useState(null);
  const [tagFilterIds, setTagFilterIds] = useState([]);
  const [tagForm, setTagForm] = useState(EMPTY_TAG_FORM);
  const [editingTagId, setEditingTagId] = useState(null);
  const [slaNow, setSlaNow] = useState(() => Date.now());
  const [form, setForm] = useState({ category_id: '', tag_ids: [], subject: '', description: '', priority: 'medium' });
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [searchQuery, statusFilter, tagFilterIds.join(',')] });

  useEffect(() => {
    const id = setInterval(() => setSlaNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setShowForm(false);
    setShowSlaSettings(false);
    setShowSavedReplyManager(false);
    setShowKbManager(false);
    setShowTagManager(false);
  }, [location.pathname]);

  const { data: categoriesData } = useQuery({
    queryKey: ['helpdesk-categories', 'active'],
    queryFn: () => platformApi.listHelpdeskCategories({ active_only: 'true' }),
  });
  const { data: savedRepliesData } = useQuery({
    queryKey: ['helpdesk-saved-replies'],
    queryFn: () => platformApi.listSavedReplies(),
    enabled: canPostInternalNote,
  });
  const { data: kbArticlesData } = useQuery({
    queryKey: ['helpdesk-kb-articles'],
    queryFn: () => platformApi.listKbArticles(),
  });
  const { data: tagsData } = useQuery({
    queryKey: ['helpdesk-tags'],
    queryFn: () => platformApi.listHelpdeskTags(),
  });
  const subjectQuery = form.subject?.trim();
  const { data: kbSuggestionsData } = useQuery({
    queryKey: ['helpdesk-kb-suggestions', subjectQuery],
    queryFn: () => platformApi.listKbArticles({ q: subjectQuery }),
    enabled: Boolean(subjectQuery && subjectQuery.length >= 3),
  });
  const activeCategories = categoriesData?.data?.categories || [];
  const savedReplies = savedRepliesData?.data?.replies || [];
  const kbArticles = kbArticlesData?.data?.articles || [];
  const allTags = tagsData?.data?.tags || [];
  const kbSuggestions = kbSuggestionsData?.data?.articles || [];

  useEffect(() => {
    if (!activeCategories.length || form.category_id) return;
    const hrCategory = activeCategories.find((c) => c.code === 'hr');
    setForm((prev) => ({ ...prev, category_id: String((hrCategory || activeCategories[0]).id) }));
  }, [activeCategories, form.category_id]);

  const listParams = useMemo(() => ({
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(tagFilterIds.length ? { tag_ids: tagFilterIds.join(',') } : {}),
  }), [statusFilter, tagFilterIds]);
  const { data, isLoading } = useQuery({
    queryKey: ['helpdesk-tickets', statusFilter, tagFilterIds.join(',')],
    queryFn: () => platformApi.listTickets(listParams),
  });
  const { data: detailData } = useQuery({
    queryKey: ['helpdesk-ticket', selected],
    queryFn: () => platformApi.getTicket(selected),
    enabled: !!selected,
  });
  const { data: empData } = useQuery({
    queryKey: ['employees-helpdesk-assign'],
    queryFn: () => employeeApi.list({ limit: 500, status: 'active' }),
    enabled: canAssign,
  });

  const createMutation = useMutation({
    mutationFn: ({ form: ticketForm, files }) => platformApi.createTicket(ticketForm, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
      setShowForm(false);
      setPendingAttachments([]);
      setKbSearchQuery('');
      setForm({ category_id: '', tag_ids: [], subject: '', description: '', priority: 'medium' });
    },
  });
  const replyMutation = useMutation({
    mutationFn: ({ id, message, is_internal }) =>
      platformApi.addTicketReply(id, { message, ...(is_internal ? { is_internal: true } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-ticket', selected] });
      setReply('');
      setIsInternalNote(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }) => platformApi.updateTicket(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk-ticket', selected] });
    },
  });
  const bulkUpdateMutation = useMutation({
    mutationFn: (payload) => platformApi.bulkUpdateTickets(payload),
    onSuccess: () => {
      setSelectedTicketIds([]);
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
      if (selected) queryClient.invalidateQueries({ queryKey: ['helpdesk-ticket', selected] });
    },
  });
  const attachmentUploadMutation = useMutation({
    mutationFn: ({ id, file }) => platformApi.uploadTicketAttachment(id, file),
    onSuccess: () => {
      setUploadError('');
      queryClient.invalidateQueries({ queryKey: ['helpdesk-ticket', selected] });
    },
    onError: (err) => {
      setUploadError(err.response?.data?.error?.message || 'Failed to upload attachment');
    },
  });
  const ratingMutation = useMutation({
    mutationFn: ({ id, payload }) => platformApi.rateTicket(id, payload),
    onSuccess: () => {
      setRatingError('');
      queryClient.invalidateQueries({ queryKey: ['helpdesk-ticket', selected] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
    },
    onError: (err) => {
      setRatingError(err.response?.data?.error?.message || 'Failed to submit rating');
    },
  });
  const savedReplyCreateMutation = useMutation({
    mutationFn: (payload) => platformApi.createSavedReply(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-saved-replies'] });
      setSavedReplyForm(EMPTY_SAVED_REPLY_FORM);
    },
  });
  const savedReplyUpdateMutation = useMutation({
    mutationFn: ({ id, payload }) => platformApi.updateSavedReply(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-saved-replies'] });
      setEditingSavedReplyId(null);
      setSavedReplyForm(EMPTY_SAVED_REPLY_FORM);
    },
  });
  const savedReplyDeleteMutation = useMutation({
    mutationFn: (id) => platformApi.deleteSavedReply(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-saved-replies'] });
      if (String(selectedSavedReplyId) === String(id)) setSelectedSavedReplyId('');
    },
  });
  const kbCreateMutation = useMutation({
    mutationFn: (payload) => platformApi.createKbArticle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-kb-articles'] });
      setKbForm({ title: '', content: '', is_active: true });
    },
  });
  const kbUpdateMutation = useMutation({
    mutationFn: ({ id, payload }) => platformApi.updateKbArticle(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-kb-articles'] });
      setEditingKbArticleId(null);
      setKbForm({ title: '', content: '', is_active: true });
    },
  });
  const kbDeleteMutation = useMutation({
    mutationFn: (id) => platformApi.deleteKbArticle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['helpdesk-kb-articles'] }),
  });
  const createTagMutation = useMutation({
    mutationFn: (payload) => platformApi.createHelpdeskTag(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tags'] });
      setTagForm(EMPTY_TAG_FORM);
    },
  });
  const updateTagMutation = useMutation({
    mutationFn: ({ id, payload }) => platformApi.updateHelpdeskTag(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tags'] });
      setEditingTagId(null);
      setTagForm(EMPTY_TAG_FORM);
    },
  });
  const deleteTagMutation = useMutation({
    mutationFn: (id) => platformApi.deleteHelpdeskTag(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['helpdesk-tags'] }),
  });

  // Memoize so `tickets` keeps a stable reference between renders. Without this,
  // `data?.data?.tickets || []` produces a brand-new array every render, which
  // makes the effect below re-run every render and update state in a loop
  // ("Maximum update depth exceeded"), especially when there are no tickets.
  const tickets = useMemo(() => data?.data?.tickets || [], [data]);
  useEffect(() => {
    const validIds = new Set(tickets.map((t) => t.id));
    setSelectedTicketIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      // Bail out (return the same reference) when nothing changed so React does
      // not schedule a needless re-render.
      return next.length === prev.length ? prev : next;
    });
  }, [tickets]);
  const ticketStats = useMemo(() => {
    const counts = { total: tickets.length, open: 0, in_progress: 0, resolved: 0, closed: 0 };
    for (const ticket of tickets) {
      if (Object.prototype.hasOwnProperty.call(counts, ticket.status)) {
        counts[ticket.status] += 1;
      }
    }
    return counts;
  }, [tickets]);
  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t) => {
      const employeeName = `${t.employee?.first_name || ''} ${t.employee?.last_name || ''}`.trim().toLowerCase();
      return (
        t.ticket_no?.toLowerCase().includes(q)
        || t.subject?.toLowerCase().includes(q)
        || employeeName.includes(q)
      );
    });
  }, [tickets, searchQuery]);
  const { items: visibleTickets, pagination } = paginateClient(filteredTickets);
  const allVisibleSelected = visibleTickets.length > 0 && visibleTickets.every((t) => selectedTicketIds.includes(t.id));

  const handleExportTickets = async (format) => {
    try {
      setExportError('');
      const params = {
        format,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(tagFilterIds.length ? { tag_ids: tagFilterIds.join(',') } : {}),
        ...(searchQuery.trim() ? { q: searchQuery.trim() } : {}),
      };
      const response = await platformApi.exportTickets(params);
      const today = localDateString();
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      triggerBlobDownload(response.data, `helpdesk_tickets_${today}.${ext}`);
    } catch (err) {
      setExportError(err?.response?.data?.error?.message || 'Failed to export tickets');
    }
  };
  const ticket = detailData?.data?.ticket;
  const listTicket = tickets.find((t) => t.id === selected);
  const employees = useMemo(() => {
    const list = empData?.data?.employees || [];
    return [...list].sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    );
  }, [empData]);

  const assigneeLabel = (() => {
    const assignee = listTicket?.assignee;
    if (assignee) return `${assignee.first_name} ${assignee.last_name}`;
    if (ticket?.assigned_to) {
      const emp = employees.find((e) => e.id === ticket.assigned_to);
      if (emp) return `${emp.first_name} ${emp.last_name}`;
    }
    return 'Unassigned';
  })();

  const employeeLabel = ticket?.employee
    ? `${ticket.employee.first_name} ${ticket.employee.last_name}${ticket.employee.emp_code ? ` (${ticket.employee.emp_code})` : ''}`
    : '—';

  const priorityLabel = PRIORITY_OPTIONS.find((p) => p.value === ticket?.priority)?.label ?? ticket?.priority;
  const attachments = ticket?.attachments || [];
  const canUploadAttachment = Boolean(ticket);
  const timelineEvents = useMemo(
    () => buildTicketTimeline(ticket, { employeeName: employeeLabel, assigneeName: assigneeLabel }),
    [ticket, employeeLabel, assigneeLabel]
  );
  const canReopen =
    ticket?.status === 'resolved'
    && ticket.employee_id === user?.id
    && !isHelpdeskStaffUser;
  const canRateTicket =
    ticket?.status === 'closed'
    && ticket.employee_id === user?.id
    && !isHelpdeskStaffUser
    && ticket.satisfaction_rating == null;
  const showEmployeeRating =
    ticket?.employee_id === user?.id
    && !isHelpdeskStaffUser
    && ticket.satisfaction_rating != null;
  const showAdminRating =
    isAdmin
    && ticket?.satisfaction_rating != null
    && ticket.employee_id !== user?.id;

  const ticketSla = ticket ? getSlaDisplay(ticket, slaNow) : null;
  const selectedSavedReply = savedReplies.find((item) => String(item.id) === String(selectedSavedReplyId));

  return (
    <div className="space-y-6">
      <PageHeader
        badge={isSelfService ? 'My Work · Helpdesk' : 'Platform · Helpdesk'}
        title={isSelfService ? 'My Helpdesk' : 'Helpdesk'}
        subtitle={isSelfService ? 'Create tickets, track progress, and get updates in one place' : 'Manage employee support requests with clear status, SLA, and actions'}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && !isSelfService && (
              <>
                <Link to="/helpdesk/categories" className="btn-secondary">
                  <Tags size={14} /> Categories
                </Link>
                <button
                  type="button"
                  onClick={() => setShowSlaSettings(true)}
                  className="btn-secondary"
                >
                  <Clock size={14} /> SLA Rules
                </button>
                <button
                  type="button"
                  onClick={() => setShowSavedReplyManager(true)}
                  className="btn-secondary"
                >
                  Saved Replies
                </button>
                <button
                  type="button"
                  onClick={() => setShowKbManager(true)}
                  className="btn-secondary"
                >
                  <BookOpen size={14} /> Knowledge Base
                </button>
                <button
                  type="button"
                  onClick={() => setShowTagManager(true)}
                  className="btn-secondary"
                >
                  Ticket Tags
                </button>
              </>
            )}
            <button type="button" onClick={() => handleExportTickets('xlsx')} className="btn-secondary">
              Export Excel
            </button>
            <button type="button" onClick={() => handleExportTickets('pdf')} className="btn-secondary">
              Export PDF
            </button>
            <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={14} /> Raise New Ticket
            </button>
          </div>
        )}
      />
      {exportError && <p className="text-xs text-red-600 -mt-4">{exportError}</p>}

      <div className="card p-4 bg-brand-50/40 border border-brand-100">
        <p className="text-sm font-semibold text-slate-800">How to use Helpdesk</p>
        <p className="text-xs text-slate-600 mt-1">
          1) Create or open a ticket, 2) communicate in Replies, 3) track status/SLA until resolved.
        </p>
      </div>

      <HelpdeskSlaSettings open={showSlaSettings} onClose={() => setShowSlaSettings(false)} />
      <MainContentModal open={showSavedReplyManager} onClose={() => setShowSavedReplyManager(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl p-6 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Saved Replies</h3>
              <button type="button" onClick={() => setShowSavedReplyManager(false)} className="btn-secondary">
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden flex-1">
              <div className="border border-slate-200 rounded-lg overflow-y-auto">
                <ul className="divide-y divide-slate-100">
                  {savedReplies.map((item) => (
                    <li key={item.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-3">{item.body}</p>
                          <span className={cn('inline-flex mt-2 text-[10px] px-2 py-0.5 rounded-full', item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                            {item.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            className="text-xs btn-secondary"
                            onClick={() => {
                              setEditingSavedReplyId(item.id);
                              setSavedReplyForm({
                                title: item.title,
                                body: item.body,
                                is_active: item.is_active,
                              });
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-xs btn-secondary text-red-600"
                            onClick={() => {
                              if (window.confirm(`Delete saved reply "${item.title}"?`)) {
                                savedReplyDeleteMutation.mutate(item.id);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                  {savedReplies.length === 0 && (
                    <li className="p-6 text-sm text-slate-400 text-center">No saved replies yet</li>
                  )}
                </ul>
              </div>
              <form
                className="border border-slate-200 rounded-lg p-4 space-y-3 overflow-y-auto"
                onSubmit={(e) => {
                  e.preventDefault();
                  const payload = {
                    title: savedReplyForm.title.trim(),
                    body: savedReplyForm.body.trim(),
                    is_active: savedReplyForm.is_active,
                  };
                  if (!payload.title || !payload.body) return;
                  if (editingSavedReplyId) {
                    savedReplyUpdateMutation.mutate({ id: editingSavedReplyId, payload });
                  } else {
                    savedReplyCreateMutation.mutate(payload);
                  }
                }}
              >
                <p className="text-sm font-medium text-slate-900">
                  {editingSavedReplyId ? 'Edit reply template' : 'New reply template'}
                </p>
                <input
                  value={savedReplyForm.title}
                  onChange={(e) => setSavedReplyForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Template title"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                />
                <textarea
                  value={savedReplyForm.body}
                  onChange={(e) => setSavedReplyForm((prev) => ({ ...prev, body: e.target.value }))}
                  placeholder="Template text..."
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                />
                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={savedReplyForm.is_active}
                    onChange={(e) => setSavedReplyForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  Active
                </label>
                <div className="flex gap-2 justify-end">
                  {editingSavedReplyId && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setEditingSavedReplyId(null);
                        setSavedReplyForm(EMPTY_SAVED_REPLY_FORM);
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={savedReplyCreateMutation.isPending || savedReplyUpdateMutation.isPending}
                  >
                    {editingSavedReplyId ? 'Update Template' : 'Create Template'}
                  </button>
                </div>
              </form>
            </div>
          </div>
      </MainContentModal>
      <MainContentModal open={showKbManager} onClose={() => setShowKbManager(false)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl p-6 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Helpdesk Knowledge Base</h3>
              <button type="button" onClick={() => setShowKbManager(false)} className="btn-secondary">Close</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden flex-1">
              <div className="border border-slate-200 rounded-lg overflow-y-auto">
                <ul className="divide-y divide-slate-100">
                  {kbArticles.map((article) => (
                    <li key={article.id} className="p-3">
                      <p className="text-sm font-medium text-slate-900">{article.title}</p>
                      <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{article.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full', article.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                          {article.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          onClick={() => {
                            setEditingKbArticleId(article.id);
                            setKbForm({ title: article.title, content: article.content, is_active: article.is_active });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-secondary text-xs text-red-600"
                          onClick={() => {
                            if (window.confirm(`Delete article "${article.title}"?`)) kbDeleteMutation.mutate(article.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                  {kbArticles.length === 0 && <li className="p-6 text-center text-sm text-slate-400">No articles yet</li>}
                </ul>
              </div>
              <form
                className="border border-slate-200 rounded-lg p-4 space-y-3 overflow-y-auto"
                onSubmit={(e) => {
                  e.preventDefault();
                  const payload = {
                    title: kbForm.title.trim(),
                    content: kbForm.content.trim(),
                    is_active: kbForm.is_active,
                  };
                  if (!payload.title || !payload.content) return;
                  if (editingKbArticleId) kbUpdateMutation.mutate({ id: editingKbArticleId, payload });
                  else kbCreateMutation.mutate(payload);
                }}
              >
                <p className="text-sm font-medium text-slate-900">{editingKbArticleId ? 'Edit article' : 'Create article'}</p>
                <input
                  value={kbForm.title}
                  onChange={(e) => setKbForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Article title"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                />
                <textarea
                  value={kbForm.content}
                  onChange={(e) => setKbForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="FAQ answer / guidance..."
                  rows={8}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                />
                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={kbForm.is_active}
                    onChange={(e) => setKbForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  Active
                </label>
                <div className="flex justify-end gap-2">
                  {editingKbArticleId && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setEditingKbArticleId(null);
                        setKbForm({ title: '', content: '', is_active: true });
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button type="submit" className="btn-primary" disabled={kbCreateMutation.isPending || kbUpdateMutation.isPending}>
                    {editingKbArticleId ? 'Update Article' : 'Create Article'}
                  </button>
                </div>
              </form>
            </div>
          </div>
      </MainContentModal>
      <MainContentModal open={showTagManager} onClose={() => setShowTagManager(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Helpdesk Ticket Tags</h3>
              <button type="button" onClick={() => setShowTagManager(false)} className="btn-secondary">Close</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden flex-1">
              <div className="border border-slate-200 rounded-lg overflow-y-auto">
                <ul className="divide-y divide-slate-100">
                  {allTags.map((tag) => (
                    <li key={tag.id} className="p-3 flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-800">{tag.name}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          onClick={() => {
                            setEditingTagId(tag.id);
                            setTagForm({ name: tag.name });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-secondary text-xs text-red-600"
                          onClick={() => {
                            if (window.confirm(`Delete tag "${tag.name}"?`)) deleteTagMutation.mutate(tag.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                  {allTags.length === 0 && <li className="p-6 text-sm text-slate-400 text-center">No tags yet</li>}
                </ul>
              </div>
              <form
                className="border border-slate-200 rounded-lg p-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const payload = { name: tagForm.name.trim() };
                  if (!payload.name) return;
                  if (editingTagId) updateTagMutation.mutate({ id: editingTagId, payload });
                  else createTagMutation.mutate(payload);
                }}
              >
                <p className="text-sm font-medium text-slate-900">{editingTagId ? 'Edit tag' : 'Create tag'}</p>
                <input
                  value={tagForm.name}
                  onChange={(e) => setTagForm({ name: e.target.value })}
                  placeholder="Tag name (e.g. Payroll)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                />
                <div className="flex justify-end gap-2">
                  {editingTagId && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setEditingTagId(null);
                        setTagForm(EMPTY_TAG_FORM);
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button type="submit" className="btn-primary" disabled={createTagMutation.isPending || updateTagMutation.isPending}>
                    {editingTagId ? 'Update Tag' : 'Create Tag'}
                  </button>
                </div>
              </form>
            </div>
          </div>
      </MainContentModal>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('')}
          className={cn('text-left rounded-xl transition-shadow', statusFilter === '' && 'ring-2 ring-brand-500 ring-offset-2')}
        >
          <StatCard label="Total Tickets" value={isLoading ? '…' : ticketStats.total} icon={LifeBuoy} />
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('open')}
          className={cn('text-left rounded-xl transition-shadow', statusFilter === 'open' && 'ring-2 ring-brand-500 ring-offset-2')}
        >
          <StatCard label="Open" value={isLoading ? '…' : ticketStats.open} icon={CircleDot} />
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('in_progress')}
          className={cn('text-left rounded-xl transition-shadow', statusFilter === 'in_progress' && 'ring-2 ring-brand-500 ring-offset-2')}
        >
          <StatCard label="In Progress" value={isLoading ? '…' : ticketStats.in_progress} icon={Loader} />
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('resolved')}
          className={cn('text-left rounded-xl transition-shadow', statusFilter === 'resolved' && 'ring-2 ring-brand-500 ring-offset-2')}
        >
          <StatCard label="Resolved" value={isLoading ? '…' : ticketStats.resolved} icon={CheckCircle2} />
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('closed')}
          className={cn('text-left rounded-xl transition-shadow col-span-2 sm:col-span-1', statusFilter === 'closed' && 'ring-2 ring-brand-500 ring-offset-2')}
        >
          <StatCard label="Closed" value={isLoading ? '…' : ticketStats.closed} icon={XCircle} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card overflow-x-auto overscroll-x-contain">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Ticket List</p>
          </div>
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/70">
            <p className="text-xs text-slate-600">
              Use search, status, and tags to narrow tickets. Select tickets for bulk actions when needed.
            </p>
          </div>
          {isAdmin && selectedTicketIds.length > 0 && (
            <div className="px-3 py-2 border-b border-slate-100 bg-brand-50/40 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-700 font-medium">{selectedTicketIds.length} selected</span>
              <select
                value={bulkAssigneeId}
                onChange={(e) => setBulkAssigneeId(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded text-xs bg-white"
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={bulkUpdateMutation.isPending}
                onClick={() => bulkUpdateMutation.mutate({
                  ticket_ids: selectedTicketIds,
                  action: 'assign',
                  assigned_to: bulkAssigneeId ? parseInt(bulkAssigneeId, 10) : null,
                })}
              >
                Assign
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={bulkUpdateMutation.isPending}
                onClick={() => bulkUpdateMutation.mutate({ ticket_ids: selectedTicketIds, action: 'resolve' })}
              >
                Resolve
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={bulkUpdateMutation.isPending}
                onClick={() => bulkUpdateMutation.mutate({ ticket_ids: selectedTicketIds, action: 'close' })}
              >
                Close
              </button>
              <select
                value={bulkPriority}
                onChange={(e) => setBulkPriority(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded text-xs bg-white"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={bulkUpdateMutation.isPending}
                onClick={() => bulkUpdateMutation.mutate({
                  ticket_ids: selectedTicketIds,
                  action: 'priority',
                  priority: bulkPriority,
                })}
              >
                Change Priority
              </button>
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-700"
                onClick={() => setSelectedTicketIds([])}
              >
                Clear
              </button>
            </div>
          )}
          <div className="ds-toolbar border-b border-slate-100">
            <div className="toolbar-row">
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket number, subject, or employee..."
                className="ds-input pl-9 w-full"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="ds-select w-full sm:w-44 shrink-0"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            </div>
          </div>
          <div className="px-3 py-2 border-b border-slate-100 flex flex-wrap gap-2">
            {isAdmin && visibleTickets.length > 0 && (
              <label className="inline-flex items-center gap-2 text-xs text-slate-600 pr-2 mr-1 border-r border-slate-200">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const ids = visibleTickets.map((t) => t.id);
                      setSelectedTicketIds((prev) => [...new Set([...prev, ...ids])]);
                    } else {
                      const remove = new Set(visibleTickets.map((t) => t.id));
                      setSelectedTicketIds((prev) => prev.filter((id) => !remove.has(id)));
                    }
                  }}
                />
                Select page
              </label>
            )}
            <button
              type="button"
              className={cn('text-xs px-2 py-1 rounded-full border', tagFilterIds.length === 0 ? 'bg-brand-50 border-brand-200 text-brand-700' : 'border-slate-200 text-slate-600')}
              onClick={() => setTagFilterIds([])}
            >
              All Tags
            </button>
            {allTags.map((tag) => {
              const active = tagFilterIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={cn('text-xs px-2 py-1 rounded-full border', active ? 'bg-brand-50 border-brand-200 text-brand-700' : 'border-slate-200 text-slate-600')}
                  onClick={() => {
                    setTagFilterIds((prev) =>
                      prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                    );
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
          {isLoading ? <p className="p-8 text-center text-slate-400">Loading…</p> : tickets.length === 0 ? (
            <p className="p-12 text-center text-slate-400">
              {statusFilter
                ? `No ${STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label.toLowerCase()} tickets`
                : 'No tickets yet'}
            </p>
          ) : filteredTickets.length === 0 ? (
            <p className="p-12 text-center text-slate-400">No tickets match your search</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visibleTickets.map((t) => {
                const overdue = isActiveSlaOverdue(t, slaNow);
                return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(t.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-slate-50 border-l-2',
                      selected === t.id && 'bg-brand-50',
                      overdue ? 'bg-red-50 border-l-red-500' : 'border-l-transparent'
                    )}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {isAdmin && (
                          <label className="inline-flex items-center gap-2 text-xs text-slate-500 mb-1">
                            <input
                              type="checkbox"
                              checked={selectedTicketIds.includes(t.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                setSelectedTicketIds((prev) =>
                                  prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                                );
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            Select
                          </label>
                        )}
                        <p className="text-xs font-mono text-slate-400">{t.ticket_no}</p>
                        <p className={cn('text-sm font-medium mt-0.5', overdue && 'text-red-800')}>{t.subject}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {isAdmin ? `${t.employee?.first_name} ${t.employee?.last_name} · ` : ''}{formatCategory(t.category)}
                        </p>
                        {Array.isArray(t.tags) && t.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {t.tags.map((tag) => (
                              <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-full capitalize', TICKET_STATUSES[t.status])}>{t.status.replace(/_/g, ' ')}</span>
                          {t.escalated_at && <EscalatedBadge />}
                        </div>
                        <SlaBadge ticket={t} now={slaNow} />
                      </div>
                    </div>
                  </button>
                </li>
              );
              })}
            </ul>
          )}
          {!isLoading && filteredTickets.length > 0 && (
            <TablePagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          )}
        </div>

        <div className="card p-5 min-h-[300px]">
          <div className="mb-3">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Ticket Details</p>
          </div>
          {!selected || !ticket ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
              <MessageSquare size={32} className="mb-2 opacity-40" />
              <p className="text-sm">Select a ticket to view details</p>
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-slate-900 mb-1">{ticket.subject}</h3>
              <p className="text-sm text-slate-600 mb-4">{ticket.description}</p>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <DetailField label="Ticket Number">
                  <span className="font-mono text-slate-700">{ticket.ticket_no}</span>
                </DetailField>
                <DetailField label="Category">
                  {formatCategory(ticket.category)}
                </DetailField>
                <DetailField label="Status">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full capitalize font-medium', TICKET_STATUSES[ticket.status])}>
                      {ticket.status.replace(/_/g, ' ')}
                    </span>
                    {ticket.escalated_at && <EscalatedBadge />}
                    {isAdmin && (
                      <select
                        value={ticket.status}
                        onChange={(e) => updateMutation.mutate({ id: ticket.id, status: e.target.value })}
                        disabled={updateMutation.isPending}
                        className="text-xs border border-slate-200 rounded px-2 py-0.5 bg-white capitalize"
                        aria-label="Change ticket status"
                      >
                        {Object.keys(TICKET_STATUSES).map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </DetailField>
                <DetailField label="Priority">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', TICKET_PRIORITIES[ticket.priority])}>
                      {priorityLabel}
                    </span>
                    {isAdmin && (
                      <select
                        value={ticket.priority}
                        onChange={(e) => updateMutation.mutate({ id: ticket.id, priority: e.target.value })}
                        disabled={updateMutation.isPending}
                        className="text-xs border border-slate-200 rounded px-2 py-0.5 bg-white"
                        aria-label="Change ticket priority"
                      >
                        {PRIORITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </DetailField>
                <DetailField label="Created Date">
                  {formatTicketDate(ticket.created_at)}
                </DetailField>
                <DetailField label="SLA Due">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-700">{formatTicketDate(ticket.sla_due_at)}</span>
                    {ticketSla && ticketSla.status !== 'none' && (
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-medium',
                          ticketSla.overdue ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
                        )}
                      >
                        {ticketSla.label}
                      </span>
                    )}
                  </div>
                </DetailField>
                <DetailField label="Employee">
                  {employeeLabel}
                </DetailField>
                <DetailField label="Assigned To">
                  {canAssign ? (
                    <select
                      value={ticket.assigned_to ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateMutation.mutate({
                          id: ticket.id,
                          assigned_to: value === '' ? null : parseInt(value, 10),
                        });
                      }}
                      disabled={updateMutation.isPending}
                      className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                    >
                      <option value="">Unassigned</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}{emp.emp_code ? ` (${emp.emp_code})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-slate-700">{assigneeLabel}</span>
                  )}
                </DetailField>
                <DetailField label="Tags">
                  {isAdmin ? (
                    <select
                      multiple
                      value={(ticket.tags || []).map((t) => String(t.id))}
                      onChange={(e) => {
                        const selectedIds = Array.from(e.target.selectedOptions).map((opt) => parseInt(opt.value, 10));
                        updateMutation.mutate({ id: ticket.id, tag_ids: selectedIds });
                      }}
                      disabled={updateMutation.isPending}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white min-h-[78px]"
                    >
                      {allTags.map((tag) => (
                        <option key={tag.id} value={tag.id}>{tag.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {(ticket.tags || []).length === 0 ? '—' : (ticket.tags || []).map((tag) => (
                        <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </DetailField>
              </dl>

              {canReopen && (
                <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50">
                  <p className="text-sm text-amber-900 mb-2">
                    This ticket is resolved. Reopen it if you still need help.
                  </p>
                  <button
                    type="button"
                    onClick={() => updateMutation.mutate({ id: ticket.id, status: 'in_progress' })}
                    disabled={updateMutation.isPending}
                    className="btn-secondary text-sm"
                  >
                    {updateMutation.isPending ? 'Reopening…' : 'Reopen Ticket'}
                  </button>
                </div>
              )}

              {canRateTicket && (
                <div className="mb-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
                  <p className="text-[10px] uppercase text-slate-500 font-medium tracking-wide mb-3">
                    Rate Support
                  </p>
                  <TicketSatisfactionForm
                    isSubmitting={ratingMutation.isPending}
                    error={ratingError}
                    onSubmit={(payload) => ratingMutation.mutate({ id: ticket.id, payload })}
                  />
                </div>
              )}

              {showEmployeeRating && !canRateTicket && (
                <div className="mb-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
                  <p className="text-[10px] uppercase text-slate-500 font-medium tracking-wide mb-2">
                    Your Rating
                  </p>
                  <TicketSatisfactionDisplay
                    rating={ticket.satisfaction_rating}
                    feedback={ticket.satisfaction_feedback}
                    ratedAt={ticket.satisfaction_rated_at}
                  />
                </div>
              )}

              {showAdminRating && (
                <div className="mb-4 p-4 rounded-lg border border-brand-100 bg-brand-50/40">
                  <p className="text-[10px] uppercase text-slate-500 font-medium tracking-wide mb-2">
                    Satisfaction Rating
                  </p>
                  <TicketSatisfactionDisplay
                    rating={ticket.satisfaction_rating}
                    feedback={ticket.satisfaction_feedback}
                    ratedAt={ticket.satisfaction_rated_at}
                  />
                </div>
              )}

              <div className="mb-4">
                <p className="text-[10px] uppercase text-slate-500 font-medium tracking-wide mb-2">Attachments</p>
                {attachments.length === 0 ? (
                  <p className="text-sm text-slate-400 mb-2">No attachments yet</p>
                ) : (
                  <ul className="space-y-2 mb-3">
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
                                  {formatTicketDate(att.created_at)}
                                </>
                              )}
                            </p>
                          </div>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-white border border-transparent hover:border-slate-200 shrink-0"
                            title="Open"
                            aria-label={`Open ${att.file_name}`}
                          >
                            <ExternalLink size={14} />
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {canUploadAttachment && (
                  <div>
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer">
                      <Plus size={14} />
                      Add attachment
                      <input
                        type="file"
                        accept={HELPDESK_ATTACHMENT_ACCEPT}
                        className="hidden"
                        disabled={attachmentUploadMutation.isPending}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          attachmentUploadMutation.mutate({ id: ticket.id, file });
                        }}
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">{HELPDESK_ATTACHMENT_HINT}</p>
                    {uploadError && (
                      <p className="text-xs text-red-600 mt-1">{uploadError}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <p className="text-[10px] uppercase text-slate-500 font-medium tracking-wide mb-3">Activity</p>
                <TicketActivityTimeline events={timelineEvents} />
              </div>

              <p className="text-[10px] uppercase text-slate-500 font-medium tracking-wide mb-2">Replies</p>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {(ticket.replies || []).map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      'rounded-lg px-3 py-2 text-xs',
                      r.is_internal ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{r.author?.first_name} {r.author?.last_name}</p>
                      {r.is_internal && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                          Internal
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 mt-1">{r.message}</p>
                  </div>
                ))}
              </div>
              {canPostInternalNote && (
                <label className="flex items-center gap-2 text-xs text-slate-600 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Internal Note
                  <span className="text-slate-400">(not visible to employees)</span>
                </label>
              )}
              {canPostInternalNote && (
                <div className="flex gap-2 mb-2">
                  <select
                    value={selectedSavedReplyId}
                    onChange={(e) => setSelectedSavedReplyId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">Insert saved reply...</option>
                    {savedReplies.filter((item) => item.is_active).map((item) => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={!selectedSavedReply}
                    onClick={() => {
                      if (!selectedSavedReply) return;
                      setReply((prev) => (prev.trim() ? `${prev}\n\n${selectedSavedReply.body}` : selectedSavedReply.body));
                    }}
                  >
                    Insert
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                <button
                  type="button"
                  disabled={!reply.trim() || replyMutation.isPending}
                  onClick={() =>
                    replyMutation.mutate({
                      id: ticket.id,
                      message: reply,
                      is_internal: canPostInternalNote && isInternalNote,
                    })
                  }
                  className="btn-primary"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <MainContentModal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setPendingAttachments([]);
          setKbSearchQuery('');
          setForm({ category_id: '', tag_ids: [], subject: '', description: '', priority: 'medium' });
        }}
      >
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 mx-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-slate-900">New Support Ticket</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Fields marked with <span className="text-red-500">*</span> are required.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Category <span className="text-red-500 ml-0.5">*</span>
                </label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                  disabled={activeCategories.length === 0}
                >
                  {activeCategories.length === 0 ? (
                    <option value="">No active categories</option>
                  ) : (
                    <>
                      <option value="">Select category</option>
                      {activeCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">
                  Subject <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Brief summary of the issue"
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                />
              </div>

              {(form.subject?.trim().length >= 3) && (
                <div className="rounded-lg border border-brand-100 bg-brand-50/40 p-3">
                  <p className="text-xs font-medium text-slate-700 mb-2">Suggested knowledge base articles</p>
                  {kbSuggestions.length === 0 ? (
                    <p className="text-xs text-slate-500">No matching articles found.</p>
                  ) : (
                    <ul className="space-y-2">
                      {kbSuggestions.map((article) => (
                        <li key={article.id} className="text-xs">
                          <p className="font-medium text-slate-800">{article.title}</p>
                          <p className="text-slate-600 line-clamp-2 whitespace-pre-wrap">{article.content}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-600">
                  Description <span className="text-red-500 ml-0.5">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe your issue in detail…"
                  rows={4}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {Object.keys(TICKET_PRIORITIES).map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Tags</label>
                <p className="text-[10px] text-slate-400 mt-0.5 mb-1">Optional. Hold Ctrl/Cmd to select multiple.</p>
                <select
                  multiple
                  value={(form.tag_ids || []).map((id) => String(id))}
                  onChange={(e) => {
                    const ids = Array.from(e.target.selectedOptions).map((opt) => parseInt(opt.value, 10));
                    setForm({ ...form, tag_ids: ids });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm min-h-[84px]"
                >
                  {allTags.length === 0 ? (
                    <option disabled value="">No tags available</option>
                  ) : (
                    allTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>{tag.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-700 mb-2">Search Knowledge Base before creating ticket</p>
                <input
                  type="search"
                  value={kbSearchQuery}
                  onChange={(e) => setKbSearchQuery(e.target.value)}
                  placeholder="Search FAQ articles..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                />
                {kbSearchQuery.trim().length >= 2 && (
                  <div className="mt-2 max-h-36 overflow-y-auto space-y-2">
                    {(kbArticles.filter((a) =>
                      a.title?.toLowerCase().includes(kbSearchQuery.toLowerCase())
                      || a.content?.toLowerCase().includes(kbSearchQuery.toLowerCase())
                    )).slice(0, 5).map((article) => (
                      <div key={article.id} className="text-xs p-2 bg-white rounded border border-slate-100">
                        <p className="font-medium text-slate-800">{article.title}</p>
                        <p className="text-slate-600 line-clamp-2 whitespace-pre-wrap">{article.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DocumentDropzone
                label="Attachments (optional)"
                accept={HELPDESK_ATTACHMENT_ACCEPT}
                file={null}
                onFile={(file) => setPendingAttachments((prev) => [...prev, file])}
                onClear={() => {}}
              />
              {pendingAttachments.length > 0 && (
                <ul className="space-y-2">
                  {pendingAttachments.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <FileText size={14} className="text-brand-600 shrink-0" />
                      <span className="text-xs text-slate-700 truncate flex-1">{file.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{formatFileSize(file.size)}</span>
                      <button
                        type="button"
                        onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== index))}
                        className="p-1 rounded-md hover:bg-slate-200 text-slate-400"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] text-slate-400">{HELPDESK_ATTACHMENT_HINT}</p>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setPendingAttachments([]);
                  setKbSearchQuery('');
                  setForm({ category_id: '', tag_ids: [], subject: '', description: '', priority: 'medium' });
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!form.subject?.trim() || !form.description?.trim() || !form.category_id || createMutation.isPending}
                onClick={() => createMutation.mutate({
                  form: {
                    ...form,
                    category_id: parseInt(form.category_id, 10),
                  },
                  files: pendingAttachments,
                })}
                className="btn-primary"
              >
                {createMutation.isPending ? 'Submitting…' : 'Submit Ticket'}
              </button>
            </div>
          </div>
      </MainContentModal>
    </div>
  );
}
