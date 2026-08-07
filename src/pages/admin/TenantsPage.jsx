import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Check, Pencil, CheckCircle2, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tenantApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import StatusBadge from '../../components/shared/StatusBadge';
import { useAuthStore } from '../../store/auth.store';
import { getInitials, resolveAssetUrl } from '../../utils/helpers';
import CreateTenantModal from './CreateTenantModal';

function TenantSuccessModal({ open, companyName, mode = 'created', tempPassword, credentialsSent, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;

  const isCreated = mode === 'created';
  const title = isCreated ? 'Tenant Created' : 'Tenant Updated';
  const message = isCreated ? 'was successfully created.' : 'was successfully updated.';

  return (
    <div className="modal-backdrop z-[60]">
      <div className="modal-panel sm:max-w-md">
        <div className="modal-panel-body text-center py-8 px-6">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm text-slate-600">
            <span className="font-medium text-slate-800">{companyName}</span> {message}
          </p>
          {isCreated && credentialsSent && (
            <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              Admin login credentials were emailed to the tenant administrator.
            </p>
          )}
          {tempPassword && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Admin credentials could not be emailed. Temporary password:{' '}
              <span className="font-mono font-semibold">{tempPassword}</span>
            </p>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-center shrink-0">
          <button type="button" onClick={onClose} className="btn-primary min-w-[120px]">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TenantsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedTenantId, setSelectedTenantId } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState(null);
  const [formError, setFormError] = useState('');
  const [actionSuccess, setActionSuccess] = useState(null);
  const [resendTenantId, setResendTenantId] = useState(null);

  const modalOpen = showForm || Boolean(editingTenantId);

  const { data, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantApi.list({ limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: tenantApi.create,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-company-slug'] });
      const companyName = res?.data?.tenant?.name || 'Tenant';
      const tempPass = res?.data?.temporary_password;
      const credentialsSent = res?.data?.credentials_sent;
      setShowForm(false);
      setFormError('');
      setActionSuccess({ companyName, mode: 'created', tempPassword: tempPass || null, credentialsSent });
    },
    onError: (err) => {
      setFormError(err?.response?.data?.error?.message || 'Failed to create tenant');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => tenantApi.update(id, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-edit'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-company-slug'] });
      const companyName = res?.data?.tenant?.name || 'Tenant';
      setEditingTenantId(null);
      setShowForm(false);
      setFormError('');
      setActionSuccess({ companyName, mode: 'updated' });
    },
    onError: (err) => {
      setFormError(err?.response?.data?.error?.message || 'Failed to update tenant');
    },
  });

  const resendMutation = useMutation({
    mutationFn: tenantApi.resendAdminCredentials,
    onSuccess: (res, tenantId) => {
      const tempPass = res?.data?.temporary_password;
      const tenant = tenants.find((t) => t.id === tenantId);
      setResendTenantId(null);
      setActionSuccess({
        companyName: tenant?.name || 'Tenant',
        mode: 'created',
        tempPassword: tempPass || null,
        credentialsSent: res?.data?.credentials_sent,
      });
    },
    onError: (err) => {
      setResendTenantId(null);
      setFormError(err?.response?.data?.error?.message || 'Failed to resend credentials');
    },
  });

  const tenants = data?.data?.tenants || [];

  const openForm = () => {
    setEditingTenantId(null);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (tenantId) => {
    setShowForm(false);
    setFormError('');
    setEditingTenantId(tenantId);
  };

  const closeModal = () => {
    setShowForm(false);
    setEditingTenantId(null);
    setFormError('');
  };

  const handleSubmit = (payload) => {
    if (editingTenantId) {
      updateMutation.mutate({ id: editingTenantId, payload });
      return;
    }
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Admin · Tenants"
        title="Tenants / Organizations"
        subtitle="Manage all tenants"
        actions={
          <button type="button" onClick={openForm} className="btn-primary">
            <Plus size={14} /> Add Tenant
          </button>
        }
      />

      {isLoading ? (
        <div className="stat-grid-3">
          {[1, 2, 3].map((i) => <div key={i} className="card h-40 animate-pulse bg-slate-100" />)}
        </div>
      ) : tenants.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400 text-sm">No tenants yet</p>
          <button type="button" onClick={openForm} className="btn-primary mt-4">
            <Plus size={14} /> Add Tenant
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setSelectedTenantId(null);
              navigate('/dashboard');
            }}
            className={`w-full card p-4 text-left hover:shadow-md transition-all border-2 ${
              !selectedTenantId ? 'border-brand-600 bg-brand-50' : 'border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                All
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900">All Organizations</h3>
                <p className="text-xs text-slate-500">Platform dashboard — tenants, employees & role stats</p>
              </div>
              {!selectedTenantId && (
                <span className="text-xs font-medium text-brand-600 flex items-center gap-1 shrink-0">
                  <Check size={12} /> Active
                </span>
              )}
            </div>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tenants.map((tenant) => {
            const logoSrc = resolveAssetUrl(tenant.logo_url);
            return (
              <div key={tenant.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt={`${tenant.name} logo`}
                      className="w-10 h-10 rounded-xl object-contain border border-slate-200 bg-white shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                      {getInitials(tenant.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{tenant.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">{tenant.slug}.hrms.app</p>
                    {tenant.company_code && (
                      <p className="text-[10px] text-slate-400 mt-0.5">Code: {tenant.company_code}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <StatusBadge status={tenant.status} />
                      {tenant.subscriptionPlan && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700">
                          {tenant.subscriptionPlan.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{tenant.employee_count} employees</span>
                  <span>{tenant.city || '—'}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(tenant.id)}
                    className="flex-1 btn-secondary justify-center text-xs"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    title="Resend admin credentials"
                    disabled={resendMutation.isPending && resendTenantId === tenant.id}
                    onClick={() => {
                      setResendTenantId(tenant.id);
                      resendMutation.mutate(tenant.id);
                    }}
                    className="btn-secondary justify-center text-xs px-3"
                  >
                    <Mail size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTenantId(tenant.id);
                      navigate('/dashboard');
                    }}
                    className={`flex-1 btn-secondary justify-center text-xs ${
                      selectedTenantId === tenant.id ? 'border-brand-600 text-brand-600 bg-brand-50' : ''
                    }`}
                  >
                    {selectedTenantId === tenant.id ? (
                      <><Check size={12} /> Active</>
                    ) : (
                      <><Building2 size={12} /> Select</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      <CreateTenantModal
        open={modalOpen}
        tenantId={editingTenantId}
        saving={createMutation.isPending || updateMutation.isPending}
        error={formError}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <TenantSuccessModal
        open={Boolean(actionSuccess)}
        companyName={actionSuccess?.companyName || ''}
        mode={actionSuccess?.mode || 'created'}
        tempPassword={actionSuccess?.tempPassword}
        credentialsSent={actionSuccess?.credentialsSent}
        onClose={() => setActionSuccess(null)}
      />
    </div>
  );
}
