const API_BASE = '/api';

/**
 * Fetch properties with optional filters and pagination.
 * Only non-empty filter values are included in the request URL.
 * @param {Object} options
 * @param {number}  [options.limit=20]    - Number of results per page
 * @param {number}  [options.offset=0]    - Number of results to skip
 * @param {string}  [options.city]        - Filter by city name
 * @param {string}  [options.state]       - Filter by state name
 * @param {string}  [options.zipcode]     - Filter by 5-digit ZIP code
 * @param {number}  [options.minPrice]    - Minimum listing price
 * @param {number}  [options.maxPrice]    - Maximum listing price
 * @param {number}  [options.beds]        - Number of bedrooms
 * @param {number}  [options.baths]       - Number of bathrooms
 * @returns {Promise<{total: number, limit: number, offset: number, results: Array}>}
 */
export async function fetchProperties({ limit = 20, offset = 0, ...filters } = {}) {
  const params = new URLSearchParams({ limit, offset });

  // Append only non-empty filter values
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value != null) {
      params.set(key, value);
    }
  }

  const url = `${API_BASE}/properties?${params}`;

  let response;
  try {
    response = await fetch(url, { cache: 'no-store' });
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
