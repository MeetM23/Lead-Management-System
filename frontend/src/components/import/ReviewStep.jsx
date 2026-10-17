import React from 'react';

const Stat = ({ label, value, tone }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
    <p className="text-xs font-bold text-gray-400 uppercase">{label}</p>
    <p className={`text-2xl font-bold ${tone}`}>{value}</p>
  </div>
);

const ProblemTable = ({ title, rows, render }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <h3 className="px-4 py-3 font-bold text-dark border-b border-gray-100">{title}</h3>
    <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
      {rows.map((row) => (
        <div key={row.row} className="px-4 py-2 text-sm flex gap-4">
          <span className="w-16 shrink-0 font-semibold text-gray-500">Row {row.row}</span>
          <span className="text-gray-700">{render(row)}</span>
        </div>
      ))}
    </div>
  </div>
);

// Step 3: what was found in the file, and what to do with possible duplicates. Nothing is written until "Import".
const ReviewStep = ({ report, duplicates, onDuplicatesChange, onBack, onImport, busy }) => {
  const importable = duplicates === 'skip' ? report.validRows - report.duplicateRows : report.validRows;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Rows in file" value={report.totalRows} tone="text-dark" />
        <Stat label="Valid rows" value={report.validRows} tone="text-green-600" />
        <Stat label="Invalid rows" value={report.invalidRows} tone={report.invalidRows ? 'text-red-600' : 'text-gray-400'} />
        <Stat label="Possible duplicates" value={report.duplicateRows} tone={report.duplicateRows ? 'text-amber-600' : 'text-gray-400'} />
      </div>

      {report.errors.length > 0 && (
        <ProblemTable title="Rows with errors (these will not be imported)" rows={report.errors} render={(row) => row.messages.join('; ')} />
      )}

      {report.duplicates.length > 0 && (
        <>
          <ProblemTable
            title="Possible duplicates"
            rows={report.duplicates}
            render={(row) => `${row.name}: ${row.reasons.join('; ')}`}
          />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
            <p className="font-bold text-dark text-sm">What should happen to possible duplicates?</p>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="radio" name="duplicates" checked={duplicates === 'skip'} onChange={() => onDuplicatesChange('skip')} />
              Skip them (recommended)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="radio" name="duplicates" checked={duplicates === 'import'} onChange={() => onDuplicatesChange('import')} />
              Import them anyway as new leads
            </label>
          </div>
        </>
      )}

      {report.listsTruncated && (
        <p className="text-xs text-gray-400">Only the first 200 problems of each kind are listed; the counts above are complete.</p>
      )}
      <p className="text-sm text-gray-500">Existing leads are never changed or merged. Imported leads are assigned to you.</p>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">
          Back to mapping
        </button>
        <button
          onClick={onImport}
          disabled={busy || importable === 0}
          className="px-5 py-2 rounded-xl bg-primary text-white font-bold hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? 'Importing...' : `Import ${importable} lead${importable === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
};

export default ReviewStep;
