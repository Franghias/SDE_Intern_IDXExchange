/**
 * Week 4 Tests — Property Detail & Open House Endpoints + Request Logging
 *
 * Run with: npm test
 *
 * These tests verify Week 4 deliverables:
 *   1. GET /api/properties/:id returns the full property object
 *   2. GET /api/properties/:id returns 404 for unknown IDs
 *   3. GET /api/properties/:id/openhouses returns an array (empty is OK)
 *   4. Open houses are ordered by date and start time
 *   5. Malformed or oversized IDs return 400
 *   6. Every request prints a log line with method, URL, status code, and duration
 *   7. Route order is correct — /openhouses is registered before /:id
 */

require('dotenv').config();

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

// Mock the database pool
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  end: jest.fn(),
}));

afterAll(async () => {
  await pool.end();
});

// =========================================================
// GET /api/properties/:id — Property Detail
// =========================================================

describe('Week 4 — GET /api/properties/:id', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns full property object for a valid ID', async () => {
    const mockProperty = {
      listingId: '1174572339',
      displayId: '1174572339',
      address: '123 Main St',
      city: 'Portland',
      state: 'Oregon',
      zipCode: '97201',
      listPrice: 459900,
      beds: 3,
      baths: 2.0,
      sqft: 1500,
      yearBuilt: 2005,
      description: 'Beautiful home',
      photos: '["https://example.com/photo1.jpg"]',
      latitude: 45.523064,
      longitude: -122.676483,
      propertyType: 'Residential',
      status: 'Active',
    };
    pool.query.mockResolvedValueOnce([[mockProperty]]);

    const res = await request(app).get('/api/properties/1174572339');

    expect(res.status).toBe(200);
    expect(res.body.listingId).toBe('1174572339');
    expect(res.body.address).toBe('123 Main St');
    expect(res.body.listPrice).toBe(459900);
    expect(res.body.beds).toBe(3);
    expect(res.body.photos).toBeDefined();
  });

  test('returns 404 for unknown property ID', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/properties/9999999999');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Property not found');
  });

  test('returns 400 for malformed ID with special characters', async () => {
    const res = await request(app).get('/api/properties/abc!@%23');

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toContain('alphanumeric');
  });

  test('returns 400 for oversized ID (more than 20 characters)', async () => {
    const longId = 'A'.repeat(21);
    const res = await request(app).get(`/api/properties/${longId}`);

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  test('returns 500 when database query fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('Connection lost'));

    const res = await request(app).get('/api/properties/1174572339');

    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Failed to fetch property');
  });

  test('query uses parameterized placeholder for ID', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/properties/1174572339');

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('?');
    expect(sql).not.toContain('1174572339');
    expect(params).toContain('1174572339');
  });
});

// =========================================================
// GET /api/properties/:id/openhouses — Open Houses
// =========================================================

