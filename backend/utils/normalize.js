// Comparable forms of contact details, used to find duplicate leads.

const MIN_PHONE_DIGITS = 7; // shorter numbers are not compared
const PHONE_KEY_DIGITS = 10; // compare the last 10 digits, so "+91 98765 43210" matches "098765-43210"

export const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : "");

// Last digits of a phone number, or "" when there are too few digits to compare
export const normalizePhone = (phone) => {
  const digits = typeof phone === "string" ? phone.replace(/\D/g, "") : "";
  return digits.length >= MIN_PHONE_DIGITS ? digits.slice(-PHONE_KEY_DIGITS) : "";
};

// Spreadsheet exports (for example lead-ad downloads) often write phone numbers as "p:+917550853464".
// Removes such a label ("p:", "tel:", "phone:") when what follows really is a phone number. Anything else is returned unchanged.
const PHONE_LABEL = /^(?:p|tel|phone)\s*:\s*(\+?[\d][\d\s().-]*)$/i;

export const cleanPhone = (phone) => {
  if (typeof phone !== "string") return phone;
  const match = PHONE_LABEL.exec(phone.trim());
  return match ? match[1].trim() : phone;
};
