import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Laptop, RotateCcw, X } from 'lucide-react';
import { portalApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import { cn } from '../../utils/helpers';
import { format, parseISO } from 'date-fns';

const RETURN_STATUS = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
};

function ReturnModal({ asset, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => portalApi.requestAssetReturn(asset.id, { reason }),
    onSuccess: () => onSuccess(),
    onError: (err) => {
      setError(err.response?.data?.error?.message || 'Failed to submit return request');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5">
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
        >
          <label className="text-xs font-medium text-slate-600">Reason for return</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            minLength={5}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            placeholder="e.g. Leaving project, damaged device…"
          />
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={mutation.isPending} className="btn-primary text-xs">
              {mutation.isPending ? 'Submitting…' : 'Submit Request'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary text-xs">Cancel</button>
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

  const handleReturnSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['my-assets'] });
    setReturnAsset(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Assets"
        subtitle="Company equipment assigned to you"
      />

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
                      <p className="text-xs text-slate-500 mt-1 capitalize">{a?.category?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  {pending ? (
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded capitalize', RETURN_STATUS.pending)}>
                      Return pending
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReturnAsset(a)}
                      className="btn-secondary text-xs inline-flex items-center gap-1"
                    >
                      <RotateCcw size={12} /> Return
                    </button>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400 uppercase text-[10px]">Brand / Model</p>
                    <p className="text-slate-700">{[a?.brand, a?.model].filter(Boolean).join(' ') || '—'}</p>
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
        <ReturnModal asset={returnAsset} onClose={() => setReturnAsset(null)} onSuccess={handleReturnSuccess} />
      )}
    </div>
  );
}
