// How a lead's extra (imported) data is shown on the lead page. Works for any columns: nothing is hardcoded.

// Text for one saved value: strings as written (line breaks kept), numbers and booleans as text,
// lists and objects as formatted JSON. Missing and blank values give "".
const valueText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

// [{ label, text, empty }] in the order the fields were saved. The label is the field name exactly as stored.
export const describeCustomFields = (customFields) => {
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) return [];

  return Object.entries(customFields).map(([label, value]) => {
    const text = valueText(value);
    return { label, text, empty: text === '' };
  });
};
