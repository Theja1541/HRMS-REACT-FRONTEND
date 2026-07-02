import { digitsOnly } from './validation';

/** Map form statutory toggles to API fields (UAN → pf_number copy). */
export function statutoryFieldsFromForm(form) {
  const pfApplicable = !!form.pf_applicable;
  const esiApplicable = !!form.esi_applicable;
  const uan = pfApplicable ? digitsOnly(form.uan_number) || null : null;
  const esic = esiApplicable ? digitsOnly(form.esic_number) || null : null;

  return {
    pf_applicable: pfApplicable,
    esi_applicable: esiApplicable,
    uan_number: uan,
    pf_number: uan,
    esic_number: esic,
  };
}
