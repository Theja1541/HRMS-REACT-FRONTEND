import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, EyeOff, Mail, RefreshCw, Save, Send } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { smtpApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import TablePagination from '../../components/shared/TablePagination';
import {
  SMTP_PROVIDERS,
  ENCRYPTION_TYPES,
  emptySmtpForm,
  settingsToForm,
  statusLabel,
} from '../../constants/smtp';
import { cn } from '../../utils/helpers';
import { useTablePagination } from '../../hooks/useTablePagination';

function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600';

export default function SmtpSettingsTab() {
  const queryClient = useQueryClient();
  const { user, selectedTenantId } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const [scope, setScope] = useState(isSuperAdmin && !selectedTenantId ? 'global' : 'company');
  const [form, setForm] = useState(emptySmtpForm());
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState(null);
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [scope, selectedTenantId] });

  const scopeParams = isSuperAdmin
    ? scope === 'global'
      ? { scope: 'global' }
      : { scope: 'company' }
    : {};

  const { data, isLoading } = useQuery({
    queryKey: ['smtp-settings', scope, selectedTenantId],
    queryFn: () => smtpApi.getSettings(scopeParams),
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['smtp-logs', scope, selectedTenantId],
    queryFn: () => smtpApi.listLogs({ ...scopeParams, limit: 10 }),
  });

  const settings = data?.data?.settings;
  const passwordConfigured = settings?.passwordConfigured;

  useEffect(() => {
    setForm(settingsToForm(settings));
  }, [settings]);

  useEffect(() => {
    if (isSuperAdmin) {
      setScope(selectedTenantId ? 'company' : 'global');
    }
  }, [isSuperAdmin, selectedTenantId]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => smtpApi.saveSettings(payload, scopeParams),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['smtp-settings'] });
      const base = res?.message || 'SMTP settings saved';
      const globalNote =
        isSuperAdmin && scope === 'company'
          ? ' Company SMTP is also copied to Global SMTP when Global is not configured yet.'
          : '';
      showToast('success', `${base}${globalNote}`);
    },
    onError: (err) => {
      const msg =
        err?.code === 'ERR_NETWORK' || err?.message?.includes('Network')
          ? 'Could not reach the API server. Ensure the backend is running on port 4000.'
          : err?.response?.data?.error?.message || 'Failed to save settings';
      showToast('error', msg);
    },
  });

  const testMutation = useMutation({
    mutationFn: (payload) => smtpApi.testSettings(payload, scopeParams),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['smtp-settings'] });
      queryClient.invalidateQueries({ queryKey: ['smtp-logs'] });
      showToast(res?.success ? 'success' : 'error', res?.message || 'Test completed');
    },
    onError: (err) => {
      const msg =
        err?.code === 'ERR_NETWORK' || err?.message?.includes('Network')
          ? 'Could not reach the API server. Ensure the backend is running on port 4000.'
          : err?.response?.data?.error?.message || err?.response?.data?.message || 'SMTP test failed';
      showToast('error', msg);
    },
  });

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const authEnabled = form.smtp_auth_enabled !== false;

  const handleProviderChange = (provider) => {
    const preset = SMTP_PROVIDERS[provider];
    setForm((f) => ({
      ...f,
      provider,
      smtp_host: preset?.smtp_host ?? f.smtp_host,
      smtp_port: String(preset?.smtp_port ?? f.smtp_port),
      encryption_type: preset?.encryption_type ?? f.encryption_type,
    }));
  };

  const buildPayload = () => ({
    provider: form.provider,
    sender_name: form.sender_name.trim(),
    from_email: form.from_email.trim(),
    reply_to_email: form.reply_to_email.trim() || null,
    smtp_host: form.smtp_host.trim(),
    smtp_port: parseInt(form.smtp_port, 10),
    encryption_type: form.encryption_type,
    smtp_auth_enabled: authEnabled,
    smtp_username: form.smtp_username.trim(),
    ...(form.smtp_password ? { smtp_password: form.smtp_password.replace(/\s+/g, '') } : {}),
  });

  const buildTestPayload = () => ({
    ...buildPayload(),
    test_recipient: form.test_recipient.trim(),
  });

  const status = statusLabel(settings?.last_test_status);
  const logs = logsData?.data?.logs || [];
  const { items: visibleLogs, pagination } = paginateClient(logs);

  if (isSuperAdmin && scope === 'company' && !selectedTenantId) {
    return (
      <div className="card p-8 text-center text-sm text-slate-500">
        Select a tenant from Tenants page to configure company SMTP, or switch to Global SMTP.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className={cn(
          'px-4 py-3 rounded-lg text-sm border',
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-red-50 text-red-800 border-red-100'
        )}>
          {toast.message}
        </div>
      )}

      {isSuperAdmin && (
        <div className="flex gap-2">
          {['global', 'company'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border',
                scope === s ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'
              )}
            >
              {s === 'global' ? 'Global SMTP' : 'Company SMTP'}
            </button>
          ))}
        </div>
      )}

      {isSuperAdmin && scope === 'company' && selectedTenantId && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Company SMTP is used for employee welcome emails and notifications for the selected tenant.
          If Global SMTP is not configured yet, saving here also copies these settings to Global SMTP
          (used when creating new organizations).
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-brand-600" />
            <h3 className="text-sm font-semibold text-slate-900">SMTP Status</h3>
          </div>
          {isLoading ? (
            <div className="h-20 bg-slate-100 animate-pulse rounded-lg" />
          ) : (
            <>
              <div className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-semibold', status.color)}>
                {status.label}
              </div>
              <div className="text-xs text-slate-500 space-y-2 pt-2 border-t border-slate-100">
                <p>
                  <span className="text-slate-400">Last Tested:</span><br />
                  {settings?.last_tested_at
                    ? format(parseISO(settings.last_tested_at), 'dd MMM yyyy, HH:mm')
                    : '—'}
                </p>
                <p>
                  <span className="text-slate-400">Last Result:</span><br />
                  {settings?.last_test_message || '—'}
                </p>
                <p>
                  <span className="text-slate-400">Password:</span><br />
                  {passwordConfigured ? 'Password Configured' : 'Not configured'}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />)}
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(buildPayload());
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="SMTP Provider" required>
                  <select
                    value={form.provider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className={inputCls}
                  >
                    {Object.entries(SMTP_PROVIDERS).map(([key, p]) => (
                      <option key={key} value={key}>{p.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Sender Name" required>
                  <input required value={form.sender_name} onChange={(e) => set('sender_name', e.target.value)} className={inputCls} />
                </Field>
                <Field label="From Email" required>
                  <input
                    required
                    type="email"
                    value={form.from_email}
                    onChange={(e) => {
                      const email = e.target.value;
                      setForm((f) => ({
                        ...f,
                        from_email: email,
                        smtp_username:
                          f.provider === 'gmail' || !f.smtp_username || f.smtp_username === f.from_email
                            ? email
                            : f.smtp_username,
                      }));
                    }}
                    className={inputCls}
                  />
                </Field>
                <Field label="Reply-To Email">
                  <input type="email" value={form.reply_to_email} onChange={(e) => set('reply_to_email', e.target.value)} className={inputCls} />
                </Field>
                <Field label="SMTP Host" required>
                  <input required value={form.smtp_host} onChange={(e) => set('smtp_host', e.target.value)} className={inputCls} disabled={form.provider !== 'custom'} />
                </Field>
                <Field label="SMTP Port" required>
                  <input required type="number" value={form.smtp_port} onChange={(e) => set('smtp_port', e.target.value)} className={inputCls} disabled={form.provider !== 'custom'} />
                </Field>
                <Field label="Encryption Type" required>
                  <select value={form.encryption_type} onChange={(e) => set('encryption_type', e.target.value)} className={inputCls}>
                    {ENCRYPTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="SMTP Authentication">
                  <button
                    type="button"
                    onClick={() => set('smtp_auth_enabled', !authEnabled)}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium",
                      authEnabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"
                    )}
                  >
                    {authEnabled ? <CheckCircle2 size={16} /> : <Mail size={16} />}
                    {authEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Turn this off for SMTP relays that do not require username/password.
                  </p>
                </Field>
                <Field label="SMTP Username" required={authEnabled} hint={authEnabled ? 'For Gmail, use your full email address (not display name)' : 'Not required when authentication is disabled.'}>
                  <input
                    required={authEnabled}
                    type="email"
                    value={form.smtp_username}
                    onChange={(e) => set('smtp_username', e.target.value)}
                    placeholder="you@gmail.com"
                    disabled={!authEnabled}
                    className={inputCls}
                  />
                </Field>
                <Field
                  label="SMTP Password"
                  required={authEnabled && !passwordConfigured}
                  hint={!authEnabled ? 'Not required when authentication is disabled.' : passwordConfigured ? 'Leave blank to keep existing password. Gmail: use App Password (16 chars, no spaces).' : 'Gmail: generate an App Password at myaccount.google.com → Security → App passwords'}
                >
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.smtp_password}
                      onChange={(e) => set('smtp_password', e.target.value)}
                      placeholder={passwordConfigured ? 'Password Configured' : 'Enter SMTP password'}
                      disabled={!authEnabled}
                      className={cn(inputCls, 'pr-10')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>
                <Field label="Test Recipient Email" className="md:col-span-2" hint="Only required when clicking Test Connection">
                  <input
                    type="email"
                    value={form.test_recipient}
                    onChange={(e) => set('test_recipient', e.target.value)}
                    placeholder="email@example.com"
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={testMutation.isPending || !form.test_recipient?.trim()}
                  onClick={() => {
                    if (!form.test_recipient?.trim()) {
                      showToast('error', 'Enter a test recipient email');
                      return;
                    }
                    testMutation.mutate(buildTestPayload());
                  }}
                  className="btn-secondary"
                >
                  {testMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  Test Connection
                </button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                  {saveMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Settings
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Recent Email Logs</h3>
        </div>
        {logsLoading ? (
          <p className="p-8 text-center text-slate-400 text-sm">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">No email logs yet</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-slate-500">Recipient</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-500">Subject</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-500">Status</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-500">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">{log.recipient_email}</td>
                  <td className="px-4 py-2 text-slate-600 truncate max-w-[200px]">{log.subject}</td>
                  <td className="px-4 py-2">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full font-semibold',
                      log.status === 'SENT' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    )}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                    {log.sent_at ? format(parseISO(log.sent_at), 'dd MMM yyyy HH:mm') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!logsLoading && logs.length > 0 && (
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
    </div>
  );
}

