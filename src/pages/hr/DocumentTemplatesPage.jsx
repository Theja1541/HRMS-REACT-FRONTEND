import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Braces,
  Eye,
  FileCode2,
  FileOutput,
  FileText,
  LayoutTemplate,
  Pencil,
  Plus,
  Replace,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { hrApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
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
import { usePortalRole } from '../../hooks/usePortalRole';

const PLACEHOLDER_TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

const TYPE_ACCENT = {
  offer_letter: 'bg-sky-50 text-sky-700 border-sky-100',
  appointment_letter: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  confirmation_letter: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  increment_letter: 'bg-amber-50 text-amber-800 border-amber-100',
  relieving_letter: 'bg-orange-50 text-orange-700 border-orange-100',
  experience_letter: 'bg-teal-50 text-teal-700 border-teal-100',
  salary_certificate: 'bg-violet-50 text-violet-700 border-violet-100',
  other: 'bg-slate-50 text-slate-600 border-slate-200',
};

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
  change_note: '',
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
    change_note: '',
  };
}

function buildPayload(form) {
  const payload = {
    name: form.name.trim(),
    document_type: form.document_type,
    status: form.status,
    is_default: !!form.is_default,
    template_html: form.template_html,
  };
  if (form.change_note?.trim()) {
    payload.change_note = form.change_note.trim().slice(0, 255);
  }
  return payload;
}

function TypeBadge({ type }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border',
        TYPE_ACCENT[type] || TYPE_ACCENT.other
      )}
    >
      {documentTypeLabel(type)}
    </span>
  );
}

