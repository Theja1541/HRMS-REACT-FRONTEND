import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  PAYSLIP_CONTENT_WIDTH_MM,
  PAYSLIP_PAGE_MARGIN_MM,
  PAYSLIP_PRINT_ELEMENT_ID,
  inlineDocumentImages,
  mmToPx,
  mountPrintFrame,
  waitForDocumentImages,
} from './printDocument';

/** Preview width — matches A4 content column used for export */
export const PAYSLIP_EXPORT_WIDTH = mmToPx(PAYSLIP_CONTENT_WIDTH_MM);

/** A4 document width at 96 DPI — matches 210mm finance print layouts */
export const FINANCE_A4_EXPORT_WIDTH = 794;

const CAPTURE_SCALE = 2;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

const EXPORT_MARKERS = '[data-payslip-export], [data-quotation-export], [data-finance-export]';

/** @see exportQuotationPdf — shared table width fix for html2canvas fidelity */
export function fixTableColWidths(table, tableWidth) {
  const cols = Array.from(table.querySelectorAll('colgroup > col'));
  if (cols.length === 0) return;

  const colPx = cols.map((col) => {
    const w = col.style.width || '';
    let px = 0;
    if (w.endsWith('%')) {
      px = Math.round((parseFloat(w) / 100) * tableWidth);
    } else if (w.endsWith('px')) {
      px = parseFloat(w);
    }
    if (px > 0) col.style.width = `${px}px`;
    return px;
  });

  for (const row of Array.from(table.querySelectorAll('tr'))) {
    const cells = Array.from(row.querySelectorAll('td, th'));
    if (cells.length === cols.length) {
      cells.forEach((cell, i) => {
        if (colPx[i] > 0) {
          cell.style.width = `${colPx[i]}px`;
          cell.style.minWidth = `${colPx[i]}px`;
        }
      });
      break;
    }
  }
}

/**
 * html2canvas mishandles flex — flatten to table layout in the clone only.
 */
export function flattenFlexForCapture(scope) {
  const flexEls = Array.from(scope.querySelectorAll('*')).filter(
    (el) => el.style && el.style.display === 'flex'
  );

  flexEls.forEach((container) => {
    const alignItems = container.style.alignItems;
    const vAlign = alignItems === 'center' ? 'middle' : alignItems === 'flex-end' ? 'bottom' : 'top';

    container.style.display = 'table';
    container.style.width = '100%';
    container.style.tableLayout = 'fixed';
    container.style.borderSpacing = '0';

    Array.from(container.children).forEach((child) => {
      if (!child.style) return;
      child.style.display = 'table-cell';
      child.style.verticalAlign = vAlign;
      child.style.float = 'none';
      const grows = child.style.flex || child.style.flexGrow;
      if (grows && !child.style.width) {
        child.style.width = 'auto';
      }
    });
  });
}

function preparePayslipCloneForCapture(doc, cloneEl, widthPx) {
  const root =
    doc.getElementById(PAYSLIP_PRINT_ELEMENT_ID) ||
    doc.querySelector('[data-payslip-export]') ||
    cloneEl;
  if (!root) return;

  Object.assign(root.style, {
    width: `${widthPx}px`,
    maxWidth: `${widthPx}px`,
    minWidth: `${widthPx}px`,
    margin: '0',
    padding: '0',
    transform: 'none',
    background: '#ffffff',
    color: '#000000',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '11px',
    lineHeight: '1.35',
    boxSizing: 'border-box',
    overflow: 'visible',
  });

  flattenFlexForCapture(root);

  root.querySelectorAll('table').forEach((table) => {
    const cols = table.querySelectorAll(':scope > colgroup > col');
    table.style.borderCollapse = 'collapse';
    table.style.borderSpacing = '0';
    if (cols.length >= 2) {
      table.style.tableLayout = 'fixed';
      table.style.width = `${widthPx}px`;
      fixTableColWidths(table, widthPx);
    }
  });

  // Keep thin 1px grid — prevent doubled/thick borders from inline + parent CSS
  root.querySelectorAll('td, th').forEach((cell) => {
    const isNested = cell.closest('table')?.parentElement?.closest('table');
    if (isNested) {
      cell.style.border = 'none';
      return;
    }
    cell.style.borderWidth = '1px';
    cell.style.borderStyle = 'solid';
    cell.style.borderColor = '#000000';
    cell.style.boxShadow = 'none';
    cell.style.outline = 'none';
  });

  root.querySelectorAll('img').forEach((img) => {
    img.crossOrigin = 'anonymous';
    img.style.display = 'block';
    img.style.objectFit = 'contain';
    img.style.maxHeight = '64px';
  });
}

function waitForFonts(doc) {
  return doc.fonts?.ready ?? Promise.resolve();
}

/**
 * Mount View Payslip into an isolated A4 print frame and capture a canvas.
 * Same HTML + CSS as the on-screen design — avoids scroll-container distortion.
 */
export async function capturePayslipA4Canvas(element) {
  if (!element) throw new Error('Payslip element not found');

  const elementId = element.id || PAYSLIP_PRINT_ELEMENT_ID;
  if (!element.id) element.id = PAYSLIP_PRINT_ELEMENT_ID;

  const widthPx = mmToPx(PAYSLIP_CONTENT_WIDTH_MM);
  const { doc, cleanup } = mountPrintFrame(element, elementId, {
    title: 'Payslip',
    forCapture: true,
  });

  try {
    await inlineDocumentImages(doc);
    await waitForDocumentImages(doc);
    await waitForFonts(doc);

    const docEl = doc.getElementById(elementId) || doc.querySelector('[data-payslip-export]');
    if (!docEl) throw new Error('Payslip print element not found');

    const canvas = await html2canvas(docEl, {
      scale: CAPTURE_SCALE,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: widthPx,
      height: docEl.scrollHeight,
      windowWidth: widthPx + 40,
      windowHeight: docEl.scrollHeight + 40,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc, cloneEl) => {
        preparePayslipCloneForCapture(clonedDoc, cloneEl, widthPx);
      },
    });

    return { canvas, cleanup };
  } catch (err) {
    cleanup();
    throw err;
  }
}

