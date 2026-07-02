import { formatINR } from '../../utils/helpers';

const BUYOUT_STATUS_LABELS = {
  not_applicable: 'Not applicable',
  pending: 'Pending HR decision',
  payable: 'Payable by employee',
  waived: 'Waived by HR',
  paid: 'Paid',
};

export default function NoticeSettlementSummary({ settlement, buyoutStatus, compact = false }) {
  if (!settlement) return null;

  const {
    notice_served_days,
    notice_shortfall_days,
    early_release,
    notice_buyout_applicable,
    notice_buyout_amount,
    buyout_daily_rate,
    notice_buyout_enabled,
  } = settlement;

  if (!early_release && !compact) {
    return (
      <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800">
        Full notice period — {notice_served_days} days served, no shortfall.
      </div>
    );
  }

  if (!early_release) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-xs space-y-1.5">
      <p className="font-semibold text-amber-900">Early release</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-amber-900/90">
        <span>Notice served</span>
        <span className="font-medium">{notice_served_days ?? '—'} days</span>
        <span>Shortfall</span>
        <span className="font-medium text-amber-800">{notice_shortfall_days ?? 0} days</span>
      </div>
      {notice_buyout_enabled && notice_buyout_applicable && notice_buyout_amount != null && (
        <p className="text-amber-900 pt-1 border-t border-amber-200/80">
          Notice buyout: <strong>{formatINR(notice_buyout_amount)}</strong>
          {buyout_daily_rate != null && (
            <span className="text-amber-800/80"> ({formatINR(buyout_daily_rate)}/day × {notice_shortfall_days} days)</span>
          )}
        </p>
      )}
      {notice_buyout_enabled && !notice_buyout_applicable && notice_shortfall_days > 0 && (
        <p className="text-amber-800/90">Buyout enabled but salary data unavailable — amount not calculated.</p>
      )}
      {buyoutStatus && (
        <p className="text-[11px] text-amber-800">
          Buyout status: <strong>{BUYOUT_STATUS_LABELS[buyoutStatus] || buyoutStatus}</strong>
        </p>
      )}
    </div>
  );
}

export { BUYOUT_STATUS_LABELS };
