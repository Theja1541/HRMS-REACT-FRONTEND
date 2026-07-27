import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileOutput, Loader2, Printer, X } from 'lucide-react';
import { employeeApi, hrApi } from '../../api';
import { DOCUMENT_TEMPLATE_TYPE_LABELS } from '../../constants/hr';
import { printHtmlDocument } from '../../utils/printDocument';
import { cn, localDateString } from '../../utils/helpers';

function empLabel(emp) {
  if (!emp) return '';
  const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
  return name ? `${name} (${emp.emp_code})` : emp.emp_code || String(emp.id);
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

/**
 * Pick an employee, merge template placeholders with live data, preview HTML, download PDF.
 */
export default function GenerateTemplateDocumentModal({ open, template, onClose }) {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [letterDate, setLetterDate] = useState(() => localDateString());
  const [html, setHtml] = useState('');
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [rendering, setRendering] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const getEligibleStatuses = (type) => {
    switch (type) {
      case 'relieving_letter':
      case 'experience_letter':
        return 'separated';
      case 'appointment_letter':
        return 'active,probation';
      default:
        return 'active,probation,on_notice,on_leave';
    }
  };

  const statusFilter = useMemo(() => getEligibleStatuses(template?.document_type), [template?.document_type]);

  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-for-document-generate', statusFilter],
    queryFn: () => employeeApi.list({ limit: 500, status: statusFilter }),
    enabled: open && !!statusFilter,
  });

  const employees = employeesData?.data?.employees || employeesData?.data || [];

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    const list = Array.isArray(employees) ? employees : [];
    if (!q) return list.slice(0, 200);
    return list
      .filter((e) => {
        const hay = `${e.first_name || ''} ${e.last_name || ''} ${e.emp_code || ''} ${e.email || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 200);
  }, [employees, employeeSearch]);

  useEffect(() => {
    if (!open) {
      setEmployeeId('');
      setEmployeeSearch('');
      setLetterDate(localDateString());
      setHtml('');
      setMeta(null);
      setError('');
      setRendering(false);
      setDownloading(false);
    }
  }, [open]);

  if (!open || !template) return null;

  const typeLabel =
    DOCUMENT_TEMPLATE_TYPE_LABELS[template.document_type] || template.document_type;

  const buildParams = () => {
    const params = { employee_id: Number(employeeId) };
    if (letterDate) params.letter_date = letterDate;
    return params;
  };

  const handleRender = async () => {
    if (!employeeId) {
      setError('Select an employee to fill placeholders');
      return;
    }
    setRendering(true);
    setError('');
    try {
      const res = await hrApi.previewDocumentTemplateHtml(template.id, buildParams());
      const payload = res?.data || res;
      setHtml(payload.html || '');
      setMeta({
        employee: payload.employee,
        company: payload.company,
        template: payload.template,
      });
    } catch (err) {
      setHtml('');
      setMeta(null);
      setError(err.response?.data?.error?.message || err.message || 'Failed to render document');
    } finally {
      setRendering(false);
    }
  };

  const handleDownload = async () => {
    if (!employeeId) {
      setError('Select an employee first');
      return;
    }
    setDownloading(true);
    setError('');
    try {
      const params = buildParams();
      let previewMeta = meta;
      if (!html) {
        const res = await hrApi.previewDocumentTemplateHtml(template.id, params);
        const payload = res?.data || res;
        setHtml(payload.html || '');
        previewMeta = {
          employee: payload.employee,
          company: payload.company,
          template: payload.template,
        };
        setMeta(previewMeta);
      }
      const blob = await hrApi.downloadDocumentTemplatePdf(template.id, params);
      const code = previewMeta?.employee?.emp_code || employeeId;
      const filename = `${template.document_type || 'document'}_${code}.pdf`;
      triggerBlobDownload(blob, filename);
      queryClient.invalidateQueries({ queryKey: ['generated-documents'] });
    } catch (err) {
      setError(await parseBlobError(err, 'Failed to generate PDF'));
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (!html) return;
    printHtmlDocument(html, {
      title: template.name || typeLabel,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative bg-white rounded-2xl w-full max-w-5xl shadow-xl flex flex-col max-h-[92vh]">
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileOutput size={16} className="text-brand-600 shrink-0" />
              Generate document
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {template.name} · {typeLabel}
              {template.version != null ? ` · v${template.version}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600">Employee *</label>
            <input
              type="search"
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              placeholder="Filter by name or code…"
              className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
            <select
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                setHtml('');
                setMeta(null);
                setError('');
              }}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              required
            >
              <option value="">
                {employeesLoading ? 'Loading employees…' : 'Select employee'}
              </option>
              {filteredEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {empLabel(emp)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Letter date</label>
            <input
              type="date"
              value={letterDate}
              onChange={(e) => setLetterDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="px-6 py-3 flex flex-wrap items-center gap-2 border-b border-slate-100 shrink-0">
          <button
            type="button"
            disabled={!employeeId || rendering}
            onClick={handleRender}
            className="btn-primary text-xs"
          >
            {rendering ? <Loader2 size={13} className="animate-spin" /> : null}
            {rendering ? 'Rendering…' : 'Render with data'}
          </button>
          <button
            type="button"
            disabled={!html || downloading}
            onClick={handlePrint}
            className="btn-secondary text-xs"
          >
            <Printer size={13} /> Print
          </button>
          <button
            type="button"
            disabled={!employeeId || downloading}
            onClick={handleDownload}
            className="btn-secondary text-xs"
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
          {meta?.employee && (
            <p className="text-[11px] text-slate-500 ml-auto">
              Filled for <span className="font-medium text-slate-700">{meta.employee.name}</span>
              {meta.company?.name ? ` · ${meta.company.name}` : ''}
            </p>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden px-6 py-4">
          {error && (
            <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div
            className={cn(
              'border border-slate-200 rounded-lg overflow-hidden bg-white h-[min(52vh,480px)]',
              !html && 'flex items-center justify-center'
            )}
          >
            {html ? (
              <iframe title="Rendered document" sandbox="" srcDoc={html} className="w-full h-full bg-white" />
            ) : (
              <p className="text-xs text-slate-400 text-center px-6">
                Select an employee and click <span className="font-medium text-slate-600">Render with data</span> to
                replace placeholders like {'{{employee_name}}'} with live employee and company values.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
