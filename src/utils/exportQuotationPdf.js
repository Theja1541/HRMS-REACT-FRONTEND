import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { downloadPdfBlob, fixTableColWidths, flattenFlexForCapture } from './exportPayslipPdf';
import {
  QUOTATION_CONTENT_WIDTH_MM,
  QUOTATION_PAGE_MARGIN_MM,
  QUOTATION_PRINT_ELEMENT_ID,
  inlineDocumentImages,
  measureQuotationContentScale,
  mmToPx,
  mountPrintFrame,
  waitForDocumentImages,
} from './printDocument';

const CAPTURE_SCALE = 4;
const MONO_FONT = 'Consolas, "Courier New", monospace';

export function buildQuotationPdfFilename(quotationNo) {
  const safe = String(quotationNo || 'quotation').replace(/[^\w.-]+/g, '_');
  return `${safe}.pdf`;
}

function prepareQuotationCloneForCapture(clonedDoc, cloneEl, widthPx) {
  const root = clonedDoc.getElementById(QUOTATION_PRINT_ELEMENT_ID) || cloneEl;
  if (!root) return;

  Object.assign(root.style, {
    width: `${widthPx}px`,
    maxWidth: `${widthPx}px`,
    minWidth: `${widthPx}px`,
    margin: '0',
    padding: '0',
    transform: 'none',
    background: '#ffffff',
    color: '#111827',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '11px',
    lineHeight: '1.45',
    boxSizing: 'border-box',
  });

  flattenFlexForCapture(root);

  root.querySelectorAll('table').forEach((table) => {
    table.style.borderCollapse = 'collapse';
    table.style.tableLayout = 'fixed';
    table.style.width = `${widthPx}px`;
    fixTableColWidths(table, widthPx);
  });

  root.querySelectorAll('img').forEach((img) => {
    const host = img.parentElement;
    if (host?.style) {
      host.style.width = '76px';
      host.style.minWidth = '76px';
      host.style.textAlign = 'center';
      host.style.verticalAlign = 'middle';
    }
    img.style.display = 'block';
    img.style.margin = '0 auto';
    img.style.maxWidth = '68px';
    img.style.maxHeight = '56px';
    img.style.objectFit = 'contain';
  });
}

function waitForFonts(doc) {
  return doc.fonts?.ready ?? Promise.resolve();
}

/**
 * Download PDF — same HTML + print CSS as Print, captured without CSS transform
 * (fit is applied in PDF coordinates so typography matches the print preview).
 */
export async function exportQuotationPdf(element, filename) {
  const elementId = element?.id || QUOTATION_PRINT_ELEMENT_ID;
  const widthPx = mmToPx(QUOTATION_CONTENT_WIDTH_MM);
  const { doc, cleanup } = mountPrintFrame(element, elementId, {
    title: filename,
    forCapture: true,
  });

  try {
    await inlineDocumentImages(doc);
    await waitForDocumentImages(doc);
    await waitForFonts(doc);

    const docEl = doc.getElementById(elementId);
    if (!docEl) {
      throw new Error('Quotation print element not found');
    }

    // Do not use CSS transform before capture — it distorts html2canvas output.
    const fitScale = measureQuotationContentScale(doc);

    const canvas = await html2canvas(docEl, {
      scale: CAPTURE_SCALE,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: widthPx,
      height: docEl.scrollHeight,
      windowWidth: widthPx,
      windowHeight: docEl.scrollHeight,
      onclone: (clonedDoc, cloneEl) => {
        prepareQuotationCloneForCapture(clonedDoc, cloneEl, widthPx);
        clonedDoc.querySelectorAll('[style*="ui-monospace"]').forEach((node) => {
          if (node.style) node.style.fontFamily = MONO_FONT;
        });
      },
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const drawWidthMm = QUOTATION_CONTENT_WIDTH_MM * fitScale;
    const drawHeightMm = (canvas.height / canvas.width) * drawWidthMm;
    const pageContentWidthMm = 210 - QUOTATION_PAGE_MARGIN_MM * 2;
    const offsetX = QUOTATION_PAGE_MARGIN_MM + (pageContentWidthMm - drawWidthMm) / 2;

    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      offsetX,
      QUOTATION_PAGE_MARGIN_MM,
      drawWidthMm,
      drawHeightMm,
      undefined,
      'SLOW'
    );

    downloadPdfBlob(pdf.output('blob'), filename);
    return pdf.output('blob');
  } finally {
    cleanup();
  }
}
