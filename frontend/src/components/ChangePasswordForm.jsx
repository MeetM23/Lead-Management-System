import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { apiPut } from '../utils/api.js';

const MIN_PASSWORD_LENGTH = 8; // keep in sync with the backend password policy
const EMPTY_FORM = { newPassword: '', confirmPassword: '' };
const inputClass = 'w-full mt-2 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold';

// Self-service password change for the logged-in user (admin or employee). The password fields are masked, nothing
// is stored in the browser, and the success message appears only after the server confirms the change.
const ChangePasswordForm = () => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text }
  const [saving, setSaving] = useState(false);

  const setField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setFeedback(null);
  };

  const validate = () => {
    if (!form.newPassword || !form.confirmPassword) return 'Please fill in all password fields';
    if (form.newPassword.length < MIN_PASSWORD_LENGTH) return `New password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    if (form.newPassword !== form.confirmPassword) return 'New password and confirmation do not match';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const problem = validate();
    if (problem) return setFeedback({ type: 'error', text: problem });

    setSaving(true);
    setFeedback(null);
    try {
      const res = await apiPut('/api/users/me/password', form);
      const result = await res.json().catch(() => ({}));

      if (res.ok && result.success) {
        setForm(EMPTY_FORM);
        setFeedback({ type: 'success', text: 'Password changed' });
      } else {
        setFeedback({ type: 'error', text: result.message || 'Could not change the password' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="bg-white rounded-3xl shadow-xl border-2 border-gray-200 p-8 space-y-5">
      <div className="flex items-center gap-3">
        <KeyRound className="text-primary" size={22} />
        <h2 className="text-2xl font-heading font-bold text-dark">Change Password</h2>
      </div>

      <div>
        <label htmlFor="new-password" className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Password</label>
        <input id="new-password" type="password" autoComplete="new-password" value={form.newPassword} onChange={setField('newPassword')} className={inputClass} />
        <p className="mt-1 text-xs text-gray-400">At least {MIN_PASSWORD_LENGTH} characters.</p>
      </div>
      <div>
        <label htmlFor="confirm-password" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirm New Password</label>
        <input id="confirm-password" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={setField('confirmPassword')} className={inputClass} />
      </div>

      {feedback && (
        <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`text-sm font-medium ${feedback.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {feedback.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="bg-gradient-to-r from-primary to-violet-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? 'Changing...' : 'Change Password'}
      </button>
    </form>
  );
};

export default ChangePasswordForm;
