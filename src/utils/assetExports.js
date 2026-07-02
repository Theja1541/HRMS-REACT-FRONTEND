import { format } from 'date-fns';
import { hrApi } from '../api';
import { downloadCsv } from './exportCsv';

function formatDate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function assignedTo(asset) {
  const emp = asset.assignments?.[0]?.employee;
  if (!emp) return '';
  return `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
}

export function assetsToCsvRows(assets) {
  return assets.map((a) => ({
    'Asset Code': a.asset_code || '',
    Name: a.name || '',
    Category: a.category_name || a.category_info?.name || a.category || '',
    Brand: a.brand || '',
    Model: a.model || '',
    'Serial Number': a.serial_number || '',
    Vendor: a.vendor_name || a.vendor?.name || '',
    'Purchase Value': a.purchase_value ?? '',
    'Purchase Date': formatDate(a.purchase_date),
    'Warranty Expires': formatDate(a.warranty_expires),
    Status: a.status || '',
    'Assigned To': assignedTo(a),
  }));
}

export async function fetchAllAssets(params = {}) {
  const res = await hrApi.listAssets({ ...params, limit: 5000 });
  return res?.data?.assets || [];
}

export async function exportAssetsCsvFromApi(params = {}, filename) {
  const assets = await fetchAllAssets(params);
  const stamp = format(new Date(), 'yyyy-MM-dd');
  downloadCsv(filename || `assets-${stamp}.csv`, assetsToCsvRows(assets));
}
