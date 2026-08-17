/**
 * Tests for Request Logging Middleware
 *
 * Verifies:
 *  1. Logs every request with timestamp, HTTP method, URL, status code, and duration in ms.
 *  2. Response duration matches actual execution time in milliseconds.
 *  3. Attaches X-Response-Time header to outgoing responses.
 *  4. Accurately logs different HTTP status codes (200, 400, 404, 500).
 *  5. Correctly calls next() to continue Express middleware pipeline.
 *  6. Handles both finish and close events without duplicate logs.
 */

const express = require('express');
const request = require('supertest');
const requestLogger = require('../src/middleware/requestLogger');

describe('Request Logging Middleware (backend/src/middleware/requestLogger.js)', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use(requestLogger);

    app.get('/test/fast', (req, res) => {
      res.status(200).json({ message: 'fast response' });
    });

    app.get('/test/slow', async (req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 60));
      res.status(200).json({ message: 'delayed response' });
    });

    app.post('/test/created', (req, res) => {
      res.status(201).json({ created: true, data: req.body });
    });

    app.get('/test/bad-request', (req, res) => {
      res.status(400).json({ error: 'invalid parameters' });
    });

    app.get('/test/error', (req, res) => {
      res.status(500).json({ error: 'internal server error' });
    });

    return app;
  }

  test('calls next() and logs method, URL, status, and duration in ms for successful requests', async () => {
    const app = createTestApp();
    const res = await request(app).get('/test/fast');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'fast response' });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const logOutput = logSpy.mock.calls[0][0];

    // Format: [YYYY-MM-DDTHH:mm:ss.sssZ] GET /test/fast 200 <duration>ms
    const logRegex = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] GET \/test\/fast 200 \d+ms$/;
    expect(logOutput).toMatch(logRegex);
  });

  test('measures and logs accurate elapsed time in milliseconds for delayed requests', async () => {
    const app = createTestApp();
    const res = await request(app).get('/test/slow');

    expect(res.status).toBe(200);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const logOutput = logSpy.mock.calls[0][0];

    const match = logOutput.match(/(\d+)ms$/);
    expect(match).not.toBeNull();
    const duration = parseInt(match[1], 10);
    // 60ms simulated delay, allow slight variance
    expect(duration).toBeGreaterThanOrEqual(50);
  });

  test('sets X-Response-Time header on outgoing responses', async () => {
    const app = createTestApp();
    const res = await request(app).get('/test/fast');

    expect(res.status).toBe(200);
    expect(res.headers['x-response-time']).toBeDefined();
    expect(res.headers['x-response-time']).toMatch(/^\d+ms$/);
  });

  test('correctly logs POST requests with 201 Created', async () => {
    const app = createTestApp();
    const payload = { propertyId: '12345', notes: 'test favorite' };
    const res = await request(app).post('/test/created').send(payload);

    expect(res.status).toBe(201);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const logOutput = logSpy.mock.calls[0][0];

    expect(logOutput).toMatch(/POST \/test\/created 201 \d+ms/);
  });

  test('correctly logs 400 Bad Request responses', async () => {
    const app = createTestApp();
    const res = await request(app).get('/test/bad-request');

    expect(res.status).toBe(400);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const logOutput = logSpy.mock.calls[0][0];

    expect(logOutput).toMatch(/GET \/test\/bad-request 400 \d+ms/);
  });

  test('correctly logs 404 Not Found for undefined routes', async () => {
    const app = createTestApp();
    const res = await request(app).get('/test/nonexistent-route');

    expect(res.status).toBe(404);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const logOutput = logSpy.mock.calls[0][0];

    expect(logOutput).toMatch(/GET \/test\/nonexistent-route 404 \d+ms/);
  });

  test('correctly logs 500 Internal Server Error responses', async () => {
    const app = createTestApp();
    const res = await request(app).get('/test/error');

    expect(res.status).toBe(500);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const logOutput = logSpy.mock.calls[0][0];

    expect(logOutput).toMatch(/GET \/test\/error 500 \d+ms/);
  });

  test('logs once even if both finish and close events fire', () => {
    const req = { method: 'GET', originalUrl: '/api/mock-test' };
    const listeners = {};
    const res = {
      statusCode: 200,
      headersSent: false,
      writeHead: jest.fn(),
      setHeader: jest.fn(),
      once: jest.fn((event, cb) => {
        listeners[event] = cb;
      }),
    };
    const next = jest.fn();

    requestLogger(req, res, next);
    expect(next).toHaveBeenCalled();

    // Trigger finish
    if (listeners.finish) listeners.finish();
    expect(logSpy).toHaveBeenCalledTimes(1);

    // Trigger close afterwards
    if (listeners.close) listeners.close();
    // Must remain 1 call (no duplicate log)
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  test('falls back to req.url if req.originalUrl is not defined', () => {
    const req = { method: 'GET', url: '/api/fallback-url' };
    const listeners = {};
    const res = {
      statusCode: 200,
      headersSent: false,
      writeHead: jest.fn(),
      setHeader: jest.fn(),
      once: jest.fn((event, cb) => {
        listeners[event] = cb;
      }),
    };
    const next = jest.fn();

    requestLogger(req, res, next);
    if (listeners.finish) listeners.finish();

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toMatch(/GET \/api\/fallback-url 200 \d+ms/);
  });

  test('redacts sensitive query parameters (token, key, password, api_key) in access logs', async () => {
    const app = createTestApp();
    const res = await request(app).get('/test/fast?token=secret123&api_key=abc&page=1');

    expect(res.status).toBe(200);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const logOutput = logSpy.mock.calls[0][0];

    // Sensitive params should be redacted
    expect(logOutput).toContain('token=[REDACTED]');
    expect(logOutput).toContain('api_key=[REDACTED]');
    // Non-sensitive params should remain intact
    expect(logOutput).toContain('page=1');
    // Raw values must NOT appear
    expect(logOutput).not.toContain('secret123');
    expect(logOutput).not.toContain('abc');
  });

  test('does not redact URLs without sensitive query parameters', async () => {
    const app = createTestApp();
    const res = await request(app).get('/test/fast?city=Portland&limit=10');

    expect(res.status).toBe(200);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const logOutput = logSpy.mock.calls[0][0];

    expect(logOutput).toContain('city=Portland');
    expect(logOutput).toContain('limit=10');
  });

  test('does not modify URLs without query strings', async () => {
    const app = createTestApp();
    const res = await request(app).get('/test/fast');

    expect(res.status).toBe(200);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const logOutput = logSpy.mock.calls[0][0];

    expect(logOutput).toContain('/test/fast');
    expect(logOutput).not.toContain('?');
  });
});

