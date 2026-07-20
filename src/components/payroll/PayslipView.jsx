import { useRef, useState } from 'react';
import { Download, FileText, Mail } from 'lucide-react';
import { payrollApi } from '../../api';
import { amountInWordsINR, formatPayslipAmount } from '../../utils/amountInWords';
import { resolveAssetUrl } from '../../utils/helpers';
import { downloadPdfBlob, exportPayslipImage, renderElementToPdfBlob } from '../../utils/exportPayslipPdf';

/** Step 3 salary structure — earnings (A) */
const EARNING_FIELDS = [
  'Basic',
  'DA',
  'HRA',
  'Conveyance Allowance',
  'Medical Allowance',
  'Special Allowance',
];

/** Step 3 — employee deductions (B), then employer contributions (C) in right column */
const DEDUCTION_FIELDS = [
  { name: 'Employee PF', category: 'employee' },
  { name: 'Professional Tax', category: 'employee' },
  { name: 'Employee ESI', category: 'employee' },
  { name: 'TDS', category: 'employee' },
  { name: 'Medical Insurance', category: 'employee' },
  { name: 'LOP Deduction', category: 'employee' },
  { name: 'Employer PF', category: 'employer' },
  { name: 'Employer ESI', category: 'employer' },
  { name: 'Gratuity', category: 'employer' },
];

const BORDER = '1px solid #000000';

function cell(extra = {}) {
  return {
    border: BORDER,
    padding: '4px 8px',
    fontSize: '11px',
    lineHeight: 1.35,
    verticalAlign: 'middle',
    color: '#000000',
    background: '#ffffff',
    boxSizing: 'border-box',
    fontFamily: 'Arial, Helvetica, sans-serif',
    ...extra,
  };
}

function labelCell(extra = {}) {
  return cell({ fontWeight: 700, textTransform: 'uppercase', ...extra });
}

function valueCell(extra = {}) {
  return cell({ textAlign: 'left', ...extra });
}

function amountCell(extra = {}) {
  return cell({ textAlign: 'right', fontFamily: 'Consolas, Monaco, monospace', whiteSpace: 'nowrap', ...extra });
}


