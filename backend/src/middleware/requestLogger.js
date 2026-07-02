/**
 * Request logging middleware.
 * Logs every request with method, URL, status code, and duration in ms.
 * Each request is logged on a new line with a timestamp.
 * Example:
 * [2026-07-02T13:12:21.858Z] GET /api/properties 200 15ms
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
}

module.exports = requestLogger;
