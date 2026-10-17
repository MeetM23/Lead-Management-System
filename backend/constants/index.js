// Shared values used by models, routes and controllers. Keep in sync with frontend/src/constants/index.js.

export const ROLES = Object.freeze({
  ADMIN: "admin",
  SALES: "sales",
});


// Basic email shape check (an address must have text, "@", and a dotted domain)
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
