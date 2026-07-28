const express = require('express');
const pool = require('../config/db');

const router = express.Router();

/**
 * Configurable columns for the property detail endpoint.
 * Add or remove entries here to control which fields GET /api/properties/:id returns.
 * Each entry: { db: 'DB_COLUMN_NAME', alias: 'apiFieldName' }
 */
const PROPERTY_DETAIL_COLUMNS = [
  { db: 'L_ListingID', alias: 'listingId' },
  { db: 'L_DisplayId', alias: 'displayId' },
  { db: 'L_Address', alias: 'address' },
  { db: 'L_City', alias: 'city' },
  { db: 'L_State', alias: 'state' },
  { db: 'L_Zip', alias: 'zipCode' },
  { db: 'L_SystemPrice', alias: 'listPrice' },
  { db: 'L_Keyword2', alias: 'beds' },
  { db: 'LM_Dec_3', alias: 'baths' },
  { db: 'LM_Int2_3', alias: 'sqft' },
  { db: 'YearBuilt', alias: 'yearBuilt' },
  { db: 'L_Remarks', alias: 'description' },
  { db: 'L_Photos', alias: 'photos' },
  { db: 'LMD_MP_Latitude', alias: 'latitude' },
  { db: 'LMD_MP_Longitude', alias: 'longitude' },
  { db: 'L_Type_', alias: 'propertyType' },
  { db: 'L_Status', alias: 'status' },
  { db: 'Flooring', alias: 'flooring' }
];

/**
 * Build the SELECT clause from PROPERTY_DETAIL_COLUMNS.
 */
function buildDetailSelect() {
  return PROPERTY_DETAIL_COLUMNS
    .map((col) => `${col.db} AS ${col.alias}`)
    .join(',\n        ');
}

/**
 * Capitalize a string to Title Case (first letter uppercase, rest lowercase).
 * Handles multi-word strings like "New York" -> "New York".
 */
function toTitleCase(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

/**
 * Validate query parameters and return parsed values or an error message.
 */
function validateQueryParams(query) {
  const errors = [];
  const filters = {};

  // -- Pagination --
  if (query.limit !== undefined) {
    const limit = Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      errors.push('limit must be an integer between 1 and 100');
    } else {
      filters.limit = limit;
    }
  } else {
    filters.limit = 20;
  }

  if (query.offset !== undefined) {
    const offset = Number(query.offset);
    if (!Number.isInteger(offset) || offset < 0) {
      errors.push('offset must be a non-negative integer');
    } else {
      filters.offset = offset;
    }
  } else {
    filters.offset = 0;
  }

  // -- Filters --
  if (query.city !== undefined) {
    const city = query.city.trim();
    if (city === '' || !/^[A-Za-z\s]+$/.test(city)) {
      errors.push('city must contain only letters and spaces');
    } else {
      filters.city = toTitleCase(city);
    }
  }

  if (query.state !== undefined) {
    const state = query.state.trim();
    if (state === '' || !/^[A-Za-z\s]+$/.test(state)) {
      errors.push('state must contain only letters and spaces');
    } else {
      filters.state = toTitleCase(state);
    }
  }

  if (query.zipcode !== undefined) {
    const zip = query.zipcode.trim();
    if (!/^\d{5}$/.test(zip)) {
      errors.push('zipcode must be exactly 5 digits');
    } else {
      filters.zipcode = zip;
    }
  }

  if (query.minPrice !== undefined) {
    const minPrice = Number(query.minPrice);
    if (!Number.isInteger(minPrice) || minPrice < 0) {
      errors.push('minPrice must be a non-negative integer');
    } else {
      filters.minPrice = minPrice;
    }
  }

  if (query.maxPrice !== undefined) {
    const maxPrice = Number(query.maxPrice);
    if (!Number.isInteger(maxPrice) || maxPrice < 0) {
      errors.push('maxPrice must be a non-negative integer');
    } else {
      filters.maxPrice = maxPrice;
    }
  }

  // minPrice must be <= maxPrice if both provided
  if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
    if (filters.minPrice > filters.maxPrice) {
      errors.push('minPrice must be less than or equal to maxPrice');
    }
  }

  if (query.beds !== undefined) {
    const beds = Number(query.beds);
    if (!Number.isInteger(beds) || beds < 0) {
      errors.push('beds must be a non-negative integer');
    } else {
      filters.beds = beds;
    }
  }

  if (query.baths !== undefined) {
    const baths = Number(query.baths);
    if (isNaN(baths) || baths < 0) {
      errors.push('baths must be a non-negative number');
    } else {
      filters.baths = baths;
    }
  }

  return { errors, filters };
}

/**
 * Build the WHERE clause and params array for the properties query.
 * Always includes data quality filters, then appends user-provided filters.
 */
