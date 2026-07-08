import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Copy, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { financeApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import QuotationStatusBadge from '../../components/finance/QuotationStatusBadge';
import CreateQuotationDrawer from '../../components/finance/CreateQuotationDrawer';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import {
  FINANCE_WRITE_ROLES,
  QUOTATION_STATUS_FILTER_OPTIONS,
  buildPlaceholderQuotationNumber,
  formatQuotationCreatedBy,
  quotationDetailToFormValues,
  quotationFormValuesToApiPayload,
} from '../../constants/finance';
import { formatINR } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { normalizePagination, useTablePagination } from '../../hooks/useTablePagination';

function monthBounds(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  return {
    from: new Date(y, m, 1).toISOString().slice(0, 10),
    to: new Date(y, m + 1, 0).toISOString().slice(0, 10),
  };
}

function QuotationsIllustration() {
  return (
    <svg
      width="160"
      height="140"
      viewBox="0 0 160 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto"
      aria-hidden="true"
    >
      <rect x="28" y="12" width="88" height="112" rx="8" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5" />
      <rect x="44" y="32" width="56" height="6" rx="3" fill="#CBD5E1" />
      <rect x="44" y="48" width="48" height="4" rx="2" fill="#E2E8F0" />
      <rect x="44" y="58" width="52" height="4" rx="2" fill="#E2E8F0" />
      <rect x="44" y="68" width="40" height="4" rx="2" fill="#E2E8F0" />
      <rect x="44" y="84" width="36" height="4" rx="2" fill="#E2E8F0" />
      <rect x="44" y="94" width="44" height="4" rx="2" fill="#E2E8F0" />
      <path
        d="M108 88L132 64L140 72L116 96L108 98V88Z"
        fill="#DBEAFE"
        stroke="#2563EB"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M128 68L136 76" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="120" cy="108" r="20" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1.5" />
      <text x="120" y="114" textAnchor="middle" fill="#2563EB" fontSize="14" fontWeight="600" fontFamily="Inter, sans-serif">
        ₹
      </text>
    </svg>
  );
}

export default function QuotationsPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;
  const canWrite = FINANCE_WRITE_ROLES.includes(user?.role);

  const defaults = monthBounds();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('create');
  const [editingQuotationId, setEditingQuotationId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formError, setFormError] = useState('');

  const { page, limit, setPage, setLimit, queryParams } = useTablePagination({
    resetDeps: [search, statusFilter, from, to, selectedTenantId],
  });

  const listParams = useMemo(
    () => ({
      search: search || undefined,
      status: statusFilter || undefined,
      from: from || undefined,
      to: to || undefined,
      ...queryParams,
    }),
    [search, statusFilter, from, to, queryParams]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['finance-quotations', selectedTenantId, listParams],
    queryFn: () => financeApi.listQuotations(listParams),
    enabled: !tenantRequired,
  });

  const { data: editingData, isLoading: editingLoading } = useQuery({
    queryKey: ['finance-quotation', selectedTenantId, editingQuotationId],
    queryFn: () => financeApi.getQuotation(editingQuotationId),
    enabled: drawerOpen && drawerMode === 'edit' && Boolean(editingQuotationId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['finance-quotations'] });
    queryClient.invalidateQueries({ queryKey: ['finance-quotation'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => financeApi.createQuotation(payload),
    onSuccess: (res) => {
      invalidate();
      setFormError('');
      closeDrawer();
      const newId = res?.data?.quotation?.id;
      if (newId) {
        setPage(1);
      }
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to create quotation'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => financeApi.updateQuotation(id, payload),
    onSuccess: () => {
      invalidate();
      setFormError('');
      closeDrawer();
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to update quotation'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => financeApi.deleteQuotation(id),
    onSuccess: () => {
      invalidate();
      closeDeleteConfirm();
      if (editingQuotationId === deleteTarget?.id) {
        closeDrawer();
      }
    },
    onError: (err) => {
      window.alert(err.response?.data?.error?.message || 'Failed to delete quotation');
      closeDeleteConfirm();
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id) => {
      const res = await financeApi.getQuotation(id);
      const source = res?.data?.quotation;
      if (!source) throw new Error('Quotation not found');

      const values = quotationDetailToFormValues(source);
      const payload = quotationFormValuesToApiPayload(
        { ...values, quotation_number: '' },
        { status: 'draft' }
      );
      return financeApi.createQuotation(payload);
    },
    onSuccess: (res) => {
      invalidate();
      const newId = res?.data?.quotation?.id;
      if (newId) {
        setDrawerMode('edit');
        setEditingQuotationId(newId);
        setDrawerOpen(true);
        setPage(1);
      }
    },
    onError: (err) => {
      window.alert(err.response?.data?.error?.message || 'Failed to duplicate quotation');
    },
  });

  const quotations = data?.data?.quotations || [];
  const pagination = normalizePagination(data?.data?.pagination, limit);
  const nextQuotationNumber = buildPlaceholderQuotationNumber((pagination.total || quotations.length) + 1);

  const editingDetail = editingData?.data?.quotation;
  const editInitialValues = editingDetail ? quotationDetailToFormValues(editingDetail) : null;

  const openCreateDrawer = () => {
    setFormError('');
    setDrawerMode('create');
    setEditingQuotationId(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (quotationId) => {
    setFormError('');
    setDrawerMode('edit');
    setEditingQuotationId(quotationId);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingQuotationId(null);
    setFormError('');
  };

  const handleSaveDraft = (values) => {
    createMutation.mutate(quotationFormValuesToApiPayload(values, { status: 'draft' }));
  };

  const handleUpdate = (values, quotationId) => {
    updateMutation.mutate({
      id: quotationId,
      payload: quotationFormValuesToApiPayload(values),
    });
  };

  const openDeleteConfirm = (quotation) => {
    setDeleteTarget(quotation);
  };

  const closeDeleteConfirm = () => {
    setDeleteTarget(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  const handleDuplicate = (quotationId) => {
    duplicateMutation.mutate(quotationId);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const filtersActive = search || statusFilter || from !== defaults.from || to !== defaults.to;

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to view quotations.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        subtitle="Price quotes for clients"
      />

      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quotation no, customer, created by…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
              aria-label="Search quotations"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            aria-label="Filter by status"
          >
            {QUOTATION_STATUS_FILTER_OPTIONS.map((status) => (
              <option key={status.value || 'all'} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            aria-label="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            aria-label="To date"
          />
          {canWrite && (
            <button type="button" onClick={openCreateDrawer} className="btn-primary shrink-0">
              <Plus size={14} /> Create Quotation
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        {isLoading ? (
          <p className="p-12 text-center text-slate-400 text-sm">Loading quotations…</p>
        ) : error ? (
          <p className="p-12 text-center text-red-600 text-sm">
            {error.response?.data?.error?.message || 'Failed to load quotations'}
          </p>
        ) : quotations.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <QuotationsIllustration />
            <p className="mt-6 text-sm font-medium text-slate-700">No quotations found</p>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {filtersActive
                ? 'Try adjusting your filters or create a new quotation.'
                : 'Create your first quotation to share pricing with vendors or clients before recording a transaction.'}
            </p>
            {canWrite && (
              <button type="button" onClick={openCreateDrawer} className="btn-primary mt-6">
                <Plus size={14} /> Create Quotation
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Quotation No</th>
                    <th className="text-left px-4 py-3 font-semibold">Customer</th>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Valid Until</th>
                    <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">Total</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Created By</th>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotations.map((quotation) => (
                    <tr key={quotation.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-brand-600 whitespace-nowrap">
                        {quotation.quotation_no}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{quotation.customer}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{quotation.date}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{quotation.valid_until}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium whitespace-nowrap">
                        {formatINR(quotation.total)}
                      </td>
                      <td className="px-4 py-3">
                        <QuotationStatusBadge status={quotation.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatQuotationCreatedBy(quotation)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/quotations/${quotation.id}`}
                            className="p-1.5 text-slate-400 hover:text-brand-600 inline-flex"
                            title="View quotation"
                          >
                            <Eye size={14} />
                          </Link>
                          {canWrite && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditDrawer(quotation.id)}
                                className="p-1.5 text-slate-400 hover:text-brand-600"
                                title="Edit quotation"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicate(quotation.id)}
                                disabled={duplicateMutation.isPending}
                                className="p-1.5 text-slate-400 hover:text-brand-600 disabled:opacity-50"
                                title="Duplicate quotation"
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteConfirm(quotation)}
                                className="p-1.5 text-slate-400 hover:text-red-500"
                                title="Delete quotation"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
      </div>

      <CreateQuotationDrawer
        open={drawerOpen}
        mode={drawerMode}
        quotationId={editingQuotationId}
        quotationNumber={nextQuotationNumber}
        initialValues={editInitialValues}
        loading={drawerMode === 'edit' && editingLoading}
        saving={isSaving}
        error={formError}
        onClose={closeDrawer}
        onSaveDraft={handleSaveDraft}
        onUpdate={handleUpdate}
      />

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete Quotation"
        message="Are you sure you want to delete this quotation?"
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onClose={closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
