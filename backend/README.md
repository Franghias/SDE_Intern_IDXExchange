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
│       └── properties.js      # GET /api/properties, GET /api/properties/:id, GET /api/properties/:id/openhouses
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
| GET | `/api/properties` | Search properties with pagination and filters |
| GET | `/api/properties/:id` | Single property detail by `L_DisplayId` |
| GET | `/api/properties/:id/openhouses` | Open house events for a property |

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
      "photos": "[\"https://example.com/photo1.jpg\", ...]"
    }
  ]
}
```

Note: `photos` is a raw JSON string from the `L_Photos` database column. The frontend parses it with `JSON.parse()`.

**Data quality filters** are always applied: rows with NULL/blank city, state, zip, price, beds, or baths are excluded. Rows with invalid zips, negative values, or non-alphabetic city/state are also excluded.

### `GET /api/properties/:id` — Property detail

Returns the full property object or 404. Looks up by `L_DisplayId`.

### `GET /api/properties/:id/openhouses` — Open houses

Returns an array of open house events ordered by date and start time. Returns an empty array (not 404) if no events exist.

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
