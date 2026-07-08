import { useEffect, useMemo, useRef } from 'react';
import { useFieldArray, useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, X } from 'lucide-react';
import InternationalPhoneInput from '../shared/InternationalPhoneInput';
import QuotationTotals from './QuotationTotals';
import {
  QUOTATION_UNITS,
  QUOTATION_STATUSES,
  computeQuotationLineAmounts,
  createEmptyQuotationFormValues,
  EMPTY_QUOTATION_LINE_ITEM,
} from '../../constants/finance';
import { cn, formatINR } from '../../utils/helpers';

const quotationLineSchema = z.object({
  item_name: z.string().trim().min(1, 'Item name is required'),
  description: z.string().optional(),
  qty: z.string().min(1, 'Qty is required'),
  unit: z.string().min(1, 'Unit is required'),
  rate: z.string().min(1, 'Rate is required'),
  discount: z.string().optional(),
  gst_percent: z.string().optional(),
});

const quotationFormSchema = z.object({
  quotation_number: z.string(),
  date: z.string().min(1, 'Date is required'),
  valid_until: z.string().min(1, 'Valid until is required'),
  customer_name: z.string().trim().min(1, 'Customer name is required'),
  company_name: z.string().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'Invalid email address',
    }),
  address: z.string().optional(),
  notes: z.string().optional(),
  terms_and_conditions: z.string().optional(),
  status: z.string().optional(),
  line_items: z.array(quotationLineSchema).min(1, 'At least one item is required'),
});

function FormField({
  label,
  error,
  required,
  className,
  children,
}) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function inputClassName({ readOnly, alignRight } = {}) {
  return cn(
    'mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm',
    readOnly ? 'bg-slate-50 text-slate-500 font-mono cursor-not-allowed' : 'bg-white',
    alignRight && 'text-right font-mono'
  );
}

const textareaClassName =
  'mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white resize-y min-h-[96px]';

