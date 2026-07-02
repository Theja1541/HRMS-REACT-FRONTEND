import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { financeApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import FinanceModuleGuide from '../../components/finance/FinanceModuleGuide';
import PeriodSelector from '../../components/finance/PeriodSelector';
import TablePagination from '../../components/shared/TablePagination';
import { GST_TYPES } from '../../constants/finance';
import { formatINR } from '../../utils/helpers';
import { Receipt, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useTablePagination } from '../../hooks/useTablePagination';

export default function GSTPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [month, year] });
  const [form, setForm] = useState({
    invoice_date: new Date().toISOString().slice(0, 10),
    invoice_no: '',
    party_name: '',
    party_gstin: '',
    description: '',
    entry_type: 'input',
    taxable_value: '',
    cgst_rate: 9,
    sgst_rate: 9,
    igst_rate: 0,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['gst', month, year],
    queryFn: () => financeApi.listGst({ month, year }),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => financeApi.createGst(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gst'] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => financeApi.deleteGst(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gst'] }),
  });

  const entries = data?.data?.entries || [];
  const { items: visibleEntries, pagination } = paginateClient(entries);
  const summary = data?.data?.summary;

  const handleSubmit = () => {
    const payload = {
      ...form,
      taxable_value: parseFloat(form.taxable_value),
      cgst_rate: parseFloat(form.cgst_rate),
      sgst_rate: parseFloat(form.sgst_rate),
      igst_rate: parseFloat(form.igst_rate),
    };
    if (form.entry_type === 'output' && payload.igst_rate > 0) {
      payload.cgst_rate = 0;
      payload.sgst_rate = 0;
    }
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="GST Monthly"
        subtitle="Input / output tax register for GSTR-3B preparation"
        actions={
          <div className="flex items-center gap-2">
            <PeriodSelector month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
            <button type="button" onClick={() => setShowForm(!showForm)} className="btn-primary">
              <Plus size={14} /> Add Invoice
            </button>
          </div>
        }
      />

      <FinanceModuleGuide page="gst" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Input Tax (ITC)" value={formatINR(summary?.input_tax?.total)} icon={ArrowDownLeft} />
        <StatCard label="Output Tax" value={formatINR(summary?.output_tax?.total)} icon={ArrowUpRight} />
        <StatCard
          label="Net GST Payable"
          value={formatINR(data?.data?.net_gst_payable)}
          delta={(data?.data?.net_gst_payable ?? 0) >= 0 ? 'Payable to govt' : 'Refund due'}
          deltaType="neutral"
          icon={Receipt}
        />
      </div>

      {showForm && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4">Add GST Invoice</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Type</label>
              <select value={form.entry_type} onChange={(e) => setForm({ ...form, entry_type: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                {GST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Invoice Date</label>
              <input type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Invoice No</label>
              <input value={form.invoice_no} onChange={(e) => setForm({ ...form, invoice_no: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Party Name</label>
              <input value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Party GSTIN</label>
              <input value={form.party_gstin} onChange={(e) => setForm({ ...form, party_gstin: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Taxable Value</label>
              <input type="number" value={form.taxable_value} onChange={(e) => setForm({ ...form, taxable_value: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">CGST %</label>
              <input type="number" value={form.cgst_rate} onChange={(e) => setForm({ ...form, cgst_rate: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">SGST %</label>
              <input type="number" value={form.sgst_rate} onChange={(e) => setForm({ ...form, sgst_rate: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">IGST %</label>
              <input type="number" value={form.igst_rate} onChange={(e) => setForm({ ...form, igst_rate: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="col-span-3">
              <label className="text-xs font-medium text-slate-600">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={handleSubmit} disabled={createMutation.isPending || !form.invoice_no || !form.party_name || !form.taxable_value} className="btn-primary">
              Save Invoice
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto overscroll-x-contain">
        {isLoading ? (
          <p className="text-center py-12 text-slate-400">Loading GST register…</p>
        ) : entries.length === 0 ? (
          <p className="text-center py-12 text-slate-400">No GST entries for this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Invoice</th>
                  <th className="text-left px-4 py-3 font-semibold">Party</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-right px-4 py-3 font-semibold">Taxable</th>
                  <th className="text-right px-4 py-3 font-semibold">CGST</th>
                  <th className="text-right px-4 py-3 font-semibold">SGST</th>
                  <th className="text-right px-4 py-3 font-semibold">IGST</th>
                  <th className="text-right px-4 py-3 font-semibold">Total Tax</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleEntries.map((e) => {
                  const totalTax = parseFloat(e.cgst_amount) + parseFloat(e.sgst_amount) + parseFloat(e.igst_amount);
                  return (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">{e.invoice_date}</td>
                      <td className="px-4 py-2.5 font-mono">{e.invoice_no}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{e.party_name}</p>
                        {e.party_gstin && <p className="text-slate-400 text-[10px]">{e.party_gstin}</p>}
                      </td>
                      <td className="px-4 py-2.5 capitalize">{e.entry_type.replace('_', ' ')}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatINR(e.taxable_value)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatINR(e.cgst_amount)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatINR(e.sgst_amount)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatINR(e.igst_amount)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium">{formatINR(totalTax)}</td>
                      <td className="px-4 py-2.5">
                        <button type="button" onClick={() => deleteMutation.mutate(e.id)} className="text-slate-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!isLoading && entries.length > 0 && (
        <TablePagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}
    </div>
  );
}
