import { PAGE_SIZE_OPTIONS } from '../../hooks/useTablePagination';
import { cn } from '../../utils/helpers';

/**
 * Standard footer for data tables: entries-per-page, range summary, prev/next.
 */
export default function TablePagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className,
}) {
  const pages = totalPages ?? Math.max(1, Math.ceil((total || 0) / (limit || 1)));
  const safePage = Math.min(page, pages);
  const start = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const end = Math.min(safePage * limit, total);

  if (total === 0) return null;

  return (
    <div
      className={cn(
        'px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span>Show</span>
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700"
          aria-label="Entries per page"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span>entries</span>
      </div>

      <span>
        Showing {start} to {end} of {total} entries
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="btn-secondary text-xs py-1 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="whitespace-nowrap">
          Page {safePage} of {pages}
        </span>
        <button
          type="button"
          disabled={safePage >= pages}
          onClick={() => onPageChange(safePage + 1)}
          className="btn-secondary text-xs py-1 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
