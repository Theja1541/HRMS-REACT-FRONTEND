import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import PayslipView from '../components/payroll/PayslipView';
import { payrollApi } from '../api';
import { PAYSLIP_EXPORT_WIDTH, downloadPdfBlob, renderElementToPdfBlob } from './exportPayslipPdf';

function waitForImages(root) {
  const images = Array.from(root.querySelectorAll('img'));
  return Promise.all(
    images.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        })
    )
  );
}

function nextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

/**
 * Mount the same PayslipView used on screen, capture it to an A4 PDF blob,
 * then tear down. Guarantees Download / Email / Bulk use the view design 1:1.
 */
export async function renderPayslipViewToPdfBlob(payslip, { employee, tenantName } = {}) {
  if (!payslip) throw new Error('Payslip data required');

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${PAYSLIP_EXPORT_WIDTH}px`,
    zIndex: '-1',
    pointerEvents: 'none',
    opacity: '0',
  });
  document.body.appendChild(host);

  const root = createRoot(host);
  try {
    root.render(
      createElement(PayslipView, {
        payslip,
        employee,
        tenantName,
        showActions: false,
      })
    );
    await nextPaint();
    await document.fonts?.ready;

    const el = host.querySelector('[data-payslip-export]');
    if (!el) throw new Error('Payslip preview not ready');
    await waitForImages(el);
    return await renderElementToPdfBlob(el);
  } finally {
    root.unmount();
    host.remove();
  }
}

export function payslipPdfFilename(payslip) {
  const emp = payslip?.employee;
  const code = emp?.emp_code || payslip?.employee_id || 'employee';
  const month = String(payslip?.month || 0).padStart(2, '0');
  return `payslip_${code}_${payslip?.year}_${month}.pdf`;
}

/** Generate view-matching PDF and upload to server (used by Email + Bulk Email). */
export async function generateAndStorePayslipPdf(payslip, { force = true } = {}) {
  if (!payslip?.id) throw new Error('Payslip id required');
  if (!force && payslip.pdf_url) return payslip.pdf_url;

  const blob = await renderPayslipViewToPdfBlob(payslip);
  const filename = payslipPdfFilename(payslip);
  const res = await payrollApi.uploadPayslipPdf(payslip.id, blob, filename);
  return res?.data?.payslip?.pdf_url;
}

/** Download a PDF that is a 1:1 capture of PayslipView. */
export async function downloadPayslipViewPdf(payslip) {
  const blob = await renderPayslipViewToPdfBlob(payslip);
  downloadPdfBlob(blob, payslipPdfFilename(payslip));
  return blob;
}
