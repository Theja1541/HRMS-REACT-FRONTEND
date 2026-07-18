import { useCallback, useState } from 'react';
import { Award, Loader2 } from 'lucide-react';
import { employeeApi } from '../../api';
import DocumentPreviewModal from './DocumentPreviewModal';
import { cn } from '../../utils/helpers';

function buildParams({ templateId, version } = {}) {
  const params = {};
  if (templateId) params.template_id = templateId;
  if (version) params.version = version;
  return Object.keys(params).length ? params : undefined;
}

/**
 * Opens HTML preview for exited employees; pick any template version, then Download / Print.
 */
export default function GenerateExperienceLetterAction({
  employeeId,
  employeeCode,
  disabled = false,
  disabledReason,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);

  const loadTemplates = useCallback(async () => {
    const res = await employeeApi.listExperienceLetterTemplates(employeeId);
    return res?.data ?? res;
  }, [employeeId]);

  const loadPreview = useCallback(
    async (selection) => {
      const res = await employeeApi.previewExperienceLetterHtml(employeeId, buildParams(selection));
      return res?.data ?? res;
    },
    [employeeId]
  );

  const downloadPdf = useCallback(
    (selection) => employeeApi.downloadExperienceLetter(employeeId, buildParams(selection)),
    [employeeId]
  );

  if (!employeeId) return null;

  const handleOpen = () => {
    if (disabled) return;
    setOpening(true);
    setOpen(true);
    setTimeout(() => setOpening(false), 150);
  };

  return (
    <div className={cn('inline-flex flex-col items-end gap-1', className)}>
      <button
        type="button"
        disabled={disabled || opening}
        title={disabledReason || 'Preview experience letter with any template version'}
        onClick={handleOpen}
        className="btn-primary text-xs"
      >
        {opening ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
        Generate Experience Letter
      </button>
      {disabled && disabledReason && (
        <p className="text-[11px] text-slate-400 max-w-xs text-right">{disabledReason}</p>
      )}

      <DocumentPreviewModal
        open={open}
        onClose={() => setOpen(false)}
        title="Experience Letter"
        loadTemplates={loadTemplates}
        loadPreview={loadPreview}
        downloadPdf={downloadPdf}
        downloadFilename={`experience_letter_${employeeCode || employeeId}.pdf`}
      />
    </div>
  );
}
