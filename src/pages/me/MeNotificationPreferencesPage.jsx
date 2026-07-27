import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Bell } from 'lucide-react';
import { portalApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import { cn } from '../../utils/helpers';

const CATEGORY_LABELS = {
  leave: 'Leave',
  attendance: 'Attendance',
  ticket: 'Helpdesk Tickets',
  task: 'Tasks & Projects',
  announcement: 'Announcements',
  document: 'Documents & Policies',
  payroll: 'Payroll & Payslips',
};

export default function MeNotificationPreferencesPage() {
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState([]);
  const [saved, setSaved] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: portalApi.getNotificationPreferences,
  });

  useEffect(() => {
    if (data?.data?.preferences?.length) {
      setPrefs(data.data.preferences);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (payload) => portalApi.updateNotificationPreferences(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400">Loading preferences…</div>;
  }

  if (error) {
    return <div className="p-12 text-center text-red-500">Failed to load notification preferences</div>;
  }

  const displayPrefs = prefs.length ? prefs : data?.data?.preferences || [];

  const toggle = (category, field) => {
    setPrefs((current) => {
      const base = current.length ? current : data?.data?.preferences || [];
      return base.map((p) =>
        p.category === category ? { ...p, [field]: !p[field] } : p
      );
    });
  };

  const handleSave = () => {
    const toSave = prefs.length ? prefs : data?.data?.preferences || [];
    updateMutation.mutate({
      preferences: toSave.map(({ category, email_enabled, in_app_enabled }) => ({
        category,
        email_enabled,
        in_app_enabled,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="My Work · Notifications"
        title="Notification Settings"
        subtitle="Choose how you receive updates for each category"
        actions={
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="btn-primary text-xs inline-flex items-center gap-2"
          >
            <Save size={14} />
            {updateMutation.isPending ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        }
      />

      <div className="card overflow-x-auto overscroll-x-contain">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <Bell size={16} className="text-slate-400" />
          <p className="text-sm text-slate-600">Toggle email and in-app notifications per category.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3 text-center">Email</th>
                <th className="px-5 py-3 text-center">In-app</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayPrefs.map((p) => (
                <tr key={p.category}>
                  <td className="px-5 py-4 font-medium text-slate-800">
                    {CATEGORY_LABELS[p.category] || p.category}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.email_enabled}
                      onClick={() => toggle(p.category, 'email_enabled')}
                      className={cn(
                        'relative inline-flex h-5 w-9 rounded-full transition-colors',
                        p.email_enabled ? 'bg-brand-600' : 'bg-slate-200'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5',
                          p.email_enabled ? 'translate-x-4' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.in_app_enabled}
                      onClick={() => toggle(p.category, 'in_app_enabled')}
                      className={cn(
                        'relative inline-flex h-5 w-9 rounded-full transition-colors',
                        p.in_app_enabled ? 'bg-brand-600' : 'bg-slate-200'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5',
                          p.in_app_enabled ? 'translate-x-4' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
