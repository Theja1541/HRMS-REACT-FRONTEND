import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Eye, FileStack, Loader2, Search } from 'lucide-react';
import { employeeApi, hrApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { DOCUMENT_TEMPLATE_TYPE_LABELS, DOCUMENT_TEMPLATE_TYPES } from '../../constants/hr';
import { useTablePagination, normalizePagination } from '../../hooks/useTablePagination';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';

function empName(emp) {
  if (!emp) return '—';
  return `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.emp_code || '—';
}

function fmtDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function fmtDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

async function parseBlobError(err, fallback) {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed?.error?.message || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.error?.message || err?.message || fallback;
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

export default function DocumentGenerationHistoryPage() {
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;

  const [employeeId, setEmployeeId] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const { page, limit, setPage, setLimit, queryParams } = useTablePagination({
    defaultLimit: 20,
    resetDeps: [employeeId, documentType, dateFrom, dateTo, search],
  });

  const listParams = useMemo(
    () => ({
      ...queryParams,
      employee_id: employeeId || undefined,
      document_type: documentType || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      search: search.trim() || undefined,
    }),
    [queryParams, employeeId, documentType, dateFrom, dateTo, search]
  );

  const { data: empData } = useQuery({
    queryKey: ['employees-for-doc-history', selectedTenantId],
    queryFn: () => employeeApi.list({ limit: 500 }),
    enabled: !tenantRequired,
  });

  const employees = empData?.data?.employees || empData?.data || [];

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['generated-documents', selectedTenantId, listParams],
    queryFn: () => hrApi.listGeneratedDocuments(listParams),
    enabled: !tenantRequired,
    keepPreviousData: true,
  });

  const documents = data?.data?.documents || [];
  const pagination = normalizePagination(data?.pagination, limit);

  const runDownload = async (doc, mode) => {
    setActionError('');
    setBusyId(`${doc.id}-${mode}`);
    try {
      const blob =
        mode === 'preview'
          ? await hrApi.previewGeneratedDocument(doc.id)
          : await hrApi.downloadGeneratedDocument(doc.id);
      if (mode === 'preview') {
        const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else {
        triggerBlobDownload(blob, doc.file_name || `document_${doc.id}.pdf`);
      }
    } catch (err) {
      setActionError(await parseBlobError(err, `Failed to ${mode} document`));
    } finally {
      setBusyId(null);
    }
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to view document generation history.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="People · Documents"
        title="Document Generation History"
        subtitle="Immutable snapshots of letters and certificates generated from templates"
      />

      <div className="card overflow-hidden">
        <div className="ds-toolbar">
          <div className="toolbar-row flex-wrap items-end">
          <div className="relative flex-1 min-w-0 sm:max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee…"
              className="ds-input pl-9 w-full"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">Employee</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="ds-select min-w-[180px]"
            >
              <option value="">All employees</option>
              {(Array.isArray(employees) ? employees : []).map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {empName(emp)} {emp.emp_code ? `(${emp.emp_code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">Document type</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="ds-select min-w-[160px]"
            >
              <option value="">All types</option>
              {DOCUMENT_TEMPLATE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="ds-input"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="ds-input"
            />
          </div>

          {(employeeId || documentType || dateFrom || dateTo || search) && (
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => {
                setEmployeeId('');
                setDocumentType('');
                setDateFrom('');
                setDateTo('');
                setSearch('');
              }}
            >
              Clear filters
            </button>
          )}

          {isFetching && !isLoading && (
            <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Updating…
            </span>
          )}
          </div>
        </div>

        {actionError && (
          <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{actionError}</div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading history…
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">
            {error.response?.data?.error?.message || 'Failed to load generation history'}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileStack size={28} className="mb-2 opacity-40" />
            <p className="text-sm">No generated documents found</p>
            <p className="text-xs mt-1">Try adjusting filters or generate a letter from an employee profile.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="px-4 py-3 font-medium">Generated</th>
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Document</th>
                    <th className="px-4 py-3 font-medium">Template</th>
                    <th className="px-4 py-3 font-medium">Letter date</th>
                    <th className="px-4 py-3 font-medium">Generated by</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {fmtDateTime(doc.generated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{empName(doc.employee)}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{doc.employee?.emp_code || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-800">{doc.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {DOCUMENT_TEMPLATE_TYPE_LABELS[doc.document_type] || doc.document_type}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {doc.template_name || '—'}
                        {doc.template_version != null && (
                          <span className="text-slate-400"> · v{doc.template_version}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {fmtDate(doc.letter_date)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{empName(doc.generator)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={!!busyId}
                            onClick={() => runDownload(doc, 'preview')}
                            className="btn-secondary text-[11px] px-2 py-1"
                            title="Preview PDF"
                          >
                            {busyId === `${doc.id}-preview` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Eye size={13} />
                            )}
                            Preview
                          </button>
                          <button
                            type="button"
                            disabled={!!busyId}
                            onClick={() => runDownload(doc, 'download')}
                            className="btn-primary text-[11px] px-2 py-1"
                            title="Download PDF"
                          >
                            {busyId === `${doc.id}-download` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Download size={13} />
                            )}
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-0">
              <TablePagination
                page={pagination.page}
                limit={pagination.limit}
                total={pagination.total}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
