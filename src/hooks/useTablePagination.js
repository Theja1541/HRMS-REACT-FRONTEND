import { useEffect, useMemo, useState } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/** Normalize pagination from API (top-level or nested, snake_case or camelCase). */
export function normalizePagination(raw, fallbackLimit = 20) {
  if (!raw) {
    return { page: 1, limit: fallbackLimit, total: 0, totalPages: 1 };
  }
  const page = raw.page ?? 1;
  const limit = raw.limit ?? fallbackLimit;
  const total = raw.total ?? 0;
  const totalPages =
    raw.totalPages ??
    raw.total_pages ??
    (limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1);
  return { page, limit, total, totalPages };
}

/**
 * Table pagination state for server-side or client-side lists.
 * Pass filter deps to resetDeps so page resets when filters change.
 */
export function useTablePagination({ defaultLimit = 20, resetDeps = [] } = {}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultLimit);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, ...resetDeps]);

  const queryParams = useMemo(() => ({ page, limit }), [page, limit]);

  const paginateClient = (items = []) => {
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    return {
      items: items.slice(start, start + limit),
      pagination: { page: safePage, limit, total, totalPages },
    };
  };

  return {
    page,
    limit,
    setPage,
    setLimit,
    queryParams,
    paginateClient,
  };
}
