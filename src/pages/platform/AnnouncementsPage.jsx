import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Plus, Pin } from 'lucide-react';
import { platformApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import { ANNOUNCEMENT_PRIORITIES, ANNOUNCEMENT_STATUSES } from '../../constants/platform';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { format, parseISO } from 'date-fns';

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const isSelfService = location.pathname.startsWith('/me/');
  const { user } = useAuthStore();
  const isAdmin = !isSelfService && ['super_admin', 'owner', 'hr'].includes(user?.role);
  const [showForm, setShowForm] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', priority: 'normal', target_audience: 'all', is_pinned: false });

  const { data, isLoading } = useQuery({
    queryKey: ['announcements', showDrafts],
    queryFn: () => platformApi.listAnnouncements(isAdmin && showDrafts ? { published_only: 'false' } : {}),
  });

  const createMutation = useMutation({
    mutationFn: platformApi.createAnnouncement,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements'] }); setShowForm(false); },
  });
  const publishMutation = useMutation({
    mutationFn: platformApi.publishAnnouncement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });

  const announcements = data?.data?.announcements || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={isSelfService ? 'Company Announcements' : 'Announcements'}
        subtitle={isSelfService ? 'Updates and notices from your organization' : 'Company-wide updates and notices'}
        actions={
          isAdmin && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowDrafts(!showDrafts)} className="btn-secondary">{showDrafts ? 'Published' : 'Drafts'}</button>
              <button type="button" onClick={() => setShowForm(true)} className="btn-primary"><Plus size={14} /> New</button>
            </div>
          )
        }
      />

      <div className="space-y-3">
        {isLoading ? <p className="text-center py-12 text-slate-400">Loading…</p> : announcements.length === 0 ? (
          <p className="text-center py-12 text-slate-400">No announcements</p>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className={cn('card p-5', a.is_pinned && 'border-brand-200 bg-brand-50/30')}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
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
                  </p>
                </div>
                {isAdmin && a.status === 'draft' && (
                  <button type="button" onClick={() => publishMutation.mutate(a.id)} className="btn-primary text-xs shrink-0">Publish</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6">
            <h3 className="font-semibold mb-4">New Announcement</h3>
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Message" rows={5} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  {Object.keys(ANNOUNCEMENT_PRIORITIES).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="all">All employees</option>
                  <option value="managers">Managers only</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} /> Pin to top</label>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="button" disabled={!form.title || !form.body} onClick={() => createMutation.mutate(form)} className="btn-primary">Save Draft</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
