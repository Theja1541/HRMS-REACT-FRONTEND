import { getStateCode } from '../constants/tenant';

function stateCodeFromGstin(gstin) {
  const value = String(gstin || '').trim().toUpperCase();
  if (value.length < 2 || !/^\d{2}/.test(value)) return null;
  return value.slice(0, 2);
}

/** Resolve GST state code for display on tax invoices. */
export function resolveGstStateCode(tenant = {}) {
  const stored = tenant.gst_state_code?.trim();
  if (stored) return stored;

  const fromGstState = getStateCode(tenant.gst_state);
  if (fromGstState) return fromGstState;

  const fromState = getStateCode(tenant.state);
  if (fromState) return fromState;

  return stateCodeFromGstin(tenant.gstin);
}

export function resolveGstStateName(tenant = {}) {
  return tenant.gst_state?.trim() || tenant.state?.trim() || null;
}
