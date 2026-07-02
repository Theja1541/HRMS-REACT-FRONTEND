import PhoneInputLib from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { cn } from '../../utils/helpers';

const PhoneInput = PhoneInputLib.default || PhoneInputLib;

function toInputValue(value) {
  if (!value) return '';
  return value.startsWith('+') ? value.slice(1) : value;
}

export default function InternationalPhoneInput({ label, value, onChange, error, required, disabled, className }) {
  return (
    <div className={className}>
      {label && (
        <label className="text-xs font-medium text-slate-600">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <PhoneInput
        country="in"
        value={toInputValue(value)}
        onChange={(phone) => onChange(phone ? `+${phone}` : '')}
        enableSearch
        countryCodeEditable={false}
        disabled={disabled}
        specialLabel=""
        containerClass={cn('intl-phone-input', label ? 'mt-1' : '', error && 'intl-phone-input--error')}
        inputClass="intl-phone-input-field"
        buttonClass="intl-phone-input-button"
        dropdownClass="intl-phone-input-dropdown"
        searchClass="intl-phone-input-search"
      />
      {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
