const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/requestLogger');
const { apiLimiter, chatLimiter } = require('./middleware/rateLimiter');
const healthRouter = require('./routes/health');
const propertiesRouter = require('./routes/properties');
const openhousesRouter = require('./routes/openhouses');
const chatRouter = require('./routes/chat');

const app = express();

// Trust reverse proxy (e.g. Render / Vercel load balancer) for accurate IP resolution
app.set('trust proxy', 1);

// Whitelist of allowed frontend origins for CORS
const defaultOrigins = [
  'https://propertysearchsdeintern.vercel.app',
  'https://propertysearchsdeintern-hsujzxyf0-franghias-projects.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const allowedOriginsSet = new Set([...defaultOrigins, ...envOrigins]);

// CORS configuration with whitelist validation & Vercel preview domain support
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. Vercel serverless edge rewrites, curl, server-to-server, health check)
    if (!origin) return callback(null, true);

    // Exact match in whitelist
    if (allowedOriginsSet.has(origin)) {
      return callback(null, true);
    }

    // Dynamic match for any Vercel preview deployment for this project
    if (
      /^https:\/\/propertysearchsdeintern(-[a-z0-9-]+)?-franghias-projects\.vercel\.app$/.test(origin) ||
      /^https:\/\/propertysearchsdeintern(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked: Origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(requestLogger);

// Rate limiting middleware
app.use('/api/', apiLimiter);
app.use('/api/chat', chatLimiter);

// Routes
app.use('/api/health', healthRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/openhouses', openhousesRouter);
app.use('/api/chat', chatRouter);

// Global error handler (handles CORS errors gracefully)
app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({
      status: 'error',
      message: err.message,
    });
  }
  return res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error',
  });
});

module.exports = app;