describe('Week 4 — GET /api/properties/:id/openhouses', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns open houses array for a valid ID', async () => {
    const mockRows = [
      {
        L_ListingID: '1174572339',
        L_DisplayId: '1174572339',
        OpenHouseDate: '2026-06-20',
        OH_StartDate: '2026-06-20',
        OH_EndDate: '2026-06-20',
        startTime: '14:00:00',
        endTime: '16:00:00',
        all_data: JSON.stringify({
          OpenHouseRemarks: 'Welcome!',
          OpenHouseType: 'Public',
          OpenHouseStatus: 'Active',
          OpenHouseAttendedBy: 'Agent',
          // Refreshments: null,
          PropertyType: 'Residential',
          PropertySubType: 'SingleFamilyResidence',
          // ListingId: 'TR26129416',
          // ShowingAgentFirstName: 'Jane',
          // ShowingAgentLastName: 'Doe',
          SomeOtherField: 'should be excluded',
        }),
      },
    ];
    pool.query.mockResolvedValueOnce([mockRows]);

    const res = await request(app).get('/api/properties/1174572339/openhouses');

    expect(res.status).toBe(200);
    expect(res.body.listingId).toBe('1174572339');
    expect(Array.isArray(res.body.openHouses)).toBe(true);
    expect(res.body.openHouses).toHaveLength(1);

    const oh = res.body.openHouses[0];
    expect(oh.date).toBe('2026-06-20');
    expect(oh.startTime).toBe('14:00:00');
    expect(oh.endTime).toBe('16:00:00');
    expect(oh.OpenHouseRemarks).toBe('Welcome!');
    expect(oh.OpenHouseType).toBe('Public');
    // expect(oh.ShowingAgentFirstName).toBe('Jane');

    // Verify excluded keys are not present
    expect(oh.SomeOtherField).toBeUndefined();
  });

  test('returns empty array when no open houses exist (not 404)', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/properties/9999999999/openhouses');

    expect(res.status).toBe(200);
    expect(res.body.openHouses).toEqual([]);
  });

  test('uses OH_StartDate when dates differ', async () => {
    const mockRows = [
      {
        L_ListingID: '1174572339',
        L_DisplayId: '1174572339',
        OpenHouseDate: '2026-06-20',
        OH_StartDate: '2026-06-19',
        OH_EndDate: '2026-06-20',
        startTime: '10:00:00',
        endTime: '12:00:00',
        all_data: '{}',
      },
    ];
    pool.query.mockResolvedValueOnce([mockRows]);

    const res = await request(app).get('/api/properties/1174572339/openhouses');

    expect(res.status).toBe(200);
    // Dates differ, so OH_StartDate should be used
    expect(res.body.openHouses[0].date).toBe('2026-06-19');
  });

  test('uses L_ListingID when it differs from L_DisplayId', async () => {
    const mockRows = [
      {
        L_ListingID: 'SYSTEM123',
        L_DisplayId: 'MLS456',
        OpenHouseDate: '2026-06-20',
        OH_StartDate: '2026-06-20',
        OH_EndDate: '2026-06-20',
        startTime: '10:00:00',
        endTime: '12:00:00',
        all_data: '{}',
      },
    ];
    pool.query.mockResolvedValueOnce([mockRows]);

    const res = await request(app).get('/api/properties/MLS456/openhouses');

    expect(res.status).toBe(200);
    // IDs differ, so L_ListingID should be used
    expect(res.body.openHouses[0].listingId).toBe('SYSTEM123');
  });

  test('uses L_DisplayId when both IDs are equal', async () => {
    const mockRows = [
      {
        L_ListingID: '1174572339',
        L_DisplayId: '1174572339',
        OpenHouseDate: '2026-06-20',
        OH_StartDate: '2026-06-20',
        OH_EndDate: '2026-06-20',
        startTime: '10:00:00',
        endTime: '12:00:00',
        all_data: '{}',
      },
    ];
    pool.query.mockResolvedValueOnce([mockRows]);

    const res = await request(app).get('/api/properties/1174572339/openhouses');

    expect(res.status).toBe(200);
    expect(res.body.openHouses[0].listingId).toBe('1174572339');
  });

  test('open houses are ordered by date and start time (verified via SQL)', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/properties/1174572339/openhouses');

    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain('ORDER BY OpenHouseDate ASC, OH_StartTime ASC');
  });

  test('returns 400 for malformed ID', async () => {
    const res = await request(app).get('/api/properties/!!!invalid/openhouses');

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  test('handles invalid all_data JSON gracefully', async () => {
    const mockRows = [
      {
        L_ListingID: '1174572339',
        L_DisplayId: '1174572339',
        OpenHouseDate: '2026-06-20',
        OH_StartDate: '2026-06-20',
        OH_EndDate: '2026-06-20',
        startTime: '10:00:00',
        endTime: '12:00:00',
        all_data: 'not-json',
      },
    ];
    pool.query.mockResolvedValueOnce([mockRows]);

    const res = await request(app).get('/api/properties/1174572339/openhouses');

    expect(res.status).toBe(200);
    // Should still return the row, just without extracted details
    expect(res.body.openHouses).toHaveLength(1);
    expect(res.body.openHouses[0].date).toBe('2026-06-20');
  });

  test('returns 500 when database query fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('Connection lost'));

    const res = await request(app).get('/api/properties/1174572339/openhouses');

    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Failed to fetch open houses');
  });
});

// =========================================================
// Request Logging Middleware
// =========================================================

describe('Week 4 — Request Logging Middleware', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  test('logs method, URL, status code, and duration for every request', async () => {
    // Mock a successful property query
    pool.query.mockResolvedValueOnce([[{ listingId: '123', address: 'Test' }]]);

    await request(app).get('/api/properties/123');

    // Find the log call from our middleware (not from error logging)
    const logCalls = console.log.mock.calls.map((call) => call[0]);
    const logLine = logCalls.find((line) =>
      typeof line === 'string' && line.includes('GET') && line.includes('/api/properties/123')
    );

    expect(logLine).toBeDefined();
    expect(logLine).toMatch(/GET/);
    expect(logLine).toMatch(/\/api\/properties\/123/);
    expect(logLine).toMatch(/200/);
    expect(logLine).toMatch(/\d+ms/);
  });

  test('logs 404 status for unknown routes', async () => {
    await request(app).get('/api/nonexistent');

    const logCalls = console.log.mock.calls.map((call) => call[0]);
    const logLine = logCalls.find((line) =>
      typeof line === 'string' && line.includes('/api/nonexistent')
    );

    expect(logLine).toBeDefined();
    expect(logLine).toMatch(/404/);
  });
});