function formatDateIN(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function maskAccount(num) {
  if (!num) return '—';
  const s = String(num);
  return s.length > 4 ? `XXXXXX${s.slice(-4)}` : s;
}

function buildAmountMap(lines) {
  const map = {};
  let arr = lines || [];
  if (typeof arr === 'string') {
    try { arr = JSON.parse(arr); } catch (e) { arr = []; }
  }
  if (Array.isArray(arr)) {
    arr.forEach((line) => {
      map[line.name] = parseFloat(line.amount || 0);
    });
  }
  return map;
}

function padRows(earnings, deductions, minRows = 9) {
  const e = [...earnings];
  const d = [...deductions];
  while (e.length < minRows) e.push({ name: '', amount: null });
  while (d.length < minRows) d.push({ name: '', amount: null });
  return { earnings: e, deductions: d };
}

export default function PayslipView({ payslip, employee, tenantName, showActions = true, showEmail = false, onPdfStored }) {
  const slipRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const emp = employee || payslip?.employee;
  const tenant = emp?.tenant;
  const companyName = tenantName || tenant?.legal_business_name || tenant?.name || 'HRMS';
  const logoUrl = resolveAssetUrl(tenant?.logo_url || '');

  const monthLabel = payslip
    ? new Date(payslip.year, payslip.month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    : '';

  const daysInMonth = payslip?.standard_days
    ? parseInt(payslip.standard_days, 10)
    : payslip
      ? new Date(payslip.year, payslip.month, 0).getDate()
      : 30;

  const earningMap = buildAmountMap(payslip?.earnings);
  const deductionMap = buildAmountMap(payslip?.deductions);

  const earningRows = EARNING_FIELDS.map((name) => ({
    name,
    amount: earningMap[name] ?? 0,
  }));

  ['Arrears', 'Bonus', 'Overtime'].forEach((name) => {
    if (earningMap[name] > 0) {
      earningRows.push({ name, amount: earningMap[name] });
    }
  });

  const deductionRows = DEDUCTION_FIELDS.map(({ name }) => ({
    name,
    amount: deductionMap[name] ?? 0,
  }));

  let rawDeductions = payslip?.deductions || [];
  if (typeof rawDeductions === 'string') {
    try { rawDeductions = JSON.parse(rawDeductions); } catch(e) { rawDeductions = []; }
  }
  (Array.isArray(rawDeductions) ? rawDeductions : []).forEach((line) => {
    if (line.source !== 'salary_feed') return;
    const amount = parseFloat(line.amount || 0);
    if (amount <= 0) return;
    if (deductionRows.some((row) => row.name === line.name)) return;
    deductionRows.push({ name: line.name, amount });
  });

  const grossEarnings = parseFloat(payslip?.gross_salary || 0);
  const employeeDeductions =
    parseFloat(payslip?.total_deductions) ||
    deductionRows
      .filter((r) =>
        ['Employee PF', 'Professional Tax', 'Employee ESI', 'TDS', 'Medical Insurance', 'LOP Deduction'].includes(r.name)
      )
      .reduce((s, r) => s + r.amount, 0);

  const additionalBenefits =
    parseFloat(payslip?.additional_benefits) ||
    (deductionMap['Employer PF'] || parseFloat(payslip?.pf_employer || 0)) +
      (deductionMap['Employer ESI'] || parseFloat(payslip?.esic_employer || 0)) +
      (deductionMap.Gratuity || parseFloat(payslip?.gratuity || 0));

  const totalPayable = parseFloat(payslip?.total_payable) || grossEarnings + additionalBenefits;
  const netPay = parseFloat(payslip?.net_salary || 0);

  const tdsSourceTooltip = {
    slab: 'TDS: slab-computed (annualize + true-up)',
    override: 'TDS: manual override amount',
    manual: 'TDS: flat amount from salary record',
  }[payslip?.tds_source];

  const { earnings: eRows, deductions: dRows } = padRows(earningRows, deductionRows);

  const location = emp?.branch?.city || emp?.city || tenant?.city || '—';
  const fileSlug = `${emp?.emp_code || 'employee'}_${payslip?.year}_${String(payslip?.month).padStart(2, '0')}`;
  const pdfFilename = `payslip_${fileSlug}.pdf`;

  const waitForImages = (root) => {
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
  };

  const ensurePdfStored = async ({ force = false } = {}) => {
    if (!payslip?.id) return;
    if (!force && payslip?.pdf_url) return;
    if (!slipRef.current) throw new Error('Payslip preview not ready');
    await waitForImages(slipRef.current);
    const blob = await renderElementToPdfBlob(slipRef.current);
    const res = await payrollApi.uploadPayslipPdf(payslip.id, blob, pdfFilename);
    onPdfStored?.(res?.data?.payslip?.pdf_url);
  };

  const handleDownloadPdf = async () => {
    if (!slipRef.current || exporting) return;
    setExporting(true);
    setPdfError(null);
    try {
      await waitForImages(slipRef.current);
      const blob = await renderElementToPdfBlob(slipRef.current);
      downloadPdfBlob(blob, pdfFilename);
      if (payslip?.id) {
        try {
          const res = await payrollApi.uploadPayslipPdf(payslip.id, blob, pdfFilename);
          onPdfStored?.(res?.data?.payslip?.pdf_url);
        } catch {
          setPdfError('PDF downloaded locally. Server save failed — try again.');
        }
      }
    } catch {
      setPdfError('Could not generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!slipRef.current || exporting) return;
    setExporting(true);
    try {
      await waitForImages(slipRef.current);
      await exportPayslipImage(slipRef.current, `payslip_${fileSlug}.png`);
    } finally {
      setExporting(false);
    }
  };

  const handleEmailPayslip = async () => {
    if (!payslip?.id || exporting) return;
    setExporting(true);
    setEmailStatus(null);
    setPdfError(null);
    try {
      await ensurePdfStored({ force: true });
      const res = await payrollApi.emailPayslip(payslip.id);
      const withPdf = res?.data?.has_pdf_attachment;
      setEmailStatus({
        type: 'success',
        message: withPdf
          ? `Payslip PDF emailed to ${res?.data?.email || 'employee'}`
          : `Payslip link emailed to ${res?.data?.email || 'employee'}`,
      });
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to send payslip email';
      setEmailStatus({ type: 'error', message: msg });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      {showActions && (
        <div className="flex flex-col items-end gap-2 print:hidden">
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={handleDownloadPdf} disabled={exporting} className="btn-primary text-xs">
              <FileText size={14} /> {exporting ? 'Generating…' : 'Download PDF'}
            </button>
            <button type="button" onClick={handleDownloadImage} disabled={exporting} className="btn-secondary text-xs">
              <Download size={14} /> Image
            </button>
            {showEmail && (
              <button type="button" onClick={handleEmailPayslip} disabled={exporting} className="btn-secondary text-xs">
                <Mail size={14} /> {exporting ? 'Sending…' : 'Email Payslip'}
              </button>
            )}
          </div>
          {emailStatus && (
            <p className={`text-xs ${emailStatus.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
              {emailStatus.message}
            </p>
          )}
          {pdfError && <p className="text-xs text-amber-700">{pdfError}</p>}
        </div>
      )}

      <div className="table-scroll">
        <div
          ref={slipRef}
          data-payslip-export
          className="bg-white mx-auto"
          style={{
            width: '640px',
            maxWidth: '100%',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#000000',
          }}
        >
          <table
            style={{
              borderCollapse: 'collapse',
              border: BORDER,
              width: '100%',
              tableLayout: 'fixed',
            }}
          >
            <colgroup>
              <col style={{ width: '26%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '24%' }} />
            </colgroup>
            <tbody>
              <tr>
                <td colSpan={4} style={cell({ padding: '8px', verticalAlign: 'middle' })}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '26%', flexShrink: 0, textAlign: 'center' }}>
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Company logo"
                          crossOrigin="anonymous"
                          style={{ maxWidth: '100%', maxHeight: '64px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                        />
                      ) : null}
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', padding: '4px 8px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
                        {companyName}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '4px' }}>
                        Pay Slip for the Month of {monthLabel}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>

              <tr>
                <td style={labelCell()}>EMPCODE</td>
                <td style={valueCell()}>{emp?.emp_code || '—'}</td>
                <td style={labelCell()}>PF NO</td>
                <td style={valueCell()}>{emp?.pf_number || emp?.uan_number || '—'}</td>
              </tr>
              <tr>
                <td style={labelCell()}>EMPNAME</td>
                <td style={valueCell()}>{emp?.first_name} {emp?.last_name}</td>
                <td style={labelCell()}>STD DAYS</td>
                <td style={valueCell()}>{daysInMonth}</td>
              </tr>
              <tr>
                <td style={labelCell()}>DESIGNATION</td>
                <td style={valueCell()}>{emp?.designation?.name || '—'}</td>
                <td style={labelCell()}>WRK DAYS</td>
                <td style={valueCell()}>{payslip?.present_days ?? payslip?.working_days ?? daysInMonth}</td>
              </tr>
              <tr>
                <td style={labelCell()}>DOJ</td>
                <td style={valueCell()}>{formatDateIN(emp?.date_of_joining)}</td>
                <td style={labelCell()}>LOP DAYS</td>
                <td style={valueCell()}>{payslip?.lop_days ?? 0}</td>
              </tr>
              <tr>
                <td style={labelCell()}>BUSINESS UNIT</td>
                <td style={valueCell()}>{emp?.department?.name || '—'}</td>
                <td style={labelCell()}>BANK NAME</td>
                <td style={valueCell()}>{emp?.bank_name || '—'}</td>
              </tr>
              <tr>
                <td style={labelCell()}>PAN</td>
                <td style={valueCell()}>{emp?.pan_number || '—'}</td>
                <td style={labelCell()}>ACCOUNT NO</td>
                <td style={valueCell()}>{maskAccount(emp?.account_number)}</td>
              </tr>
              <tr>
                <td style={labelCell()}>LOCATION</td>
                <td style={valueCell()}>{location}</td>
                <td style={labelCell()}>UAN</td>
                <td style={valueCell()}>{emp?.uan_number || '—'}</td>
              </tr>

              <tr>
                <td style={labelCell({ width: '30%' })}>EARNINGS</td>
                <td style={labelCell({ width: '20%', textAlign: 'right' })}>AMOUNT</td>
                <td style={labelCell({ width: '30%' })}>DEDUCTIONS</td>
                <td style={labelCell({ width: '20%', textAlign: 'right' })}>AMOUNT</td>
              </tr>

              {eRows.map((e, i) => (
                <tr key={`row-${i}`}>
                  <td style={cell({ textTransform: 'uppercase' })}>{e.name}</td>
                  <td style={amountCell()}>{e.name ? formatPayslipAmount(e.amount) : ''}</td>
                  <td style={cell({ textTransform: 'uppercase' })}>{dRows[i]?.name || ''}</td>
                  <td
                    style={amountCell()}
                    title={dRows[i]?.name === 'TDS' && tdsSourceTooltip ? tdsSourceTooltip : undefined}
                  >
                    {dRows[i]?.name ? formatPayslipAmount(dRows[i].amount) : ''}
                  </td>
                </tr>
              ))}

              <tr>
                <td style={labelCell()}>GROSS EARNINGS (A)</td>
                <td style={amountCell({ fontWeight: 700 })}>{formatPayslipAmount(grossEarnings)}</td>
                <td style={labelCell()}>GROSS DEDUCTION (B)</td>
                <td style={amountCell({ fontWeight: 700 })}>{formatPayslipAmount(employeeDeductions)}</td>
              </tr>

              <tr>
                <td style={labelCell()}>TOTAL PAYABLE (A + C)</td>
                <td style={amountCell({ fontWeight: 700 })}>{formatPayslipAmount(totalPayable)}</td>
                <td style={labelCell()}>NET PAY (A − B)</td>
                <td style={amountCell({ fontWeight: 700, fontSize: '12px' })}>{formatPayslipAmount(netPay)}</td>
              </tr>

              <tr>
                <td style={labelCell()}>IN WORDS</td>
                <td colSpan={3} style={cell({ fontStyle: 'italic' })}>{amountInWordsINR(netPay)}</td>
              </tr>

              <tr>
                <td
                  colSpan={4}
                  style={cell({
                    textAlign: 'center',
                    fontStyle: 'italic',
                    fontSize: '10px',
                    padding: '8px',
                  })}
                >
                  This is a computer generated document, hence no signature is required.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
