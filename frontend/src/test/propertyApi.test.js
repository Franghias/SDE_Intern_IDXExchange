import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchProperties } from '../api/propertyApi';

// Mock global fetch
beforeEach(() => {
  vi.restoreAllMocks();
});

describe('fetchProperties', () => {
  it('builds the correct URL with default params when no filters are provided', async () => {
    const mockData = { total: 10, limit: 20, offset: 0, results: [] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    const result = await fetchProperties();

    expect(fetch).toHaveBeenCalledTimes(1);
    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('/api/properties?');
    expect(calledUrl).toContain('limit=20');
    expect(calledUrl).toContain('offset=0');
    expect(result).toEqual(mockData);
  });

  it('includes only non-empty filter values in the URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ total: 0, limit: 20, offset: 0, results: [] }),
    }));

    await fetchProperties({ city: 'Portland', state: '', zipcode: '', minPrice: 300000, beds: '' });

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('city=Portland');
    expect(calledUrl).toContain('minPrice=300000');
    // Empty values should NOT be in the URL
    expect(calledUrl).not.toContain('state=');
    expect(calledUrl).not.toContain('zipcode=');
    expect(calledUrl).not.toContain('beds=');
  });

  it('throws a meaningful error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(fetchProperties()).rejects.toThrow(
      'Unable to connect to the server. Please check your connection.'
    );
  });

  it('throws an error with the server message on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ errors: ['city must contain only letters and spaces'] }),
    }));

    await expect(fetchProperties({ city: '123' })).rejects.toThrow(
      'city must contain only letters and spaces'
    );
  });
});
