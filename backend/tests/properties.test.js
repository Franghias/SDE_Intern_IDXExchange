/**
 * Week 3 Tests — Property Search Endpoint with Filters & Pagination
 *
 * Run with: npm test
 *
 * These tests verify Week 3 deliverables:
 *   1. GET /api/properties returns 20 properties by default with a total count
 *   2. Pagination works with limit and offset
 *   3. Filtering works for city, state, zipcode, minPrice, maxPrice, beds, baths
 *   4. Multiple filters combine correctly
 *   5. Invalid inputs return 400 with descriptive error messages
 *   6. All queries use parameterized values (verified via mock inspection)
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

describe('Week 3 — GET /api/properties', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================
  // Default behavior and pagination
  // =========================================================

  test('returns 20 properties by default with total, limit, and offset', async () => {
    const mockRows = Array.from({ length: 20 }, (_, i) => ({
      listingId: `ID${i}`,
      listPrice: 300000 + i * 1000,
      address: `${i} Main St`,
      city: 'Portland',
      state: 'Oregon',
      zipCode: '97201',
      beds: 3,
      baths: 2,
      sqft: 1500,
    }));
    mockDbQueries(87, mockRows);

    const res = await request(app).get('/api/properties');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(87);
    expect(res.body.limit).toBe(20);
    expect(res.body.offset).toBe(0);
    expect(res.body.results).toHaveLength(20);
  });

  test('pagination works with ?limit=10&offset=20', async () => {
    const mockRows = Array.from({ length: 10 }, (_, i) => ({
      listingId: `ID${i + 20}`,
      listPrice: 300000,
      address: `${i + 20} Main St`,
      city: 'Portland',
      state: 'Oregon',
      zipCode: '97201',
      beds: 3,
      baths: 2,
      sqft: 1500,
    }));
    mockDbQueries(87, mockRows);

    const res = await request(app).get('/api/properties?limit=10&offset=20');

    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(10);
    expect(res.body.offset).toBe(20);
    expect(res.body.results).toHaveLength(10);

    // Verify the LIMIT and OFFSET params were passed to the data query
    const dataQueryParams = pool.query.mock.calls[1][1];
    expect(dataQueryParams).toContain(10);  // limit
    expect(dataQueryParams).toContain(20);  // offset
  });

  // =========================================================
  // Filtering
  // =========================================================

  test('city filter works: ?city=Portland', async () => {
    mockDbQueries(25, [{ listingId: 'ID1', city: 'Portland' }]);

    const res = await request(app).get('/api/properties?city=Portland');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(25);

    // Verify city param was passed to the query
    const countParams = pool.query.mock.calls[0][1];
    expect(countParams).toContain('Portland');
  });

  test('state filter works: ?state=Oregon', async () => {
    mockDbQueries(100, [{ listingId: 'ID1', state: 'Oregon' }]);

    const res = await request(app).get('/api/properties?state=Oregon');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(100);

    const countParams = pool.query.mock.calls[0][1];
    expect(countParams).toContain('Oregon');
  });

  test('multiple filters combine: ?city=Portland&minPrice=300000&beds=3', async () => {
    mockDbQueries(12, [{ listingId: 'ID1', city: 'Portland', listPrice: 350000, beds: 3 }]);

    const res = await request(app).get('/api/properties?city=Portland&minPrice=300000&beds=3');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(12);

    // Verify all filter params were passed
    const countParams = pool.query.mock.calls[0][1];
    expect(countParams).toContain('Portland');
    expect(countParams).toContain(300000);
    expect(countParams).toContain(3);
  });

  test('zipcode filter: ?zipcode=97201', async () => {
    mockDbQueries(5, [{ listingId: 'ID1', zipCode: '97201' }]);

    const res = await request(app).get('/api/properties?zipcode=97201');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5);

    const countParams = pool.query.mock.calls[0][1];
    expect(countParams).toContain('97201');
  });

  test('price range filter: ?minPrice=200000&maxPrice=500000', async () => {
    mockDbQueries(40, [{ listingId: 'ID1', listPrice: 350000 }]);

    const res = await request(app).get('/api/properties?minPrice=200000&maxPrice=500000');

    expect(res.status).toBe(200);

    const countParams = pool.query.mock.calls[0][1];
    expect(countParams).toContain(200000);
    expect(countParams).toContain(500000);
  });

  test('baths filter: ?baths=2.5', async () => {
    mockDbQueries(15, [{ listingId: 'ID1', baths: 3.0 }]);

    const res = await request(app).get('/api/properties?baths=2.5');

    expect(res.status).toBe(200);

    const countParams = pool.query.mock.calls[0][1];
    expect(countParams).toContain(2.5);
  });

  // =========================================================
  // Input validation — 400 errors
  // =========================================================

  test('returns 400 for non-numeric minPrice: ?minPrice=abc', async () => {
    const res = await request(app).get('/api/properties?minPrice=abc');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  test('returns 400 for limit=0', async () => {
    const res = await request(app).get('/api/properties?limit=0');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('returns 400 for limit=200 (exceeds max)', async () => {
    const res = await request(app).get('/api/properties?limit=200');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('returns 400 for negative offset: ?offset=-1', async () => {
    const res = await request(app).get('/api/properties?offset=-1');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('returns 400 for non-numeric limit: ?limit=abc', async () => {
    const res = await request(app).get('/api/properties?limit=abc');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('returns 400 for invalid zipcode: ?zipcode=123', async () => {
    const res = await request(app).get('/api/properties?zipcode=123');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('returns 400 for non-alphabetic city: ?city=123', async () => {
    const res = await request(app).get('/api/properties?city=123');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('returns 400 when minPrice > maxPrice', async () => {
    const res = await request(app).get('/api/properties?minPrice=500000&maxPrice=100000');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  // =========================================================
  // Parameterized queries (no SQL injection)
  // =========================================================

  test('all filter values use parameterized queries', async () => {
    mockDbQueries(0, []);

    await request(app).get('/api/properties?city=Portland&minPrice=300000');

    // Verify pool.query was called with parameterized format (SQL string + params array)
    expect(pool.query).toHaveBeenCalledTimes(2);

    // COUNT query
    const [countSQL, countParams] = pool.query.mock.calls[0];
    expect(typeof countSQL).toBe('string');
    expect(Array.isArray(countParams)).toBe(true);
    expect(countSQL).not.toContain('Portland');  // Value should be in params, not in SQL
    expect(countSQL).not.toContain('300000');
    expect(countSQL).toContain('?');

    // Data query
    const [dataSQL, dataParams] = pool.query.mock.calls[1];
    expect(typeof dataSQL).toBe('string');
    expect(Array.isArray(dataParams)).toBe(true);
    expect(dataSQL).toContain('?');
  });

  // =========================================================
  // Error handling
  // =========================================================

  test('returns 500 when database query fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('Connection lost'));

    const res = await request(app).get('/api/properties');

    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Failed to fetch properties');
  });
});
