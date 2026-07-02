import { resolveAssetUrl } from '../../utils/helpers';
import { resolveGstStateCode, resolveGstStateName } from '../../utils/gstStateCode';
import {
  formatAmountInWords,
  formatIndianAmount,
  formatInvoiceDateLong,
  formatInvoiceQty,
  joinAddress,
} from '../../utils/invoiceFormat';

const SECTION_BG = '#D9E9F4';
const TABLE_HEAD_BG = '#F2F2F2';
const MIN_ITEM_ROWS = 10;
const COLS = 8;

const border = '1px solid #000';

function cell(extra = {}) {
  return {
    border,
    padding: '5px 8px',
    fontSize: '11px',
    lineHeight: 1.4,
    verticalAlign: 'middle',
    ...extra,
  };
}

function sectionBar(extra = {}) {
  return cell({
    backgroundColor: SECTION_BG,
    fontWeight: 700,
    ...extra,
  });
}

function tableHead(extra = {}) {
  return cell({
    backgroundColor: TABLE_HEAD_BG,
    fontWeight: 700,
    textAlign: 'center',
    ...extra,
  });
}

function labelCell(extra = {}) {
  return cell({ fontWeight: 700, width: '14%', ...extra });
}

function displayGstPercent(item) {
  if (item.gst_applicable || parseFloat(item.gst_amount) > 0) {
    return `${parseFloat(item.gst_percent) || 0}%`;
  }
  return '-';
}

const PAYMENT_MODE_LABELS = {
  cash: 'Cash',
  bank: 'Bank Transfer',
  upi: 'UPI',
  cheque: 'Cheque',
};

