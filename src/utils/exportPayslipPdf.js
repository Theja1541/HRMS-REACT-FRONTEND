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
  }

  // Convert the flex header to a table layout before sizing tables, so the
  // header cells participate in the same deterministic px-based layout.
  flattenFlexForCapture(scope);

  scope.querySelectorAll('table').forEach((table) => {
    table.style.borderCollapse = 'collapse';
    table.style.borderSpacing = '0';
    // Use explicit px width so html2canvas doesn't miscompute '100%'
    table.style.width = `${width}px`;
    table.style.border = '1px solid #000000';
    table.style.tableLayout = 'fixed';

    fixTableColWidths(table, width);
  });

  scope.querySelectorAll('td, th').forEach((cell) => {
    cell.style.border = '1px solid #000000';
    cell.style.boxSizing = 'border-box';
    cell.style.color = cell.style.color || '#000000';
    const inlineBg = cell.style.backgroundColor;
    if (inlineBg && inlineBg !== 'transparent' && inlineBg !== 'rgba(0, 0, 0, 0)') {
      cell.style.background = inlineBg;
    } else if (!cell.style.background) {
      cell.style.background = '#ffffff';
    }
    // 1:1 fidelity with the on-screen view, applied only to text cells (the
    // header cell holds the logo/title block and keeps its own 8px padding).
    // html2canvas 1.4.1 clips the text descender against the bottom border at
    // line-height 1.35, so nudge line-height up just enough (1.45) to clear the
    // descender WITHOUT changing row height perceptibly, keeping the view's exact
    // 4px top/bottom padding. verticalAlign:middle centers single-line text.
    const hasSectionBg =
      cell.style.backgroundColor &&
      cell.style.backgroundColor !== 'transparent' &&
      cell.style.backgroundColor !== 'rgba(0, 0, 0, 0)';
    if (cell.children.length === 0 && !hasSectionBg) {
      cell.style.verticalAlign = 'middle';
      cell.style.lineHeight = '1.45';
      cell.style.paddingTop = '4px';
      cell.style.paddingBottom = '4px';
    }
  });

  scope.querySelectorAll('img').forEach((img) => {
    img.crossOrigin = 'anonymous';
  });
}

export async function capturePayslipCanvas(element, { width = PAYSLIP_EXPORT_WIDTH } = {}) {
  if (!element) throw new Error('Document element not found');

  await document.fonts?.ready;

  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    position: 'absolute',
    top: '-99999px',
    left: '0',
    width: `${width}px`,
    background: '#ffffff',
    overflow: 'visible',
  });

  const clone = element.cloneNode(true);
  Object.assign(clone.style, {
    width: `${width}px`,
    maxWidth: `${width}px`,
    minWidth: `${width}px`,
    margin: '0',
    padding: '0',
    background: '#ffffff',
    color: '#000000',
  });

  clone.querySelectorAll('table').forEach((table) => {
    fixTableColWidths(table, width);
  });

  clone.querySelectorAll('img').forEach((img) => {
    img.crossOrigin = 'anonymous';
  });

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  // Wait for cloned images to finish loading before capturing
  await Promise.all(
    Array.from(clone.querySelectorAll('img')).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) { resolve(); return; }
          img.onload = resolve;
          img.onerror = resolve;
        })
    )
  );

  try {
    return await html2canvas(clone, {
      scale: CAPTURE_SCALE,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      width,
      windowWidth: width,
      onclone: (doc, cloneEl) => prepareCloneForCapture(doc, cloneEl, width),
    });
  } finally {
    document.body.removeChild(wrapper);
  }
}

function canvasToPdfBlob(canvas, format = 'PNG', { fitSinglePage = false } = {}) {
  const isPng = format === 'PNG';
  const imgData = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', isPng ? 1.0 : 0.94);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const margin = 8;
  const pageW = pdf.internal.pageSize.getWidth() - margin * 2;
  const pageH = pdf.internal.pageSize.getHeight() - margin * 2;

  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  if (fitSinglePage) {
    const scale = imgH > pageH ? pageH / imgH : 1;
    const finalW = imgW * scale;
    const finalH = imgH * scale;
    const offsetX = margin + (pageW - finalW) / 2;
    pdf.addImage(imgData, format, offsetX, margin, finalW, finalH, undefined, isPng ? 'SLOW' : 'MEDIUM');
    return pdf.output('blob');
  }

  let heightLeft = imgH;
  let position = margin;

  pdf.addImage(imgData, format, margin, position, imgW, imgH, undefined, isPng ? 'SLOW' : 'MEDIUM');
  heightLeft -= pageH;

  while (heightLeft > 0) {
    position = margin - (imgH - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, format, margin, position, imgW, imgH, undefined, isPng ? 'SLOW' : 'MEDIUM');
    heightLeft -= pageH;
  }

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
