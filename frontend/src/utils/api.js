// Central API configuration
// Use this file for all API calls to ensure consistent base URL

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Fetch wrapper with proper base URL
 * @param {string} endpoint - API endpoint (e.g., '/api/auth/login')
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} - Fetch response
 */
export const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available
  const token = localStorage.getItem('token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    return response;
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
};

/**
 * GET request
 */
export const apiGet = (endpoint, options = {}) => 
  apiFetch(endpoint, { ...options, method: 'GET' });

/**
 * POST request
 */
export const apiPost = (endpoint, body, options = {}) => 
  apiFetch(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });

/**
 * PUT request
 */
export const apiPut = (endpoint, body, options = {}) => 
  apiFetch(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });

/**
 * PATCH request
 */
export const apiPatch = (endpoint, body, options = {}) => 
  apiFetch(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) });

/**
 * DELETE request
 */
export const apiDelete = (endpoint, options = {}) => 
  apiFetch(endpoint, { ...options, method: 'DELETE' });

export default apiFetch;
