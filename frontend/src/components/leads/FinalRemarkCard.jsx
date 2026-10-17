import React, { useState } from 'react';

const MAX_FINAL_REMARK_LENGTH = 5000; // keep in sync with the backend

// The outcome of the lead, written by the assigned employee (or an admin). It is its own field: not a note, not custom data.
//   remark: the saved text (or null)    onSave(text) -> Promise<{ success, message }>
const FinalRemarkCard = ({ remark, onSave }) => {
  const [draft, setDraft] = useState(null); // null: the text has not been edited, show the saved remark
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text }

  const saved = remark ?? '';
  const text = draft ?? saved;
  const changed = draft !== null && draft.trim() !== saved.trim();

  const handleChange = (e) => {
    setDraft(e.target.value);
    setFeedback(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    const result = await onSave(text);
    setSaving(false);

    if (result?.success) {
      setDraft(null);
      setFeedback({ type: 'success', text: 'Final remark saved' });
    } else {
      setFeedback({ type: 'error', text: result?.message || 'Could not save the final remark' });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-bold text-dark text-lg mb-1">Final Remark</h3>
      <p className="text-sm text-gray-500 mb-4">Record the outcome of this lead. You can update it as the lead progresses.</p>

      <label htmlFor="final-remark" className="sr-only">Final remark</label>
      <textarea
        id="final-remark"
        value={text}
        onChange={handleChange}
        maxLength={MAX_FINAL_REMARK_LENGTH}
        rows={6}
        placeholder="No final remark yet"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y whitespace-pre-wrap break-words text-dark"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-gray-400">{text.length} / {MAX_FINAL_REMARK_LENGTH}</span>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !changed}
          className="px-5 py-2 rounded-xl bg-primary text-white font-bold hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {feedback && (
        <p
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`mt-3 text-sm font-medium ${feedback.type === 'error' ? 'text-red-600' : 'text-green-600'}`}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
};

export default FinalRemarkCard;
