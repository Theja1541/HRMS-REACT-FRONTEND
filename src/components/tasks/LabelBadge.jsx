import { X } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function LabelBadge({ label, onRemove, removable, className }) {
  if (!label) return null;

  return (
    <span
      className={cn(
        'text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 max-w-full',
        className
      )}
      style={{
        backgroundColor: label.color || '#64748b',
        color: '#fff',
      }}
      title={label.name}
    >
      <span className="truncate">{label.name}</span>
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(label);
          }}
          className="hover:opacity-80 shrink-0"
          aria-label={`Remove ${label.name}`}
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
