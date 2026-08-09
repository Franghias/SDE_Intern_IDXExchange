import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllOpenHouses } from '../api/propertyApi';

// Mock global fetch
beforeEach(() => {
  vi.restoreAllMocks();
});

describe('fetchAllOpenHouses', () => {
  it('builds the correct URL with default params when no filters are provided', async () => {
    const mockData = { total: 10, limit: 20, offset: 0, results: [] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    const result = await fetchAllOpenHouses();

    expect(fetch).toHaveBeenCalledTimes(1);
    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('/api/openhouses?');
    expect(calledUrl).toContain('limit=20');
    expect(calledUrl).toContain('offset=0');
    expect(calledUrl).not.toContain('startDate');
    expect(calledUrl).not.toContain('endDate');
    expect(result).toEqual(mockData);
  });

  it('includes startDate and endDate when provided', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ total: 5, limit: 20, offset: 0, results: [] }),
    }));

    await fetchAllOpenHouses({ startDate: '2026-06-01', endDate: '2026-06-30' });

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('startDate=2026-06-01');
    expect(calledUrl).toContain('endDate=2026-06-30');
  });

  it('respects custom limit and offset', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ total: 50, limit: 10, offset: 20, results: [] }),
    }));

    await fetchAllOpenHouses({ limit: 10, offset: 20 });

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('limit=10');
    expect(calledUrl).toContain('offset=20');
  });

  it('throws a meaningful error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(fetchAllOpenHouses()).rejects.toThrow(
      'Unable to connect to the server. Please check your connection.'
    );
  });

  it('throws an error with the server message on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ errors: ['startDate must be a valid date in YYYY-MM-DD format'] }),
    }));

    await expect(fetchAllOpenHouses({ startDate: 'invalid' })).rejects.toThrow(
      'startDate must be a valid date in YYYY-MM-DD format'
    );
  });

  it('does not include startDate or endDate when they are falsy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ total: 0, limit: 20, offset: 0, results: [] }),
    }));

    await fetchAllOpenHouses({ startDate: '', endDate: null });

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).not.toContain('startDate');
    expect(calledUrl).not.toContain('endDate');
  });
});
