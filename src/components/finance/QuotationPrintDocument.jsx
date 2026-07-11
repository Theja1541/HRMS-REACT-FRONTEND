import {
  QUOTATION_UNIT_LABELS,
  computeQuotationLineAmounts,
  computeQuotationTotals,
} from '../../constants/finance';
import { resolveAssetUrl } from '../../utils/helpers';
import { formatIndianAmount, formatInvoiceDateLong, formatDocumentField, joinAddressOptional } from '../../utils/invoiceFormat';

const BORDER = '#1a202c';
const MUTED = '#4a5568';
const TABLE_HEAD_BG = '#f1f5f9';
const SECTION_BG = '#e8f0f7';
const FONT_STACK = 'Arial, Helvetica, sans-serif';
const MONO_FONT = 'Consolas, "Courier New", monospace';

const border = `1px solid ${BORDER}`;

function cell(extra = {}) {
  return {
    border,
    padding: '6px 8px',
    fontSize: '11px',
    lineHeight: 1.45,
    verticalAlign: 'middle',
    color: '#111827',
    ...extra,
  };
}

function sectionBar(extra = {}) {
  return cell({
    backgroundColor: SECTION_BG,
    fontWeight: 700,
    fontSize: '11px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    ...extra,
  });
}

function tableHead(extra = {}) {
  return cell({
    backgroundColor: TABLE_HEAD_BG,
    fontWeight: 700,
    textAlign: 'center',
    verticalAlign: 'middle',
    ...extra,
  });
}

function labelCell(extra = {}) {
  return cell({ fontWeight: 700, width: '22%', whiteSpace: 'nowrap', ...extra });
}

function valueCell(extra = {}) {
  return cell({ ...extra });
}

function MetaRow({ label, value, mono, multiline }) {
  const display = formatDocumentField(value);
  return (
    <tr>
      <td style={labelCell({ width: '34%', verticalAlign: multiline ? 'top' : 'middle' })}>{label}</td>
      <td
        style={valueCell({
          fontFamily: mono ? MONO_FONT : FONT_STACK,
          whiteSpace: multiline ? 'pre-wrap' : undefined,
          verticalAlign: multiline ? 'top' : 'middle',
          wordBreak: multiline ? 'break-word' : undefined,
        })}
      >
        {display}
      </td>
    </tr>
  );
}

