import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatStoryPoints(points) {
  if (points == null || points === '') return null;
  const n = parseFloat(points);
  if (Number.isNaN(n)) return null;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function getInitials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Local calendar date as YYYY-MM-DD (avoids UTC shift from toISOString). */
export function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** First and last day of the month containing `date`, as YYYY-MM-DD. */
export function monthBounds(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const month = String(m + 1).padStart(2, '0');
  const lastDay = new Date(y, m + 1, 0).getDate();
  return {
    from: `${y}-${month}-01`,
    to: `${y}-${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

/** Resolve uploaded asset paths (/uploads/...) for img src */
export function resolveAssetUrl(url) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return url.startsWith('/') ? url : `/${url}`;
}
