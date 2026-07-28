# IDXExchange — Backend API

Node.js + Express REST API serving property listing data from a MySQL database.

## File Structure

```
backend/
├── src/
│   ├── server.js              # Entry point — starts Express on PORT (default 5000)
│   ├── app.js                 # Express app — wires middleware and routes
│   ├── config/
│   │   └── db.js              # MySQL connection pool (mysql2/promise, 10 connections)
│   ├── middleware/
│   │   └── requestLogger.js   # Logs every request: [timestamp] METHOD /url STATUS durationMs
│   └── routes/
│       ├── health.js          # GET /api/health — database connectivity check
│       └── properties.js      # GET /api/properties (search + hasOpenHouse),
│                              # GET /api/properties/:id (configurable columns),
│                              # GET /api/properties/:id/openhouses (status + validation)
├── tests/
│   ├── health.test.js         # 5 tests — health endpoint
│   ├── properties.test.js     # 17 tests — listing search, filters, pagination, validation
│   └── propertyDetail.test.js # 16 tests — property detail, open houses, request logging
├── .env                       # Environment variables (gitignored)
├── .env.example               # Template for .env
└── package.json
```

## How It Works

### Request flow

```
Client request
  → requestLogger (timestamps + captures response time)
  → cors middleware
  → express.json() (body parser)
  → Route handler (health / properties)
  → MySQL query via connection pool
  → JSON response
```

### Startup

1. `server.js` loads `.env` via `dotenv`
2. Imports `app.js` (the configured Express app)
3. Calls `app.listen(PORT)` to start the server

### `app.js` — Middleware and routing

`app.js` exists separately from `server.js` so that tests can import the Express app without starting a real HTTP server. It wires:

1. `cors()` — allows cross-origin requests
2. `express.json()` — parses JSON request bodies
3. `requestLogger` — logs method, URL, status, and duration for every request
4. `/api/health` → `health.js` route
5. `/api/properties` → `properties.js` route

### `db.js` — Connection pool

Creates a `mysql2/promise` connection pool with 10 connections. All route handlers share this pool — connections are reused across requests rather than created/destroyed per query.

Reads connection details from environment variables: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Returns `{ status: "ok" }` if database is reachable, 500 if not |
| GET | `/api/properties` | Search properties with pagination, filters, and `hasOpenHouse` flag |
| GET | `/api/properties/:id` | Single property detail by `L_DisplayId` (driven by `PROPERTY_DETAIL_COLUMNS`) |
| GET | `/api/properties/:id/openhouses` | Open house events with status (`active`, `expired`, `upcoming`) |

### `GET /api/properties` — Listing search

**Query parameters:**

| Param | Type | Default | Validation |
|-------|------|---------|------------|
| `limit` | int | 20 | 1–100 |
| `offset` | int | 0 | ≥ 0 |
| `city` | string | — | letters and spaces only |
| `state` | string | — | letters and spaces only |
| `zipcode` | string | — | exactly 5 digits |
| `minPrice` | int | — | ≥ 0 |
| `maxPrice` | int | — | ≥ 0 |
| `beds` | int | — | ≥ 0 |
| `baths` | number | — | ≥ 0 |

**Response:**
```json
{
  "total": 487,
  "limit": 20,
  "offset": 0,
  "results": [
    {
      "listingId": 100002222,
      "propertyId": 100002222,
      "listPrice": 459900,
      "address": "123 Main St",
      "city": "Portland",
      "state": "OR",
      "zipCode": "97201",
      "beds": 3,
      "baths": 2,
      "sqft": 1500,
      "photos": "[\"https://example.com/photo1.jpg\", ...]",
      "hasOpenHouse": true
    }
  ]
}
```

- `photos` is a raw JSON string from the `L_Photos` database column.
- `hasOpenHouse` is a boolean flag determined via a LEFT JOIN subquery against active open house events (`OH_StartDate <= OH_EndDate AND OH_EndDate >= CURDATE() AND OH_StartDate <= CURDATE()`).

**Data quality filters** are always applied: rows with NULL/blank city, state, zip, price, beds, or baths are excluded. Rows with invalid zips, negative values, or non-alphabetic city/state are also excluded.

### `GET /api/properties/:id` — Configurable Property Detail

Returns the property object or 404. Looks up by `L_DisplayId`.

The SELECT clause is built dynamically from the `PROPERTY_DETAIL_COLUMNS` array at the top of `src/routes/properties.js`:

```javascript
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
  { db: 'L_Status', alias: 'status' }
];
```

To add or remove database columns returned by this endpoint, simply edit `PROPERTY_DETAIL_COLUMNS`.

### `GET /api/properties/:id/openhouses` — Open House Events

Returns open house events for a property with strict validation rules:
- Inner joined with `rets_property` on `L_DisplayId` to verify existence in both tables.
- Filters out invalid date records (`OH_StartDate <= OH_EndDate`).
- Computes a server-side `status` field:
  - `"active"`: `OH_StartDate <= today <= OH_EndDate`
  - `"expired"`: `OH_EndDate < today`
  - `"upcoming"`: `OH_StartDate > today`

**Response Example:**
```json
{
  "listingId": "100002222",
  "openHouses": [
    {
      "listingId": "100002222",
      "date": "2026-06-15T00:00:00.000Z",
      "startDate": "2026-06-15T00:00:00.000Z",
      "endDate": "2026-06-15T00:00:00.000Z",
      "startTime": "0 days 14:00:00",
      "endTime": "0 days 17:00:00",
      "status": "expired",
      "OpenHouseRemarks": "Refreshments served."
    }
  ]
}
```

## Setup

```bash
# Install dependencies
npm install

# Create .env from template
cp .env.example .env
# Edit .env with your database credentials

# Start dev server (auto-restarts on file changes)
npm run dev

# Run tests
npm test
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | MySQL host | — |
| `DB_USER` | MySQL user | — |
| `DB_PASSWORD` | MySQL password | — |
| `DB_NAME` | MySQL database name | — |
| `DB_PORT` | MySQL port | 3306 |
| `PORT` | Express server port | 5000 |
