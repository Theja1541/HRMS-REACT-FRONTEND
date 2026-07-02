import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function ExportExcelButton({
  onExport,
  label = 'Export Excel',
  className,
  disabled = false,
  size = 'sm',
}) {
  const [exporting, setExporting] = useState(false);

  const handleClick = async () => {
    if (exporting || disabled) return;
    setExporting(true);
    try {
      await onExport();
    } catch (err) {
      window.alert(err?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || exporting}
      className={cn(
        size === 'sm' ? 'btn-secondary text-xs' : 'btn-secondary',
        className
      )}
    >
      <FileSpreadsheet size={14} />
      {exporting ? 'Exporting…' : label}
    </button>
  );
}
