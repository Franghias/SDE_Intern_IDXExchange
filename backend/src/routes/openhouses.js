const express = require('express');
const pool = require('../config/db');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Keys to extract from the open house `all_data` JSON blob.
 * Same set used in properties.js for per-property open house detail.
 */
const OPEN_HOUSE_ALL_DATA_KEYS = [
  'OpenHouseRemarks',
  'OffMarketDate',
  'AppointmentRequiredYN',
  'PropertyType',
  'OpenHouseStatus',
  'OpenHouseType',
  'PropertySubTypeAdditional',
  'OpenHouseAttendedBy',
  'PropertySubType',
  'LivestreamOpenHouseURL',
];

/**
 * Extract selected keys from the all_data JSON string.
 * Returns an object with only the keys listed in OPEN_HOUSE_ALL_DATA_KEYS.
 */
function extractAllData(allDataStr) {
  try {
    const parsed = JSON.parse(allDataStr);
    const result = {};
    for (const key of OPEN_HOUSE_ALL_DATA_KEYS) {
      if (key in parsed) {
        result[key] = parsed[key];
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Capitalize a string to Title Case.
 */
function toTitleCase(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

/**
 * Validate a YYYY-MM-DD date string.
 * Returns true if the format is valid and the date is a real calendar date.
 */
function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const date = new Date(str + 'T00:00:00');
  return !isNaN(date.getTime());
}

const SORT_WHITELIST = {
  price: 'p.L_SystemPrice',
  date: 'oh.OpenHouseDate',
  sqft: 'p.LM_Int2_3',
  beds: 'p.L_Keyword2',
  baths: 'p.LM_Dec_3',
};

// GET /api/openhouses — list open houses with optional date range filtering
router.get('/', async (req, res) => {
  const errors = [];

  // -- Pagination --
  let limit = 20;
  if (req.query.limit !== undefined) {
    limit = Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      errors.push('limit must be an integer between 1 and 500');
    }
  }

  let offset = 0;
  if (req.query.offset !== undefined) {
    offset = Number(req.query.offset);
    if (!Number.isInteger(offset) || offset < 0) {
      errors.push('offset must be a non-negative integer');
    }
  }

  // -- Date range filters --
  let startDate = null;
  let endDate = null;

  if (req.query.startDate !== undefined) {
    if (!isValidDate(req.query.startDate)) {
      errors.push('startDate must be a valid date in YYYY-MM-DD format');
    } else {
      startDate = req.query.startDate;
    }
  }

  if (req.query.endDate !== undefined) {
    if (!isValidDate(req.query.endDate)) {
      errors.push('endDate must be a valid date in YYYY-MM-DD format');
    } else {
      endDate = req.query.endDate;
    }
  }

  if (startDate && endDate && startDate > endDate) {
    errors.push('startDate must be before or equal to endDate');
  }

  // -- Property filters --
  const city = req.query.city && req.query.city.trim() ? toTitleCase(req.query.city) : null;
  const state = req.query.state && req.query.state.trim() ? toTitleCase(req.query.state) : null;
  const zipcode = req.query.zipcode ? req.query.zipcode.trim() : null;

  let minPrice = null;
  if (req.query.minPrice !== undefined && req.query.minPrice !== '') {
    minPrice = Number(req.query.minPrice);
    if (isNaN(minPrice) || minPrice < 0) {
      errors.push('minPrice must be a non-negative number');
    }
  }

  let maxPrice = null;
  if (req.query.maxPrice !== undefined && req.query.maxPrice !== '') {
    maxPrice = Number(req.query.maxPrice);
    if (isNaN(maxPrice) || maxPrice < 0) {
      errors.push('maxPrice must be a non-negative number');
    }
  }

  let beds = null;
  if (req.query.beds !== undefined && req.query.beds !== '') {
    beds = Number(req.query.beds);
    if (!Number.isInteger(beds) || beds < 0) {
      errors.push('beds must be a non-negative integer');
    }
  }

  let baths = null;
  if (req.query.baths !== undefined && req.query.baths !== '') {
    baths = Number(req.query.baths);
    if (!Number.isInteger(baths) || baths < 0) {
      errors.push('baths must be a non-negative integer');
    }
  }

  // -- Sorting --
  let orderSQL = 'ORDER BY oh.OpenHouseDate ASC, oh.OH_StartTime ASC';
  if (req.query.sortBy) {
    const sortFields = req.query.sortBy.split(',');
    const sortOrders = (req.query.sortOrder || '').split(',');

    if (sortFields.length !== sortOrders.length) {
      errors.push('sortBy and sortOrder must have the same number of values');
    } else {
      const orderClauses = [];
      for (let i = 0; i < sortFields.length; i++) {
        const field = sortFields[i].trim();
        const order = sortOrders[i].trim().toLowerCase();

        if (!SORT_WHITELIST[field]) {
          errors.push(`sortBy must be one of: ${Object.keys(SORT_WHITELIST).join(', ')}`);
        }
        if (order !== 'asc' && order !== 'desc') {
          errors.push('sortOrder must be asc or desc');
        }

        if (SORT_WHITELIST[field] && (order === 'asc' || order === 'desc')) {
          orderClauses.push(`${SORT_WHITELIST[field]} ${order.toUpperCase()}`);
        }
      }

      if (orderClauses.length > 0 && errors.length === 0) {
        orderSQL = `ORDER BY ${orderClauses.join(', ')}`;
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ status: 'error', errors });
  }

  try {
    // Base conditions: valid open house + exists in both tables (INNER JOIN)
    const conditions = ['oh.OH_StartDate <= oh.OH_EndDate'];
    const params = [];

    if (startDate) {
      conditions.push('oh.OpenHouseDate >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('oh.OpenHouseDate <= ?');
      params.push(endDate);
    }

    // Property filters (exact matches to leverage indexes)
    if (city) {
      conditions.push('p.L_City = ?');
      params.push(city);
    }

    if (state) {
      conditions.push('p.L_State = ?');
      params.push(state);
    }

    if (zipcode) {
      conditions.push('p.L_Zip = ?');
      params.push(zipcode);
    }

    if (minPrice !== null) {
      conditions.push('p.L_SystemPrice >= ?');
      params.push(minPrice);
    }

    if (maxPrice !== null) {
      conditions.push('p.L_SystemPrice <= ?');
      params.push(maxPrice);
    }

    if (beds !== null) {
      conditions.push('p.L_Keyword2 >= ?');
      params.push(beds);
    }

    if (baths !== null) {
      conditions.push('p.LM_Dec_3 >= ?');
      params.push(baths);
    }

    const whereSQL = conditions.join(' AND ');

    // Count total matching results
    const countSQL = `
      SELECT COUNT(*) AS total
      FROM rets_openhouse oh
      INNER JOIN rets_property p ON oh.L_DisplayId = p.L_DisplayId
      WHERE ${whereSQL}
    `;
    const [countRows] = await pool.query(countSQL, params);
    const total = countRows[0].total;

    // Fetch paginated results with property context
    const dataSQL = `
      SELECT
        oh.L_ListingID,
        oh.L_DisplayId,
        oh.OpenHouseDate,
        oh.OH_StartDate,
        oh.OH_EndDate,
        oh.OH_StartTime   AS startTime,
        oh.OH_EndTime     AS endTime,
        oh.all_data,
        p.L_Address       AS address,
        p.L_City          AS city,
        p.L_State         AS state,
        p.L_Zip           AS zipCode,
        p.L_SystemPrice   AS listPrice,
        p.L_Keyword2      AS beds,
        p.LM_Dec_3        AS baths,
        p.LM_Int2_3       AS sqft,
        p.L_Photos        AS photos
      FROM rets_openhouse oh
      INNER JOIN rets_property p ON oh.L_DisplayId = p.L_DisplayId
      WHERE ${whereSQL}
      ${orderSQL}
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, limit, offset];
    const [rows] = await pool.query(dataSQL, dataParams);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results = rows.map((row) => {
      // Listing ID: if L_ListingID == L_DisplayId use L_DisplayId, else use L_ListingID
      const listingId = row.L_ListingID === row.L_DisplayId
        ? row.L_DisplayId
        : row.L_ListingID;

      // Date: if all three equal use OpenHouseDate, else use OH_StartDate
      const allDatesEqual =
        row.OpenHouseDate != null &&
        row.OH_StartDate != null &&
        row.OH_EndDate != null &&
        row.OpenHouseDate.toString() === row.OH_StartDate.toString() &&
        row.OpenHouseDate.toString() === row.OH_EndDate.toString();
      const date = allDatesEqual ? row.OpenHouseDate : row.OH_StartDate;

      // Compute status: expired, upcoming, or active
      const startDate = row.OH_StartDate ? new Date(row.OH_StartDate) : null;
      const endDate = row.OH_EndDate ? new Date(row.OH_EndDate) : null;
      let status = 'active';
      if (startDate && startDate > today) {
        status = 'upcoming';
      } else if (endDate && endDate < today) {
        status = 'expired';
      }

      // Extract selected fields from all_data JSON
      const details = extractAllData(row.all_data);

      return {
        listingId,
        propertyId: row.L_DisplayId,
        date,
        openHouseDate: row.OpenHouseDate,
        startDate: row.OH_StartDate,
        endDate: row.OH_EndDate,
        startTime: row.startTime,
        endTime: row.endTime,
        status,
        address: row.address,
        city: row.city,
        state: row.state,
        zipCode: row.zipCode,
        listPrice: row.listPrice,
        beds: row.beds,
        baths: row.baths,
        sqft: row.sqft,
        photos: row.photos,
        ...details,
      };
    });

    res.json({ total, limit, offset, results });
  } catch (err) {
    logger.error('Open houses query failed', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch open houses',
    });
  }
});

module.exports = router;
