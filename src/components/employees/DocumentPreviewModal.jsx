import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Printer, RefreshCw, X } from 'lucide-react';
import { printHtmlDocument } from '../../utils/printDocument';
import { cn } from '../../utils/helpers';

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

async function parseApiError(err, fallback) {
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

function selectionKey(t) {
  const templateId = t.template_id ?? t.id;
  return `${templateId}:${t.version}`;
}

function parseSelection(value) {
  if (!value) return { templateId: null, version: null };
  const [templateIdRaw, versionRaw] = String(value).split(':');
  const templateId = Number(templateIdRaw);
  const version = Number(versionRaw);
  return {
    templateId: Number.isInteger(templateId) && templateId > 0 ? templateId : null,
    version: Number.isInteger(version) && version > 0 ? version : null,
  };
}

function templateOptionLabel(t) {
  const bits = [`${t.name} (v${t.version})`];
  if (t.is_current) bits.push('Current');
  if (t.is_default) bits.push('Default');
  if (t.status === 'inactive') bits.push('Inactive');
  return bits.join(' · ');
}

/**
 * HTML document preview before PDF generation.
 * Supports picking any historical template version when regenerating.
 */
export default function DocumentPreviewModal({
  open,
  onClose,
  title = 'Document preview',
  subtitle,
  /** () => Promise<{ templates: Array }> */
  loadTemplates,
  /**
   * ({ templateId, version }?) => Promise<{ html, template?, employee? }>
   */
  loadPreview,
  /** ({ templateId, version }?) => Promise<Blob> */
  downloadPdf,
  downloadFilename = 'document.pdf',
  className,
}) {
  const [html, setHtml] = useState('');
  const [meta, setMeta] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selection, setSelection] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const loadPreviewRef = useRef(loadPreview);
  const loadTemplatesRef = useRef(loadTemplates);
  loadPreviewRef.current = loadPreview;
  loadTemplatesRef.current = loadTemplates;

  useEffect(() => {
    if (!open) {
      setHtml('');
      setMeta(null);
      setTemplates([]);
      setSelection('');
      setError('');
      setLoading(false);
      setDownloading(false);
      setLoadingTemplates(false);
      return undefined;
    }

    if (!loadTemplatesRef.current) return undefined;

    let cancelled = false;
    (async () => {
      setLoadingTemplates(true);
      try {
        const data = await loadTemplatesRef.current();
        if (cancelled) return;
        const list = data?.templates || data?.data?.templates || [];
        setTemplates(list);
        const preferred =
          list.find((t) => t.is_default && t.is_current && t.status === 'active') ||
          list.find((t) => t.is_current && t.status === 'active') ||
          list.find((t) => t.is_current) ||
          list[0];
        setSelection(preferred ? selectionKey(preferred) : '');
      } catch (err) {
        if (cancelled) return;
        setTemplates([]);
        setSelection('');
        setError(await parseApiError(err, 'Failed to load templates'));
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    if (loadTemplatesRef.current && loadingTemplates) return undefined;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const parsed = parseSelection(selection);
        const data = await loadPreviewRef.current(parsed);
        if (cancelled) return;
        setHtml(data?.html || '');
        setMeta(data);
        if (!data?.html) setError('Preview returned empty content');
      } catch (err) {
        if (cancelled) return;
        setHtml('');
        setMeta(null);
        setError(await parseApiError(err, 'Failed to load document preview'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, selection, loadingTemplates, reloadKey]);

  if (!open) return null;

  const selected = templates.find((t) => selectionKey(t) === selection);
  const displayTitle = meta?.template?.name || selected?.name || title;
  const displaySubtitle =
    subtitle ||
    (meta?.employee
      ? `${meta.employee.name || ''}${meta.employee.emp_code ? ` · ${meta.employee.emp_code}` : ''}`.trim()
      : null);
  const versionLabel = meta?.template?.version ?? selected?.version;

  const handlePrint = () => {
    if (!html) return;
    try {
      printHtmlDocument(html, { title: displayTitle });
    } catch {
      setError('Could not open print dialog');
    }
  };

  const handleDownload = async () => {
    if (!downloadPdf || downloading) return;
    setDownloading(true);
    setError('');
    try {
      const blob = await downloadPdf(parseSelection(selection));
      triggerBlobDownload(blob, downloadFilename);
    } catch (err) {
      setError(await parseApiError(err, 'Failed to download PDF'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div
        className={cn(
          'bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-preview-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="min-w-0 flex-1">
            <h3 id="document-preview-title" className="text-base font-semibold text-slate-900 truncate">
              {displayTitle}
            </h3>
            {displaySubtitle && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{displaySubtitle}</p>
            )}
            {versionLabel != null && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                Using template version {versionLabel}
                {selected && !selected.is_current ? ' (historical)' : ''}
                {selected?.status === 'inactive' ? ' (inactive)' : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>

        {loadTemplates && (
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-end gap-3 shrink-0">
            <div className="flex-1 min-w-[220px]">
              <label htmlFor="document-template-select" className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">
                Template version
              </label>
              <select
                id="document-template-select"
                value={selection}
                disabled={loadingTemplates || templates.length === 0}
                onChange={(e) => setSelection(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                {templates.length === 0 && (
                  <option value="">{loadingTemplates ? 'Loading templates…' : 'No templates available'}</option>
                )}
                {templates.map((t) => (
                  <option key={selectionKey(t)} value={selectionKey(t)}>
                    {templateOptionLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={loading || loadingTemplates}
              onClick={() => setReloadKey((k) => k + 1)}
              className="btn-secondary text-xs"
              title="Reload preview with selected template"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Regenerate preview
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 bg-slate-100 p-4 overflow-hidden">
          {loading || loadingTemplates ? (
            <div className="h-full min-h-[420px] flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading preview…
            </div>
          ) : error && !html ? (
            <div className="h-full min-h-[420px] flex items-center justify-center">
              <p className="text-sm text-red-600 max-w-md text-center px-4">{error}</p>
            </div>
          ) : (
            <iframe
              title="Document preview"
              sandbox=""
              srcDoc={html}
              className="w-full h-[min(58vh,600px)] bg-white rounded-lg border border-slate-200 shadow-sm"
            />
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            {error && html ? (
              <p className="text-xs text-red-600">{error}</p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Choose any historical template version to regenerate. Download saves a new immutable snapshot.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Close
            </button>
            <button
              type="button"
              disabled={!html || loading}
              onClick={handlePrint}
              className="btn-secondary text-xs"
              title="Print this document"
            >
              <Printer size={14} /> Print
            </button>
            <button
              type="button"
              disabled={!html || loading || downloading || !downloadPdf}
              onClick={handleDownload}
              className="btn-primary text-xs"
              title="Generate PDF from selected template and download"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {downloading ? 'Generating PDF…' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
