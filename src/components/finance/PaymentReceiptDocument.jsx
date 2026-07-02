import {
  formatReceiptINR,
  formatReceiptPurpose,
  formatWebsiteDisplay,
  receiptAmountInWords,
} from '../../utils/receiptFormat';
import { formatInvoiceDateLong, formatInvoiceQty, joinAddress } from '../../utils/invoiceFormat';
import { resolveAssetUrl } from '../../utils/helpers';

const TEXT = '#1a202c';
const MUTED = '#718096';
const TABLE_HEAD_BG = '#f8f9fa';
const SUMMARY_BG = '#f8f9fa';
const BORDER = '#dee2e6';

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

  return (
    <div
      id="payment-receipt-print"
      className="payment-receipt-document"
      style={{
        maxWidth: '210mm',
        width: '100%',
        margin: '0 auto',
        background: '#fff',
        padding: '40px 48px 36px',
        fontFamily: 'Inter, Arial, Helvetica, sans-serif',
        fontSize: '13px',
        lineHeight: 1.55,
        color: TEXT,
        boxSizing: 'border-box',
      }}
    >
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <div
          style={{
            width: '76px',
            height: '76px',
            margin: '0 auto',
            borderRadius: '10px',
            border: `1px solid ${BORDER}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            background: '#fff',
          }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: '11px', color: '#a0aec0' }}>Logo</span>
          )}
        </div>
      </div>

      {/* Title */}
      <h1
        style={{
          textAlign: 'center',
          fontSize: '24px',
          fontWeight: 700,
          color: TEXT,
          textDecoration: 'underline',
          textUnderlineOffset: '5px',
          textDecorationThickness: '2px',
          margin: '0 0 28px',
        }}
      >
        Payment Receipt
      </h1>

      {/* Company */}
      <div style={{ marginBottom: '0' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '3px' }}>{companyName}</div>
        <div style={{ fontSize: '13px', color: '#4a5568' }}>{companyAddress}</div>
      </div>

      <Rule />

      {/* Receipt meta */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
          gap: '16px',
        }}
      >
        <div>
          <span style={{ fontWeight: 400 }}>Receipt No: </span>
          <span>{receipt?.number}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong>Date:</strong> {formatInvoiceDateLong(receipt?.date)}
        </div>
      </div>

      <Rule />

      {/* Paying to */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: MUTED,
            textTransform: 'uppercase',
            marginBottom: '6px',
          }}
        >
          Paying To:
        </div>
        <div style={{ fontWeight: 700, fontSize: '15px', color: TEXT }}>{vendor?.name || '—'}</div>
      </div>

      {/* Line items */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '24px',
          fontSize: '12px',
        }}
      >
        <thead>
          <tr>
            <th style={thStyle({ textAlign: 'left', width: '24%' })}>Product Name</th>
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

      {/* Total amount paid */}
      <div
        style={{
          backgroundColor: SUMMARY_BG,
          borderRadius: '10px',
          padding: '22px 28px 20px',
          textAlign: 'center',
          marginBottom: '22px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.07em',
            color: MUTED,
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}
        >
          Total Amount Paid:
        </div>
        <div
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: TEXT,
            letterSpacing: '-0.02em',
            marginBottom: '8px',
            lineHeight: 1.2,
          }}
        >
          {formatReceiptINR(grandTotal)}
        </div>
        <div style={{ fontSize: '12px', fontStyle: 'italic', color: MUTED }}>
          (Equivalent: {receiptAmountInWords(grandTotal)})
        </div>
      </div>

      {/* Payment mode + purpose */}
      <div style={{ marginBottom: '24px', fontSize: '12px', lineHeight: 1.65 }}>
        <div style={{ marginBottom: '8px' }}>
          <strong>Payment Mode:</strong> {receipt?.payment_mode_label || '—'}
        </div>
        <div>
          <strong>Purpose:</strong> {purpose}
        </div>
      </div>

      <Rule style={{ marginTop: '4px' }} />

      {/* Signatory */}
      <div style={{ marginBottom: '28px', paddingTop: '4px' }}>
        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '18px' }}>Authorized Signatory</div>
        <div style={{ fontSize: '13px' }}>
          <div style={{ marginBottom: '16px' }}>
            <span>Signature:</span>
            <span
              style={{
                display: 'inline-block',
                borderBottom: `1px solid ${TEXT}`,
                minWidth: '220px',
                marginLeft: '6px',
                height: '18px',
                verticalAlign: 'bottom',
              }}
            />
          </div>
          <div>Seal:</div>
        </div>
      </div>

      <Rule style={{ margin: '0 0 22px' }} />

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '11px', color: '#4a5568', lineHeight: 1.75 }}>
        <div style={{ fontWeight: 700, fontSize: '12px', color: TEXT, letterSpacing: '0.05em', marginBottom: '2px' }}>
          {companyName.toUpperCase()}
        </div>
        <div style={{ color: MUTED, marginBottom: '2px' }}>(GST NO: {gstDisplay})</div>
        <div>
          Corporate Office: {companyAddress} | Phone: {tenant?.phone || '—'}
        </div>
        {(email || website) && (
          <div>
            {email && <span>Email: {email}</span>}
            {email && website && <span> | </span>}
            {website && (
              <span>
                Website:{' '}
                <span style={{ color: '#2563eb', textDecoration: 'underline' }}>{website}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function thStyle(extra = {}) {
  return {
    padding: '10px 10px',
    fontWeight: 600,
    fontSize: '12px',
    textAlign: 'center',
    backgroundColor: TABLE_HEAD_BG,
    border: `1px solid ${BORDER}`,
    color: '#4a5568',
    ...extra,
  };
}

function tdStyle(extra = {}) {
  return {
    padding: '10px 10px',
    border: `1px solid ${BORDER}`,
    verticalAlign: 'middle',
    color: TEXT,
    ...extra,
  };
}
