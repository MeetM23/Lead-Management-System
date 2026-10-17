import React from 'react';
import { describeCustomFields } from '../../utils/leadDisplay';

// Every extra field saved on the lead (for example the columns of an imported spreadsheet), under its saved name.
const CustomFieldsCard = ({ customFields }) => {
  const fields = describeCustomFields(customFields);
  if (fields.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-bold text-dark mb-5 text-lg">Additional Information</h3>
      <dl className="space-y-4">
        {fields.map(({ label, text, empty }) => (
          <div key={label}>
            <dt className="text-xs text-gray-400 font-semibold uppercase break-words">{label}</dt>
            <dd className={`mt-0.5 whitespace-pre-wrap break-words max-h-40 overflow-y-auto ${empty ? 'text-gray-300' : 'text-dark'}`}>
              {empty ? '—' : text}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default CustomFieldsCard;
