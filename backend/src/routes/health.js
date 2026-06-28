const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// GET /api/health — verify database connectivity
router.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'database is reachable' });
  } catch (err) {
    console.error('Health check failed:', err.message);
    if (err.message == 'ECONNREFUSED') {
      res.status(500).json({
        status: 'error',
        database: 'database unreachable',
        message: err.message,
      });
    }
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
});

module.exports = router;
