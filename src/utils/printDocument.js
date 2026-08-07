const PRINT_FRAME_ID = 'hrms-print-frame';

export const QUOTATION_PRINT_ELEMENT_ID = 'quotation-view-print';
export const QUOTATION_CONTENT_WIDTH_MM = 194;
export const QUOTATION_PAGE_MARGIN_MM = 8;

/** Payslip — A4 portrait sheet (same visual as View Payslip) */
export const PAYSLIP_PRINT_ELEMENT_ID = 'payslip-view-print';
export const PAYSLIP_CONTENT_WIDTH_MM = 190;
export const PAYSLIP_PAGE_MARGIN_MM = 10;

export function mmToPx(mm) {
  return Math.round(mm * (96 / 25.4));
}

const BASE_PRINT_STYLES = `
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 10mm 12mm;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
`;

const QUOTATION_PRINT_STYLES = `
  @page { size: A4 portrait; margin: ${QUOTATION_PAGE_MARGIN_MM}mm; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    height: auto !important;
    overflow: hidden !important;
    font-family: Arial, Helvetica, sans-serif !important;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  #quotation-view-print {
    width: ${QUOTATION_CONTENT_WIDTH_MM}mm !important;
    max-width: ${QUOTATION_CONTENT_WIDTH_MM}mm !important;
    min-width: ${QUOTATION_CONTENT_WIDTH_MM}mm !important;
    margin: 0 auto !important;
    border: 1px solid #1a202c !important;
    box-shadow: none !important;
    page-break-after: avoid !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    font-family: Arial, Helvetica, sans-serif !important;
    font-size: 11px !important;
    line-height: 1.45 !important;
    color: #111827 !important;
    background: #fff !important;
  }
  #quotation-view-print table {
    width: 100% !important;
    border-collapse: collapse !important;
    table-layout: fixed !important;
  }
  #quotation-view-print td,
  #quotation-view-print th {
    font-family: Arial, Helvetica, sans-serif !important;
    line-height: 1.45 !important;
  }
`;

const PAYSLIP_PRINT_STYLES = `
  @page { size: A4 portrait; margin: ${PAYSLIP_PAGE_MARGIN_MM}mm; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    font-family: Arial, Helvetica, sans-serif !important;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  #${PAYSLIP_PRINT_ELEMENT_ID} {
    width: ${PAYSLIP_CONTENT_WIDTH_MM}mm !important;
    max-width: ${PAYSLIP_CONTENT_WIDTH_MM}mm !important;
    min-width: ${PAYSLIP_CONTENT_WIDTH_MM}mm !important;
    margin: 0 auto !important;
    padding: 0 !important;
    background: #fff !important;
    color: #000 !important;
    font-family: Arial, Helvetica, sans-serif !important;
    font-size: 11px !important;
    line-height: 1.35 !important;
    box-shadow: none !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  #${PAYSLIP_PRINT_ELEMENT_ID} table {
    width: 100% !important;
    border-collapse: collapse !important;
    table-layout: fixed !important;
  }
  #${PAYSLIP_PRINT_ELEMENT_ID} td,
  #${PAYSLIP_PRINT_ELEMENT_ID} th {
    border-color: #000 !important;
    border-style: solid !important;
    border-width: 1px !important;
    font-family: Arial, Helvetica, sans-serif !important;
    color: #000 !important;
    background: #fff !important;
    -webkit-font-smoothing: antialiased;
  }
  #${PAYSLIP_PRINT_ELEMENT_ID} table table td,
  #${PAYSLIP_PRINT_ELEMENT_ID} table table th {
    border: none !important;
  }
`;

function waitForImages(doc, callback) {
  const images = Array.from(doc.images || []);
  if (!images.length) {
    callback();
    return;
  }

  let loaded = 0;
  const done = () => {
    loaded += 1;
    if (loaded >= images.length) callback();
  };

  images.forEach((img) => {
    if (img.complete) done();
    else {
      img.onload = done;
      img.onerror = done;
    }
  });
}

export function waitForDocumentImages(doc) {
  return new Promise((resolve) => {
    waitForImages(doc, resolve);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Inline <img> sources as data URLs so html2canvas can render logos in PDF
 * (browser Print loads images directly; canvas export needs same-origin pixels).
 */
export async function inlineDocumentImages(doc, baseUrl = window.location.origin) {
  const images = Array.from(doc.images || []);

  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;

      try {
        const absoluteUrl = new URL(src, baseUrl).href;
        const response = await fetch(absoluteUrl, { credentials: 'include' });
        if (!response.ok) return;

        const blob = await response.blob();
        img.src = await blobToDataUrl(blob);
        img.removeAttribute('crossorigin');
      } catch {
        // Keep original src — print may still work even if PDF capture cannot inline.
      }
    })
  );
}

