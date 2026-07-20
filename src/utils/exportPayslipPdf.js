import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/** Fixed export width — matches on-screen payslip preview */
export const PAYSLIP_EXPORT_WIDTH = 640;

/** A4 document width at 96 DPI — matches 210mm finance print layouts */
export const FINANCE_A4_EXPORT_WIDTH = 794;

const CAPTURE_SCALE = 3;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

const EXPORT_MARKERS = '[data-payslip-export], [data-quotation-export], [data-finance-export]';

/** @see exportQuotationPdf — shared table width fix for html2canvas fidelity */
export function fixTableColWidths(table, tableWidth) {
  const cols = Array.from(table.querySelectorAll('colgroup > col'));
  if (cols.length === 0) return;

  // Step 1: convert col widths from % → px
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

  // Step 2: apply widths to the first row that has exactly cols.length cells
  // (skips the company-header row which uses colSpan=4 on one cell)
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
 * html2canvas 1.4.1 does not lay out CSS flexbox correctly: `display:flex`
 * containers collapse and `flex:1` / percentage-width children render at the
 * wrong size. The payslip header (logo + company title) relies on flexbox, so
 * it breaks in the exported PDF/Image/Email while looking fine on screen.
 *
 * Convert every flex container in the CLONE (never the live view) to an
 * equivalent CSS table layout, which html2canvas renders faithfully.
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
      // A `flex:1` child has no explicit width — let the table cell auto-size.
      const grows = child.style.flex || child.style.flexGrow;
      if (grows && !child.style.width) {
        child.style.width = 'auto';
      }
    });
  });
}

function prepareCloneForCapture(doc, cloneEl, width = PAYSLIP_EXPORT_WIDTH) {
  // html2canvas passes (clonedDocument, clonedElement). Use the document to
  // search so this works whether we capture the full page or an isolated element.
  const target = doc.querySelector(EXPORT_MARKERS) || cloneEl;
  const scope = doc.body || cloneEl;

  if (target) {
    Object.assign(target.style, {
      width: `${width}px`,
      maxWidth: `${width}px`,
      minWidth: `${width}px`,
      margin: '0',
      padding: '0',
      background: '#ffffff',
      color: '#000000',
      fontFamily: 'Arial, Helvetica, sans-serif',
      boxSizing: 'border-box',
      overflow: 'visible',
    });

    target.querySelectorAll('table').forEach(table => {
      table.style.borderCollapse = 'collapse';
      table.style.tableLayout = 'fixed';
    });
  }

  scope.querySelectorAll('img').forEach((img) => {
    img.crossOrigin = 'anonymous';
  });
}

export async function capturePayslipCanvas(element, { width = PAYSLIP_EXPORT_WIDTH } = {}) {
  if (!element) throw new Error('Document element not found');

  await document.fonts?.ready;
  const previewRect = element.getBoundingClientRect();
  const exportWidth = Math.round(previewRect.width || width);
  const exportHeight = Math.round(previewRect.height || element.scrollHeight);

  element.querySelectorAll('img').forEach((img) => {
    img.crossOrigin = 'anonymous';
  });

  await Promise.all(
    Array.from(element.querySelectorAll('img')).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) { resolve(); return; }
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
    windowWidth: document.documentElement.scrollWidth,
    windowHeight: document.documentElement.scrollHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    onclone: (doc) => {
      doc.querySelectorAll('img').forEach((img) => {
        img.crossOrigin = 'anonymous';
      });
    },
  });
}

function canvasToPdfBlob(canvas, format = 'PNG', { fitSinglePage = false } = {}) {
  const isPng = format === 'PNG';
  const imgData = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', isPng ? 1.0 : 0.94);

  if (!fitSinglePage) {
    const pageW = canvas.width / CAPTURE_SCALE;
    const pageH = canvas.height / CAPTURE_SCALE;
    const pdf = new jsPDF({
      orientation: pageW > pageH ? 'landscape' : 'portrait',
      unit: 'px',
      format: [pageW, pageH],
      compress: true,
      hotfixes: ['px_scaling'],
    });
    pdf.addImage(imgData, format, 0, 0, pageW, pageH, undefined, isPng ? 'SLOW' : 'MEDIUM');
    return pdf.output('blob');
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const margin = 8;
  const pageW = pdf.internal.pageSize.getWidth() - margin * 2;
  const pageH = pdf.internal.pageSize.getHeight() - margin * 2;

  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  const scale = imgH > pageH ? pageH / imgH : 1;
  const finalW = imgW * scale;
  const finalH = imgH * scale;
  const offsetX = margin + (pageW - finalW) / 2;
  pdf.addImage(imgData, format, offsetX, margin, finalW, finalH, undefined, isPng ? 'SLOW' : 'MEDIUM');
  return pdf.output('blob');
}

export async function renderElementToPdfBlob(element, { width = PAYSLIP_EXPORT_WIDTH, fitSinglePage = false } = {}) {
  const canvas = await capturePayslipCanvas(element, { width });
  // Always embed the lossless PNG so the PDF is pixel-identical to the Image
  // export (same canvas, same crispness). Only if it somehow exceeds the size
  // cap do we re-encode the SAME canvas as high-quality JPEG as a last resort.
  let blob = canvasToPdfBlob(canvas, 'PNG', { fitSinglePage });
  if (blob.size > MAX_PDF_BYTES) {
    blob = canvasToPdfBlob(canvas, 'JPEG', { fitSinglePage });
  }
  return blob;
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

export async function exportPayslipImage(element, filename) {
  const canvas = await capturePayslipCanvas(element);
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}

export function downloadPngCanvas(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}
