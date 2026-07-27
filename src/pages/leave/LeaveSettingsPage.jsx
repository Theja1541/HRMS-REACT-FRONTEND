import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Palmtree, RefreshCw, ArrowLeft } from 'lucide-react';
import { leaveSettingsApi, departmentApi, designationApi, employeeApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';
import { cn } from '../../utils/helpers';
import LeaveTypesList from '../../modules/LeaveManagement/LeaveSettings/LeaveTypesList';
import LeaveTypeForm from '../../modules/LeaveManagement/LeaveSettings/LeaveTypeForm';
import LeavePolicyList from '../../modules/LeaveManagement/LeaveSettings/LeavePolicyList';
import LeavePolicyForm from '../../modules/LeaveManagement/LeaveSettings/LeavePolicyForm';
import LeavePolicyAssignment from '../../modules/LeaveManagement/LeaveSettings/LeavePolicyAssignment';

const TABS = [
  { id: 'types', label: 'Leave Types' },
  { id: 'policies', label: 'Policies & Assignments' },
];

const ADMIN_ROLES = ['super_admin', 'owner', 'hr'];

export default function LeaveSettingsPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;
  const canAdmin = ADMIN_ROLES.includes(role);

  const [tab, setTab] = useState('types');
  const [typeForm, setTypeForm] = useState({ open: false, item: null });
  const [policyForm, setPolicyForm] = useState({ open: false, item: null });
  const [assignForm, setAssignForm] = useState({ open: false, policy: null });
  const [policyTypeFilter, setPolicyTypeFilter] = useState('');
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: typesData, isLoading: typesLoading, error: typesError } = useQuery({
    queryKey: ['leave-types', selectedTenantId],
    queryFn: () => leaveSettingsApi.listTypes(),
    enabled: !tenantRequired && canAdmin,
  });

  const { data: policiesData, isLoading: policiesLoading, error: policiesError } = useQuery({
    queryKey: ['leave-policies', selectedTenantId],
    queryFn: () => leaveSettingsApi.listPolicies(),
    enabled: !tenantRequired && canAdmin,
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments', selectedTenantId],
    queryFn: () => departmentApi.list(),
    enabled: !tenantRequired && assignForm.open,
  });

  const { data: desigData } = useQuery({
    queryKey: ['designations', selectedTenantId],
    queryFn: () => designationApi.list(),
    enabled: !tenantRequired && assignForm.open,
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-assign', selectedTenantId],
    queryFn: () => employeeApi.list({ limit: 200 }),
    enabled: !tenantRequired && assignForm.open,
  });

  const leaveTypes = typesData?.data?.leaveTypes || [];
  const policies = policiesData?.data?.policies || [];

  const invalidateTypes = () => queryClient.invalidateQueries({ queryKey: ['leave-types'] });
  const invalidatePolicies = () => queryClient.invalidateQueries({ queryKey: ['leave-policies'] });

  const createType = useMutation({
    mutationFn: leaveSettingsApi.createType,
    onSuccess: (res) => {
      invalidateTypes();
      setTypeForm({ open: false, item: null });
      setFormError('');
      showToast('success', res?.message || 'Leave type created');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to create leave type'),
  });

  const updateType = useMutation({
    mutationFn: ({ id, payload }) => leaveSettingsApi.updateType(id, payload),
    onSuccess: (res) => {
      invalidateTypes();
      setTypeForm({ open: false, item: null });
      setFormError('');
      showToast('success', res?.message || 'Leave type updated');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to update leave type'),
  });

  const deactivateType = useMutation({
    mutationFn: leaveSettingsApi.deactivateType,
    onSuccess: () => { invalidateTypes(); showToast('success', 'Leave type deactivated'); },
    onError: (err) => showToast('error', err.response?.data?.error?.message || 'Failed to deactivate'),
  });

  const createPolicy = useMutation({
    mutationFn: leaveSettingsApi.createPolicy,
    onSuccess: (res) => {
      invalidatePolicies();
      setPolicyForm({ open: false, item: null });
      setFormError('');
      showToast('success', res?.message || 'Policy created');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to create policy'),
  });

  const updatePolicy = useMutation({
    mutationFn: ({ id, payload }) => leaveSettingsApi.updatePolicy(id, payload),
    onSuccess: (res) => {
      invalidatePolicies();
      setPolicyForm({ open: false, item: null });
      setFormError('');
      showToast('success', res?.message || 'Policy updated');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to update policy'),
  });

  const deactivatePolicy = useMutation({
    mutationFn: leaveSettingsApi.deactivatePolicy,
    onSuccess: () => { invalidatePolicies(); showToast('success', 'Policy deactivated'); },
    onError: (err) => showToast('error', err.response?.data?.error?.message || 'Failed to deactivate'),
  });

  const assignPolicy = useMutation({
    mutationFn: ({ id, payload }) => leaveSettingsApi.assignPolicy(id, payload),
    onSuccess: (res) => {
      invalidatePolicies();
      setAssignForm({ open: false, policy: null });
      setFormError('');
      showToast('success', res?.message || 'Policy assigned');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to assign policy'),
  });

  const removeAssignment = useMutation({
    mutationFn: ({ policyId, assignmentId }) => leaveSettingsApi.removeAssignment(policyId, assignmentId),
    onSuccess: () => { invalidatePolicies(); showToast('success', 'Assignment removed'); },
    onError: (err) => showToast('error', err.response?.data?.error?.message || 'Failed to remove assignment'),
  });

  const recalculate = useMutation({
    mutationFn: () => leaveSettingsApi.recalculateBalances({}),
    onSuccess: (res) => showToast('success', res?.message || 'Balances recalculated'),
    onError: (err) => showToast('error', err.response?.data?.error?.message || 'Recalculate failed'),
  });

  if (!canAdmin) {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-lg font-semibold text-slate-700">Access denied</h3>
        <p className="text-sm text-slate-500 mt-2">Leave settings require admin access.</p>
      </div>
    );
  }

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center">
        <Palmtree size={40} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700">Select a tenant</h3>
        <p className="text-sm text-slate-500 mt-2">Choose an organization to configure leave types and policies.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={cn('fixed top-4 right-4 z-[60] px-4 py-2 rounded-lg text-sm shadow-lg text-white', toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600')}>
          {toast.message}
        </div>
      )}

      <PageHeader
        badge="People · Leave Settings"
        title="Leave Settings"
        subtitle="Configure leave types, accrual policies, and assignments"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/leaves" className="btn-secondary text-xs">
              <ArrowLeft size={14} /> Back to Leaves
            </Link>
            <button type="button" onClick={() => recalculate.mutate()} disabled={recalculate.isPending} className="btn-secondary text-xs">
              <RefreshCw size={14} className={recalculate.isPending ? 'animate-spin' : ''} /> Recalculate balances
            </button>
            {tab === 'types' ? (
              <button type="button" onClick={() => { setFormError(''); setTypeForm({ open: true, item: null }); }} className="btn-primary text-xs">
                <Plus size={14} /> Add leave type
              </button>
            ) : (
              <button type="button" onClick={() => { setFormError(''); setPolicyForm({ open: true, item: null }); }} className="btn-primary text-xs">
                <Plus size={14} /> Add policy
              </button>
            )}
          </div>
        }
      />

      <div className="ds-tabs scroll-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(tab === t.id && 'ds-tab-active')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        {tab === 'types' ? (
          <LeaveTypesList
            types={leaveTypes}
            loading={typesLoading}
            error={typesError}
            onAdd={() => { setFormError(''); setTypeForm({ open: true, item: null }); }}
            onEdit={(item) => { setFormError(''); setTypeForm({ open: true, item }); }}
            onToggleActive={(item, is_active) => {
              if (!is_active && item.is_active) deactivateType.mutate(item.id);
              else updateType.mutate({ id: item.id, payload: { is_active } });
            }}
            togglePending={deactivateType.isPending || updateType.isPending}
          />
        ) : (
          <LeavePolicyList
            policies={policies}
            loading={policiesLoading}
            error={policiesError}
            filterTypeId={policyTypeFilter}
            onFilterType={setPolicyTypeFilter}
            leaveTypes={leaveTypes}
            onAdd={() => { setFormError(''); setPolicyForm({ open: true, item: null }); }}
            onEdit={(item) => { setFormError(''); setPolicyForm({ open: true, item }); }}
            onAssign={(policy) => { setFormError(''); setAssignForm({ open: true, policy }); }}
            onToggleActive={(item, is_active) => {
              if (!is_active && item.is_active) deactivatePolicy.mutate(item.id);
              else updatePolicy.mutate({ id: item.id, payload: { is_active } });
            }}
            onRemoveAssignment={(policy, assignment) => removeAssignment.mutate({ policyId: policy.id, assignmentId: assignment.id })}
            togglePending={deactivatePolicy.isPending || updatePolicy.isPending}
            removeAssignmentPending={removeAssignment.isPending}
          />
        )}
      </div>

      <LeaveTypeForm
        open={typeForm.open}
        initial={typeForm.item}
        isEdit={!!typeForm.item}
        error={formError}
        loading={createType.isPending || updateType.isPending}
        onClose={() => { setTypeForm({ open: false, item: null }); setFormError(''); }}
        onSubmit={(payload) => {
          if (typeForm.item) updateType.mutate({ id: typeForm.item.id, payload });
          else createType.mutate(payload);
        }}
      />

      <LeavePolicyForm
        open={policyForm.open}
        initial={policyForm.item}
        isEdit={!!policyForm.item}
        leaveTypes={leaveTypes}
        error={formError}
        loading={createPolicy.isPending || updatePolicy.isPending}
        onClose={() => { setPolicyForm({ open: false, item: null }); setFormError(''); }}
        onSubmit={(payload) => {
          if (policyForm.item) updatePolicy.mutate({ id: policyForm.item.id, payload });
          else createPolicy.mutate(payload);
        }}
      />

      <LeavePolicyAssignment
        open={assignForm.open}
        policy={assignForm.policy}
        departments={deptData?.data?.departments || []}
        designations={desigData?.data?.designations || []}
        employees={empData?.data?.employees || []}
        error={formError}
        loading={assignPolicy.isPending}
        onClose={() => { setAssignForm({ open: false, policy: null }); setFormError(''); }}
        onSubmit={(payload) => assignPolicy.mutate({ id: assignForm.policy.id, payload })}
      />
    </div>
  );
}
