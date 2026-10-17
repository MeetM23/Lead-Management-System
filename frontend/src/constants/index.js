// Shared values used across pages. Keep in sync with backend/constants/index.js.

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  SALES: 'sales',
});

export const LEAD_PRIORITIES = Object.freeze(['High', 'Medium', 'Low']);

// Choices offered in the Add Lead form (the backend accepts any text for a lead source)
export const LEAD_SOURCES = Object.freeze(['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Advertisement']);

// Home route for each role
export const getBasePath = (role) => (role === ROLES.ADMIN ? '/admin/dashboard' : '/sales/dashboard');