export default function CreateQuotationDrawer({
  open,
  mode = 'create',
  quotationId,
  quotationNumber,
  initialValues,
  loading = false,
  saving = false,
  error = '',
  onClose,
  onSaveDraft,
  onUpdate,
}) {
  const isEdit = mode === 'edit';

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: createEmptyQuotationFormValues({ quotationNumber }),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'line_items',
  });

  const watchedLineItems = useWatch({ control, name: 'line_items' }) || [];
  const watchedQuotationNumber = useWatch({ control, name: 'quotation_number' });
  const lineTotals = useMemo(
    () => watchedLineItems.map((line) => computeQuotationLineAmounts(line)),
    [watchedLineItems]
  );

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;

    if (isEdit) {
      if (initialValues) {
        reset(initialValues);
      }
      return;
    }

    if (justOpened) {
      reset(createEmptyQuotationFormValues({ quotationNumber }));
    }
  }, [open, isEdit, initialValues, quotationNumber, reset]);

  if (!open) return null;

  const onSubmit = (values) => {
    if (isEdit) {
      onUpdate?.(values, quotationId);
    } else {
      onSaveDraft?.(values);
    }
  };

  const headerNumber = watchedQuotationNumber || quotationNumber || '—';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-5xl bg-white shadow-xl h-full overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <p className="text-xs font-mono text-brand-600 mb-1">{headerNumber}</p>
            <h2 className="text-lg font-semibold text-slate-900 leading-tight">
              {isEdit ? 'Edit Quotation' : 'Create Quotation'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isEdit ? 'Update customer details, line items, and notes' : 'Customer details and line items'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-12 text-sm text-slate-400">
              Loading quotation…
            </div>
          ) : (
          <div className="flex-1 p-5 space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-slate-900">Basic Information</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEdit
                  ? 'Quotation number cannot be changed after creation.'
                  : 'Quotation number is assigned automatically when you save.'}
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Quotation Number" className="sm:col-span-2">
                  <input
                    {...register('quotation_number')}
                    readOnly
                    className={inputClassName({ readOnly: true })}
                  />
                </FormField>

                <FormField label="Date" required error={errors.date?.message}>
                  <input type="date" {...register('date')} className={inputClassName()} />
                </FormField>

                <FormField label="Valid Until" required error={errors.valid_until?.message}>
                  <input type="date" {...register('valid_until')} className={inputClassName()} />
                </FormField>

                {isEdit && (
                  <FormField label="Status" required error={errors.status?.message} className="sm:col-span-2">
                    <select {...register('status')} className={inputClassName()}>
                      {QUOTATION_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                )}

                <FormField
                  label="Customer Name"
                  required
                  error={errors.customer_name?.message}
                  className="sm:col-span-2"
                >
                  <input
                    {...register('customer_name')}
                    placeholder="Primary customer or account name"
                    className={inputClassName()}
                  />
                </FormField>

                <FormField label="Company Name" className="sm:col-span-2">
                  <input
                    {...register('company_name')}
                    placeholder="Registered company name"
                    className={inputClassName()}
                  />
                </FormField>

                <FormField label="Contact Person">
                  <input
                    {...register('contact_person')}
                    placeholder="Name of primary contact"
                    className={inputClassName()}
                  />
                </FormField>

                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <InternationalPhoneInput
                      label="Phone"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />

                <FormField label="Email" error={errors.email?.message} className="sm:col-span-2">
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="name@company.com"
                    className={inputClassName()}
                  />
                </FormField>

                <FormField label="Address" className="sm:col-span-2">
                  <textarea
                    {...register('address')}
                    placeholder="Billing or correspondence address"
                    rows={3}
                    className={textareaClassName}
                  />
                </FormField>
              </div>
            </section>

            <section className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Quotation Items</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Amount includes discount and GST per line</p>
                </div>
                <button
                  type="button"
                  onClick={() => append({ ...EMPTY_QUOTATION_LINE_ITEM })}
                  className="btn-primary text-xs shrink-0"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>

              {errors.line_items?.message && (
                <p className="px-4 pt-3 text-xs text-red-600">{errors.line_items.message}</p>
              )}

              <div className="overflow-x-auto overscroll-x-contain">
                <table className="w-full text-xs min-w-[960px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2.5 font-semibold min-w-[140px]">Item Name</th>
                      <th className="text-left px-3 py-2.5 font-semibold min-w-[160px]">Description</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-20">Qty</th>
                      <th className="text-left px-3 py-2.5 font-semibold w-24">Unit</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-28">Rate</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-28">Discount</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-20">GST %</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-28">Amount</th>
                      <th className="px-3 py-2.5 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fields.map((field, index) => {
                      const lineError = errors.line_items?.[index];
                      const { amount } = lineTotals[index] || computeQuotationLineAmounts({});

                      return (
                        <tr key={field.id} className="align-top">
                          <td className="px-3 py-2">
                            <input
                              {...register(`line_items.${index}.item_name`)}
                              placeholder="Item name"
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm"
                            />
                            {lineError?.item_name && (
                              <p className="text-[10px] text-red-600 mt-1">{lineError.item_name.message}</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              {...register(`line_items.${index}.description`)}
                              placeholder="Optional details"
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              {...register(`line_items.${index}.qty`)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right font-mono"
                            />
                            {lineError?.qty && (
                              <p className="text-[10px] text-red-600 mt-1">{lineError.qty.message}</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              {...register(`line_items.${index}.unit`)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                            >
                              {QUOTATION_UNITS.map((unit) => (
                                <option key={unit.value} value={unit.value}>
                                  {unit.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              {...register(`line_items.${index}.rate`)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right font-mono"
                            />
                            {lineError?.rate && (
                              <p className="text-[10px] text-red-600 mt-1">{lineError.rate.message}</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              {...register(`line_items.${index}.discount`)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right font-mono"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              {...register(`line_items.${index}.gst_percent`)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right font-mono"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-medium text-slate-900 pt-3">
                            {formatINR(amount)}
                          </td>
                          <td className="px-3 py-2 pt-2.5">
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              disabled={fields.length === 1}
                              className="text-slate-400 hover:text-red-500 disabled:opacity-30"
                              title="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <QuotationTotals lineItems={watchedLineItems} />

            <section>
              <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Optional remarks and standard terms shown on the quotation.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4">
                <FormField label="Notes">
                  <textarea
                    {...register('notes')}
                    rows={4}
                    placeholder="Internal notes or message for the customer"
                    className={textareaClassName}
                  />
                </FormField>

                <FormField label="Terms & Conditions">
                  <textarea
                    {...register('terms_and_conditions')}
                    rows={4}
                    placeholder="Payment terms, delivery timeline, validity clauses…"
                    className={textareaClassName}
                  />
                </FormField>
              </div>
            </section>
          </div>
          )}

          {error && <p className="px-5 pb-2 text-xs text-red-600">{error}</p>}

          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving || loading}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
