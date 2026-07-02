import { Star } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function TicketStarRating({ value = 0, onChange, readOnly = false, size = 18 }) {
  return (
    <div className="flex items-center gap-0.5" role={readOnly ? 'img' : 'group'} aria-label={readOnly ? `${value} out of 5 stars` : 'Rate support'}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        if (readOnly) {
          return (
            <Star
              key={star}
              size={size}
              className={cn(filled ? 'fill-amber-400 text-amber-400' : 'text-slate-200')}
            />
          );
        }
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className="p-0.5 rounded hover:scale-110 transition-transform"
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
          >
            <Star
              size={size}
              className={cn(filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-300')}
            />
          </button>
        );
      })}
    </div>
  );
}
