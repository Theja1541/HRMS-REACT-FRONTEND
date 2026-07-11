import { buildPlaceholderQuotationNumber, computeQuotationTotals, duplicateQuotationDetail } from '../constants/finance';

const DUMMY_QUOTATION_DETAILS = [
  {
    id: 1,
    quotation_no: 'QT-2025-26-0001',
    date: '2026-07-01',
    valid_until: '2026-07-31',
    status: 'sent',
    created_by: 'Priya Sharma',
    customer_name: 'Acme Industries Pvt Ltd',
    company_name: 'Acme Industries Private Limited',
    contact_person: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    email: 'rajesh@acmeindustries.com',
    address: '42 Industrial Estate, Phase II, Peenya, Bengaluru, Karnataka 560058',
    notes: 'Quotation valid for 30 days. Prices exclusive of freight unless stated otherwise.',
    terms_and_conditions:
      '1. Payment terms: 50% advance, balance on delivery.\n2. Delivery within 15 working days from PO.\n3. GST as applicable. Subject to Bengaluru jurisdiction.',
    line_items: [
      {
        item_name: 'ERP Implementation',
        description: 'Core modules setup and configuration',
        qty: '1',
        unit: 'nos',
        rate: '85000',
        discount: '5000',
        gst_percent: '18',
      },
      {
        item_name: 'Annual Support',
        description: '12 months premium support',
        qty: '1',
        unit: 'nos',
        rate: '45000',
        discount: '0',
        gst_percent: '18',
      },
    ],
  },
  {
    id: 2,
    quotation_no: 'QT-2025-26-0002',
    date: '2026-07-03',
    valid_until: '2026-08-03',
    status: 'accepted',
    created_by: 'Rahul Mehta',
    customer_name: 'Brightline Solutions',
    company_name: 'Brightline Solutions LLP',
    contact_person: 'Meera Iyer',
    phone: '+91 99887 76655',
    email: 'meera@brightline.in',
    address: '9th Floor, Cyber Towers, HITEC City, Hyderabad 500081',
    notes: 'Client requested phased billing across two milestones.',
    terms_and_conditions:
      '1. Milestone 1: 40% on sign-off.\n2. Milestone 2: 60% on UAT completion.\n3. Change requests billed separately.',
    line_items: [
      {
        item_name: 'Website Redesign',
        description: 'UX audit and responsive rebuild',
        qty: '1',
        unit: 'nos',
        rate: '32000',
        discount: '2000',
        gst_percent: '18',
      },
      {
        item_name: 'Content Migration',
        description: 'Legacy CMS to new platform',
        qty: '40',
        unit: 'hrs',
        rate: '450',
        discount: '0',
        gst_percent: '18',
      },
    ],
  },
  {
    id: 3,
    quotation_no: 'QT-2025-26-0003',
    date: '2026-07-05',
    valid_until: '2026-08-05',
    status: 'draft',
    created_by: 'Priya Sharma',
    customer_name: 'Nova Tech Services',
    company_name: 'Nova Tech Services Pvt Ltd',
    contact_person: 'Arun Nair',
    phone: '+91 91234 56789',
    email: 'arun@novatech.co.in',
    address: 'Plot 18, IT Park, Kochi, Kerala 682030',
    notes: '',
    terms_and_conditions: 'Standard company terms apply. Draft — not yet shared with customer.',
    line_items: [
      {
        item_name: 'Cloud Hosting',
        description: 'Managed AWS environment (12 months)',
        qty: '12',
        unit: 'nos',
        rate: '6500',
        discount: '3000',
        gst_percent: '18',
      },
    ],
  },
  {
    id: 4,
    quotation_no: 'QT-2025-26-0004',
    date: '2026-06-15',
    valid_until: '2026-06-30',
    status: 'expired',
    created_by: 'Anita Desai',
    customer_name: 'Greenfield Logistics',
    company_name: 'Greenfield Logistics Ltd',
    contact_person: 'Vikram Singh',
    phone: '+91 90123 45678',
    email: 'vikram@greenfieldlog.com',
    address: 'Warehouse 7, MIDC, Navi Mumbai, Maharashtra 400701',
    notes: 'Expired without customer response.',
    terms_and_conditions: 'Quotation validity: 30 days from issue date.',
    line_items: [
      {
        item_name: 'Fleet Tracking Devices',
        description: 'GPS units with SIM',
        qty: '25',
        unit: 'pcs',
        rate: '1200',
        discount: '0',
        gst_percent: '18',
      },
      {
        item_name: 'Installation',
        description: 'On-site fitting per vehicle',
        qty: '25',
        unit: 'nos',
        rate: '350',
        discount: '500',
        gst_percent: '18',
      },
    ],
  },
  {
    id: 5,
    quotation_no: 'QT-2025-26-0005',
    date: '2026-07-08',
    valid_until: '2026-08-08',
    status: 'sent',
    created_by: 'Rahul Mehta',
    customer_name: 'Summit Consulting',
    company_name: 'Summit Consulting Group',
    contact_person: 'Deepa Rao',
    phone: '+91 98760 11223',
    email: 'deepa@summitconsulting.in',
    address: 'Level 12, UB City, Vittal Mallya Road, Bengaluru 560001',
    notes: 'Includes 2 days on-site workshop.',
    terms_and_conditions:
      '1. Travel and stay for workshop at actuals if outside Bengaluru.\n2. Intellectual property remains with Summit Consulting until full payment.',
    line_items: [
      {
        item_name: 'Strategy Workshop',
        description: 'Two-day facilitated session',
        qty: '2',
        unit: 'days',
        rate: '45000',
        discount: '0',
        gst_percent: '18',
      },
      {
        item_name: 'Executive Report',
        description: 'Findings and recommendations deck',
        qty: '1',
        unit: 'nos',
        rate: '35000',
        discount: '5000',
        gst_percent: '18',
      },
    ],
  },
  {
    id: 6,
    quotation_no: 'QT-2025-26-0006',
    date: '2026-07-10',
    valid_until: '2026-08-10',
    status: 'rejected',
    created_by: 'Anita Desai',
    customer_name: 'Urban Spaces LLP',
    company_name: 'Urban Spaces LLP',
    contact_person: 'Karan Malhotra',
    phone: '+91 98100 22334',
    email: 'karan@urbanspaces.in',
    address: 'Sector 44, Gurgaon, Haryana 122003',
    notes: 'Customer chose a lower-cost vendor.',
    terms_and_conditions: 'Prices valid for 30 days. Rejected on 2026-07-18.',
    line_items: [
      {
        item_name: 'Interior Design Package',
        description: '3BHK turnkey design',
        qty: '1',
        unit: 'nos',
        rate: '55000',
        discount: '0',
        gst_percent: '18',
      },
      {
        item_name: '3D Renders',
        description: 'High-resolution visualisations',
        qty: '8',
        unit: 'nos',
        rate: '2500',
        discount: '1000',
        gst_percent: '18',
      },
    ],
  },
  {
    id: 7,
    quotation_no: 'QT-2025-26-0007',
    date: '2026-07-12',
    valid_until: '2026-08-12',
    status: 'draft',
    created_by: 'Priya Sharma',
    customer_name: 'Pinnacle Retail',
    company_name: 'Pinnacle Retail Pvt Ltd',
    contact_person: 'Sneha Patel',
    phone: '+91 98250 66778',
    email: 'sneha@pinnacleretail.com',
    address: 'Ashram Road, Ahmedabad, Gujarat 380009',
    notes: 'Awaiting final SKU list from client.',
    terms_and_conditions: '',
    line_items: [
      {
        item_name: 'POS Terminals',
        description: 'Counter-top units',
        qty: '4',
        unit: 'pcs',
        rate: '4200',
        discount: '0',
        gst_percent: '18',
      },
      {
        item_name: 'Barcode Scanners',
        description: 'Wireless handheld',
        qty: '4',
        unit: 'pcs',
        rate: '1800',
        discount: '200',
        gst_percent: '18',
      },
    ],
  },
  {
    id: 8,
    quotation_no: 'QT-2025-26-0008',
    date: '2026-07-14',
    valid_until: '2026-08-14',
    status: 'accepted',
    created_by: 'Rahul Mehta',
    customer_name: 'Horizon Media Group',
    company_name: 'Horizon Media Group Pvt Ltd',
    contact_person: 'Aditya Khanna',
    phone: '+91 98112 33445',
    email: 'aditya@horizonmedia.in',
    address: 'Film City, Noida, Uttar Pradesh 201301',
    notes: 'Accepted — proceed with media buy schedule.',
    terms_and_conditions:
      '1. Media rates subject to inventory availability.\n2. Cancellation within 7 days of campaign start attracts 25% fee.',
    line_items: [
      {
        item_name: 'Digital Campaign',
        description: 'Multi-platform ad spend management',
        qty: '1',
        unit: 'nos',
        rate: '125000',
        discount: '10000',
        gst_percent: '18',
      },
      {
        item_name: 'Creative Production',
        description: 'Video and static assets',
        qty: '1',
        unit: 'nos',
        rate: '75000',
        discount: '0',
        gst_percent: '18',
      },
    ],
  },
  {
    id: 9,
    quotation_no: 'QT-2025-26-0009',
    date: '2026-07-06',
    valid_until: '2026-08-06',
    status: 'cancelled',
    created_by: 'Anita Desai',
    customer_name: 'Delta Office Supplies',
    company_name: 'Delta Office Supplies',
    contact_person: 'Rohit Jain',
    phone: '+91 98989 12121',
    email: 'rohit@deltaoffice.in',
    address: 'Lajpat Nagar II, New Delhi 110024',
    notes: 'Cancelled — duplicate quotation issued.',
    terms_and_conditions: 'This quotation has been cancelled and superseded by QT-2025-26-0010.',
    line_items: [
      {
        item_name: 'Office Chairs',
        description: 'Ergonomic mesh back',
        qty: '20',
        unit: 'pcs',
        rate: '650',
        discount: '500',
        gst_percent: '18',
      },
    ],
  },
  {
    id: 10,
    quotation_no: 'QT-2025-26-0010',
    date: '2026-07-07',
    valid_until: '2026-08-07',
    status: 'draft',
    created_by: 'Anita Desai',
    customer_name: 'Delta Office Supplies',
    company_name: 'Delta Office Supplies',
    contact_person: 'Rohit Jain',
    phone: '+91 98989 12121',
    email: 'rohit@deltaoffice.in',
    address: 'Lajpat Nagar II, New Delhi 110024',
    notes: 'Revised quotation replacing QT-2025-26-0009.',
    terms_and_conditions: 'Standard payment terms: 30 days from invoice date.',
    line_items: [
      {
        item_name: 'Office Chairs',
        description: 'Ergonomic mesh back',
        qty: '20',
        unit: 'pcs',
        rate: '620',
        discount: '400',
        gst_percent: '18',
      },
      {
        item_name: 'Delivery & Assembly',
        description: 'On-site assembly per chair',
        qty: '20',
        unit: 'nos',
        rate: '150',
        discount: '0',
        gst_percent: '18',
      },
    ],
  },
];

