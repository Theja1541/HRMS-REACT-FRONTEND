import { amountInWordsINR } from './amountInWords';

export function formatInvoiceNumber(id, date) {
  const compact = String(date).replace(/-/g, '');
  return `TXN-${compact}-${String(id).padStart(4, '0')}`;
}

export function formatIndianAmount(amount) {
  const n = parseFloat(amount) || 0;
  const hasDecimals = Math.round(n * 100) % 100 !== 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatInvoiceQty(qty) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(qty) || 0);
}

export function formatInvoiceDateLong(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDate();
  const mod100 = day % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? 'th'
      : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10];
  const month = d.toLocaleString('en-IN', { month: 'long' });
  return `${day}${suffix} ${month} ${d.getFullYear()}`;
}

export function formatAmountInWords(amount) {
  return amountInWordsINR(amount)
    .replace(/^Rupees /, '')
    .replace(/ Only$/, ' only');
}

export function joinAddress(parts) {
  return parts.filter(Boolean).join(', ') || '—';
}

/** Join address parts without a placeholder dash — for optional header blocks. */
export function joinAddressOptional(parts) {
  return parts.filter(Boolean).join(', ');
}

/** Display text/multiline field values in finance documents. */
export function formatDocumentField(value) {
  const text = value == null ? '' : String(value).trim();
  return text || '—';
}
