import {
  formatReceiptINR,
  formatReceiptPurpose,
  formatWebsiteDisplay,
  receiptAmountInWords,
} from '../../utils/receiptFormat';
import { formatInvoiceDateLong, formatInvoiceQty, joinAddress } from '../../utils/invoiceFormat';
import { resolveAssetUrl } from '../../utils/helpers';

const TEXT = '#0f172a';
const MUTED = '#64748b';
const TABLE_HEAD_BG = '#f8fafc';
const SUMMARY_BG = '#f8fafc';
const BORDER = '#dbe3ef';
const BRAND = '#1d4ed8';

function displayGstPercent(item) {
  if (item.gst_applicable || parseFloat(item.gst_amount) > 0) {
    return `${parseFloat(item.gst_percent) || 0}%`;
  }
  return '-';
}

function Rule({ style }) {
  return (
    <hr
      style={{
        border: 'none',
        borderTop: `1px solid ${BORDER}`,
        margin: '18px 0',
        ...style,
      }}
    />
  );
}

export default function PaymentReceiptDocument({ receipt, tenant, vendor }) {
  const companyName = tenant?.legal_business_name || tenant?.name || 'Company Name';
  const companyAddress = joinAddress([
    tenant?.address_line1,
    tenant?.address_line2,
    tenant?.city,
    tenant?.state,
    tenant?.pincode,
  ]);
  const logoUrl = resolveAssetUrl(tenant?.logo_url || '');
  const lineItems = receipt?.line_items || [];
  const grandTotal = receipt?.grand_total ?? 0;
  const gstDisplay = tenant?.gstin ? tenant.gstin : 'N/A';
  const email = tenant?.email || '';
  const website = formatWebsiteDisplay(tenant?.website_url);
  const purpose = formatReceiptPurpose(receipt?.number, receipt?.date);
  const paymentMode = receipt?.payment_mode_label || '—';
  const receiptNumber = receipt?.number || '—';
  const receiptDate = formatInvoiceDateLong(receipt?.date);
  const totalInWords = receiptAmountInWords(grandTotal);

  return (
    <div
      id="payment-receipt-print"
      className="payment-receipt-document"
      style={{
        maxWidth: '210mm',
        width: '100%',
        margin: '0 auto',
        background: '#fff',
        border: `1px solid ${BORDER}`,
        borderRadius: '10px',
        padding: '24px 28px',
        fontFamily: 'Inter, Arial, Helvetica, sans-serif',
        fontSize: '12px',
        lineHeight: 1.45,
        color: TEXT,
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '8px',
              border: `1px solid ${BORDER}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              background: '#fff',
              flexShrink: 0,
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '10px', color: '#a0aec0' }}>Logo</span>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '2px' }}>{companyName}</div>
            <div style={{ color: '#475569', marginBottom: '2px' }}>{companyAddress}</div>
            <div style={{ color: MUTED, fontSize: '11px' }}>
              GSTIN: {gstDisplay} | Phone: {tenant?.phone || '—'}
            </div>
            {(email || website) && (
              <div style={{ color: MUTED, fontSize: '11px' }}>
                {email && <span>{email}</span>}
                {email && website && <span> | </span>}
                {website && <span>{website}</span>}
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            minWidth: '180px',
            border: `1px solid ${BORDER}`,
            borderRadius: '8px',
            padding: '10px 12px',
            background: '#f8fafc',
            alignSelf: 'flex-start',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', color: MUTED, marginBottom: '4px' }}>
            RECEIPT DETAILS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '3px 8px', fontSize: '11px' }}>
            <span style={{ color: MUTED }}>Receipt No</span>
            <span style={{ fontWeight: 600 }}>{receiptNumber}</span>
            <span style={{ color: MUTED }}>Date</span>
            <span style={{ fontWeight: 600 }}>{receiptDate}</span>
            <span style={{ color: MUTED }}>Mode</span>
            <span style={{ fontWeight: 600 }}>{paymentMode}</span>
          </div>
        </div>
      </div>

      <div
        style={{
          borderRadius: '8px',
          border: `1px solid ${BORDER}`,
          background: '#eff6ff',
          color: BRAND,
          padding: '8px 12px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontSize: '12px',
          marginBottom: '12px',
          textAlign: 'center',
        }}
      >
        Payment Receipt
      </div>

      <div style={{ border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', color: MUTED, marginBottom: '4px' }}>
          RECEIVED FROM
        </div>
        <div style={{ fontWeight: 700, fontSize: '14px', color: TEXT, marginBottom: '2px' }}>{vendor?.name || '—'}</div>
        <div style={{ color: '#475569' }}>
          For: <span style={{ fontWeight: 600 }}>{purpose}</span>
        </div>
      </div>

      {/* Line items */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '12px',
          fontSize: '11px',
        }}
      >
        <thead>
          <tr>
            <th style={thStyle({ textAlign: 'left', width: '24%' })}>Description</th>
            <th style={thStyle({ width: '9%' })}>Qty</th>
            <th style={thStyle({ textAlign: 'right', width: '13%' })}>Unit Price</th>
            <th style={thStyle({ textAlign: 'right', width: '13%' })}>Amount</th>
            <th style={thStyle({ width: '9%' })}>GST %</th>
            <th style={thStyle({ textAlign: 'right', width: '13%' })}>GST Amt</th>
            <th style={thStyle({ textAlign: 'right', width: '14%' })}>Total Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, idx) => (
            <tr key={item.id || idx}>
              <td style={tdStyle({ fontWeight: 600, textAlign: 'left' })}>{item.description}</td>
              <td style={tdStyle({ textAlign: 'center' })}>{formatInvoiceQty(item.qty)}</td>
              <td style={tdStyle({ textAlign: 'right' })}>{formatReceiptINR(item.unit_price)}</td>
              <td style={tdStyle({ textAlign: 'right' })}>{formatReceiptINR(item.amount)}</td>
              <td style={tdStyle({ textAlign: 'center' })}>{displayGstPercent(item)}</td>
              <td style={tdStyle({ textAlign: 'right' })}>{formatReceiptINR(item.gst_amount)}</td>
              <td style={tdStyle({ textAlign: 'right', fontWeight: 700 })}>
                {formatReceiptINR(item.line_total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div
          style={{
            backgroundColor: SUMMARY_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <div style={{ fontSize: '10px', color: MUTED, letterSpacing: '0.06em', fontWeight: 600, marginBottom: '4px' }}>
            AMOUNT IN WORDS
          </div>
          <div style={{ fontSize: '11px', color: '#334155', fontStyle: 'italic' }}>{totalInWords}</div>
        </div>
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: `1px solid ${BORDER}`,
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <div style={{ fontSize: '10px', color: MUTED, letterSpacing: '0.06em', fontWeight: 600, marginBottom: '4px' }}>
            TOTAL PAID
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: TEXT, lineHeight: 1.2 }}>{formatReceiptINR(grandTotal)}</div>
        </div>
      </div>

      <div style={{ marginBottom: '12px', fontSize: '11px', lineHeight: 1.55 }}>
        <div style={{ marginBottom: '4px' }}>
          <strong>Purpose:</strong> {purpose}
        </div>
        <div>
          <strong>Note:</strong> This is a computer-generated receipt and does not require physical signature for accounting reference.
        </div>
      </div>

      <Rule style={{ margin: '10px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-end' }}>
        <div style={{ fontSize: '10px', color: MUTED, lineHeight: 1.6 }}>
          <div>Generated on: {new Date().toLocaleDateString('en-IN')}</div>
          <div>Reference: {receiptNumber}</div>
        </div>
        <div style={{ textAlign: 'center', minWidth: '170px' }}>
          <div style={{ borderTop: `1px solid ${TEXT}`, paddingTop: '6px', fontSize: '11px', fontWeight: 600 }}>
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  );
}

function thStyle(extra = {}) {
  return {
    padding: '7px 8px',
    fontWeight: 600,
    fontSize: '10px',
    textAlign: 'center',
    backgroundColor: TABLE_HEAD_BG,
    border: `1px solid ${BORDER}`,
    color: '#4a5568',
    ...extra,
  };
}

function tdStyle(extra = {}) {
  return {
    padding: '6px 8px',
    border: `1px solid ${BORDER}`,
    verticalAlign: 'middle',
    color: TEXT,
    ...extra,
  };
}
