/**
 * Request logging middleware.
 * Logs every request with method, URL, status code, and duration in ms.
 * Attaches X-Response-Time header to outgoing responses.
 * Sensitive query-string parameters (token, key, secret, password, etc.)
 * are automatically redacted before being written to stdout.
 * Each request is logged on a new line with an ISO timestamp.
 * Example:
 * [2026-07-02T13:12:21.858Z] GET /api/properties 200 15ms
 */
const { redactUrl } = require('../utils/logger');

function requestLogger(req, res, next) {
  const startHr = process.hrtime.bigint();
  const startMs = Date.now();

  // Attach X-Response-Time header before response headers are flushed
  const originalWriteHead = res.writeHead;
  res.writeHead = function (...args) {
    if (!res.headersSent) {
      const elapsedMs = Math.round(Number(process.hrtime.bigint() - startHr) / 1e6);
      res.setHeader('X-Response-Time', `${elapsedMs}ms`);
    }
    return originalWriteHead.apply(this, args);
  };

  let logged = false;
  const logRequest = () => {
    if (logged) return;
    logged = true;

    const duration = Math.round(Number(process.hrtime.bigint() - startHr) / 1e6);
    const timestamp = new Date(startMs).toISOString();
    const rawUrl = req.originalUrl || req.url;
    const url = redactUrl(rawUrl);
    console.log(`[${timestamp}] ${req.method} ${url} ${res.statusCode} ${duration}ms`);
  };

  res.once('finish', logRequest);
  res.once('close', logRequest);

  next();
}

module.exports = requestLogger;

