import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Braces,
  Eye,
  FileCode2,
  FileOutput,
  FileText,
  Pencil,
  Plus,
  Replace,
  Search,
  Star,
  Upload,
} from 'lucide-react';
import { hrApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import GenerateTemplateDocumentModal from '../../components/hr/GenerateTemplateDocumentModal';
import {
  DOCUMENT_TEMPLATE_STATUSES,
  DOCUMENT_TEMPLATE_TYPE_LABELS,
  DOCUMENT_TEMPLATE_TYPES,
} from '../../constants/hr';
import {
  DOCUMENT_VARIABLES,
  listDocumentVariableRegistry,
  toPlaceholder,
} from '../../constants/documentVariables';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';

const PLACEHOLDER_TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function countOccurrences(haystack, needle) {
  if (!haystack || !needle) return 0;
  let count = 0;
  let idx = 0;
  while (idx < haystack.length) {
    const found = haystack.indexOf(needle, idx);
    if (found === -1) break;
    count += 1;
    idx = found + needle.length;
  }
  return count;
}

function listUsedPlaceholders(html) {
  const keys = new Set();
  const text = String(html || '');
  PLACEHOLDER_TOKEN_RE.lastIndex = 0;
  let match;
  while ((match = PLACEHOLDER_TOKEN_RE.exec(text)) !== null) {
    keys.add(match[1]);
  }
  return [...keys].sort();
}

const EMPTY_FORM = {
  name: '',
  document_type: 'offer_letter',
  status: 'active',
  is_default: false,
  template_html: '',
};

const WRITE_ROLES = new Set(['super_admin', 'owner', 'hr', 'admin']);

function documentTypeLabel(value) {
  return DOCUMENT_TEMPLATE_TYPE_LABELS[value] || value;
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function templateToForm(template) {
  return {
    name: template.name || '',
    document_type: template.document_type || 'offer_letter',
    status: template.status || 'active',
    is_default: !!template.is_default,
    template_html: template.template_html || '',
    version: template.version ?? null,
  };
}

function buildPayload(form) {
  return {
    name: form.name.trim(),
    document_type: form.document_type,
    status: form.status,
    is_default: !!form.is_default,
    template_html: form.template_html,
  };
}

function TemplateHtmlEditor({ value, onChange, onImportFile, importing }) {
  const [tab, setTab] = useState('write');
  const [panelMode, setPanelMode] = useState('insert'); // insert | replace
  const [categoryKey, setCategoryKey] = useState('employee');
  const [varSearch, setVarSearch] = useState('');
  const [findText, setFindText] = useState('');
  const [replaceKey, setReplaceKey] = useState('employee_name');
  const [replaceMessage, setReplaceMessage] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0, text: '' });
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const registry = useMemo(() => listDocumentVariableRegistry(), []);
  const activeCategory = registry.find((c) => c.key === categoryKey) || registry[0];
  const usedKeys = useMemo(() => listUsedPlaceholders(value), [value]);

  const filteredVariables = useMemo(() => {
    const q = varSearch.trim().toLowerCase();
    const list = activeCategory?.variables || [];
    if (!q) return list;
    return list.filter(
      (v) =>
        v.label.toLowerCase().includes(q) ||
        v.key.toLowerCase().includes(q) ||
        v.placeholder.toLowerCase().includes(q)
    );
  }, [activeCategory, varSearch]);

  const syncSelection = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    setSelection({
      start,
      end,
      text: String(value || '').slice(start, end),
    });
  };

  const focusAt = (start, end = start) => {
    const el = textareaRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, end);
      setSelection({
        start,
        end,
        text: String(value || '').slice(start, end),
      });
    });
  };

  const applyTextChange = (next, cursorStart, cursorEnd = cursorStart) => {
    onChange(next);
    setTab('write');
    setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(cursorStart, cursorEnd);
      setSelection({
        start: cursorStart,
        end: cursorEnd,
        text: next.slice(cursorStart, cursorEnd),
      });
    }, 0);
  };

  /** Insert at cursor, or replace the current selection with the placeholder. */
  const insertOrReplaceWithPlaceholder = (key) => {
    const token = toPlaceholder(key);
    const el = textareaRef.current;
    const current = value || '';

    if (!el) {
      onChange(`${current}${token}`);
      setTab('write');
      return;
    }

    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = `${current.slice(0, start)}${token}${current.slice(end)}`;
    applyTextChange(next, start + token.length);
    setReplaceMessage(
      end > start
        ? `Replaced selection with ${token}`
        : `Inserted ${token}`
    );
  };

  const handleReplace = (mode = 'one') => {
    const needle = findText;
    const token = toPlaceholder(replaceKey);
    const current = value || '';

    if (!needle) {
      setReplaceMessage('Enter the static text to replace');
      return;
    }
    if (!current.includes(needle)) {
      setReplaceMessage(`No matches for “${needle}”`);
      return;
    }

    if (mode === 'all') {
      const count = countOccurrences(current, needle);
      const next = current.split(needle).join(token);
      applyTextChange(next, 0);
      setReplaceMessage(`Replaced ${count} occurrence${count === 1 ? '' : 's'} with ${token}`);
      return;
    }

    const idx = current.indexOf(needle);
    const next = `${current.slice(0, idx)}${token}${current.slice(idx + needle.length)}`;
    applyTextChange(next, idx, idx + token.length);
    setReplaceMessage(`Replaced first match with ${token}`);
  };

  const useSelectionAsFind = () => {
    const text = selection.text;
    if (!text.trim()) {
      setReplaceMessage('Select static text in the editor first');
      return;
    }
    setFindText(text);
    setPanelMode('replace');
    setReplaceMessage('Selection loaded — choose a variable and replace');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs font-medium text-slate-600">Template HTML *</label>
        <div className="flex items-center gap-2">
          {onImportFile && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.docx,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportFile(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-[11px]"
                title="Import DOCX or HTML into the editor"
              >
                <Upload size={12} />
                {importing ? 'Importing…' : 'Import DOCX/HTML'}
              </button>
            </>
          )}
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setTab('write')}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium',
                tab === 'write' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <FileCode2 size={12} /> Write
            </button>
            <button
              type="button"
              onClick={() => setTab('preview')}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border-l border-slate-200',
                tab === 'preview' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <Eye size={12} /> Preview
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3 items-stretch">
        <div className="min-w-0 space-y-2">
          {tab === 'write' ? (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onSelect={syncSelection}
              onKeyUp={syncSelection}
              onClick={syncSelection}
              spellCheck={false}
              required
              placeholder={`<html>\n  <body>\n    <h1>Offer Letter</h1>\n    <p>Dear {{employee_name}},</p>\n    <p>Joining date: {{joining_date}}</p>\n  </body>\n</html>`}
              className="w-full h-[320px] lg:h-[420px] px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono leading-relaxed text-slate-800 bg-slate-50 focus:bg-white resize-y"
            />
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white h-[320px] lg:h-[420px]">
              {value.trim() ? (
                <iframe title="Template preview" sandbox="" srcDoc={value} className="w-full h-full bg-white" />
              ) : (
                <p className="p-8 text-center text-xs text-slate-400">Nothing to preview yet</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
            <Braces size={12} className="text-brand-600 shrink-0" />
            {selection.text ? (
              <>
                <span>
                  Selection:{' '}
                  <code className="text-slate-700 bg-slate-100 px-1 rounded">
                    {selection.text.length > 40
                      ? `${selection.text.slice(0, 40)}…`
                      : selection.text}
                  </code>
                </span>
                <button type="button" className="text-brand-700 hover:underline" onClick={useSelectionAsFind}>
                  Use in replace
                </button>
                <span className="text-slate-300">·</span>
                <span>Click a variable to replace this selection</span>
              </>
            ) : (
              <span>
                Select static text (e.g. an employee name) then click a variable, or use Replace below.
              </span>
            )}
          </div>

          {usedKeys.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                Placeholders in template ({usedKeys.length})
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {usedKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    title="Jump to first occurrence"
                    onClick={() => {
                      const token = toPlaceholder(key);
                      const idx = (value || '').indexOf(token);
                      if (idx >= 0) {
                        setTab('write');
                        focusAt(idx, idx + token.length);
                      }
                    }}
                    className="inline-flex items-center px-1.5 py-0.5 rounded border border-brand-100 bg-brand-50 text-[10px] font-mono text-brand-800 hover:border-brand-300"
                  >
                    {toPlaceholder(key)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="border border-slate-200 rounded-lg bg-slate-50 flex flex-col min-h-[280px] lg:h-[420px] overflow-hidden">
          <div className="px-3 py-2.5 border-b border-slate-200 bg-white shrink-0">
            <p className="text-[11px] font-semibold text-slate-700">Placeholder editor</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Swap static values for merge fields like {'{{employee_name}}'}
            </p>
            <div className="mt-2 inline-flex rounded-lg border border-slate-200 overflow-hidden w-full">
              <button
                type="button"
                onClick={() => setPanelMode('insert')}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium',
                  panelMode === 'insert'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                <Braces size={11} /> Insert
              </button>
              <button
                type="button"
                onClick={() => setPanelMode('replace')}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium border-l border-slate-200',
                  panelMode === 'replace'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                <Replace size={11} /> Replace
              </button>
            </div>
          </div>

          {panelMode === 'replace' ? (
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              <div>
                <label className="text-[10px] font-medium text-slate-600">Static text to replace</label>
                <input
                  value={findText}
                  onChange={(e) => {
                    setFindText(e.target.value);
                    setReplaceMessage('');
                  }}
                  placeholder="e.g. Priya Sharma or 15 Jan 2024"
                  className="mt-1 w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-white"
                />
                {selection.text && (
                  <button
                    type="button"
                    className="mt-1 text-[10px] text-brand-700 hover:underline"
                    onClick={useSelectionAsFind}
                  >
                    Use current selection
                  </button>
                )}
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-600">Replace with variable</label>
                <select
                  value={replaceKey}
                  onChange={(e) => setReplaceKey(e.target.value)}
                  className="mt-1 w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-white"
                >
                  {DOCUMENT_VARIABLES.map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.label} — {toPlaceholder(v.key)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-400 font-mono">{toPlaceholder(replaceKey)}</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleReplace('one')}
                  className="btn-secondary text-[11px] flex-1"
                >
                  Replace first
                </button>
                <button
                  type="button"
                  onClick={() => handleReplace('all')}
                  className="btn-primary text-[11px] flex-1"
                >
                  Replace all
                </button>
              </div>

              {findText && (
                <p className="text-[10px] text-slate-500">
                  Matches in template:{' '}
                  <span className="font-semibold text-slate-700">
                    {countOccurrences(value || '', findText)}
                  </span>
                </p>
              )}

              {replaceMessage && (
                <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1.5">
                  {replaceMessage}
                </p>
              )}

              <div className="rounded-md border border-dashed border-slate-200 bg-white px-2.5 py-2 text-[10px] text-slate-500 leading-relaxed">
                Tip: After uploading a DOCX/HTML letter, search for names, dates, and company text, then replace
                them with placeholders so each generated letter is personalized.
              </div>
            </div>
          ) : (
            <>
              <div className="px-2 pt-2 flex flex-wrap gap-1 shrink-0">
                {registry.map((category) => (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => {
                      setCategoryKey(category.key);
                      setVarSearch('');
                    }}
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-medium border',
                      categoryKey === category.key
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              <div className="px-2 pt-2 shrink-0">
                <div className="relative">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={varSearch}
                    onChange={(e) => setVarSearch(e.target.value)}
                    placeholder="Filter variables…"
                    className="w-full pl-6 pr-2 py-1 border border-slate-200 rounded text-[11px] bg-white"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                {filteredVariables.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-4">No variables match</p>
                ) : (
                  filteredVariables.map((variable) => {
                    const inUse = usedKeys.includes(variable.key);
                    return (
                      <button
                        key={variable.key}
                        type="button"
                        title={`${variable.description}${variable.example ? ` — e.g. ${variable.example}` : ''}`}
                        onClick={() => insertOrReplaceWithPlaceholder(variable.key)}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded-md bg-white border transition-colors',
                          inUse
                            ? 'border-brand-200 hover:border-brand-400 hover:bg-brand-50/50'
                            : 'border-slate-200 hover:border-brand-300 hover:bg-brand-50/40'
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-800 leading-tight">
                          {variable.label}
                          {inUse && (
                            <span className="text-[9px] uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1 py-0.5">
                              Used
                            </span>
                          )}
                          {variable.is_html && (
                            <span className="text-[9px] uppercase tracking-wide text-violet-700 bg-violet-50 border border-violet-100 rounded px-1 py-0.5">
                              Image
                            </span>
                          )}
                        </span>
                        <code className="block text-[10px] text-brand-700 mt-0.5 truncate">
                          {variable.placeholder}
                        </code>
                      </button>
                    );
                  })
                )}
              </div>

              {replaceMessage && panelMode === 'insert' && (
                <div className="px-2 pb-2 shrink-0">
                  <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1.5">
                    {replaceMessage}
                  </p>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function UploadTemplateModal({ form, setForm, file, setFile, onClose, onSubmit, loading, error }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Upload document template</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload an existing DOCX or HTML file. DOCX is converted to HTML for editing and PDF generation.
          </p>
        </div>

        <form
          className="px-6 py-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div>
            <label className="text-xs font-medium text-slate-600">File *</label>
            <input
              type="file"
              accept=".html,.htm,.docx,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              onChange={(e) => {
                const next = e.target.files?.[0] || null;
                setFile(next);
                if (next && !form.name.trim()) {
                  const base = next.name.replace(/\.(docx|html?|htm)$/i, '').replace(/[_-]+/g, ' ').trim();
                  if (base) setForm({ ...form, name: base.slice(0, 150) });
                }
              }}
            />
            {file && (
              <p className="mt-1 text-[11px] text-slate-500 truncate">
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="e.g. Standard Offer Letter"
              required
              maxLength={150}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Document type *</label>
              <select
                value={form.document_type}
                onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                required
              >
                {DOCUMENT_TEMPLATE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Status *</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                required
              >
                {DOCUMENT_TEMPLATE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
            />
            Set as default for this document type
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="pt-1 flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" disabled={loading || !file} className="btn-primary text-xs">
              {loading ? 'Uploading…' : 'Upload & create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TemplateModal({ mode, form, setForm, onClose, onSubmit, loading, error, setError, templateId }) {
  const [importing, setImporting] = useState(false);
  const { data: versionsData } = useQuery({
    queryKey: ['document-template-versions', templateId],
    queryFn: () => hrApi.listDocumentTemplateVersions(templateId),
    enabled: mode === 'edit' && !!templateId,
  });
  const versions = versionsData?.data?.versions || [];

  const handleImportFile = async (file) => {
    setImporting(true);
    setError?.('');
    try {
      const res = await hrApi.parseDocumentTemplateFile(file);
      const html = res?.data?.template_html || '';
      const suggested = res?.data?.suggested_name;
      setForm((prev) => ({
        ...prev,
        template_html: html,
        name: prev.name.trim() ? prev.name : suggested || prev.name,
      }));
    } catch (err) {
      setError?.(err.response?.data?.error?.message || 'Failed to import file');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative bg-white rounded-2xl w-full max-w-5xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <h3 className="font-semibold text-slate-900">
            {mode === 'create' ? 'Add Document Template' : 'Edit Document Template'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {mode === 'edit' && form.version != null
              ? `Current version v${form.version}. Saving HTML changes creates a new version.`
              : 'Define reusable HTML for HR letters and certificates.'}
          </p>
        </div>

        <form
          className="flex flex-col flex-1 min-h-0"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="e.g. Standard Offer Letter"
                required
                maxLength={150}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600">Document type *</label>
                <select
                  value={form.document_type}
                  onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                >
                  {DOCUMENT_TEMPLATE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Status *</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                >
                  {DOCUMENT_TEMPLATE_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                disabled={mode === 'edit' && form.is_default}
              />
              Set as default for this document type
            </label>

            <TemplateHtmlEditor
              value={form.template_html}
              onChange={(template_html) => setForm({ ...form, template_html })}
              onImportFile={handleImportFile}
              importing={importing}
            />

            {mode === 'edit' && versions.length > 0 && (
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-700">Version history</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Older versions remain available when regenerating letters.
                  </p>
                </div>
                <ul className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                  {versions.map((v) => (
                    <li
                      key={`${v.document_template_id}-${v.version}`}
                      className="px-3 py-2 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800">
                          v{v.version}
                          {v.is_current && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1 py-0.5">
                              Current
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {v.change_note || '—'} · {formatDate(v.created_at || v.updated_at)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary text-[10px] shrink-0"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            template_html: v.template_html,
                          }))
                        }
                        title="Load this version into the editor"
                      >
                        Load into editor
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary text-xs">
              {loading ? 'Saving…' : mode === 'create' ? 'Create template' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DocumentTemplatesPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;
  const canWrite = WRITE_ROLES.has(user?.role) || (user?.roles || []).some((r) => WRITE_ROLES.has(r));

  const [search, setSearch] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [generateTemplate, setGenerateTemplate] = useState(null);

  const listParams = useMemo(
    () => ({
      search: search.trim() || undefined,
      document_type: documentType || undefined,
      status: status || undefined,
    }),
    [search, documentType, status]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['document-templates', selectedTenantId, listParams],
    queryFn: () => hrApi.listDocumentTemplates(listParams),
    enabled: !tenantRequired,
  });

  const templates = data?.data?.templates || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['document-templates'] });
    queryClient.invalidateQueries({ queryKey: ['document-template-versions'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => hrApi.createDocumentTemplate(payload),
    onSuccess: () => {
      invalidate();
      setModal(null);
      setForm(EMPTY_FORM);
      setFormError('');
    },
    onError: (err) =>
      setFormError(err.response?.data?.error?.message || 'Failed to create template'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => hrApi.updateDocumentTemplate(id, payload),
    onSuccess: () => {
      invalidate();
      setModal(null);
      setFormError('');
    },
    onError: (err) =>
      setFormError(err.response?.data?.error?.message || 'Failed to update template'),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, payload }) => hrApi.createDocumentTemplateFromFile(file, payload),
    onSuccess: () => {
      invalidate();
      setModal(null);
      setForm(EMPTY_FORM);
      setUploadFile(null);
      setFormError('');
    },
    onError: (err) =>
      setFormError(err.response?.data?.error?.message || 'Failed to upload template'),
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setUploadFile(null);
    setModal('create');
  };

  const openUpload = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setUploadFile(null);
    setModal('upload');
  };

  const openEdit = async (template) => {
    setFormError('');
    setUploadFile(null);
    setForm(templateToForm(template));
    setModal({ id: template.id });
    try {
      const res = await hrApi.getDocumentTemplate(template.id);
      const t = res?.data?.template;
      if (t) setForm(templateToForm(t));
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to refresh template details');
    }
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setFormError('Template name is required');
      return;
    }
    if (!form.template_html.trim()) {
      setFormError('Template HTML is required');
      return;
    }

    const payload = buildPayload(form);
    if (modal === 'create') {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: modal.id, payload });
    }
  };

  const handleUploadSubmit = () => {
    if (!uploadFile) {
      setFormError('Please select a DOCX or HTML file');
      return;
    }
    if (!form.name.trim()) {
      setFormError('Template name is required');
      return;
    }
    uploadMutation.mutate({
      file: uploadFile,
      payload: {
        name: form.name.trim(),
        document_type: form.document_type,
        status: form.status,
        is_default: !!form.is_default,
      },
    });
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to manage document templates.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Templates"
        subtitle="Manage HTML templates for offer letters, relieving letters, and other HR documents"
        actions={
          canWrite ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={openUpload} className="btn-secondary text-xs">
                <Upload size={14} /> Upload DOCX/HTML
              </button>
              <button type="button" onClick={openCreate} className="btn-primary text-xs">
                <Plus size={14} /> Add template
              </button>
            </div>
          ) : null
        }
      />

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs w-48"
            />
          </div>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
          >
            <option value="">All document types</option>
            {DOCUMENT_TEMPLATE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
          >
            <option value="">All statuses</option>
            {DOCUMENT_TEMPLATE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {(search || documentType || status) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDocumentType('');
                setStatus('');
              }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Clear filters
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="p-8 text-center text-slate-400 text-sm">Loading templates…</p>
        ) : error ? (
          <p className="p-8 text-center text-red-500 text-sm">
            {error.response?.data?.error?.message || error.message || 'Failed to load templates'}
          </p>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No document templates found</p>
            {(search || documentType || status) && (
              <p className="text-xs text-slate-400 mt-1">Try adjusting search or filters</p>
            )}
            {canWrite && !search && !documentType && !status && (
              <button type="button" onClick={openCreate} className="btn-primary text-xs mt-4">
                <Plus size={13} /> Create first template
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Document type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Version</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {templates.map((template) => (
                  <tr
                    key={template.id}
                    className={cn('hover:bg-slate-50', template.status === 'inactive' && 'opacity-60')}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className="text-brand-600 shrink-0" />
                        <span className="font-medium text-slate-900 truncate">{template.name}</span>
                        {template.is_default && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-full shrink-0"
                            title="Default for this document type"
                          >
                            <Star size={10} /> Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {documentTypeLabel(template.document_type)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full',
                          template.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        {template.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">v{template.version}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(template.updated_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setGenerateTemplate(template)}
                          className="p-1.5 text-slate-400 hover:text-brand-600"
                          title="Generate document with employee data"
                          disabled={template.status !== 'active'}
                        >
                          <FileOutput size={14} />
                        </button>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => openEdit(template)}
                            className="p-1.5 text-slate-400 hover:text-brand-600"
                            title="Edit"
                          >
                            <Pencil size={14} />
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

      {modal === 'upload' && (
        <UploadTemplateModal
          form={form}
          setForm={setForm}
          file={uploadFile}
          setFile={setUploadFile}
          onClose={() => {
            setModal(null);
            setFormError('');
            setUploadFile(null);
          }}
          onSubmit={handleUploadSubmit}
          loading={uploadMutation.isPending}
          error={formError}
        />
      )}

      {modal && modal !== 'upload' && (
        <TemplateModal
          mode={modal === 'create' ? 'create' : 'edit'}
          templateId={modal === 'create' ? null : modal.id}
          form={form}
          setForm={setForm}
          onClose={() => {
            setModal(null);
            setFormError('');
          }}
          onSubmit={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
          error={formError}
          setError={setFormError}
        />
      )}

      <GenerateTemplateDocumentModal
        open={!!generateTemplate}
        template={generateTemplate}
        onClose={() => setGenerateTemplate(null)}
      />
    </div>
  );
}
