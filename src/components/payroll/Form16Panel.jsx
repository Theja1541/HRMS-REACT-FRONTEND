import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Trash2, Upload } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { payrollApi, portalApi } from '../../api';
import { getCurrentFinancialYear, listRecentFinancialYears } from '../../utils/financialYear';
import { useAuthStore } from '../../store/auth.store';

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Form 16 documents — admin upload on employee profile, employee download on self-service.
 * @param {{ employeeId?: number, mode?: 'admin' | 'self' }} props
 */
export default function Form16Panel({ employeeId, mode = 'admin' }) {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const user = useAuthStore((s) => s.user);
  const isSelf = mode === 'self';
  const canUpload = !isSelf && ['super_admin', 'owner', 'hr', 'pf_team'].includes(user?.role);
  const canDelete = canUpload;

  const [financialYear, setFinancialYear] = useState(getCurrentFinancialYear());
  const [selectedFile, setSelectedFile] = useState(null);
  const [toast, setToast] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fyOptions = listRecentFinancialYears(8);

  const queryKey = isSelf ? ['my-form16'] : ['form16', employeeId];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () =>
      isSelf ? portalApi.listMyForm16() : payrollApi.listEmployeeForm16(employeeId),
    enabled: isSelf || !!employeeId,
  });

  const documents = data?.data?.documents || [];

  const uploadMutation = useMutation({
    mutationFn: () => payrollApi.uploadEmployeeForm16(employeeId, selectedFile, financialYear),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setToast({ type: 'success', message: `Form 16 for FY ${financialYear} uploaded` });
    },
    onError: (err) => {
      setToast({
        type: 'error',
        message: err.response?.data?.error?.message || 'Upload failed',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => payrollApi.deleteForm16(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setToast({ type: 'success', message: 'Form 16 deleted' });
    },
    onError: (err) => {
      setToast({
        type: 'error',
        message: err.response?.data?.error?.message || 'Delete failed',
      });
    },
  });

  const handleDownload = async (doc) => {
    setDownloadingId(doc.id);
    try {
      const blob = isSelf
        ? await portalApi.downloadForm16(doc.id)
        : await payrollApi.downloadForm16(doc.id);
      triggerBlobDownload(blob, doc.file_name || `Form16_FY${doc.financial_year}.pdf`);
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.error?.message || 'Download failed',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setToast({ type: 'error', message: 'Select a PDF file' });
      return;
    }
    uploadMutation.mutate();
  };

  if (isLoading) {
    return <div className="py-6 text-center text-slate-400 text-sm">Loading Form 16 documents…</div>;
  }

  if (error) {
    return (
      <div className="py-6 text-center text-red-600 text-sm">
        {error.response?.data?.error?.message || 'Failed to load Form 16 documents'}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
          <FileText size={16} className="text-slate-500" />
          Form 16 (TDS Certificate)
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {isSelf
            ? 'Download your Form 16 PDFs issued by the employer for each financial year.'
            : 'Upload Form 16 PDFs for this employee. One document per financial year (re-upload replaces the existing file).'}
        </p>
      </div>

      {toast && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {toast.message}
        </div>
      )}

      {canUpload && (
        <form onSubmit={handleUpload} className="card p-4 space-y-3 max-w-xl">
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Upload Form 16</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600">Financial year</label>
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
              >
                {fyOptions.map((fy) => (
                  <option key={fy} value={fy}>
                    FY {fy}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">PDF file</label>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="mt-1 w-full text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-brand-50 file:text-brand-700"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={uploadMutation.isPending || !selectedFile}
            className="btn-primary text-sm inline-flex items-center gap-1.5"
          >
            <Upload size={14} />
            {uploadMutation.isPending ? 'Uploading…' : 'Upload Form 16'}
          </button>
        </form>
      )}

      {documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {isSelf
            ? 'No Form 16 documents available yet. Contact HR or payroll once your certificate is issued.'
            : 'No Form 16 uploaded yet for this employee.'}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-[10px] font-semibold uppercase text-slate-500">
                <th className="px-4 py-2.5">Financial Year</th>
                <th className="px-4 py-2.5">File</th>
                <th className="px-4 py-2.5">Uploaded</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800">FY {doc.financial_year}</td>
                  <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={doc.file_name}>
                    {doc.file_name}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {doc.generated_at
                      ? format(parseISO(doc.generated_at), 'dd MMM yyyy')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingId === doc.id}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-brand-600"
                        title="Download"
                      >
                        <Download size={15} />
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete Form 16 for FY ${doc.financial_year}?`)) {
                              deleteMutation.mutate(doc.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
