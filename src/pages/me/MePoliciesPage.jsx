import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Plus,
  ScrollText,
  Upload,
  X,
} from 'lucide-react';
import { hrApi, portalApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { useTablePagination } from '../../hooks/useTablePagination';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';
import {
  formatPolicyDate,
  formatPolicyVersion,
  policyAcknowledgementStatus,
  policyCategoryLabel,
  POLICY_ACK_STATUS_STYLES,
  POLICY_CATEGORIES,
} from '../../constants/policyDocuments';
import { cn } from '../../utils/helpers';

const EMPTY_UPLOAD_FORM = {
  title: '',
  category: 'other',
  description: '',
  requires_acknowledgement: false,
};

function PolicyModalShell({ onClose, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/40"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        className={cn('relative z-10 w-full', maxWidth)}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

function PolicyUploadModal({ onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_UPLOAD_FORM);
  const [file, setFile] = useState(null);
  const [formError, setFormError] = useState('');

  const uploadMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('category', form.category);
      if (form.description.trim()) formData.append('description', form.description.trim());
      formData.append('requires_acknowledgement', form.requires_acknowledgement ? 'true' : 'false');
      formData.append('file', file);
      return hrApi.createPolicyDocument(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-documents'] });
      queryClient.invalidateQueries({ queryKey: ['pending-policies'] });
      onSuccess();
    },
    onError: (err) => {
      const apiMessage = err.response?.data?.error?.message;
      setFormError(apiMessage || err.message || 'Failed to upload policy');
    },
  });

  const canSubmit = form.title.trim().length > 0 && file;

  return (
    <PolicyModalShell onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto">
        <form
          className="p-5"
          onSubmit={(e) => {
            e.preventDefault();
            setFormError('');
            if (!canSubmit) return;
            uploadMutation.mutate();
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Upload Policy Document</h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={200}
                required
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="e.g. Employee Code of Conduct"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                {Object.entries(POLICY_CATEGORIES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                maxLength={2000}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="Brief summary for employees (optional)"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Policy file *</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-1 w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
              <p className="text-[10px] text-slate-400 mt-1">PDF, DOC, or DOCX · max 15 MB</p>
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.requires_acknowledgement}
                onChange={(e) => setForm({ ...form, requires_acknowledgement: e.target.checked })}
                className="mt-0.5"
              />
              <span>
                Require employees to acknowledge this policy
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  Employees must mark the policy as read after reviewing it.
                </span>
              </span>
            </label>
          </div>

          {formError && <p className="text-xs text-red-600 mt-3">{formError}</p>}

          <div className="flex gap-2 mt-5 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || uploadMutation.isPending}
              className="btn-primary text-xs inline-flex items-center gap-1.5"
            >
              <Upload size={14} />
              {uploadMutation.isPending ? 'Uploading…' : 'Upload Policy'}
            </button>
          </div>
        </form>
      </div>
    </PolicyModalShell>
  );
}

function PolicyViewModal({ policy, onClose, onAcknowledged, isAdmin }) {
  const queryClient = useQueryClient();
  const [ackError, setAckError] = useState('');

  const ackMutation = useMutation({
    mutationFn: () => portalApi.acknowledgePolicy(policy.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-documents'] });
      queryClient.invalidateQueries({ queryKey: ['pending-policies'] });
      onAcknowledged?.();
      onClose();
    },
    onError: (err) => {
      setAckError(err.response?.data?.error?.message || 'Failed to acknowledge policy');
    },
  });

  const requiresAck = policy.acknowledgement_required || policy.requires_acknowledgement;
  const ackStatus = policyAcknowledgementStatus(policy);
  const headerBadge = isAdmin
    ? { key: requiresAck ? 'pending' : 'not_required', label: requiresAck ? 'Ack required' : 'No ack required' }
    : ackStatus;

  const handleDownload = () => {
    if (!policy.file_url) return;
    const link = document.createElement('a');
    link.href = policy.file_url;
    link.download = policy.file_name || 'policy-document';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PolicyModalShell onClose={onClose} maxWidth="max-w-2xl">
      <div className="bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-900">{policy.title}</h3>
              <span
                className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                  POLICY_ACK_STATUS_STYLES[headerBadge.key]
                )}
              >
                {headerBadge.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{policyCategoryLabel(policy.category)}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-slate-400 uppercase text-[10px]">Effective Date</p>
              <p className="text-slate-700 mt-0.5">{formatPolicyDate(policy.created_at)}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase text-[10px]">Version</p>
              <p className="text-slate-700 mt-0.5">{formatPolicyVersion(policy)}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase text-[10px]">Attachment</p>
              <p className="text-slate-700 mt-0.5 truncate" title={policy.file_name}>
                {policy.file_name || '—'}
              </p>
            </div>
          </div>

          {policy.description && (
            <div>
              <p className="text-slate-400 uppercase text-[10px] mb-1">Description</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{policy.description}</p>
            </div>
          )}

          {policy.is_acknowledged && policy.acknowledged_at && !isAdmin && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
              <CheckCircle2 size={14} />
              Acknowledged on {formatPolicyDate(policy.acknowledged_at)}
              {policy.acknowledged_at.includes('T') && (
                <span className="text-emerald-600">
                  at {format(parseISO(policy.acknowledged_at), 'h:mm a')}
                </span>
              )}
            </div>
          )}

          {requiresAck && !policy.is_acknowledged && !isAdmin && (
            <div className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
              Please read this policy and acknowledge that you have understood it.
            </div>
          )}

          {ackError && <p className="text-xs text-red-600">{ackError}</p>}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap items-center gap-2 justify-end">
          {policy.file_url && (
            <>
              <a
                href={policy.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                <Eye size={14} /> Open
              </a>
              <button
                type="button"
                onClick={handleDownload}
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                <Download size={14} /> Download
              </button>
            </>
          )}
          {requiresAck && !policy.is_acknowledged && !isAdmin && (
            <button
              type="button"
              onClick={() => {
                setAckError('');
                ackMutation.mutate();
              }}
              disabled={ackMutation.isPending}
              className="btn-primary text-xs inline-flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              {ackMutation.isPending ? 'Saving…' : 'Mark as Read'}
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-secondary text-xs">
            Close
          </button>
        </div>
      </div>
    </PolicyModalShell>
  );
}

export default function MePoliciesPage() {
  const location = useLocation();
  const isHrAdminView = location.pathname.startsWith('/people/policy-documents');
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const isAdmin = ['super_admin', 'owner', 'hr'].includes(role);
  const tenantRequired = role === 'super_admin' && !selectedTenantId;
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewPolicy, setViewPolicy] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [categoryFilter] });

  const openUploadModal = () => {
    if (tenantRequired) return;
    setShowUpload(true);
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['policy-documents', categoryFilter, selectedTenantId],
    queryFn: () => portalApi.listPolicyDocuments(categoryFilter ? { category: categoryFilter } : {}),
    enabled: !tenantRequired,
  });

  const policies = useMemo(() => {
    const list = data?.data?.policies || [];
    return [...list].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }, [data]);

  const pendingCount = isAdmin
    ? 0
    : policies.filter((p) => {
        const requiresAck = p.acknowledgement_required || p.requires_acknowledgement;
        return requiresAck && !p.is_acknowledged;
      }).length;
  const { items: visiblePolicies, pagination } = paginateClient(policies);

  const pageSubtitle = isHrAdminView
    ? 'Upload and manage company policy documents for employees'
    : isAdmin
      ? 'View company policies or upload new documents for employees'
      : 'Official policy documents and acknowledgements';

  return (
    <div className="space-y-6">
      <PageHeader
        badge={isHrAdminView ? 'People · Policies' : 'My Work · Policies'}
        title={isHrAdminView ? 'Policy Documents' : 'Company Policies'}
        subtitle={pageSubtitle}
        actions={
          isAdmin ? (
            <button
              type="button"
              onClick={openUploadModal}
              disabled={tenantRequired}
              title={tenantRequired ? 'Select a tenant from the header first' : undefined}
              className="btn-primary text-xs inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} /> Upload Policy
            </button>
          ) : null
        }
      />

      {tenantRequired ? (
        <div className="card p-12 text-center text-slate-500">
          Select a tenant from the header to view company policies.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="ds-select text-xs"
            >
              <option value="">All categories</option>
              {Object.entries(POLICY_CATEGORIES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {pendingCount > 0 && (
              <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
                {pendingCount} pending acknowledgement{pendingCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="card overflow-x-auto">
            {isLoading ? (
              <p className="p-12 text-center text-slate-400">Loading policies…</p>
            ) : isError ? (
              <div className="p-12 text-center">
                <p className="text-red-500 text-sm">
                  {error?.response?.data?.error?.message || 'Failed to load policies'}
                </p>
                <button type="button" onClick={() => refetch()} className="btn-secondary text-xs mt-3">
                  Retry
                </button>
              </div>
            ) : policies.length === 0 ? (
              <div className="p-12 text-center">
                <ScrollText size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No company policies published yet</p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={openUploadModal}
                    disabled={tenantRequired}
                    className="btn-primary text-xs mt-4 inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} /> Upload your first policy
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Version</th>
                    <th className="px-4 py-3 font-medium">Effective Date</th>
                    <th className="px-4 py-3 font-medium">
                      {isAdmin ? 'Ack Required' : 'Acknowledgement'}
                    </th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visiblePolicies.map((policy) => {
                    const ackStatus = policyAcknowledgementStatus(policy);
                    const requiresAck = policy.acknowledgement_required || policy.requires_acknowledgement;
                    return (
                      <tr key={policy.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{policy.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {policyCategoryLabel(policy.category)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatPolicyVersion(policy)}</td>
                        <td className="px-4 py-3 text-slate-600">{formatPolicyDate(policy.created_at)}</td>
                        <td className="px-4 py-3">
                          {isAdmin ? (
                            <span
                              className={cn(
                                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                requiresAck ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                              )}
                            >
                              {requiresAck ? 'Yes' : 'No'}
                            </span>
                          ) : (
                            <>
                              <span
                                className={cn(
                                  'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                  POLICY_ACK_STATUS_STYLES[ackStatus.key]
                                )}
                              >
                                {ackStatus.label}
                              </span>
                              {policy.is_acknowledged && policy.acknowledged_at && (
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {formatPolicyDate(policy.acknowledged_at)}
                                </p>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setViewPolicy(policy)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                              title="View policy"
                            >
                              <Eye size={15} />
                            </button>
                            {policy.file_url && (
                              <a
                                href={policy.file_url}
                                download={policy.file_name || undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                                title="Download attachment"
                              >
                                <Download size={15} />
                              </a>
                            )}
                            {!isAdmin &&
                              requiresAck &&
                              !policy.is_acknowledged && (
                                <button
                                  type="button"
                                  onClick={() => setViewPolicy(policy)}
                                  className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50"
                                  title="Mark as read"
                                >
                                  <FileText size={15} />
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <TablePagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}

      {viewPolicy && (
        <PolicyViewModal
          policy={viewPolicy}
          isAdmin={isAdmin}
          onClose={() => setViewPolicy(null)}
          onAcknowledged={() => setViewPolicy(null)}
        />
      )}

      {showUpload && (
        <PolicyUploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