function removePrintFrame() {
  document.getElementById(PRINT_FRAME_ID)?.remove();
}

export function isQuotationPrintElement(elementId) {
  return elementId === QUOTATION_PRINT_ELEMENT_ID;
}

export function isPayslipPrintElement(elementId) {
  return elementId === PAYSLIP_PRINT_ELEMENT_ID;
}

export function getPrintStyles(elementId) {
  if (isQuotationPrintElement(elementId)) {
    return `${BASE_PRINT_STYLES}${QUOTATION_PRINT_STYLES}`;
  }
  if (isPayslipPrintElement(elementId)) {
    return `${BASE_PRINT_STYLES}${PAYSLIP_PRINT_STYLES}`;
  }
  return BASE_PRINT_STYLES;
}

/**
 * Measure how much to shrink quotation content to fit one A4 page (print/PDF).
 * Returns 1 when no shrink is needed. Does not mutate the DOM.
 */
export function measureQuotationContentScale(doc) {
  const docEl = doc.getElementById(QUOTATION_PRINT_ELEMENT_ID);
  if (!docEl) return 1;

  const pageHeightMm = 297 - QUOTATION_PAGE_MARGIN_MM * 2;
  const maxHeightPx = mmToPx(pageHeightMm);
  const contentHeight = docEl.scrollHeight;

  if (contentHeight <= maxHeightPx) return 1;
  return maxHeightPx / contentHeight;
}

/**
 * Browser Print uses CSS transform to fit one page when content is tall.
 */
export function applyQuotationPrintFit(doc) {
  const docEl = doc.getElementById(QUOTATION_PRINT_ELEMENT_ID);
  if (!docEl) return null;

  const scale = measureQuotationContentScale(doc);
  if (scale < 1) {
    docEl.style.transform = `scale(${scale})`;
    docEl.style.transformOrigin = 'top center';
    docEl.style.width = `${QUOTATION_CONTENT_WIDTH_MM / scale}mm`;
  }

  return docEl;
}

/**
 * Build the exact printable document used by Print — iframe + outerHTML + print CSS.
 * PDF export reuses this same pipeline for a 1:1 replica.
 */
export function mountPrintFrame(element, elementId, { title = ' ', forCapture = false } = {}) {
  removePrintFrame();

  const iframe = document.createElement('iframe');
  iframe.id = PRINT_FRAME_ID;
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = forCapture
    ? 'position:fixed;left:-10000px;top:0;width:230mm;height:320mm;border:0;visibility:hidden;'
    : 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';

  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const doc = frameWindow?.document;
  if (!frameWindow || !doc) {
    removePrintFrame();
    throw new Error('Could not create print frame');
  }

  const printStyles = getPrintStyles(elementId);

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>${printStyles}</style>
  </head>
  <body>${element.outerHTML}</body>
</html>`);
  doc.close();

  return {
    iframe,
    doc,
    frameWindow,
    cleanup: removePrintFrame,
  };
}

/**
 * Print an HTML string (full document or fragment) via a hidden iframe.
 * Used for letter/template previews before PDF download.
 */
export function printHtmlDocument(html, options = {}) {
  const { title = 'Document' } = options;
  if (!html) return;

  removePrintFrame();

  const iframe = document.createElement('iframe');
  iframe.id = PRINT_FRAME_ID;
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const doc = frameWindow?.document;
  if (!frameWindow || !doc) {
    removePrintFrame();
    throw new Error('Could not create print frame');
  }

  const source = String(html).trim();
  const isFullDoc =
    source.toLowerCase().startsWith('<!doctype') || source.toLowerCase().startsWith('<html');

  doc.open();
  if (isFullDoc) {
    doc.write(source);
  } else {
    doc.write(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>${BASE_PRINT_STYLES}</style>
  </head>
  <body>${source}</body>
</html>`);
  }
  doc.close();

  const triggerPrint = () => {
    frameWindow.focus();
    frameWindow.print();
    frameWindow.onafterprint = removePrintFrame;
    setTimeout(removePrintFrame, 2000);
  };

  setTimeout(() => waitForImages(doc, triggerPrint), 250);
}

/**
 * Print only the target element via a hidden iframe (receipt/invoice/quotation).
 * Does NOT print the main application shell.
 */
export function printElementById(elementId, options = {}) {
  const { title = ' ' } = options;
  const element = document.getElementById(elementId);
  if (!element) return;

  const isQuotation = isQuotationPrintElement(elementId);
  const { doc, frameWindow, cleanup } = mountPrintFrame(element, elementId, { title });

  const triggerPrint = () => {
    if (isQuotation) {
      applyQuotationPrintFit(doc);
    }

    frameWindow.focus();
    frameWindow.print();
    frameWindow.onafterprint = cleanup;
    setTimeout(cleanup, 2000);
  };

  setTimeout(() => waitForImages(doc, triggerPrint), 250);
}
