import { useCallback, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { cn } from '../../../utils/helpers';

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentDropzone({ label, accept, file, onFile, onClear }) {
  const [dragOver, setDragOver] = useState(false);

  const pickFile = useCallback(
    (incoming) => {
      if (!incoming) return;
      const allowed = accept.split(',').map((a) => a.trim().toLowerCase());
      const name = incoming.name.toLowerCase();
      const type = incoming.type.toLowerCase();
      const ok = allowed.some((a) => {
        if (a.startsWith('.')) return name.endsWith(a);
        if (a.endsWith('/*')) return type.startsWith(a.replace('/*', ''));
        return type === a;
      });
      if (!ok) return;
      if (incoming.size > 10 * 1024 * 1024) return;
      onFile(incoming);
    },
    [accept, onFile]
  );

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pickFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-colors',
          dragOver ? 'border-brand-500 bg-brand-50/50' : file ? 'border-brand-300 bg-brand-50/20' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
        )}
      >
        {file ? (
          <div className="flex items-center gap-3 p-3">
            <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
              <FileText size={16} className="text-brand-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-800 truncate">{file.name}</p>
              <p className="text-[10px] text-slate-400">{formatSize(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={onClear}
              className="p-1 rounded-md hover:bg-slate-200 text-slate-400"
              aria-label="Remove file"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 p-5 cursor-pointer text-center">
            <Upload size={18} className="text-slate-400" />
            <span className="text-xs text-slate-500">
              Drag & drop or <span className="text-brand-600 font-medium">browse</span>
            </span>
            <span className="text-[10px] text-slate-400">PDF, JPG, PNG, DOC — max 10 MB</span>
            <input
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </label>
        )}
      </div>
    </div>
  );
}
