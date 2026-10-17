import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadsContext';
import { apiUpload } from '../utils/api.js';
import { getBasePath } from '../constants';
import MapColumnsStep, { CUSTOM_FIELD } from '../components/import/MapColumnsStep';
import ReviewStep from '../components/import/ReviewStep';

const STEPS = ['Upload', 'Map columns', 'Review', 'Done'];
const ACCEPTED_FILES = '.xlsx,.csv';

// Sends the file (and mapping) to one of the import endpoints. Every call carries the file: the server keeps nothing.
const callImport = async (endpoint, file, fields = {}) => {
  const form = new FormData();
  form.append('file', file);
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));

  try {
    const res = await apiUpload(endpoint, form);
    const result = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data: result.data } : { ok: false, message: result.message || 'Import failed' };
  } catch {
    return { ok: false, message: 'Network error' };
  }
};

const ImportLeads = () => {
  const { user } = useAuth();
  const { refetchLeads } = useLeads();
  const navigate = useNavigate();
  const leadsPath = `${getBasePath(user?.role)}/leads`;

  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [report, setReport] = useState(null);
  const [duplicates, setDuplicates] = useState('skip');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const mappingJson = () => JSON.stringify(mapping);

  const reset = () => {
    setStep(0);
    setFile(null);
    setPreview(null);
    setMapping({});
    setReport(null);
    setDuplicates('skip');
    setResult(null);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) return;
    setError('');
    setBusy(true);
    const response = await callImport('/api/leads/import/preview', file);
    setBusy(false);

    if (!response.ok) return setError(response.message);
    setPreview(response.data);
    setMapping(response.data.suggestedMapping);
    setStep(1);
  };

  const handleCheck = async () => {
    setError('');
    setBusy(true);
    const response = await callImport('/api/leads/import/validate', file, { mapping: mappingJson() });
    setBusy(false);

    if (!response.ok) return setError(response.message);
    setReport(response.data);
    setStep(2);
  };

  const handleImport = async () => {
    const count = duplicates === 'skip' ? report.validRows - report.duplicateRows : report.validRows;
    if (!window.confirm(`Import ${count} lead${count === 1 ? '' : 's'} into LeadFlow? They will be assigned to you. This cannot be undone in one step.`)) return;

    setError('');
    setBusy(true);
    const response = await callImport('/api/leads/import', file, { mapping: mappingJson(), duplicates });
    setBusy(false);

    if (!response.ok) return setError(response.message);
    setResult(response.data);
    setStep(3);
    refetchLeads();
  };

  const changeMapping = (column, target) => setMapping((prev) => ({ ...prev, [column]: target }));
  const backToMapping = () => { setError(''); setStep(1); };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <button onClick={() => navigate(leadsPath)} className="text-gray-500 hover:text-dark flex items-center gap-2 mb-2 transition-colors">
          <ArrowLeft size={18} /> Back to Leads
        </button>
        <h1 className="text-3xl font-heading font-bold text-dark">Import Leads</h1>
        <p className="text-gray-500">Add many leads at once from an Excel (.xlsx) or CSV file.</p>
      </div>

      <ol className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((label, index) => (
          <li key={label} className={`px-3 py-1 rounded-full font-semibold ${index === step ? 'bg-primary text-white' : index < step ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-sm font-medium">{error}</div>
      )}

      {step === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <label htmlFor="import-file" className="block text-sm font-semibold text-gray-700">Choose a file</label>
          <input
            id="import-file"
            type="file"
            accept={ACCEPTED_FILES}
            onChange={(e) => { setFile(e.target.files[0] ?? null); setError(''); }}
            className="block w-full text-sm text-gray-600 file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-violet-50 file:text-primary file:font-semibold"
          />
          <p className="text-xs text-gray-400">
            The first row must contain the column names. Old .xls files must be saved as .xlsx or .csv first. The file is read and
            discarded; it is not kept on the server.
          </p>
          <button
            onClick={handleUpload}
            disabled={!file || busy}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white font-bold hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Upload size={18} /> {busy ? 'Uploading and reading file...' : 'Upload and preview'}
          </button>
        </div>
      )}

      {step === 1 && preview && (
        <MapColumnsStep preview={preview} mapping={mapping} onChange={changeMapping} onBack={reset} onContinue={handleCheck} busy={busy} />
      )}

      {step === 2 && report && (
        <ReviewStep report={report} duplicates={duplicates} onDuplicatesChange={setDuplicates} onBack={backToMapping} onImport={handleImport} busy={busy} />
      )}

      {step === 3 && result && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-dark">
            <CheckCircle className="text-green-600" size={22} /> Import finished
          </h2>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><span className="font-bold">{result.imported}</span> leads imported{result.firstLeadId ? ` (${result.firstLeadId} to ${result.lastLeadId})` : ''}</li>
            <li><span className="font-bold">{result.skippedDuplicates}</span> possible duplicates skipped</li>
            {result.importedDuplicates > 0 && <li><span className="font-bold">{result.importedDuplicates}</span> possible duplicates imported anyway</li>}
            <li><span className="font-bold">{result.failedRows}</span> rows not imported because of errors</li>
            <li>{result.totalRows} rows in the file</li>
          </ul>
          <div className="flex gap-3">
            <button onClick={() => navigate(leadsPath)} className="px-5 py-2 rounded-xl bg-primary text-white font-bold hover:bg-violet-700">View leads</button>
            <button onClick={reset} className="px-5 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">Import another file</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportLeads;
