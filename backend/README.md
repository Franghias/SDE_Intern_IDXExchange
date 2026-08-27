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
│   ├── utils/
│   │   └── logger.js          # Zero-dependency logger: redactUrl (mask secrets) & sanitizeError
│   ├── middleware/
│   │   └── requestLogger.js   # Logs requests with URL parameter redaction: [timestamp] METHOD /url STATUS durationMs & sets X-Response-Time
│   └── routes/
│       ├── health.js          # GET /api/health — database connectivity check (sanitized error response)
│       ├── properties.js      # GET /api/properties (search, sort, hasOpenHouse via EXISTS),
│       │                      # POST /api/properties/favorites (IDs list search),
│       │                      # GET /api/properties/:id (configurable columns including listing agent fields),
│       │                      # GET /api/properties/:id/openhouses (status + validation)
│       ├── openhouses.js      # GET /api/openhouses (date range, exact city/state filters, sort, INNER JOIN, pagination)
│       └── chat.js            # POST /api/chat — OpenRouter LLM proxy endpoint with security prompt & sanitized error logs
├── tests/
│   ├── health.test.js         # 5 tests — health endpoint with sanitized 500 responses
│   ├── properties.test.js     # 33 tests — listing search, filters, sorting, favorites, validation
│   ├── propertyDetail.test.js # 24 tests — property detail (column expansion, RESO formatting, date formatting), open houses, request logging
│   ├── openhouses.test.js     # 24 tests — open house calendar endpoint, date/property filtering, sorting, validation
│   ├── requestLogger.test.js  # 12 tests — request logging, URL query redaction, high-res timing, X-Response-Time
│   └── query_performance.js  # Performance benchmark & EXPLAIN interpretation suite
├── OPTIMIZATION_REPORT.md     # Detailed query performance and benchmark report
├── .env                       # Environment variables (gitignored)
├── .env.example               # Template for .env
└── package.json
```

## How It Works

### Request flow

```
Client request
  → requestLogger (timestamps + high-res duration + X-Response-Time header)
  → cors middleware
  → express.json() (body parser)
  → Route handler (health / properties / openhouses / chat)
  → MySQL query via connection pool (or OpenRouter API for /api/chat)
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
3. `requestLogger` — logs method, URL, status, duration for every request, and sets `X-Response-Time` header
4. `/api/health` → `health.js` route
5. `/api/properties` → `properties.js` route
6. `/api/openhouses` → `openhouses.js` route
7. `/api/chat` → `chat.js` route

### `db.js` — Connection pool

Creates a `mysql2/promise` connection pool with 10 connections. All route handlers share this pool — connections are reused across requests rather than created/destroyed per query.

Reads connection details dynamically: prioritizes connection URLs (`MYSQL_URL`, `MYSQL_PUBLIC_URL`, `DATABASE_URL`), then Railway standard variables (`MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT`), falling back to local variables (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`).

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Returns `{ status: "ok" }` if database is reachable, 500 if not |
| GET | `/api/properties` | Search properties with pagination, filters, multi-column sort, and `hasOpenHouse` flag |
| POST | `/api/properties/favorites` | Query favorite properties by display ID array with filters, sort, and pagination |
| GET | `/api/properties/:id` | Single property detail by `L_DisplayId` (driven by `PROPERTY_DETAIL_COLUMNS`, string formatting via `formatValueString`, and date formatting) |
| GET | `/api/properties/:id/openhouses` | Open house events with status (`active`, `expired`, `upcoming`) |
| GET | `/api/openhouses` | All open houses with optional `startDate`/`endDate` date range filtering, property filters (`city`, `state`, `zipcode`, `minPrice`, `maxPrice`, `beds`, `baths`), multi-column sorting (`sortBy`/`sortOrder`), INNER JOIN with `rets_property`, pagination up to 500 |
| POST | `/api/chat` | Conversational AI filter assistant endpoint proxying to OpenRouter (`cohere/north-mini-code:free`) with safety guardrails |

### `GET /api/properties` — Listing search & sorting

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
| `sortBy` | string | — | comma-separated whitelist: `price`, `date`, `sqft`, `beds`, `baths` |
| `sortOrder` | string | — | comma-separated: `asc` or `desc` |

### `POST /api/properties/favorites` — Favorites query

**Request Body:**
```json
{
  "ids": ["100002222", "100003333"]
}
```
Queries properties where `p.L_DisplayId IN (...)` combining all search filters, multi-column sorting, and pagination options.

### `GET /api/properties/:id` — Configurable Property Detail

Returns the property object or 404. Looks up by `L_DisplayId`.

The SELECT clause is built dynamically from the `PROPERTY_DETAIL_COLUMNS` array at the top of `src/routes/properties.js` including `StandardStatus` and listing agent contact fields (`ListAgentFullName`, `ListAgentOfficePhone`, `ListAgentEmail`, `ListAgentDirectPhone`, `ListOfficeEmail`). Concatenated RESO strings are formatted via `formatValueString()` while raw fields and emails/phones are preserved in `RAW_STRING_FIELDS`. `onMarketDate` is formatted to long date format (e.g., `"August 25, 2026"`).

### `GET /api/openhouses` — Open House Calendar & Search

**Query parameters:**

| Param | Type | Default | Validation |
|-------|------|---------|------------|
| `limit` | int | 20 | 1–500 |
| `offset` | int | 0 | ≥ 0 |
| `startDate` | string | — | YYYY-MM-DD format |
| `endDate` | string | — | YYYY-MM-DD format, ≥ startDate |
| `city` | string | — | letters and spaces only |
| `state` | string | — | letters and spaces only |
| `zipcode` | string | — | exactly 5 digits |
| `minPrice` | int | — | ≥ 0 |
| `maxPrice` | int | — | ≥ 0 |
| `beds` | int | — | ≥ 0 |
| `baths` | number | — | ≥ 0 |
| `sortBy` | string | — | comma-separated whitelist: `price`, `date`, `sqft`, `beds`, `baths` |
| `sortOrder` | string | — | comma-separated: `asc` or `desc` |

Uses `INNER JOIN rets_property p ON oh.L_DisplayId = p.L_DisplayId` to ensure results exist in both tables. Enforces `OH_StartDate <= OH_EndDate`. Returns open house data with property context (address, city, state, price, beds, baths, sqft, photos) and computed status (`active`, `expired`, `upcoming`).

## Setup & Tests

```bash
# Install dependencies
npm install

# Start dev server (auto-restarts on file changes)
npm run dev

# Run unit and integration tests (Jest + Supertest — 95 tests across 5 suites)
npm test

# Run query performance & EXPLAIN benchmark suite
npm run perf
```


