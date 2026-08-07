import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Plus, Pin, Pencil, Archive, Check } from 'lucide-react';
import { platformApi, departmentApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import { ANNOUNCEMENT_PRIORITIES, ANNOUNCEMENT_STATUSES } from '../../constants/platform';
import { cn } from '../../utils/helpers';
import { usePortalRole } from '../../hooks/usePortalRole';
import { format, parseISO } from 'date-fns';

const EMPTY_FORM = {
  title: '',
  body: '',
  priority: 'normal',
  target_audience: 'all',
  department_id: '',
  is_pinned: false,
  expires_at: '',
};

const ADMIN_ROLES = ['super_admin', 'owner', 'hr', 'admin'];

function toForm(a) {
  return {
    title: a.title || '',
    body: a.body || '',
    priority: a.priority || 'normal',
    target_audience: a.target_audience || 'all',
    department_id: a.department_id || '',
    is_pinned: !!a.is_pinned,
    expires_at: a.expires_at ? String(a.expires_at).slice(0, 10) : '',
  };
}

function toPayload(form) {
  return {
    title: form.title,
    body: form.body,
    priority: form.priority,
    target_audience: form.target_audience,
    department_id: form.target_audience === 'department' && form.department_id ? Number(form.department_id) : null,
    is_pinned: form.is_pinned,
    expires_at: form.expires_at || null,
  };
}

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const isSelfService = location.pathname.startsWith('/me/');
  const role = usePortalRole();
  const isAdmin = !isSelfService && ADMIN_ROLES.includes(role);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showDrafts, setShowDrafts] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const listParams = isAdmin && showDrafts
    ? { published_only: 'false', status: 'draft' }
    : {};

  const { data, isLoading } = useQuery({
    queryKey: ['announcements', showDrafts, isAdmin],
    queryFn: () => platformApi.listAnnouncements(listParams),
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments', 'active'],
    queryFn: () => departmentApi.list({ status: 'active' }),
    enabled: isAdmin,
  });
  const departments = deptData?.data?.departments || deptData?.data || [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['announcements'] });

  const createMutation = useMutation({
    mutationFn: (payload) => platformApi.createAnnouncement(payload),
    onSuccess: () => { invalidate(); closeForm(); },
    onError: (err) => setFormError(err?.response?.data?.message || 'Failed to save'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => platformApi.updateAnnouncement(id, payload),
    onSuccess: () => { invalidate(); closeForm(); },
    onError: (err) => setFormError(err?.response?.data?.message || 'Failed to update'),
  });
  const publishMutation = useMutation({
    mutationFn: platformApi.publishAnnouncement,
    onSuccess: invalidate,
  });
  const archiveMutation = useMutation({
    mutationFn: platformApi.archiveAnnouncement,
    onSuccess: invalidate,
  });
  const ackMutation = useMutation({
    mutationFn: platformApi.acknowledgeAnnouncement,
    onSuccess: invalidate,
  });

  const announcements = data?.data?.announcements || [];

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(a) {
    setEditingId(a.id);
    setForm(toForm(a));
    setFormError('');
    setShowForm(true);
  }

  function submitForm() {
    setFormError('');
    if (form.target_audience === 'department' && !form.department_id) {
      setFormError('Select a department');
      return;
    }
    const payload = toPayload(form);
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        badge={isSelfService ? 'My Work · Announcements' : 'Platform · Announcements'}
        title={isSelfService ? 'Company Announcements' : 'Announcements'}
        subtitle={isSelfService ? 'Updates and notices from your organization' : 'Company-wide updates and notices'}
        actions={
          isAdmin && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowDrafts(!showDrafts)} className="btn-secondary">
                {showDrafts ? 'Published' : 'Drafts'}
              </button>
              <button type="button" onClick={openCreate} className="btn-primary"><Plus size={14} /> New</button>
            </div>
          )
        }
      />

      <div className="space-y-3">
        {isLoading ? <p className="text-center py-12 text-slate-400">Loading…</p> : announcements.length === 0 ? (
          <p className="text-center py-12 text-slate-400">No announcements</p>
        ) : (
          announcements.map((a) => {
            const acked = a.acknowledgements?.length > 0;
            return (
              <div key={a.id} className={cn('card p-5', a.is_pinned && 'border-brand-200 bg-brand-50/30')}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {a.is_pinned && <Pin size={14} className="text-brand-600" />}
                      <h3 className="font-semibold text-slate-900">{a.title}</h3>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full capitalize', ANNOUNCEMENT_PRIORITIES[a.priority])}>{a.priority}</span>
                      {isAdmin && showDrafts && (
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full capitalize', ANNOUNCEMENT_STATUSES[a.status])}>{a.status}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{a.body}</p>
                    <p className="text-xs text-slate-400 mt-3">
                      {a.publisher ? `${a.publisher.first_name} ${a.publisher.last_name} · ` : ''}
                      {a.publish_at ? format(parseISO(a.publish_at), 'dd MMM yyyy') : 'Draft'}
                      {a.target_audience !== 'all' && ` · ${a.target_audience}`}
                      {a.department?.name && ` · ${a.department.name}`}
                      {a.expires_at && ` · expires ${format(parseISO(a.expires_at), 'dd MMM yyyy')}`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {isAdmin && a.status === 'draft' && (
                      <>
                        <button type="button" onClick={() => openEdit(a)} className="btn-secondary text-xs"><Pencil size={12} /> Edit</button>
                        <button type="button" onClick={() => publishMutation.mutate(a.id)} className="btn-primary text-xs">Publish</button>
                      </>
                    )}
                    {isAdmin && a.status === 'published' && (
                      <>
                        <button type="button" onClick={() => openEdit(a)} className="btn-secondary text-xs"><Pencil size={12} /> Edit</button>
                        <button type="button" onClick={() => archiveMutation.mutate(a.id)} className="btn-secondary text-xs"><Archive size={12} /> Archive</button>
                      </>
                    )}
                    {!isAdmin && a.status === 'published' && !acked && (
                      <button type="button" onClick={() => ackMutation.mutate(a.id)} className="btn-secondary text-xs"><Check size={12} /> Acknowledge</button>
                    )}
                    {!isAdmin && acked && (
                      <span className="text-xs text-emerald-600 self-center">Acknowledged</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6">
            <h3 className="font-semibold mb-4">{editingId ? 'Edit Announcement' : 'New Announcement'}</h3>
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Message" rows={5} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  {Object.keys(ANNOUNCEMENT_PRIORITIES).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value, department_id: e.target.value === 'department' ? form.department_id : '' })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="all">All employees</option>
                  <option value="managers">Managers only</option>
                  <option value="department">Department</option>
                </select>
              </div>
              {form.target_audience === 'department' && (
                <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="">Select department</option>
                  {(Array.isArray(departments) ? departments : []).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
              <div className="grid grid-cols-2 gap-3 items-center">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} /> Pin to top</label>
                <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" title="Expires at" />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
              <button type="button" disabled={!form.title || !form.body || saving} onClick={submitForm} className="btn-primary">
                {editingId ? 'Save Changes' : 'Save Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
