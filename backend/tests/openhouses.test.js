/**
 * Week 9 Tests — Open House Calendar Endpoint
 *
 * Run with: npm test
 *
 * These tests verify Week 9 Feature 3 deliverables:
 *   1. GET /api/openhouses returns open houses with property context
 *   2. Date range filtering works with startDate and endDate
 *   3. Pagination works with limit and offset
 *   4. Invalid inputs return 400 with descriptive error messages
 *   5. INNER JOIN ensures results exist in both tables
 *   6. Empty date ranges return an empty array (not an error)
 *   7. OH_StartDate <= OH_EndDate validation is enforced
 *   8. Open house status (active/upcoming/expired) is computed correctly
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

// Helper to set up mock responses for COUNT + SELECT queries
function mockDbQueries(total, rows) {
  pool.query
    .mockResolvedValueOnce([[{ total }]]) // COUNT query
    .mockResolvedValueOnce([rows]);        // SELECT query
}

// Helper: create a mock open house row as returned from the DB
function mockOpenHouseRow(overrides = {}) {
  return {
    L_ListingID: '1174572339',
    L_DisplayId: '1174572339',
    OpenHouseDate: '2026-06-20',
    OH_StartDate: '2026-06-20',
    OH_EndDate: '2026-06-20',
    startTime: '12:00:00',
    endTime: '16:00:00',
    all_data: JSON.stringify({
      OpenHouseRemarks: 'Welcome!',
      OpenHouseStatus: 'Active',
      OpenHouseType: 'Public',
      PropertyType: 'Residential',
    }),
    address: '123 Main St',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    listPrice: 459900,
    beds: 3,
    baths: 2.0,
    sqft: 1500,
    photos: '["https://example.com/photo1.jpg"]',
    ...overrides,
  };
}

describe('Week 9 — GET /api/openhouses', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================
  // Default behavior and pagination
  // =========================================================

  test('returns open houses with default pagination (limit=20, offset=0)', async () => {
    const mockRows = [mockOpenHouseRow()];
    mockDbQueries(1, mockRows);

    const res = await request(app).get('/api/openhouses');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.limit).toBe(20);
    expect(res.body.offset).toBe(0);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].address).toBe('123 Main St');
    expect(res.body.results[0].propertyId).toBe('1174572339');
  });

  test('pagination works with ?limit=5&offset=10', async () => {
    mockDbQueries(50, [mockOpenHouseRow()]);

    const res = await request(app).get('/api/openhouses?limit=5&offset=10');

    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(5);
    expect(res.body.offset).toBe(10);

    // Verify LIMIT and OFFSET params were passed to the data query
    const dataQueryParams = pool.query.mock.calls[1][1];
    expect(dataQueryParams).toContain(5);
    expect(dataQueryParams).toContain(10);
  });

  test('returns empty results array (not error) when no open houses match', async () => {
    mockDbQueries(0, []);

    const res = await request(app).get('/api/openhouses?startDate=2099-01-01&endDate=2099-12-31');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.results).toEqual([]);
  });

  // =========================================================
  // Date range filtering
  // =========================================================

  test('startDate filter adds OpenHouseDate >= ? condition', async () => {
    mockDbQueries(5, [mockOpenHouseRow()]);

    const res = await request(app).get('/api/openhouses?startDate=2026-06-01');

    expect(res.status).toBe(200);

    // Verify startDate was passed to both queries
    const countParams = pool.query.mock.calls[0][1];
    expect(countParams).toContain('2026-06-01');

    const countSQL = pool.query.mock.calls[0][0];
    expect(countSQL).toContain('oh.OpenHouseDate >= ?');
  });

  test('endDate filter adds OpenHouseDate <= ? condition', async () => {
    mockDbQueries(5, [mockOpenHouseRow()]);

    const res = await request(app).get('/api/openhouses?endDate=2026-06-30');

    expect(res.status).toBe(200);

    const countSQL = pool.query.mock.calls[0][0];
    expect(countSQL).toContain('oh.OpenHouseDate <= ?');

    const countParams = pool.query.mock.calls[0][1];
    expect(countParams).toContain('2026-06-30');
  });

  test('both startDate and endDate filter together', async () => {
    mockDbQueries(3, [mockOpenHouseRow()]);

    const res = await request(app).get('/api/openhouses?startDate=2026-06-15&endDate=2026-06-25');

    expect(res.status).toBe(200);

    const countSQL = pool.query.mock.calls[0][0];
    expect(countSQL).toContain('oh.OpenHouseDate >= ?');
    expect(countSQL).toContain('oh.OpenHouseDate <= ?');

    const countParams = pool.query.mock.calls[0][1];
    expect(countParams).toContain('2026-06-15');
    expect(countParams).toContain('2026-06-25');
  });

  // =========================================================
  // SQL structure verification
  // =========================================================

  test('query uses INNER JOIN to ensure data exists in both tables', async () => {
    mockDbQueries(1, [mockOpenHouseRow()]);

    await request(app).get('/api/openhouses');

    const countSQL = pool.query.mock.calls[0][0];
    const dataSQL = pool.query.mock.calls[1][0];

    expect(countSQL).toContain('INNER JOIN rets_property p ON oh.L_DisplayId = p.L_DisplayId');
    expect(dataSQL).toContain('INNER JOIN rets_property p ON oh.L_DisplayId = p.L_DisplayId');
  });

  test('query enforces OH_StartDate <= OH_EndDate validation', async () => {
    mockDbQueries(1, [mockOpenHouseRow()]);

    await request(app).get('/api/openhouses');

    const countSQL = pool.query.mock.calls[0][0];
    expect(countSQL).toContain('oh.OH_StartDate <= oh.OH_EndDate');
  });

  test('results are ordered by OpenHouseDate ASC then OH_StartTime ASC by default', async () => {
    mockDbQueries(1, [mockOpenHouseRow()]);

    await request(app).get('/api/openhouses');

    const dataSQL = pool.query.mock.calls[1][0];
    expect(dataSQL).toContain('ORDER BY oh.OpenHouseDate ASC, oh.OH_StartTime ASC');
  });

  test('sortBy and sortOrder parameters modify SQL ORDER BY clause', async () => {
    mockDbQueries(1, [mockOpenHouseRow()]);

    await request(app).get('/api/openhouses?sortBy=price,sqft&sortOrder=asc,desc');

    const dataSQL = pool.query.mock.calls[1][0];
    expect(dataSQL).toContain('ORDER BY p.L_SystemPrice ASC, p.LM_Int2_3 DESC');
  });

  test('returns 400 when sortBy contains invalid field', async () => {
    const res = await request(app).get('/api/openhouses?sortBy=invalidField&sortOrder=asc');

    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toContain('sortBy must be one of');
  });

  // =========================================================
  // Response data mapping
  // =========================================================

  test('uses L_DisplayId as listingId when both IDs are equal', async () => {
    mockDbQueries(1, [mockOpenHouseRow({ L_ListingID: '123', L_DisplayId: '123' })]);

    const res = await request(app).get('/api/openhouses');

    expect(res.body.results[0].listingId).toBe('123');
  });

  test('uses L_ListingID when it differs from L_DisplayId', async () => {
    mockDbQueries(1, [mockOpenHouseRow({ L_ListingID: 'ABC', L_DisplayId: '123' })]);

    const res = await request(app).get('/api/openhouses');

    expect(res.body.results[0].listingId).toBe('ABC');
    expect(res.body.results[0].propertyId).toBe('123');
  });

  test('uses OpenHouseDate when all three dates are equal', async () => {
    const row = mockOpenHouseRow({
      OpenHouseDate: '2026-07-01',
      OH_StartDate: '2026-07-01',
      OH_EndDate: '2026-07-01',
    });
    mockDbQueries(1, [row]);

    const res = await request(app).get('/api/openhouses');

    expect(res.body.results[0].date).toBe('2026-07-01');
  });

  test('extracts all_data JSON fields correctly', async () => {
    mockDbQueries(1, [mockOpenHouseRow()]);

    const res = await request(app).get('/api/openhouses');

    const result = res.body.results[0];
    expect(result.OpenHouseRemarks).toBe('Welcome!');
    expect(result.OpenHouseStatus).toBe('Active');
    expect(result.OpenHouseType).toBe('Public');
    expect(result.PropertyType).toBe('Residential');
  });

  test('handles invalid all_data JSON gracefully', async () => {
    mockDbQueries(1, [mockOpenHouseRow({ all_data: 'not-json' })]);

    const res = await request(app).get('/api/openhouses');

    expect(res.status).toBe(200);
    // Invalid JSON should not crash — just no extracted fields
    expect(res.body.results[0].OpenHouseRemarks).toBeUndefined();
  });

  test('includes property context fields in response', async () => {
    mockDbQueries(1, [mockOpenHouseRow()]);

    const res = await request(app).get('/api/openhouses');

    const result = res.body.results[0];
    expect(result.address).toBe('123 Main St');
    expect(result.city).toBe('Portland');
    expect(result.state).toBe('OR');
    expect(result.zipCode).toBe('97201');
    expect(result.listPrice).toBe(459900);
    expect(result.beds).toBe(3);
    expect(result.sqft).toBe(1500);
    expect(result.photos).toBeDefined();
  });

  // =========================================================
  // Input validation
  // =========================================================

  test('returns 400 for invalid startDate format', async () => {
    const res = await request(app).get('/api/openhouses?startDate=invalid');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0]).toContain('startDate must be a valid date');
  });

  test('returns 400 for invalid endDate format', async () => {
    const res = await request(app).get('/api/openhouses?endDate=2026-13-99');

    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toContain('endDate must be a valid date');
  });

  test('returns 400 when startDate is after endDate', async () => {
    const res = await request(app).get('/api/openhouses?startDate=2026-07-01&endDate=2026-06-01');

    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toContain('startDate must be before or equal to endDate');
  });

  test('returns 400 for limit=0', async () => {
    const res = await request(app).get('/api/openhouses?limit=0');

    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toContain('limit must be an integer between 1 and 500');
  });

  test('returns 400 for limit exceeding max (501)', async () => {
    const res = await request(app).get('/api/openhouses?limit=501');

    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toContain('limit must be an integer between 1 and 500');
  });

  test('returns 400 for negative offset', async () => {
    const res = await request(app).get('/api/openhouses?offset=-1');

    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toContain('offset must be a non-negative integer');
  });

  // =========================================================
  // Error handling
  // =========================================================

  test('returns 500 when database query fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('Connection lost'));

    const res = await request(app).get('/api/openhouses');

    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Failed to fetch open houses');
  });
});
