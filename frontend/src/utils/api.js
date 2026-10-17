// The only place that talks to the backend: adds the base URL and the auth token, and handles expired sessions.
// Every helper returns the fetch Response, so callers check `res.ok` and read `await res.json()`.

const API_URL = import.meta.env.VITE_API_URL || '';

let onUnauthorized = null;

// AuthContext registers a callback that ends the session when the server rejects the token
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      // A file upload (FormData) sets its own multipart Content-Type
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // A rejected token means the session expired: clear it and let the app sign the user out
  if (response.status === 401 && token) {
    localStorage.removeItem('token');
    if (onUnauthorized) onUnauthorized();
  }

  return response;
};

const withBody = (method) => (endpoint, body, options = {}) =>
  apiFetch(endpoint, { ...options, method, body: JSON.stringify(body) });

export const apiGet = (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'GET' });
export const apiPost = withBody('POST');
export const apiPut = withBody('PUT');
export const apiUpload = (endpoint, formData) => apiFetch(endpoint, { method: 'POST', body: formData });
export const apiPatch = withBody('PATCH');
export const apiDelete = (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'DELETE' });
