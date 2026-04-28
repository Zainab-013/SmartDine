/**
 * SmartDine API Helper
 * 
 * Wraps fetch() to automatically attach the JWT Authorization header
 * and handle 401 (expired/invalid token) by redirecting to login.
 */

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

/**
 * Authenticated fetch wrapper.
 * @param {string} url - Relative path (e.g. '/api/dishes/all') or full URL
 * @param {RequestInit} options - Standard fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');

  // Build headers — preserve any existing headers from caller
  const headers = { ...(options.headers || {}) };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  // If token is expired or invalid, force re-login
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    window.dispatchEvent(new Event('auth:logout'));
    throw new Error('Session expired');
  }

  return response;
}

/**
 * Get the stored user object.
 * @returns {{ id: number, email: string, restaurant: string } | null}
 */
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

/**
 * Get the stored JWT token.
 * @returns {string | null}
 */
export function getToken() {
  return localStorage.getItem('token');
}
