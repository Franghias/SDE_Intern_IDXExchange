const API_BASE = '/api';

/**
 * Fetch properties with optional pagination params.
 * @param {Object} options
 * @param {number} [options.limit=20] - Number of results per page
 * @param {number} [options.offset=0] - Number of results to skip
 * @returns {Promise<{total: number, limit: number, offset: number, results: Array}>}
 */
export async function fetchProperties({ limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset });
  const url = `${API_BASE}/properties?${params}`;

  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Unable to connect to the server. Please check your connection.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.message || body?.errors?.join(', ') || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}
