import { useRef, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { amountInWordsINR, formatPayslipAmount } from '../../utils/amountInWords';
import { resolveAssetUrl } from '../../utils/helpers';
import { downloadPdfBlob, renderElementToPdfBlob } from '../../utils/exportPayslipPdf';
import { FNF_PAYMENT_MODE_LABELS } from '../../constants/hr';

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
  return cell({
    textAlign: 'right',
    fontFamily: 'Consolas, Monaco, monospace',
    whiteSpace: 'nowrap',
    ...extra,
  });
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function maskAccount(num) {
  if (!num) return '—';
  const s = String(num);
  return s.length > 4 ? `XXXXXX${s.slice(-4)}` : s;
}

function padToLength(arr, len) {
  const out = [...arr];
  while (out.length < len) out.push(null);
  return out;
}

export default function FnfStatementView({ statement }) {
  const docRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const emp = statement?.employee;
  const tenant = emp?.tenant;
  const sep = statement?.separationRequest;
  const payments = statement?.payments || [];

  const companyName = tenant?.legal_business_name || tenant?.name || 'Company';
  const logoUrl = resolveAssetUrl(tenant?.logo_url || '');

  const earnings = (statement?.components || []).filter((c) => c.component_type === 'earning');
  const deductions = (statement?.components || []).filter((c) => c.component_type === 'deduction');
  const minRows = Math.max(5, earnings.length, deductions.length);
  const eRows = padToLength(earnings, minRows);
  const dRows = padToLength(deductions, minRows);

  const empCode = emp?.emp_code || 'emp';
  const ref = statement?.settlement_ref || `fnf${statement?.id || ''}`;
  const pdfFilename = `fnf_statement_${empCode}_${ref}.pdf`;

  const handleDownloadPdf = async () => {
    if (!docRef.current || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const blob = await renderElementToPdfBlob(docRef.current);
      downloadPdfBlob(blob, pdfFilename);
    } catch {
      setExportError('Could not generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => window.print();

  const totalEarnings = parseFloat(statement?.total_earnings || 0);
  const totalDeductions = parseFloat(statement?.total_deductions || 0);
  const netPayable = parseFloat(statement?.net_payable || 0);
  const balanceDue = parseFloat(statement?.balance_due || 0);
  const amountPaid = parseFloat(statement?.amount_paid || 0);

  return (
    <div className="space-y-3">
      {/* Action buttons — hidden on print */}
      <div className="flex justify-end gap-2 print:hidden">
        <button type="button" onClick={handlePrint} className="btn-secondary text-xs">
          <Printer size={14} /> Print
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={exporting}
          className="btn-primary text-xs"
        >
          <Download size={14} />
          {exporting ? 'Generating…' : 'Download PDF'}
        </button>
      </div>
      {exportError && <p className="text-xs text-red-600 text-right print:hidden">{exportError}</p>}

      {/* Print-ready document — captured by html2canvas */}
      <div className="table-scroll">
        <div
          ref={docRef}
          data-payslip-export
          className="bg-white mx-auto"
          style={{
            width: '720px',
            maxWidth: '100%',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#000000',
          }}
        >
          {/* ── Main table ── */}
          <table
            style={{
              borderCollapse: 'collapse',
              border: BORDER,
              width: '100%',
              tableLayout: 'fixed',
            }}
          >
            <colgroup>
              <col style={{ width: '27%' }} />
              <col style={{ width: '23%' }} />
              <col style={{ width: '27%' }} />
              <col style={{ width: '23%' }} />
            </colgroup>
            <tbody>
              {/* Company header */}
              <tr>
                <td colSpan={4} style={cell({ padding: '10px' })}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {logoUrl && (
                      <div style={{ flexShrink: 0, width: '72px', textAlign: 'center' }}>
                        <img
                          src={logoUrl}
                          alt="logo"
                          crossOrigin="anonymous"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '56px',
                            objectFit: 'contain',
                            display: 'block',
                            margin: '0 auto',
                          }}
                        />
                      </div>
                    )}
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, textTransform: 'uppercase' }}>
                        {companyName}
                      </div>
                      {(tenant?.address_line1 || tenant?.city) && (
                        <div style={{ fontSize: '10px', color: '#333', marginTop: '2px' }}>
                          {[tenant?.address_line1, tenant?.city, tenant?.state, tenant?.pincode]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      )}
                      {tenant?.gstin && (
                        <div style={{ fontSize: '9px', color: '#555', marginTop: '1px' }}>
                          GSTIN: {tenant.gstin}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>

              {/* Document title */}
              <tr>
                <td
                  colSpan={4}
                  style={cell({
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '13px',
                    padding: '7px 8px',
                  })}
                >
                  FULL &amp; FINAL SETTLEMENT STATEMENT
                  {statement?.settlement_ref ? ` — ${statement.settlement_ref}` : ''}
                </td>
              </tr>

              {/* Employee + separation info */}
              <tr>
                <td style={labelCell()}>EMPLOYEE CODE</td>
                <td style={valueCell()}>{emp?.emp_code || '—'}</td>
                <td style={labelCell()}>DESIGNATION</td>
                <td style={valueCell()}>{emp?.designation?.name || '—'}</td>
              </tr>
              <tr>
                <td style={labelCell()}>EMPLOYEE NAME</td>
                <td style={valueCell()}>
                  {emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : '—'}
                </td>
                <td style={labelCell()}>DEPARTMENT</td>
                <td style={valueCell()}>{emp?.department?.name || '—'}</td>
              </tr>
              <tr>
                <td style={labelCell()}>DATE OF JOINING</td>
                <td style={valueCell()}>{fmt(emp?.date_of_joining)}</td>
                <td style={labelCell()}>EXIT TYPE</td>
                <td style={valueCell({ textTransform: 'capitalize' })}>
                  {sep?.exit_type?.replace(/_/g, ' ') || '—'}
                </td>
              </tr>
              <tr>
                <td style={labelCell()}>LAST WORKING DATE</td>
                <td style={valueCell()}>
                  {fmt(statement?.last_working_date || sep?.last_working_date)}
                </td>
                <td style={labelCell()}>PAN</td>
                <td style={valueCell()}>{emp?.pan_number || '—'}</td>
              </tr>
              <tr>
                <td style={labelCell()}>UAN / PF NO</td>
                <td style={valueCell()}>{emp?.uan_number || emp?.pf_number || '—'}</td>
                <td style={labelCell()}>BANK NAME</td>
                <td style={valueCell()}>{emp?.bank_name || '—'}</td>
              </tr>
              <tr>
                <td style={labelCell()}>SETTLEMENT DATE</td>
                <td style={valueCell()}>
                  {fmt(statement?.settlement_date || statement?.approved_at)}
                </td>
                <td style={labelCell()}>ACCOUNT NO</td>
                <td style={valueCell()}>{maskAccount(emp?.account_number)}</td>
              </tr>

              {/* Component column headers */}
              <tr>
                <td style={labelCell()}>EARNINGS</td>
                <td style={labelCell({ textAlign: 'right' })}>AMOUNT (₹)</td>
                <td style={labelCell()}>DEDUCTIONS</td>
                <td style={labelCell({ textAlign: 'right' })}>AMOUNT (₹)</td>
              </tr>

              {/* Component rows — earnings and deductions side-by-side */}
              {eRows.map((e, i) => (
                <tr key={`comp-${i}`}>
                  <td style={cell({ textTransform: 'uppercase' })}>{e?.label || ''}</td>
                  <td style={amountCell()}>
                    {e?.label != null && e?.amount != null
                      ? formatPayslipAmount(parseFloat(e.amount))
                      : ''}
                  </td>
                  <td style={cell({ textTransform: 'uppercase' })}>{dRows[i]?.label || ''}</td>
                  <td style={amountCell()}>
                    {dRows[i]?.label != null && dRows[i]?.amount != null
                      ? formatPayslipAmount(parseFloat(dRows[i].amount))
                      : ''}
                  </td>
                </tr>
              ))}

              {/* Totals row */}
              <tr>
                <td style={labelCell()}>TOTAL EARNINGS (A)</td>
                <td style={amountCell({ fontWeight: 700 })}>{formatPayslipAmount(totalEarnings)}</td>
                <td style={labelCell()}>TOTAL DEDUCTIONS (B)</td>
                <td style={amountCell({ fontWeight: 700 })}>{formatPayslipAmount(totalDeductions)}</td>
              </tr>

              {/* Net settlement — full-width spanning */}
              <tr>
                <td colSpan={2} style={labelCell({ borderRight: BORDER })}>
                  NET SETTLEMENT AMOUNT (A − B)
                </td>
                <td colSpan={2} style={amountCell({ fontWeight: 700, fontSize: '13px' })}>
                  {formatPayslipAmount(netPayable)}
                </td>
              </tr>
              <tr>
                <td style={labelCell()}>IN WORDS</td>
                <td colSpan={3} style={cell({ fontStyle: 'italic' })}>
                  {amountInWordsINR(netPayable)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Payment history (shown only when payments exist) ── */}
          {payments.length > 0 && (
            <table
              style={{
                borderCollapse: 'collapse',
                border: BORDER,
                width: '100%',
                marginTop: '10px',
              }}
            >
              <tbody>
                <tr>
                  <td
                    colSpan={5}
                    style={labelCell({ padding: '5px 8px' })}
                  >
                    PAYMENT HISTORY
                  </td>
                </tr>
                <tr>
                  <td style={labelCell({ width: '16%' })}>DATE</td>
                  <td style={labelCell({ width: '18%', textAlign: 'right' })}>AMOUNT (₹)</td>
                  <td style={labelCell({ width: '14%' })}>MODE</td>
                  <td style={labelCell({ width: '22%' })}>REFERENCE</td>
                  <td style={labelCell()}>REMARKS</td>
                </tr>
                {payments.map((p, i) => (
                  <tr key={`pmt-${i}`}>
                    <td style={cell()}>{fmt(p.payment_date)}</td>
                    <td style={amountCell()}>{formatPayslipAmount(parseFloat(p.amount || 0))}</td>
                    <td style={cell({ textTransform: 'uppercase' })}>
                      {FNF_PAYMENT_MODE_LABELS[p.payment_mode] || p.payment_mode || '—'}
                    </td>
                    <td style={cell()}>{p.reference_number || '—'}</td>
                    <td style={cell()}>{p.notes || '—'}</td>
                  </tr>
                ))}
                {/* Payment summary */}
                <tr>
                  <td style={labelCell()}>AMOUNT PAID</td>
                  <td style={amountCell({ fontWeight: 700 })}>{formatPayslipAmount(amountPaid)}</td>
                  <td style={labelCell()}>BALANCE DUE</td>
                  <td
                    colSpan={2}
                    style={amountCell({ fontWeight: 700 })}
                  >
                    {formatPayslipAmount(balanceDue)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* ── Signature blocks ── */}
          <table
            style={{
              borderCollapse: 'collapse',
              border: BORDER,
              width: '100%',
              marginTop: '24px',
            }}
          >
            <tbody>
              <tr>
                <td
                  style={cell({
                    width: '50%',
                    height: '64px',
                    borderRight: BORDER,
                    verticalAlign: 'bottom',
                    paddingBottom: '6px',
                  })}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      borderTop: '1px solid #000',
                      paddingTop: '4px',
                      marginTop: '44px',
                    }}
                  >
                    Authorised Signatory — HR / Finance
                  </div>
                  {statement?.approver && (
                    <div style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>
                      {`${statement.approver.first_name || ''} ${statement.approver.last_name || ''}`.trim()}
                      {statement.approver.emp_code ? ` (${statement.approver.emp_code})` : ''}
                    </div>
                  )}
                </td>
                <td
                  style={cell({
                    width: '50%',
                    height: '64px',
                    verticalAlign: 'bottom',
                    paddingBottom: '6px',
                  })}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      borderTop: '1px solid #000',
                      paddingTop: '4px',
                      marginTop: '44px',
                    }}
                  >
                    Employee Acknowledgement
                  </div>
                  <div style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>
                    I acknowledge receipt of the above F&amp;F settlement amount.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer */}
          <div
            style={{
              textAlign: 'center',
              fontSize: '9px',
              color: '#666',
              marginTop: '6px',
              fontStyle: 'italic',
            }}
          >
            This is a computer-generated document. Generated on{' '}
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.
          </div>
        </div>
      </div>
    </div>
  );
}
