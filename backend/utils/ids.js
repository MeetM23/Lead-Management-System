// Internal database IDs are positive integers. The API exposes them as strings in the `_id` field.

const MAX_INT = 2147483647;

// Returns the ID as an integer, or null when the value is not a valid ID (never throws)
export const toId = (value) => {
  const number = typeof value === 'number' ? value : typeof value === 'string' && /^\d{1,10}$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(number) && number > 0 && number <= MAX_INT ? number : null;
};

// The `_id` value sent to clients
export const toApiId = (id) => (id === null || id === undefined ? null : String(id));

// True for a Prisma unique-constraint violation, optionally limited to a column or index name
export const isUniqueViolation = (error, column) =>
  error?.code === 'P2002' && (!column || String(error.meta?.target ?? '').includes(column));