function buildWhereClause(filters) {
  const conditions = [
    // Data quality filters (SUPPORT_TASKS.md)
    "L_City IS NOT NULL AND L_City != ''",
    "L_State IS NOT NULL AND L_State != ''",
    "L_Zip IS NOT NULL AND L_Zip != '' AND L_Zip REGEXP '^[0-9]{5}$'",
    "L_SystemPrice IS NOT NULL AND L_SystemPrice >= 0",
    "L_Keyword2 IS NOT NULL AND L_Keyword2 >= 0",
    "LM_Dec_3 IS NOT NULL AND LM_Dec_3 >= 0",
    "L_City REGEXP '^[A-Za-z ]+$'",
    "L_State REGEXP '^[A-Za-z ]+$'",
  ];
  const params = [];

  if (filters.city) {
    conditions.push('LOWER(L_City) = LOWER(?)');
    params.push(filters.city);
  }

  if (filters.state) {
    conditions.push('LOWER(L_State) = LOWER(?)');
    params.push(filters.state);
  }

  if (filters.zipcode) {
    conditions.push('L_Zip = ?');
    params.push(filters.zipcode);
  }

  if (filters.minPrice !== undefined) {
    conditions.push('L_SystemPrice >= ?');
    params.push(filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    conditions.push('L_SystemPrice <= ?');
    params.push(filters.maxPrice);
  }

  if (filters.beds !== undefined) {
    conditions.push('L_Keyword2 = ?');
    params.push(filters.beds);
  }

  if (filters.baths !== undefined) {
    conditions.push('LM_Dec_3 = ?');
    params.push(filters.baths);
  }

  return {
    whereSQL: conditions.join(' AND '),
    params,
  };
}

// GET /api/properties — search properties with filters and pagination
router.get('/', async (req, res) => {
  // Validate query parameters
  const { errors, filters } = validateQueryParams(req.query);
  if (errors.length > 0) {
    return res.status(400).json({ status: 'error', errors });
  }

  try {
    const { whereSQL, params } = buildWhereClause(filters);

    // Count total matching results
    const countSQL = `SELECT COUNT(*) AS total FROM rets_property WHERE ${whereSQL}`;
    const [countRows] = await pool.query(countSQL, params);
    const total = countRows[0].total;

    // Fetch paginated results with hasOpenHouse flag
    // An active open house: L_DisplayId matches, OH_StartDate <= OH_EndDate, OH_EndDate >= today
    const dataSQL = `
      SELECT
        p.L_ListingID   AS listingId,
        p.L_DisplayId   AS propertyId,
        p.L_SystemPrice AS listPrice,
        p.L_Address     AS address,
        p.L_City        AS city,
        p.L_State       AS state,
        p.L_Zip         AS zipCode,
        p.L_Keyword2    AS beds,
        p.LM_Dec_3      AS baths,
        p.LM_Int2_3     AS sqft,
        p.L_Photos      AS photos,
        CASE WHEN oh_active.cnt > 0 THEN TRUE ELSE FALSE END AS hasOpenHouse
      FROM rets_property p
      LEFT JOIN (
        SELECT L_DisplayId, COUNT(*) AS cnt
        FROM rets_openhouse
        WHERE OH_StartDate <= OH_EndDate
          AND OH_EndDate >= CURDATE()
          AND OH_StartDate <= CURDATE()
        GROUP BY L_DisplayId
      ) oh_active ON p.L_DisplayId = oh_active.L_DisplayId
      WHERE ${whereSQL.replace(/(?<!p\.)L_/g, 'p.L_').replace(/(?<!p\.)LM_/g, 'p.LM_')}
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, filters.limit, filters.offset];
    const [rows] = await pool.query(dataSQL, dataParams);

    // Convert hasOpenHouse from 0/1 to boolean
    const results = rows.map((row) => ({
      ...row,
      hasOpenHouse: Boolean(row.hasOpenHouse),
    }));

    res.json({
      total,
      limit: filters.limit,
      offset: filters.offset,
      results,
    });
  } catch (err) {
    console.error('Properties query failed:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch properties',
    });
  }
});

/**
 * Validate a listing ID parameter.
 * Must be non-empty, numeric only, and at most 20 characters.
 */
function isValidListingId(id) {
  return typeof id === 'string' && id.length > 0 && id.length <= 20 && /^[0-9]+$/.test(id);
}

/**
 * Keys to extract from the open house `all_data` JSON blob.
 * Add or remove entries here to control which fields are returned.
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

// GET /api/properties/:id/openhouses — open house events for a property
// Registered BEFORE /:id so Express doesn't capture "openhouses" as an :id
router.get('/:id/openhouses', async (req, res) => {
  const { id } = req.params;

  if (!isValidListingId(id)) {
    return res.status(400).json({
      status: 'error',
      message: 'Listing ID must be numeric and at most 20 characters',
    });
  }

  try {
    // Validation rules from SUPPORT_TASKS.md:
    // - Must exist in both rets_openhouse and rets_property (JOIN)
    // - L_ListingID (openhouse) matches L_DisplayId (property)
    // - OH_StartDate <= OH_EndDate
    const sql = `
      SELECT
        oh.L_ListingID,
        oh.L_DisplayId,
        oh.OpenHouseDate,
        oh.OH_StartDate,
        oh.OH_EndDate,
        oh.OH_StartTime   AS startTime,
        oh.OH_EndTime     AS endTime,
        oh.all_data
      FROM rets_openhouse oh
      INNER JOIN rets_property p ON oh.L_DisplayId = p.L_DisplayId
      WHERE oh.L_DisplayId = ?
        AND oh.OH_StartDate <= oh.OH_EndDate
      ORDER BY oh.OpenHouseDate ASC, oh.OH_StartTime ASC
    `;
    const [rows] = await pool.query(sql, [id]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const openHouses = rows.map((row) => {
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
        date,
        startDate: row.OH_StartDate,
        endDate: row.OH_EndDate,
        startTime: row.startTime,
        endTime: row.endTime,
        status,
        ...details,
      };
    });

    res.json({ listingId: id, openHouses });
  } catch (err) {
    console.error('Open houses query failed:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch open houses',
    });
  }
});

// GET /api/properties/:id — single property detail (columns driven by PROPERTY_DETAIL_COLUMNS)
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!isValidListingId(id)) {
    return res.status(400).json({
      status: 'error',
      message: 'Listing ID must be numeric and at most 20 characters',
    });
  }

  try {
    const selectClause = buildDetailSelect();
    const sql = `
      SELECT
        ${selectClause}
      FROM rets_property
      WHERE L_DisplayId = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found',
      });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Property detail query failed:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch property',
    });
  }
});

module.exports = router;

