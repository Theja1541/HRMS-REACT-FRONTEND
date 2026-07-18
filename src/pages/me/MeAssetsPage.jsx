import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Laptop, RotateCcw, Upload, X } from 'lucide-react';
import { portalApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import { ASSET_ACCESSORY_CONDITION_LABELS, ASSET_RETURN_CONDITION_LABELS, ASSET_RETURN_CONDITIONS } from '../../constants/hr';
import { cn } from '../../utils/helpers';
import { format, parseISO } from 'date-fns';

const RETURN_STATUS = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
};

const DEFAULT_ACCESSORIES = [
  { key: 'charger', label: 'Charger / Power adapter' },
  { key: 'mouse', label: 'Mouse' },
  { key: 'keyboard', label: 'Keyboard' },
  { key: 'bag', label: 'Carry bag / sleeve' },
  { key: 'monitor', label: 'Monitor / Display' },
  { key: 'headset', label: 'Headset / Earphones' },
  { key: 'dongle', label: 'Dongle / USB hub' },
  { key: 'sim', label: 'SIM / Data card' },
  { key: 'other', label: 'Other accessories' },
];

function ReturnModal({ asset, defaultAccessories, onClose, onSuccess }) {
  const accessoriesSeed = useMemo(
    () =>
      (defaultAccessories?.length ? defaultAccessories : DEFAULT_ACCESSORIES).map((item) => ({
        key: item.key,
        label: item.label,
        returned: false,
        applicable: true,
        condition: 'missing',
        recovery_amount: 0,
        notes: '',
      })),
    [defaultAccessories]
  );

  const [reason, setReason] = useState('');
  const [condition, setCondition] = useState('good');
  const [remarks, setRemarks] = useState('');
  const [checklist, setChecklist] = useState(accessoriesSeed);
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setChecklist(accessoriesSeed);
  }, [accessoriesSeed]);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('reason', reason.trim());
      fd.append('condition', condition);
      if (remarks.trim()) fd.append('employee_remarks', remarks.trim());
      fd.append('accessories_checklist', JSON.stringify(checklist));
      photos.forEach((file) => fd.append('photos', file));
      return portalApi.requestAssetReturn(asset.id, fd);
    },
    onSuccess: () => onSuccess(),
    onError: (err) => {
      setError(err.response?.data?.error?.message || 'Failed to submit return request');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Request Asset Return</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          {asset.name} <span className="text-slate-400">({asset.asset_code})</span>
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-xs font-medium text-slate-600">Reason for return</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
              minLength={5}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="e.g. Project ended, device upgrade…"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Condition</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {Object.entries(ASSET_RETURN_CONDITION_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCondition(key)}
                  className={cn(
                    'text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors',
                    condition === key
                      ? ASSET_RETURN_CONDITIONS[key] + ' border-current'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Accessories checklist (mark each item)
            </label>
            <ul className="border border-slate-100 rounded-lg divide-y divide-slate-50">
              {checklist.map((item, idx) => (
                <li key={item.key} className="px-3 py-2 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.returned}
                        onChange={(e) => {
                          const next = [...checklist];
                          const returned = e.target.checked;
                          next[idx] = {
                            ...item,
                            returned,
                            condition: returned ? 'good' : 'missing',
                          };
                          setChecklist(next);
                        }}
                      />
                      <span className="text-slate-700">{item.label}</span>
                    </label>
                    <select
                      className="text-[10px] border border-slate-200 rounded px-1.5 py-1"
                      value={item.condition || 'missing'}
                      onChange={(e) => {
                        const next = [...checklist];
                        const condition = e.target.value;
                        next[idx] = {
                          ...item,
                          condition,
                          returned: condition === 'good',
                        };
                        setChecklist(next);
                      }}
                    >
                      {Object.entries(ASSET_ACCESSORY_CONDITION_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    className="w-full text-[10px] border border-slate-100 rounded px-2 py-1"
                    placeholder="Notes (damage / serial / missing details)"
                    value={item.notes || ''}
                    onChange={(e) => {
                      const next = [...checklist];
                      next[idx] = { ...item, notes: e.target.value };
                      setChecklist(next);
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Remarks (optional)</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="Damage details, missing items, etc."
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Photos (optional)</label>
            <label className="mt-1 flex items-center gap-2 btn-secondary text-xs cursor-pointer w-fit">
              <Upload size={12} /> Add photos
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setPhotos((prev) => [...prev, ...files].slice(0, 8));
                  e.target.value = '';
                }}
              />
            </label>
            {photos.length > 0 && (
              <ul className="mt-2 space-y-1">
                {photos.map((file, i) => (
                  <li key={`${file.name}-${i}`} className="text-[11px] text-slate-500 flex justify-between gap-2">
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      className="text-red-500"
                      onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={mutation.isPending} className="btn-primary text-xs">
              {mutation.isPending ? 'Submitting…' : 'Submit Request'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MeAssetsPage() {
  const queryClient = useQueryClient();
  const [returnAsset, setReturnAsset] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-assets'],
    queryFn: portalApi.listMyAssets,
  });

  const assets = data?.data?.assets || [];
  const defaultAccessories = data?.data?.default_accessories;

  const handleReturnSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['my-assets'] });
    setReturnAsset(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Assets" subtitle="Company equipment assigned to you" />

      {isLoading ? (
        <div className="card p-12 text-center text-slate-400">Loading assets…</div>
      ) : error ? (
        <div className="card p-12 text-center text-red-500">Failed to load assets</div>
      ) : assets.length === 0 ? (
        <div className="card p-12 text-center">
          <Laptop size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">No assets currently assigned to you</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map((row) => {
            const a = row.asset;
            const pending = row.pending_return_request;
            return (
              <div key={row.assignment_id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Laptop size={18} className="text-slate-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{a?.name || 'Asset'}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{a?.asset_code}</p>
                      <p className="text-xs text-slate-500 mt-1 capitalize">
                        {(a?.category_name || a?.category || '').toString().replace(/_/g, ' ') || '—'}
                      </p>
                    </div>
                  </div>
                  {pending ? (
                    <div className="text-right space-y-1">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded capitalize',
                          RETURN_STATUS.pending
                        )}
                      >
                        Return pending
                      </span>
                      {pending.condition && (
                        <p
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block',
                            ASSET_RETURN_CONDITIONS[pending.condition]
                          )}
                        >
                          {ASSET_RETURN_CONDITION_LABELS[pending.condition]}
                        </p>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReturnAsset({ ...a, _defaults: row.default_accessories })}
                      className="btn-secondary text-xs inline-flex items-center gap-1"
                    >
                      <RotateCcw size={12} /> Return
                    </button>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400 uppercase text-[10px]">Brand / Model</p>
                    <p className="text-slate-700">
                      {[a?.brand, a?.model].filter(Boolean).join(' ') || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase text-[10px]">Serial</p>
                    <p className="text-slate-700 font-mono">{a?.serial_number || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase text-[10px]">Assigned</p>
                    <p className="text-slate-700">
                      {row.assigned_date ? format(parseISO(row.assigned_date), 'dd MMM yyyy') : '—'}
                    </p>
                  </div>
                </div>

                {row.notes && (
                  <p className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-3">{row.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {returnAsset && (
        <ReturnModal
          asset={returnAsset}
          defaultAccessories={returnAsset._defaults || defaultAccessories}
          onClose={() => setReturnAsset(null)}
          onSuccess={handleReturnSuccess}
        />
      )}
    </div>
  );
}
