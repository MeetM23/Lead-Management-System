import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

// A dropdown that saves its change right away. The shown value only changes when the parent passes the new `value`
// after the server confirmed the save: while saving, the choice is shown as pending; if the save fails, the
// previous value stays and the error is shown under the dropdown.
//   options: [{ value, label }]   onSave(newValue) -> Promise<{ success, message }>
const InlineSelect = ({ value, options, onSave, label, placeholder, disabled = false, className = '' }) => {
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const saving = pending !== null;

  const handleChange = async (e) => {
    const next = e.target.value;
    if (next === (value ?? '')) return;

    setError('');
    setPending(next);
    const result = await onSave(next);
    setPending(null);

    if (!result?.success) setError(result?.message || 'Could not save the change');
  };

  return (
    <div className="min-w-[8rem]">
      <div className="relative">
        <select
          aria-label={label}
          value={pending ?? value ?? ''}
          onChange={handleChange}
          disabled={disabled || saving}
          className={`w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-70 disabled:cursor-not-allowed ${error ? 'border-red-300' : 'border-gray-200'} ${className}`}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {saving && <Loader2 size={14} className="absolute right-7 top-2.5 animate-spin text-gray-400" aria-label="Saving" />}
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default InlineSelect;
