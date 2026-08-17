const express = require('express');
const pool = require('../config/db');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/health — verify database connectivity
router.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'database is reachable' });
  } catch (err) {
    logger.error('Health check failed', err);
    res.status(500).json({
      status: 'error',
      message: 'Database connection unavailable',
    });
  }
});

module.exports = router;