function TemplateHtmlEditor({ value, onChange, onImportFile, importing }) {
  const [tab, setTab] = useState('write');
  const [panelMode, setPanelMode] = useState('insert');
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
    setReplaceMessage(end > start ? `Replaced selection with ${token}` : `Inserted ${token}`);
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
        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Letter content *
          </label>
          <p className="text-[10px] text-slate-400 mt-0.5">
            HTML with merge fields like {'{{employee_name}}'}
          </p>
        </div>
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
                {importing ? 'Importing…' : 'Import file'}
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
              placeholder={`Use a starter template above, or write HTML with placeholders:\n\nDear {{employee_name}},\nWe are pleased to offer you the role of {{employee_designation}}…`}
              className="w-full h-[320px] lg:h-[420px] px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono leading-relaxed text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-400 resize-y"
            />
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white h-[320px] lg:h-[420px]">
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
                    {selection.text.length > 40 ? `${selection.text.slice(0, 40)}…` : selection.text}
                  </code>
                </span>
                <button type="button" className="text-brand-700 hover:underline" onClick={useSelectionAsFind}>
                  Use in replace
                </button>
              </>
            ) : (
              <span>Select text then click a variable to replace it, or use Replace.</span>
            )}
          </div>

          {usedKeys.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
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

        <aside className="border border-slate-200 rounded-xl bg-slate-50 flex flex-col min-h-[280px] lg:h-[420px] overflow-hidden">
          <div className="px-3 py-2.5 border-b border-slate-200 bg-white shrink-0">
            <p className="text-[11px] font-semibold text-slate-700">Merge fields</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Insert or replace with employee / company data</p>
            <div className="mt-2 inline-flex rounded-lg border border-slate-200 overflow-hidden w-full">
              <button
                type="button"
                onClick={() => setPanelMode('insert')}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium',
                  panelMode === 'insert' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                <Braces size={11} /> Insert
              </button>
              <button
                type="button"
                onClick={() => setPanelMode('replace')}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium border-l border-slate-200',
                  panelMode === 'replace' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
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
                  placeholder="e.g. Priya Sharma"
                  className="mt-1 w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-white"
                />
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
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => handleReplace('one')} className="btn-secondary text-[11px] flex-1">
                  Replace first
                </button>
                <button type="button" onClick={() => handleReplace('all')} className="btn-primary text-[11px] flex-1">
                  Replace all
                </button>
              </div>
              {replaceMessage && (
                <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1.5">
                  {replaceMessage}
                </p>
              )}
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
                        title={variable.description}
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
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-100">
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Upload document template</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Import an existing DOCX or HTML letter. Converted HTML stays editable.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50">
            <X size={16} />
          </button>
        </div>

        <form
          className="px-6 py-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-center">
            <Upload size={22} className="mx-auto text-slate-300 mb-2" />
            <label className="text-xs font-medium text-slate-600">Template file *</label>
            <input
              type="file"
              accept=".html,.htm,.docx,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-white file:text-slate-700 file:border file:border-slate-200 hover:file:bg-slate-100"
              onChange={(e) => {
                const next = e.target.files?.[0] || null;
                setFile(next);
                if (next && !form.name.trim()) {
                  const base = next.name
                    .replace(/\.(docx|html?|htm)$/i, '')
                    .replace(/[_-]+/g, ' ')
                    .trim();
                  if (base) setForm({ ...form, name: base.slice(0, 150) });
                }
              }}
            />
            {file && (
              <p className="mt-2 text-[11px] text-slate-500 truncate">
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-400"
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

          <label className="flex items-start gap-2.5 text-sm text-slate-700 rounded-lg border border-slate-200 px-3 py-2.5 bg-white">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
            />
            <span>
              <span className="font-medium">Set as default</span>
              <span className="block text-xs text-slate-400 mt-0.5">
                Used automatically when generating this document type
              </span>
            </span>
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

function TemplateModal({
  mode,
  form,
  setForm,
  onClose,
  onSubmit,
  loading,
  error,
  setError,
  templateId,
  starters = [],
}) {
  const [importing, setImporting] = useState(false);
  const { data: versionsData } = useQuery({
    queryKey: ['document-template-versions', templateId],
    queryFn: () => hrApi.listDocumentTemplateVersions(templateId),
    enabled: mode === 'edit' && !!templateId,
  });
  const versions = versionsData?.data?.versions || [];

  const starterForType = useMemo(
    () => starters.find((s) => s.document_type === form.document_type) || null,
    [starters, form.document_type]
  );

  const applyStarter = (starter) => {
    if (!starter) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name.trim() ? prev.name : starter.name,
      document_type: starter.document_type,
      template_html: starter.template_html,
      is_default: prev.is_default || !!starter.is_default,
      status: prev.status || starter.status || 'active',
    }));
  };

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
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-2xl w-full max-w-5xl shadow-xl flex flex-col max-h-[92vh] border border-slate-100">
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900">
                {mode === 'create' ? 'New document template' : 'Edit document template'}
              </h3>
              {mode === 'edit' && form.version != null && (
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wide text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  v{form.version}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'edit'
                ? 'Saving HTML changes creates a new version. Older versions stay available for regeneration.'
                : 'Start from a standard letter, then customize placeholders and branding.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 shrink-0">
            <X size={16} />
          </button>
        </div>

        <form
          className="flex flex-col flex-1 min-h-0"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {mode === 'create' && starters.length > 0 && (
              <section className="rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50/80 via-white to-white p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Sparkles size={16} className="text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Start from a standard letter</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Loads professional HTML with merge fields for the selected document type.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {starters.map((starter) => {
                    const selected = form.document_type === starter.document_type && !!form.template_html;
                    return (
                      <button
                        key={starter.document_type}
                        type="button"
                        onClick={() => applyStarter(starter)}
                        className={cn(
                          'text-left px-3 py-2 rounded-lg border text-[11px] transition-colors max-w-[200px]',
                          selected
                            ? 'border-brand-400 bg-white shadow-sm ring-1 ring-brand-200'
                            : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40'
                        )}
                      >
                        <span className="font-semibold text-slate-800 block truncate">{starter.name}</span>
                        <span className="text-slate-400 line-clamp-2 mt-0.5">{starter.description}</span>
                      </button>
                    );
                  })}
                </div>
                {starterForType && !form.template_html.trim() && (
                  <button
                    type="button"
                    onClick={() => applyStarter(starterForType)}
                    className="mt-3 text-[11px] font-medium text-brand-700 hover:underline"
                  >
                    Load “{starterForType.name}” into editor →
                  </button>
                )}
              </section>
            )}

            <section className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Template details</p>
              <div>
                <label className="text-xs font-medium text-slate-600">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-400"
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
                    onChange={(e) => {
                      const document_type = e.target.value;
                      setForm((prev) => ({ ...prev, document_type }));
                    }}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start gap-2.5 text-sm text-slate-700 rounded-lg border border-slate-200 px-3 py-2.5 bg-slate-50/50">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={form.is_default}
                    onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                    disabled={mode === 'edit' && form.is_default}
                  />
                  <span>
                    <span className="font-medium">Default for this type</span>
                    <span className="block text-xs text-slate-400 mt-0.5">
                      One default is required per document type
                    </span>
                  </span>
                </label>
                {mode === 'edit' && (
                  <div>
                    <label className="text-xs font-medium text-slate-600">Change note</label>
                    <input
                      value={form.change_note || ''}
                      onChange={(e) => setForm({ ...form, change_note: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="Optional — shown in version history"
                      maxLength={255}
                    />
                  </div>
                )}
              </div>
            </section>

            <section>
              <TemplateHtmlEditor
                value={form.template_html}
                onChange={(template_html) => setForm({ ...form, template_html })}
                onImportFile={handleImportFile}
                importing={importing}
              />
            </section>

            {mode === 'edit' && versions.length > 0 && (
              <section className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-700">Version history</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Load an older version into the editor, then save to publish a new version.
                  </p>
                </div>
                <ul className="max-h-44 overflow-y-auto divide-y divide-slate-100">
                  {versions.map((v) => (
                    <li
                      key={`${v.document_template_id}-${v.version}`}
                      className="px-3 py-2.5 flex items-center justify-between gap-3 text-xs"
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
                            change_note: `Restored from v${v.version}`,
                          }))
                        }
                      >
                        Load into editor
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end shrink-0 bg-white rounded-b-2xl">
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
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;
  const canWrite = WRITE_ROLES.has(role);

  const [search, setSearch] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [generateTemplate, setGenerateTemplate] = useState(null);
  const [seedMessage, setSeedMessage] = useState('');

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

  const { data: defaultsData } = useQuery({
    queryKey: ['document-template-defaults', selectedTenantId],
    queryFn: () => hrApi.listDocumentTemplateDefaults(),
    enabled: !tenantRequired && canWrite,
    staleTime: 60_000,
  });

  const templates = data?.data?.templates || [];
  const starters = defaultsData?.data?.defaults || [];

  const stats = useMemo(() => {
    const all = templates;
    return {
      total: all.length,
      active: all.filter((t) => t.status === 'active').length,
      defaults: all.filter((t) => t.is_default).length,
    };
  }, [templates]);

  const missingDefaultTypes = useMemo(() => {
    if (!starters.length) return [];
    const present = new Set(templates.map((t) => t.document_type));
    return starters.filter((s) => !present.has(s.document_type));
  }, [starters, templates]);

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
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to create template'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => hrApi.updateDocumentTemplate(id, payload),
    onSuccess: () => {
      invalidate();
      setModal(null);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to update template'),
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
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to upload template'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => hrApi.deleteDocumentTemplate(id),
    onSuccess: () => invalidate(),
    onError: (err) => {
      window.alert(err.response?.data?.error?.message || 'Failed to delete template');
    },
  });

  const seedMutation = useMutation({
    mutationFn: () => hrApi.seedDefaultDocumentTemplates(),
    onSuccess: (res) => {
      invalidate();
      const seeded = res?.data?.seeded ?? 0;
      setSeedMessage(
        seeded > 0
          ? `Installed ${seeded} standard template${seeded === 1 ? '' : 's'}.`
          : 'All standard letter types already have a template.'
      );
    },
    onError: (err) => {
      setSeedMessage(err.response?.data?.error?.message || 'Failed to install default templates');
    },
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

  const handleDelete = (template) => {
    if (template.is_default) {
      window.alert('Default templates cannot be deleted. Set another template as default first.');
      return;
    }
    if (!window.confirm(`Delete template “${template.name}”? This cannot be undone.`)) return;
    deleteMutation.mutate(template.id);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setFormError('Template name is required');
      return;
    }
    if (!form.template_html.trim()) {
      setFormError('Template HTML is required — pick a starter or write content');
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

  const filtersActive = !!(search || documentType || status);
  const showEmpty = !isLoading && !error && templates.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="People · Documents"
        title="Document Templates"
        subtitle="Reusable HTML letters for offers, appointments, confirmations, exits, and salary certificates"
        actions={
          canWrite ? (
            <div className="flex items-center gap-2 flex-wrap">
              {(showEmpty || missingDefaultTypes.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSeedMessage('');
                    seedMutation.mutate();
                  }}
                  disabled={seedMutation.isPending}
                  className="btn-secondary text-xs"
                >
                  <Sparkles size={14} />
                  {seedMutation.isPending
                    ? 'Installing…'
                    : showEmpty
                      ? 'Install standard templates'
                      : `Add ${missingDefaultTypes.length} missing`}
                </button>
              )}
              <button type="button" onClick={openUpload} className="btn-secondary text-xs">
                <Upload size={14} /> Upload DOCX/HTML
              </button>
              <button type="button" onClick={openCreate} className="btn-primary text-xs">
                <Plus size={14} /> New template
              </button>
            </div>
          ) : null
        }
      />

      {!isLoading && templates.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard label="Templates" value={stats.total} icon={LayoutTemplate} tone="brand" />
          <StatCard label="Active" value={stats.active} icon={FileText} tone="emerald" />
          <StatCard label="Defaults" value={stats.defaults} icon={Star} tone="amber" />
        </div>
      )}

      {seedMessage && (
        <div className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl border border-emerald-100 bg-emerald-50 text-sm text-emerald-800">
          <p>{seedMessage}</p>
          <button type="button" onClick={() => setSeedMessage('')} className="text-emerald-600 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {canWrite && missingDefaultTypes.length > 0 && templates.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl border border-sky-100 bg-sky-50/80 text-sm text-sky-900">
          <div className="flex-1 min-w-0">
            <p className="font-medium">Missing standard letters</p>
            <p className="text-xs text-sky-700/80 mt-0.5">
              {missingDefaultTypes.map((t) => documentTypeLabel(t.document_type)).join(', ')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSeedMessage('');
              seedMutation.mutate();
            }}
            disabled={seedMutation.isPending}
            className="btn-primary text-xs shrink-0"
          >
            <Sparkles size={13} />
            {seedMutation.isPending ? 'Installing…' : 'Install missing defaults'}
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="ds-toolbar">
          <div className="toolbar-row">
          <div className="relative flex-1 min-w-0 sm:max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="ds-input pl-9 w-full"
            />
          </div>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="ds-select w-full sm:w-auto"
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
            className="ds-select w-full sm:w-auto"
          >
            <option value="">All statuses</option>
            {DOCUMENT_TEMPLATE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {filtersActive && (
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
        </div>

        {isLoading ? (
          <p className="p-10 text-center text-slate-400 text-sm">Loading templates…</p>
        ) : error ? (
          <p className="p-10 text-center text-red-500 text-sm">
            {error.response?.data?.error?.message || error.message || 'Failed to load templates'}
          </p>
        ) : showEmpty ? (
          <div className="px-6 py-14 text-center max-w-lg mx-auto">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-4">
              <FileText size={26} className="text-brand-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No document templates yet</h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Install ready-made offer, appointment, confirmation, increment, relieving, experience, and
              salary certificate letters — or create your own from scratch.
            </p>
            {canWrite && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  className="btn-primary text-xs"
                >
                  <Sparkles size={14} />
                  {seedMutation.isPending ? 'Installing…' : 'Install standard templates'}
                </button>
                <button type="button" onClick={openCreate} className="btn-secondary text-xs">
                  <Plus size={13} /> Create blank
                </button>
              </div>
            )}
            {filtersActive && (
              <p className="text-xs text-slate-400 mt-4">Or try clearing search / filters</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {templates.map((template) => (
              <article
                key={template.id}
                className={cn(
                  'group relative rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3 hover:border-brand-200 hover:shadow-sm transition-all',
                  template.status === 'inactive' && 'opacity-70'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <TypeBadge type={template.document_type} />
                  <div className="flex items-center gap-1">
                    {template.is_default && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase bg-amber-50 text-amber-800 border border-amber-100 px-1.5 py-0.5 rounded-full"
                        title="Default for this document type"
                      >
                        <Star size={10} /> Default
                      </span>
                    )}
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
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900 truncate" title={template.name}>
                    {template.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Version <span className="font-mono text-slate-600">v{template.version}</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    Updated {formatDate(template.updated_at)}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setGenerateTemplate(template)}
                    disabled={template.status !== 'active'}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-700 hover:text-brand-800 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <FileOutput size={13} /> Generate
                  </button>
                  <div className="flex items-center gap-0.5">
                    {canWrite && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(template)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(template)}
                          disabled={template.is_default || deleteMutation.isPending}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-30 disabled:pointer-events-none"
                          title={template.is_default ? 'Default templates cannot be deleted' : 'Delete'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
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
          starters={starters}
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