/** Legacy alias used by FnF / other modules — captures element in-place. */
export async function capturePayslipCanvas(element, { width = PAYSLIP_EXPORT_WIDTH } = {}) {
  if (!element) throw new Error('Document element not found');

  await document.fonts?.ready;
  const previewRect = element.getBoundingClientRect();
  const exportWidth = Math.round(previewRect.width || width) || width;
  const exportHeight = Math.round(previewRect.height || element.scrollHeight);

  element.querySelectorAll('img').forEach((img) => {
    img.crossOrigin = 'anonymous';
  });

  await Promise.all(
    Array.from(element.querySelectorAll('img')).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = resolve;
          img.onerror = resolve;
        })
    )
  );

  return html2canvas(element, {
    scale: CAPTURE_SCALE,
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: false,
    logging: false,
    width: exportWidth,
    height: exportHeight,
    windowWidth: Math.max(document.documentElement.scrollWidth, exportWidth),
    windowHeight: Math.max(document.documentElement.scrollHeight, exportHeight),
    scrollX: 0,
    scrollY: 0,
    onclone: (doc, cloneEl) => {
      const target = doc.querySelector(EXPORT_MARKERS) || cloneEl;
      if (target) {
        preparePayslipCloneForCapture(doc, target, exportWidth);
      }
    },
  });
}

function placeImageOnA4Pdf(canvas, format = 'PNG') {
  const isPng = format === 'PNG';
  const imgData = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', isPng ? 1.0 : 0.94);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  const margin = PAYSLIP_PAGE_MARGIN_MM;
  const maxW = A4_WIDTH_MM - margin * 2;
  const maxH = A4_HEIGHT_MM - margin * 2;

  let drawW = maxW;
  let drawH = (canvas.height / canvas.width) * drawW;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = (canvas.width / canvas.height) * drawH;
  }

  const offsetX = (A4_WIDTH_MM - drawW) / 2;
  const offsetY = margin;

  pdf.addImage(imgData, format, offsetX, offsetY, drawW, drawH, undefined, isPng ? 'SLOW' : 'MEDIUM');
  return pdf.output('blob');
}

/** Build a full A4 white-page canvas with the payslip content centered (for Image download). */
function composeA4PageCanvas(contentCanvas) {
  const pageScale = CAPTURE_SCALE;
  const pageW = Math.round(mmToPx(A4_WIDTH_MM) * pageScale);
  const pageH = Math.round(mmToPx(A4_HEIGHT_MM) * pageScale);
  const margin = Math.round(mmToPx(PAYSLIP_PAGE_MARGIN_MM) * pageScale);

  const page = document.createElement('canvas');
  page.width = pageW;
  page.height = pageH;
  const ctx = page.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pageW, pageH);

  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  let drawW = maxW;
  let drawH = (contentCanvas.height / contentCanvas.width) * drawW;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = (contentCanvas.width / contentCanvas.height) * drawH;
  }
  const x = (pageW - drawW) / 2;
  const y = margin;
  ctx.drawImage(contentCanvas, x, y, drawW, drawH);
  return page;
}

/**
 * Render document onto PDF.
 * Payslip (id=payslip-view-print) → isolated A4 print frame, true A4 page.
 * Other docs (FnF etc.) → in-place capture.
 */
export async function renderElementToPdfBlob(element, { fitSinglePage = false } = {}) {
  const isPayslip = element?.id === PAYSLIP_PRINT_ELEMENT_ID;
  if (isPayslip) {
    const { canvas, cleanup } = await capturePayslipA4Canvas(element);
    try {
      let blob = placeImageOnA4Pdf(canvas, 'PNG');
      if (blob.size > MAX_PDF_BYTES) {
        blob = placeImageOnA4Pdf(canvas, 'JPEG');
      }
      return blob;
    } finally {
      cleanup();
    }
  }

  // Legacy / FnF / finance — in-place capture
  const canvas = await capturePayslipCanvas(element);
  if (fitSinglePage) {
    let blob = placeImageOnA4Pdf(canvas, 'PNG');
    if (blob.size > MAX_PDF_BYTES) blob = placeImageOnA4Pdf(canvas, 'JPEG');
    return blob;
  }

  const pageW = canvas.width / CAPTURE_SCALE;
  const pageH = canvas.height / CAPTURE_SCALE;
  const pdf = new jsPDF({
    orientation: pageW > pageH ? 'landscape' : 'portrait',
    unit: 'px',
    format: [pageW, pageH],
    compress: true,
    hotfixes: ['px_scaling'],
  });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, pageH, undefined, 'SLOW');
  return pdf.output('blob');
}

export function downloadPdfBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportPayslipPdf(element, filename) {
  const blob = await renderElementToPdfBlob(element);
  downloadPdfBlob(blob, filename);
  return blob;
}

/** Download Image as a full A4 white sheet with the payslip (matches PDF layout). */
export async function exportPayslipImage(element, filename) {
  const { canvas, cleanup } = await capturePayslipA4Canvas(element);
  try {
    const pageCanvas = composeA4PageCanvas(canvas);
    const link = document.createElement('a');
    link.download = filename;
    link.href = pageCanvas.toDataURL('image/png', 1.0);
    link.click();
  } finally {
    cleanup();
  }
}

export function downloadPngCanvas(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}