export default function QuotationPrintDocument({ quotation, tenant }) {
  const companyName = (tenant?.legal_business_name || tenant?.name || 'Company Name').toUpperCase();
  const companyAddress = joinAddressOptional([
    tenant?.address_line1,
    tenant?.address_line2,
    tenant?.city,
    tenant?.state,
    tenant?.pincode,
  ]);
  const logoUrl = resolveAssetUrl(tenant?.logo_url || '');
  const lineItems = quotation?.line_items || [];
  const totals = computeQuotationTotals(lineItems);

  return (
    <div
      id="quotation-view-print"
      data-quotation-export
      data-finance-export
      className="quotation-print-document bg-white text-black mx-auto"
      style={{
        width: '194mm',
        maxWidth: '194mm',
        fontFamily: FONT_STACK,
        fontSize: '11px',
        lineHeight: 1.45,
        color: '#111827',
        border,
        boxSizing: 'border-box',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '5%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '10%' }} />
        </colgroup>
        <tbody>
          {/* Company header — logo left, company centered */}
          <tr>
            <td style={{ ...cell(), padding: '10px 12px', verticalAlign: 'middle' }} colSpan={9}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flexShrink: 0, width: '76px', textAlign: 'center' }}>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Company logo"
                      crossOrigin="anonymous"
                      data-quotation-logo="true"
                      style={{ maxWidth: '68px', maxHeight: '56px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '68px',
                        height: '56px',
                        margin: '0 auto',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        color: '#94a3b8',
                      }}
                    >
                      Logo
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '0 12px' }}>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      lineHeight: 1.25,
                      letterSpacing: '0.03em',
                    }}
                  >
                    {companyName}
                  </div>
                  {companyAddress && (
                    <div style={{ marginTop: '4px', fontSize: '10px', color: MUTED, lineHeight: 1.45 }}>
                      {companyAddress}
                    </div>
                  )}
                  <div style={{ marginTop: '6px', fontSize: '9px', color: MUTED, lineHeight: 1.5 }}>
                    {tenant?.gstin && (
                      <span>
                        <strong style={{ color: '#111827' }}>GSTIN:</strong> {tenant.gstin}
                      </span>
                    )}
                    {tenant?.gstin && tenant?.phone && <span> · </span>}
                    {tenant?.phone && (
                      <span>
                        <strong style={{ color: '#111827' }}>Phone:</strong> {tenant.phone}
                      </span>
                    )}
                    {(tenant?.gstin || tenant?.phone) && tenant?.email && <span> · </span>}
                    {tenant?.email && (
                      <span>
                        <strong style={{ color: '#111827' }}>Email:</strong> {tenant.email}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ flexShrink: 0, width: '76px' }} aria-hidden="true" />
              </div>
            </td>
          </tr>

          {/* Title */}
          <tr>
            <td style={sectionBar({ textAlign: 'center', fontSize: '12px', padding: '6px' })} colSpan={9}>
              Quotation
            </td>
          </tr>

          {/* Quotation meta + customer */}
          <tr>
            <td style={{ ...cell(), padding: 0, verticalAlign: 'top' }} colSpan={4}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={sectionBar({ borderLeft: 'none', borderTop: 'none' })} colSpan={2}>
                      Quotation Details
                    </td>
                  </tr>
                  <MetaRow label="Quotation No" value={quotation?.quotation_no} mono />
                  <MetaRow label="Date" value={formatInvoiceDateLong(quotation?.date || quotation?.quotation_date)} />
                  <MetaRow label="Valid Until" value={formatInvoiceDateLong(quotation?.valid_until)} />
                </tbody>
              </table>
            </td>
            <td style={{ ...cell(), padding: 0, verticalAlign: 'top' }} colSpan={5}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={sectionBar({ borderRight: 'none', borderTop: 'none' })} colSpan={2}>
                      Customer Details
                    </td>
                  </tr>
                  <MetaRow label="Customer" value={quotation?.customer_name} />
                  <MetaRow label="Company" value={quotation?.company_name} />
                  <MetaRow label="Contact" value={quotation?.contact_person} />
                  <MetaRow label="Phone" value={quotation?.phone} />
                  <MetaRow label="Email" value={quotation?.email} />
                  <MetaRow label="Address" value={quotation?.address} multiline />
                </tbody>
              </table>
            </td>
          </tr>

          {/* Items */}
          <tr>
            <td style={tableHead()}>#</td>
            <td style={tableHead({ textAlign: 'left' })}>Item Name</td>
            <td style={tableHead({ textAlign: 'left' })}>Description</td>
            <td style={tableHead()}>Qty</td>
            <td style={tableHead()}>Unit</td>
            <td style={tableHead({ textAlign: 'right' })}>Rate</td>
            <td style={tableHead({ textAlign: 'right' })}>Discount</td>
            <td style={tableHead()}>GST %</td>
            <td style={tableHead({ textAlign: 'right' })}>Amount</td>
          </tr>

          {lineItems.map((item, index) => {
            const { amount } = computeQuotationLineAmounts(item);
            return (
              <tr key={`${item.item_name}-${index}`}>
                <td style={{ ...cell(), textAlign: 'center', verticalAlign: 'middle' }}>{index + 1}</td>
                <td style={{ ...cell(), fontWeight: 600 }}>{item.item_name}</td>
                <td style={cell()}>{item.description || '—'}</td>
                <td style={{ ...cell(), textAlign: 'center', verticalAlign: 'middle', fontFamily: MONO_FONT }}>
                  {item.qty}
                </td>
                <td style={{ ...cell(), textAlign: 'center', verticalAlign: 'middle' }}>
                  {QUOTATION_UNIT_LABELS[item.unit] || item.unit}
                </td>
                <td style={{ ...cell(), textAlign: 'right', fontFamily: MONO_FONT }}>
                  {formatIndianAmount(item.rate)}
                </td>
                <td style={{ ...cell(), textAlign: 'right', fontFamily: MONO_FONT }}>
                  {formatIndianAmount(item.discount || 0)}
                </td>
                <td style={{ ...cell(), textAlign: 'center', verticalAlign: 'middle', fontFamily: MONO_FONT }}>
                  {item.gst_percent}%
                </td>
                <td style={{ ...cell(), textAlign: 'right', fontWeight: 700, fontFamily: MONO_FONT }}>
                  {formatIndianAmount(amount)}
                </td>
              </tr>
            );
          })}

          {/* Totals */}
          <tr>
            <td style={{ ...cell(), borderBottom: 'none' }} colSpan={6} />
            <td style={{ ...cell(), fontWeight: 600, textAlign: 'right' }} colSpan={2}>
              Subtotal
            </td>
            <td style={{ ...cell(), textAlign: 'right', fontFamily: MONO_FONT }}>
              {formatIndianAmount(totals.subtotal)}
            </td>
          </tr>
          {totals.discount > 0 && (
            <tr>
              <td style={{ ...cell(), borderTop: 'none', borderBottom: 'none' }} colSpan={6} />
              <td style={{ ...cell(), fontWeight: 600, textAlign: 'right' }} colSpan={2}>
                Discount
              </td>
              <td style={{ ...cell(), textAlign: 'right', fontFamily: MONO_FONT }}>
                {formatIndianAmount(totals.discount)}
              </td>
            </tr>
          )}
          <tr>
            <td style={{ ...cell(), borderTop: 'none', borderBottom: 'none' }} colSpan={6} />
            <td style={{ ...cell(), fontWeight: 600, textAlign: 'right' }} colSpan={2}>
              GST
            </td>
            <td style={{ ...cell(), textAlign: 'right', fontFamily: MONO_FONT }}>
              {formatIndianAmount(totals.gst)}
            </td>
          </tr>
          <tr>
            <td style={{ ...cell(), borderTop: 'none' }} colSpan={6} />
            <td style={{ ...cell(), fontWeight: 700, textAlign: 'right', borderTop: '2px solid #000' }} colSpan={2}>
              Grand Total
            </td>
            <td
              style={{
                ...cell(),
                textAlign: 'right',
                fontWeight: 700,
                fontFamily: MONO_FONT,
                borderTop: '2px solid #000',
                fontSize: '12px',
              }}
            >
              {formatIndianAmount(totals.grandTotal)}
            </td>
          </tr>

          {/* Notes + Terms */}
          <tr>
            <td style={{ ...cell(), verticalAlign: 'top' }} colSpan={4}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>Notes</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '10px', color: MUTED, lineHeight: 1.45 }}>
                {quotation?.notes || '—'}
              </div>
            </td>
            <td style={{ ...cell(), verticalAlign: 'top' }} colSpan={5}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>Terms &amp; Conditions</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '10px', color: MUTED, lineHeight: 1.45 }}>
                {quotation?.terms_and_conditions || '—'}
              </div>
            </td>
          </tr>

          {/* Signature */}
          <tr>
            <td style={{ ...cell(), verticalAlign: 'bottom' }} colSpan={5}>
              <div style={{ fontSize: '9px', color: MUTED, fontStyle: 'italic' }}>
                This is a computer-generated quotation and is valid until the date mentioned above unless revoked earlier.
              </div>
            </td>
            <td style={{ ...cell(), verticalAlign: 'bottom', textAlign: 'right' }} colSpan={4}>
              <div style={{ fontWeight: 700, marginBottom: '28px' }}>For {companyName}</div>
              <div
                style={{
                  borderTop: `1px solid ${BORDER}`,
                  display: 'inline-block',
                  minWidth: '180px',
                  paddingTop: '4px',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                Authorized Signature
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