const deletedQuotationIds = new Set();
const createdQuotations = [];

function getActiveQuotations() {
  const base = DUMMY_QUOTATION_DETAILS.filter((quotation) => !deletedQuotationIds.has(quotation.id));
  const created = createdQuotations.filter((quotation) => !deletedQuotationIds.has(quotation.id));
  return [...base, ...created];
}

export function deleteDummyQuotation(id) {
  deletedQuotationIds.add(Number(id));
}

export function isDummyQuotationDeleted(id) {
  return deletedQuotationIds.has(Number(id));
}

export function addDummyQuotation(quotation) {
  createdQuotations.push(quotation);
  return quotation;
}

export function getNextDummyQuotationId() {
  const active = getActiveQuotations();
  if (!active.length) return 1;
  return Math.max(...active.map((quotation) => quotation.id)) + 1;
}

export function getNextQuotationSequence() {
  return getActiveQuotations().length + 1;
}

export function duplicateDummyQuotation(source, { createdBy } = {}) {
  if (!source) return null;

  const newId = getNextDummyQuotationId();
  const quotationNo = buildPlaceholderQuotationNumber(getNextQuotationSequence());
  const copy = duplicateQuotationDetail(source, { newId, quotationNo, createdBy });

  if (!copy) return null;

  addDummyQuotation(copy);
  return copy;
}

function buildListRow(quotation) {
  const totals = computeQuotationTotals(quotation.line_items);
  return {
    id: quotation.id,
    quotation_no: quotation.quotation_no,
    customer: quotation.customer_name,
    date: quotation.date,
    valid_until: quotation.valid_until,
    total: totals.grandTotal,
    status: quotation.status,
    created_by: quotation.created_by,
  };
}

export function getDummyQuotationById(id) {
  const numericId = Number(id);
  if (deletedQuotationIds.has(numericId)) return null;
  return (
    createdQuotations.find((quotation) => quotation.id === numericId)
    || DUMMY_QUOTATION_DETAILS.find((quotation) => quotation.id === numericId)
    || null
  );
}

export function getDummyQuotationsList() {
  return getActiveQuotations().map(buildListRow);
}

/** @deprecated Use getDummyQuotationsList() so deletions are reflected */
export const DUMMY_QUOTATIONS_LIST = DUMMY_QUOTATION_DETAILS.map(buildListRow);

export { DUMMY_QUOTATION_DETAILS };
