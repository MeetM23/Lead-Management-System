import React, { useState } from 'react';
import { X } from 'lucide-react';
import { apiPost } from '../utils/api.js';

const EMPTY_FORM = { name: '', employeeId: '', email: '', password: '' };
const inputClass = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-dark focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white';

// Admin-only form that creates an employee account. The server decides the role.
const AddEmployeeModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (Object.values(form).some((value) => !value.trim())) {
      setError('Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      const res = await apiPost('/api/users', form);
      const result = await res.json();
      if (!res.ok) {
        setError(result.message || 'Could not create the employee');
        return;
      }
      onCreated(result.message);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading font-bold text-dark">Add Employee</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-dark"><X size={20} /></button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl mb-4 text-sm font-medium">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="emp-name" className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
            <input id="emp-name" type="text" value={form.name} onChange={setField('name')} className={inputClass} />
          </div>
          <div>
            <label htmlFor="emp-id" className="block text-sm font-semibold text-gray-700 mb-1">Employee ID</label>
            <input id="emp-id" type="text" value={form.employeeId} onChange={setField('employeeId')} placeholder="EMP-001" className={inputClass} />
          </div>
          <div>
            <label htmlFor="emp-email" className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input id="emp-email" type="email" value={form.email} onChange={setField('email')} className={inputClass} />
          </div>
          <div>
            <label htmlFor="emp-password" className="block text-sm font-semibold text-gray-700 mb-1">Temporary password</label>
            <input id="emp-password" type="password" autoComplete="new-password" value={form.password} onChange={setField('password')} placeholder="At least 8 characters" className={inputClass} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-primary text-white font-bold hover:bg-violet-700 disabled:opacity-70">
              {saving ? 'Creating...' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
