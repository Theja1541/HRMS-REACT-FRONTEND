const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${tens[t]}${o ? ` ${ones[o]}` : ''}`.trim();
}

function threeDigits(n) {
  if (n === 0) return '';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h === 0) return twoDigits(rest);
  return `${ones[h]} Hundred${rest ? ` ${twoDigits(rest)}` : ''}`.trim();
}

/** Convert rupee amount to Indian English words (payslip "In Words" line). */
export function amountInWordsINR(amount) {
  const value = Math.round(parseFloat(amount) || 0);
  if (value === 0) return 'Rupees Zero Only';

  const crore = Math.floor(value / 10000000);
  const lakh = Math.floor((value % 10000000) / 100000);
  const thousand = Math.floor((value % 100000) / 1000);
  const hundredPart = value % 1000;

  const parts = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundredPart) parts.push(threeDigits(hundredPart));

  const titled = parts
    .join(' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return `Rupees ${titled} Only`;
}

export function formatPayslipAmount(amount) {
  const n = parseFloat(amount);
  if (!Number.isFinite(n)) return '0.00';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
