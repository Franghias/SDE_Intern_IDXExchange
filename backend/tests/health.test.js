/**
 * Week 2 Tests — Health Endpoint & Server Startup
 *
 * Run with: npm test
 *
 * These tests verify all Week 2 deliverables:
 *   1. Server starts without errors
 *   2. GET /api/health returns { status: "ok", database: "connected" } when MySQL is running
 *   3. GET /api/health returns 500 (not a crash) when MySQL is unreachable
 *   4. Response has correct JSON content-type
 */

require('dotenv').config();

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

// Close the pool after all tests finish so Jest can exit cleanly
afterAll(async () => {
  await pool.end();
});

describe('Week 2 — GET /api/health', () => {

  test('returns 200 with status "ok" and database "database is reachable" when MySQL is running', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      database: 'database is reachable',
    });
  });

  test('response has JSON content-type', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  test('returns 500 with status "error" when database is unreachable and error message (ECONNREFUSED)', async () => {
    // Temporarily replace the pool's query method to simulate a DB failure
    const originalQuery = pool.query.bind(pool);
    pool.query = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      status: 'error',
      database: 'database unreachable',
      message: 'ECONNREFUSED',
    });

    // Restore original query method
    pool.query = originalQuery;
  });

  test('500 response includes an error message (does not crash)', async () => {
    const originalQuery = pool.query.bind(pool);
    pool.query = jest.fn().mockRejectedValue(new Error('Connection lost'));

    const res = await request(app).get('/api/health');

    // Server is still alive — it returned a proper JSON response, not a crash
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Connection lost');
    expect(res.headers['content-type']).toMatch(/application\/json/);

    pool.query = originalQuery;
  });
});

describe('Week 2 — Unknown routes', () => {

  test('returns 404 for undefined routes', async () => {
    const res = await request(app).get('/api/nonexistent');

    expect(res.status).toBe(404);
  });
});
