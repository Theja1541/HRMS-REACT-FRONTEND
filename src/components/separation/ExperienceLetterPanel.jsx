import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Download, Eye, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { hrApi } from '../../api';

function fmtDate(v) {
  if (!v) return '—';
  try { return format(parseISO(v), 'dd MMM yyyy'); } catch { return v; }
}

function fmtDateTime(v) {
  if (!v) return '—';
  try { return format(parseISO(v), 'dd MMM yyyy, hh:mm a'); } catch { return v; }
}

function blobToObjectUrl(blob) {
  return URL.createObjectURL(blob);
}

function triggerBlobDownload(blob, filename) {
  const url = blobToObjectUrl(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function openBlobInTab(blob) {
  const url = blobToObjectUrl(new Blob([blob], { type: 'application/pdf' }));
  const tab = window.open(url, '_blank');
  // revoke after tab has time to load
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return tab;
}

export default function ExperienceLetterPanel({ separationRequestId, separationStatus, enabled }) {
  const qc = useQueryClient();
  const [actionError, setActionError] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['el-status', separationRequestId],
    queryFn: () => hrApi.getExperienceLetterStatus(separationRequestId),
    enabled: !!separationRequestId && enabled,
    staleTime: 30_000,
  });

  const letter = data?.data?.letter ?? null;
  const isCompleted = separationStatus === 'completed';

  const generateMutation = useMutation({
    mutationFn: () => hrApi.generateExperienceLetter(separationRequestId),
    onSuccess: () => {
      setActionError(null);
      qc.invalidateQueries({ queryKey: ['el-status', separationRequestId] });
    },
    onError: (err) => {
      setActionError(err?.response?.data?.error?.message || 'Generation failed. Please try again.');
    },
  });

  const handlePreview = async () => {
    setActionError(null);
    setPreviewLoading(true);
    try {
      const res = await hrApi.previewExperienceLetter(separationRequestId);
      openBlobInTab(res.data);
    } catch {
      setActionError('Preview failed. Please try again.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    setActionError(null);
    setDownloadLoading(true);
    try {
      const res = await hrApi.downloadExperienceLetter(separationRequestId);
      triggerBlobDownload(res.data, `experience_letter_sep${separationRequestId}.pdf`);
    } catch {
      setActionError('Download failed. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
        Loading experience letter status…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Award size={16} className="text-brand-600" />
        <h3 className="text-sm font-semibold text-slate-800">Experience Certificate</h3>
      </div>

      {!isCompleted && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>
            Experience certificate can only be generated after the separation is marked as{' '}
            <strong>Completed</strong>.
          </span>
        </div>
      )}

      {isCompleted && !letter && (
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
          <Clock size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <span>No experience certificate has been generated yet for this separation.</span>
        </div>
      )}

      {letter && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-indigo-800 text-xs font-medium">
            <CheckCircle2 size={14} className="shrink-0" />
            <span>Certificate {letter.regenerated_count > 0 ? 'last regenerated' : 'generated'}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <p className="text-slate-400 uppercase text-[10px]">Letter Date</p>
              <p className="text-slate-800 font-medium mt-0.5">{fmtDate(letter.letter_date)}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase text-[10px]">Generated At</p>
              <p className="text-slate-800 font-medium mt-0.5">{fmtDateTime(letter.generated_at)}</p>
            </div>
            {letter.generatedByEmployee && (
              <div className="col-span-2">
                <p className="text-slate-400 uppercase text-[10px]">Generated By</p>
                <p className="text-slate-800 font-medium mt-0.5">
                  {letter.generatedByEmployee.first_name} {letter.generatedByEmployee.last_name}
                  {' '}
                  <span className="text-slate-400 font-mono">({letter.generatedByEmployee.emp_code})</span>
                </p>
              </div>
            )}
            {letter.regenerated_count > 0 && (
              <div>
                <p className="text-slate-400 uppercase text-[10px]">Regenerated</p>
                <p className="text-slate-800 font-medium mt-0.5">{letter.regenerated_count}×</p>
              </div>
            )}
          </div>

          {actionError && <p className="text-xs text-red-600">{actionError}</p>}

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewLoading}
              className="inline-flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-md font-medium transition"
            >
              <Eye size={13} className={previewLoading ? 'animate-pulse' : ''} />
              {previewLoading ? 'Opening…' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloadLoading}
              className="inline-flex items-center gap-1.5 text-xs bg-white border border-indigo-300 hover:bg-indigo-50 disabled:opacity-60 text-indigo-700 px-3 py-1.5 rounded-md font-medium transition"
            >
              <Download size={13} />
              {downloadLoading ? 'Downloading…' : 'Download PDF'}
            </button>
          </div>
        </div>
      )}

      {isCompleted && (
        <div className="pt-2 border-t border-slate-100">
          {generateMutation.isError && !actionError && (
            <p className="text-xs text-red-600 mb-2">Generation failed. Please try again.</p>
          )}
          <button
            type="button"
            disabled={generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
            className="inline-flex items-center gap-1.5 text-xs btn-secondary"
          >
            <RefreshCw size={13} className={generateMutation.isPending ? 'animate-spin' : ''} />
            {letter ? 'Regenerate Certificate' : 'Generate Experience Certificate'}
          </button>
          {letter && (
            <p className="text-[10px] text-slate-400 mt-1.5">
              Regenerating will replace the existing PDF and increment the version count.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
