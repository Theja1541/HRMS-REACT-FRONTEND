import { amountInWordsINR } from './amountInWords';
import { formatInvoiceDateLong, formatInvoiceQty, joinAddress } from './invoiceFormat';

export function formatReceiptINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(amount) || 0);
}

export function formatReceiptAmountPlain(amount) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(amount) || 0);
}

export function formatReceiptPurpose(receiptNumber, dateStr) {
  return `Payment paid against Transaction ${receiptNumber} dated ${formatInvoiceDateLong(dateStr)}`;
}

export function formatWebsiteDisplay(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

export function receiptAmountInWords(amount) {
  return amountInWordsINR(amount);
}
