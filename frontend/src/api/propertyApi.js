const API_BASE = '/api';

/**
 * Fetch properties with optional filters, pagination, and multi-column sorting.
 * Only non-empty filter values are included in the request URL.
 * @param {Object} options
 * @param {number}  [options.limit=20]       - Number of results per page
 * @param {number}  [options.offset=0]       - Number of results to skip
 * @param {string}  [options.city]           - Filter by city name
 * @param {string}  [options.state]          - Filter by state name
 * @param {string}  [options.zipcode]        - Filter by 5-digit ZIP code
 * @param {number}  [options.minPrice]       - Minimum listing price
 * @param {number}  [options.maxPrice]       - Maximum listing price
 * @param {number}  [options.beds]           - Number of bedrooms
 * @param {number}  [options.baths]          - Number of bathrooms
 * @param {Array}   [options.sortCriteria]   - Array of {field, order} for multi-column sort
 * @returns {Promise<{total: number, limit: number, offset: number, results: Array}>}
 */
export async function fetchProperties({ limit = 20, offset = 0, sortCriteria, ...filters } = {}) {
  const params = new URLSearchParams({ limit, offset });

  // Append only non-empty filter values
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value != null) {
      params.set(key, value);
    }
  }

  // Append multi-column sort as comma-separated values
  if (sortCriteria && sortCriteria.length > 0) {
    params.set('sortBy', sortCriteria.map((c) => c.field).join(','));
    params.set('sortOrder', sortCriteria.map((c) => c.order).join(','));
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

/**
 * Fetch a single property by its listing ID.
 * @param {string} id - The property display ID
 * @returns {Promise<Object>} Property detail object
 */
export async function fetchPropertyById(id) {
  const url = `${API_BASE}/properties/${id}`;

  let response;
  try {
    response = await fetch(url, { cache: 'no-store' });
  } catch {
    throw new Error('Unable to connect to the server. Please check your connection.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

/**
 * Fetch open house events for a property.
 * @param {string} id - The property display ID
 * @returns {Promise<{listingId: string, openHouses: Array}>}
 */
export async function fetchOpenHouses(id) {
  const url = `${API_BASE}/properties/${id}/openhouses`;

  let response;
  try {
    response = await fetch(url, { cache: 'no-store' });
  } catch {
    throw new Error('Unable to connect to the server. Please check your connection.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

/**
 * Fetch favorite properties by their IDs with optional filters, pagination, and sorting.
 * Uses POST to send the ID list in the request body (may be large).
 * @param {Object} options
 * @param {string[]} options.ids              - Array of property display IDs
 * @param {number}   [options.limit=20]       - Number of results per page
 * @param {number}   [options.offset=0]       - Number of results to skip
 * @param {Array}    [options.sortCriteria]    - Array of {field, order} for multi-column sort
 * @param {string}   [options.city]           - Filter by city name
 * @param {string}   [options.state]          - Filter by state name
 * @param {string}   [options.zipcode]        - Filter by 5-digit ZIP code
 * @param {number}   [options.minPrice]       - Minimum listing price
 * @param {number}   [options.maxPrice]       - Maximum listing price
 * @param {number}   [options.beds]           - Number of bedrooms
 * @param {number}   [options.baths]          - Number of bathrooms
 * @returns {Promise<{total: number, limit: number, offset: number, results: Array}>}
 */
export async function fetchFavoriteProperties({ ids, limit = 20, offset = 0, sortCriteria, ...filters } = {}) {
  const params = new URLSearchParams({ limit, offset });

  // Append only non-empty filter values
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value != null) {
      params.set(key, value);
    }
  }

  // Append multi-column sort as comma-separated values
  if (sortCriteria && sortCriteria.length > 0) {
    params.set('sortBy', sortCriteria.map((c) => c.field).join(','));
    params.set('sortOrder', sortCriteria.map((c) => c.order).join(','));
  }

  const url = `${API_BASE}/properties/favorites?${params}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
      cache: 'no-store',
    });
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

/**
 * Fetch open house events with optional date range filtering, property filters, and pagination.
 * @param {Object} options
 * @param {string}  [options.startDate]  - Filter start date (YYYY-MM-DD)
 * @param {string}  [options.endDate]    - Filter end date (YYYY-MM-DD)
 * @param {number}  [options.limit=20]   - Number of results per page
 * @param {number}  [options.offset=0]   - Number of results to skip
 * @param {string}  [options.city]       - Filter by city name
 * @param {string}  [options.state]      - Filter by state name
 * @param {string}  [options.zipcode]    - Filter by ZIP code
 * @param {number}  [options.minPrice]   - Minimum listing price
 * @param {number}  [options.maxPrice]   - Maximum listing price
 * @param {number}  [options.beds]       - Number of bedrooms
 * @param {number}  [options.baths]      - Number of bathrooms
 * @returns {Promise<{total: number, limit: number, offset: number, results: Array}>}
 */
export async function fetchAllOpenHouses({ startDate, endDate, limit = 20, offset = 0, sortCriteria, ...filters } = {}) {
  const params = new URLSearchParams({ limit, offset });

  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  // Append property filter values
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value != null) {
      params.set(key, value);
    }
  }

  // Append multi-column sort as comma-separated values
  if (sortCriteria && sortCriteria.length > 0) {
    params.set('sortBy', sortCriteria.map((c) => c.field).join(','));
    params.set('sortOrder', sortCriteria.map((c) => c.order).join(','));
  }

  const url = `${API_BASE}/openhouses?${params}`;

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
