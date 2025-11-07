const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

async function request(method, endpoint, { body, token, headers } = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, config);
  const contentType = response.headers.get('content-type');
  const payload = contentType && contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage = typeof payload === 'object' && payload !== null ? payload.error || JSON.stringify(payload) : payload;
    throw new Error(errorMessage || 'Request failed');
  }

  return payload;
}

export const api = {
  get: (endpoint, options) => request('GET', endpoint, options),
  post: (endpoint, options) => request('POST', endpoint, options),
};

export default api;