export default function TaxInvoiceDocument({ invoice, tenant, vendor, transaction }) {
  const companyName = (tenant?.legal_business_name || tenant?.name || 'Company Name').toUpperCase();
  const companyAddress = joinAddress([
    tenant?.address_line1,
    tenant?.address_line2,
    tenant?.city,
    tenant?.state,
    tenant?.pincode,
  ]);
  const logoUrl = resolveAssetUrl(tenant?.logo_url || '');
  const lineItems = invoice?.line_items || [];
  const subtotal = invoice?.subtotal ?? 0;
  const totalGst = invoice?.total_gst ?? 0;
  const grandTotal = invoice?.grand_total ?? 0;
  const emptyRows = Math.max(0, MIN_ITEM_ROWS - lineItems.length);
  const paymentMode = invoice?.payment_mode || 'cash';
  const chequeNumber = invoice?.cheque_number || '';

  const stateName = resolveGstStateName(tenant) || '—';
  const stateCode = resolveGstStateCode(tenant) || '—';

  return (
    <div
      id="tax-invoice-print"
      className="tax-invoice-document bg-white text-black mx-auto"
      style={{
        maxWidth: '210mm',
        width: '100%',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11px',
        color: '#000',
        border: '1px solid #000',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '6%' }} />
          <col style={{ width: '26%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '14%' }} />
        </colgroup>
        <tbody>
          {/* ── Company header ── */}
          <tr>
            <td style={{ ...cell(), padding: '8px', verticalAlign: 'middle' }} colSpan={COLS}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flexShrink: 0, width: '80px', textAlign: 'center' }}>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      style={{ maxWidth: '72px', maxHeight: '56px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                    />
                  ) : null}
                  <div style={{ fontSize: '10px', marginTop: '4px', whiteSpace: 'nowrap' }}>
                    <strong>Mobile #</strong> {tenant?.phone || ''}
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '4px 12px' }}>
                  <div
                    style={{
                      fontSize: '22px',
                      fontWeight: 700,
                      fontFamily: 'Georgia, "Times New Roman", Times, serif',
                      letterSpacing: '0.3px',
                      lineHeight: 1.2,
                    }}
                  >
                    {companyName}
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '11px' }}>{companyAddress}</div>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style={cell()} colSpan={COLS}>
              <strong>GSTIN:</strong> {tenant?.gstin || ''}
            </td>
          </tr>

          {/* ── TAX INVOICE title ── */}
          <tr>
            <td style={sectionBar({ textAlign: 'center', fontSize: '12px', padding: '6px' })} colSpan={COLS}>
              TAX INVOICE
            </td>
          </tr>

          {/* ── Invoice meta: 4-column label | value | label | value ── */}
          <tr>
            <td style={labelCell()} colSpan={2}>
              INVOICE #
            </td>
            <td style={cell()} colSpan={2}>
              {invoice?.number}
            </td>
            <td style={labelCell()} colSpan={2}>
              STATE
            </td>
            <td style={cell()} colSpan={2}>
              {stateName}
            </td>
          </tr>
          <tr>
            <td style={labelCell()} colSpan={2}>
              DATE
            </td>
            <td style={cell()} colSpan={2}>
              {formatInvoiceDateLong(invoice?.date)}
            </td>
            <td style={labelCell()} colSpan={2}>
              STATE CO
            </td>
            <td style={cell()} colSpan={2}>
              {stateCode}
            </td>
          </tr>

          {/* ── INVOICE TO ── */}
          <tr>
            <td style={sectionBar({ textAlign: 'left', padding: '5px 8px' })} colSpan={COLS}>
              INVOICE TO
            </td>
          </tr>
          <tr>
            <td style={labelCell()} colSpan={2}>
              Name:
            </td>
            <td style={cell()} colSpan={COLS - 2}>
              {vendor?.name || '—'}
            </td>
          </tr>
          <tr>
            <td style={labelCell()} colSpan={2}>
              Address:
            </td>
            <td style={cell()} colSpan={COLS - 2}>
              {vendor?.address || '—'}
            </td>
          </tr>
          <tr>
            <td style={labelCell()} colSpan={2}>
              GST No:
            </td>
            <td style={cell()} colSpan={COLS - 2}>
              {vendor?.gst_applicable ? vendor?.gstin || '—' : '—'}
            </td>
          </tr>

          {/* ── Line items header ── */}
          <tr>
            <td style={tableHead()}>Sr.No</td>
            <td style={tableHead({ textAlign: 'left' })}>Product Name</td>
            <td style={tableHead()}>Qty</td>
            <td style={tableHead()}>Unit Price</td>
            <td style={tableHead()}>Amount</td>
            <td style={tableHead()}>GST %</td>
            <td style={tableHead()}>GST Amt</td>
            <td style={tableHead()}>Total Amount</td>
          </tr>

          {/* ── Line items body ── */}
          {lineItems.map((item, idx) => (
            <tr key={item.id || idx}>
              <td style={{ ...cell(), textAlign: 'center' }}>{idx + 1}</td>
              <td style={{ ...cell(), fontWeight: 700 }}>{item.description}</td>
              <td style={{ ...cell(), textAlign: 'center' }}>{formatInvoiceQty(item.qty)}</td>
              <td style={{ ...cell(), textAlign: 'center' }}>{formatIndianAmount(item.unit_price)}</td>
              <td style={{ ...cell(), textAlign: 'center' }}>{formatIndianAmount(item.amount)}</td>
              <td style={{ ...cell(), textAlign: 'center' }}>{displayGstPercent(item)}</td>
              <td style={{ ...cell(), textAlign: 'center' }}>{formatIndianAmount(item.gst_amount)}</td>
              <td style={{ ...cell(), textAlign: 'center', fontWeight: 700 }}>
                {formatIndianAmount(item.line_total)}
              </td>
            </tr>
          ))}
          {Array.from({ length: emptyRows }).map((_, i) => (
            <tr key={`empty-${i}`}>
              {Array.from({ length: COLS }).map((__, j) => (
                <td key={j} style={{ ...cell(), height: '24px' }}>
                  &nbsp;
                </td>
              ))}
            </tr>
          ))}

          {/* ── Totals (right-aligned block) ── */}
          <tr>
            <td style={{ ...cell(), borderBottom: 'none' }} colSpan={5} />
            <td style={{ ...cell(), fontWeight: 600 }} colSpan={2}>
              Total Amount Before Tax
            </td>
            <td style={{ ...cell(), textAlign: 'center' }}>{formatIndianAmount(subtotal)}</td>
          </tr>
          <tr>
            <td style={{ ...cell(), borderTop: 'none', borderBottom: 'none' }} colSpan={5} />
            <td style={{ ...cell(), fontWeight: 600 }} colSpan={2}>
              Total GST
            </td>
            <td style={{ ...cell(), textAlign: 'center' }}>{formatIndianAmount(totalGst)}</td>
          </tr>
          <tr>
            <td style={{ ...cell(), borderTop: 'none' }} colSpan={5} />
            <td style={{ ...cell(), fontWeight: 700, borderTop: '2px solid #000' }} colSpan={2}>
              GRAND TOTAL
            </td>
            <td style={{ ...cell(), textAlign: 'center', fontWeight: 700, borderTop: '2px solid #000' }}>
              {formatIndianAmount(grandTotal)}
            </td>
          </tr>

          {/* ── Amount in words ── */}
          <tr>
            <td style={cell()} colSpan={COLS}>
              Total Invoice Amount (In words):- {formatAmountInWords(grandTotal)}
            </td>
          </tr>

          {/* ── Footer: Payment details + Signatory ── */}
          <tr>
            <td style={{ ...cell(), verticalAlign: 'top', height: '120px' }} colSpan={4}>
              <div style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: '10px' }}>
                Payment Details
              </div>
              <div style={{ marginBottom: '6px' }}>
                <strong>Payment Mode:</strong> {PAYMENT_MODE_LABELS[paymentMode] || paymentMode}
              </div>
              {paymentMode === 'bank' && (
                <>
                  {vendor?.bank_details?.account_name && (
                    <div style={{ marginBottom: '6px' }}>
                      <strong>Account Name:</strong> {vendor.bank_details.account_name}
                    </div>
                  )}
                  <div style={{ marginBottom: '6px' }}>
                    <strong style={{ backgroundColor: '#FFFF00' }}>A/c # :</strong>{' '}
                    {vendor?.bank_details?.account_number || ''}
                  </div>
                  <div style={{ marginBottom: '6px' }}>
                    <strong>IFSC:</strong> {vendor?.bank_details?.ifsc || ''}
                  </div>
                  <div>
                    <strong style={{ backgroundColor: '#FFFF00' }}>Bank:</strong>{' '}
                    {vendor?.bank_details?.bank_name || ''}
                  </div>
                </>
              )}
              {paymentMode === 'upi' && (
                <div style={{ marginBottom: '6px' }}>
                  <strong>UPI ID:</strong> {vendor?.bank_details?.upi || ''}
                </div>
              )}
              {paymentMode === 'cheque' && chequeNumber && (
                <div style={{ marginBottom: '6px' }}>
                  <strong>Cheque No:</strong> {chequeNumber}
                </div>
              )}
            </td>
            <td style={{ ...cell(), verticalAlign: 'top', textAlign: 'right' }} colSpan={4}>
              <div
                style={{
                  fontSize: '9px',
                  fontStyle: 'italic',
                  textAlign: 'right',
                  marginBottom: '36px',
                  lineHeight: 1.3,
                }}
              >
                *Certified that the particulars given above are true and correct*
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>For {tenant?.legal_business_name || tenant?.name || companyName}</div>
                <div style={{ marginTop: '52px', fontSize: '11px' }}>Authorised Signatory</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
