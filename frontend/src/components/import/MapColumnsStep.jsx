import React from 'react';

export const CUSTOM_FIELD = 'customField';
export const IGNORE = 'ignore';

const selectClass = 'w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary';

// Step 2: choose what each column of the file becomes. Columns kept as custom data are stored on the lead
// under their original header; ignored columns are dropped.
const MapColumnsStep = ({ preview, mapping, onChange, onBack, onContinue, busy }) => {
  const usedFields = new Set(Object.values(mapping).filter((target) => target !== CUSTOM_FIELD && target !== IGNORE));
  const missingRequired = preview.fields.filter((field) => field.required && !usedFields.has(field.key));

  return (
    <div className="space-y-5">
      <p className="text-gray-500 text-sm">
        {preview.totalRows} data rows found in <span className="font-semibold text-dark">{preview.fileName}</span>. Match each column
        to a lead field. Columns left as “Keep as custom data” are saved on the lead under their original header.
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Column in file</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Sample values</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase w-64">Import as</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {preview.headers.map(({ index, name }) => (
              <tr key={index}>
                <td className="px-4 py-3 font-medium text-dark">{name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {preview.sampleRows.slice(0, 3).map((row) => row[index]).filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="px-4 py-3">
                  <select
                    aria-label={`Import ${name} as`}
                    value={mapping[index] ?? CUSTOM_FIELD}
                    onChange={(e) => onChange(index, e.target.value)}
                    className={selectClass}
                  >
                    {preview.fields.map((field) => (
                      <option key={field.key} value={field.key} disabled={usedFields.has(field.key) && mapping[index] !== field.key}>
                        {field.label}{field.required ? ' (required)' : ''}
                      </option>
                    ))}
                    <option value={CUSTOM_FIELD}>Keep as custom data</option>
                    <option value={IGNORE}>Ignore this column</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {missingRequired.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl text-sm font-medium">
          Choose a column for the required field: {missingRequired.map((field) => field.label).join(', ')}.
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">
          Choose another file
        </button>
        <button
          onClick={onContinue}
          disabled={busy || missingRequired.length > 0}
          className="px-5 py-2 rounded-xl bg-primary text-white font-bold hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? 'Checking rows...' : 'Check rows'}
        </button>
      </div>
    </div>
  );
};

export default MapColumnsStep;
