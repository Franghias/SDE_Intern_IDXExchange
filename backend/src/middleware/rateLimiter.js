const { rateLimit } = require('express-rate-limit');

/**
 * General API Rate Limiter
 * - Protects all /api/* routes against aggressive scrapers and DoS attacks.
 * - Limit: 300 requests per 15 minutes per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15-minute window
  standardHeaders: 'draft-7', // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* legacy headers
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  skip: (req) => process.env.NODE_ENV === 'test' && !req.headers['x-test-ratelimit'],
});

/**
 * Dedicated AI Chatbot Rate Limiter
 * - Protects /api/chat against LLM token drainage and cost explosion.
 * - Limit: 15 chat messages per minute per IP.
 */
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // Limit each IP to 15 chat messages per minute
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many AI chat messages. Please wait a moment before sending more.',
  },
  skip: (req) => process.env.NODE_ENV === 'test' && !req.headers['x-test-ratelimit'],
});

module.exports = {
  apiLimiter,
  chatLimiter,
};
