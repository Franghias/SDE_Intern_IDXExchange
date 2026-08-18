# IDXExchange — Complete File-by-File Guide

This document explains **every file** in the IDXExchange project, what it does, and how it connects to other files. Use this as your reference to understand the entire codebase.

---

## Table of Contents

1. [Root Files](#1-root-files)
2. [Docker & Database](#2-docker--database)
3. [Backend — Entry & Configuration](#3-backend--entry--configuration)
4. [Backend — Middleware](#4-backend--middleware)
5. [Backend — Route Handlers (API Endpoints)](#5-backend--route-handlers-api-endpoints)
6. [Backend — Test Files](#6-backend--test-files)
7. [Frontend — Entry & App Shell](#7-frontend--entry--app-shell)
8. [Frontend — API Layer](#8-frontend--api-layer)
9. [Frontend — Hooks](#9-frontend--hooks)
10. [Frontend — Utilities](#10-frontend--utilities)
11. [Frontend — Components](#11-frontend--components)
12. [Frontend — Pages](#12-frontend--pages)
13. [Frontend — Stylesheets](#13-frontend--stylesheets)
14. [Frontend — Test Files](#14-frontend--test-files)
15. [Documentation Files](#15-documentation-files)

---

## 1. Root Files

### `.env` / `.env.example`
**What they do:** Store environment variables for the entire project. `.env` contains the actual secrets (database passwords, API keys) and `.env.example` is a template showing which variables are needed without real values.

**Variables used:** `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_PORT` (for Docker), `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` (for the backend), `LLM_API_KEY`, `LLM_MODEL` (for the AI chatbot).

**How it connects:** Docker Compose reads from `.env` for MySQL container config. The backend's `server.js` loads `.env` via `dotenv` so all route files can access `process.env.*` values.

---

### `.gitignore`
**What it does:** Tells Git which files to exclude from version control — `node_modules/`, `.env`, build outputs, OS files, etc.

---

### `README.md`
**What it does:** The project's main documentation. Contains the architecture overview, project structure tree, setup instructions, test counts, and tech stack summary.

---

### `FLOW.md`
**What it does:** Root-level copy of the application data flow document. Describes navigation flow, page specifications, user flows, and the data/API communication architecture between frontend → backend → database.

---

## 2. Docker & Database

### `docker-compose.yml`
**What it does:** Defines a single Docker service — a **MySQL 8** container named `idx-mysql-local`.

**How it works in detail:**
- Maps port `3306` (configurable via `MYSQL_PORT` env var) from the container to your machine.
- Sets `MYSQL_ROOT_PASSWORD` and `MYSQL_DATABASE` from `.env`.
- Runs MySQL with `--sql-mode=NO_AUTO_VALUE_ON_ZERO` so that zero-valued IDs in the data are preserved.
- Mounts `./database/` into `/docker-entrypoint-initdb.d/` — MySQL automatically runs any `.sql` files in that directory **in alphabetical order** on first container startup.
- Uses a named volume `mysql_data` so your data persists even if you delete and recreate the container.
- Has a health check that pings MySQL every 10 seconds.

**How to use it:**
```bash
docker compose up     # Start MySQL
docker compose down   # Stop MySQL
```

---

### `database/01_rets_openhouse.sql`
**What it does:** Creates the `rets_openhouse` table and inserts all open house event data. This runs first on initial Docker startup (alphabetical order: `01_`).

**Table structure:** Contains columns like `L_ListingID`, `L_DisplayId`, `OpenHouseDate`, `OH_StartDate`, `OH_EndDate`, `OH_StartTime`, `OH_EndTime`, and `all_data` (a JSON blob with extra details like `OpenHouseRemarks`, `OpenHouseType`, etc.).

---

### `database/02_rets_property.sql`
**What it does:** Creates the `rets_property` table and inserts all property listing data (~632 MB). Runs second on initial Docker startup.

**Table structure:** Contains columns like `L_ListingID`, `L_DisplayId`, `L_Address`, `L_City`, `L_State`, `L_Zip`, `L_SystemPrice`, `L_Keyword2` (beds), `LM_Dec_3` (baths), `LM_Int2_3` (sqft), `L_Photos` (JSON array of image URLs), `StandardStatus`, `OnMarketDate`, `LMD_MP_Latitude`, `LMD_MP_Longitude`, `L_Remarks`, etc.

---

### `database/03_add_indexes.sql`
**What it does:** Drops any previously created indexes and creates optimized B-Tree indexes for fast query performance.

**Indexes created:**
| Index Name | Table | Columns | Purpose |
|---|---|---|---|
| `idx_displayId` | `rets_property` | `L_DisplayId` | Fast single property lookup (`/api/properties/:id`) |
| `idx_city` | `rets_property` | `L_City` | City filter queries |
| `idx_zip` | `rets_property` | `L_Zip` | Zipcode filter queries |
| `idx_price` | `rets_property` | `L_SystemPrice` | Price range filter queries |
| `idx_state_city_price` | `rets_property` | `L_State, L_City, L_SystemPrice` | Combined state+city+price queries |
| `idx_state_city_beds_baths_price` | `rets_property` | `L_State, L_City, L_Keyword2, LM_Dec_3, L_SystemPrice` | Full filter combination |
| `idx_city_price` | `rets_property` | `L_City, L_SystemPrice` | City filter with price sorting |
| `idx_date_startTime_displayId` | `rets_openhouse` | `OpenHouseDate, OH_StartTime, L_DisplayId` | Open house date range filtering and sorting |

**How to run manually:**
```bash
docker exec -i idx-mysql-local mysql -uroot -prootpassword rets < database/03_add_indexes.sql
```

---

## 3. Backend — Entry & Configuration

### `backend/src/server.js`
**What it does:** The application entry point. Loads environment variables from `.env` using `dotenv`, imports the Express app from `app.js`, and starts listening on port `5000` (or whatever `PORT` is set to in `.env`).

**How it works:**
1. `require('dotenv').config()` — reads `.env` file and injects variables into `process.env`.
2. `require('./app')` — imports the fully configured Express application.
3. `app.listen(PORT)` — starts the HTTP server.

**Run with:** `npm run dev` (uses `nodemon` for auto-restart on file changes).

---

### `backend/src/app.js`
**What it does:** Creates and configures the Express application. This is the central file that wires together all middleware and route handlers.

**How it works step by step:**
1. Creates an Express instance: `const app = express()`.
2. Registers middleware in this order:
   - `cors()` — allows cross-origin requests (so the frontend on port 3000 can talk to the backend on port 5000).
   - `express.json()` — parses incoming JSON request bodies.
   - `requestLogger` — logs every request with method, URL, status code, and duration.
3. Registers route handlers:
   - `/api/health` → `healthRouter`
   - `/api/properties` → `propertiesRouter`
   - `/api/openhouses` → `openhousesRouter`
   - `/api/chat` → `chatRouter`
4. Exports the app (used by both `server.js` for production and test files for testing with `supertest`).

---

### `backend/src/config/db.js`
**What it does:** Creates and exports the MySQL database connection pool using `mysql2/promise`.

**How it works:**
- Reads connection settings dynamically: prioritizes connection URLs (`MYSQL_URL`, `MYSQL_PUBLIC_URL`, `DATABASE_URL`), then Railway standard variables (`MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT`), falling back to local variables (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`).
- Sets `connectionLimit: 10` — allows up to 10 simultaneous database connections.
- Sets `waitForConnections: true` — queries will wait in line if all 10 connections are busy, rather than failing immediately.
- Used by all route files (`health.js`, `properties.js`, `openhouses.js`) to run database queries via `pool.query()`.

---

### `backend/src/utils/logger.js`
**What it does:** Zero-dependency logging utility with built-in URL parameter redaction and HTTP error sanitization.

**How it works:**
- `info(msg)`, `warn(msg)`, `error(msg, err)` — ISO-timestamped log output functions.
- `redactUrl(url)` — automatically masks sensitive query parameters (token, key, secret, password, auth, email, ssn, etc.) as `[REDACTED]` before writing to stdout.
- `sanitizeError(err)` — strips stack traces and database internal details before returning safe error messages to callers.

---

### `backend/package.json`
**What it does:** Defines the backend Node.js project metadata, dependencies, and scripts.

**Key scripts:**
- `npm run dev` — starts the server with `nodemon` (auto-restarts on file changes).
- `npm test` — runs all Jest test suites.
- `npm start` — starts the server with plain `node` (for production).

**Key dependencies:**
- `express` — web framework.
- `mysql2` — MySQL database driver with promise support.
- `cors` — cross-origin resource sharing middleware.
- `dotenv` — loads `.env` file into `process.env`.

**Key dev dependencies:**
- `jest` — test runner.
- `supertest` — HTTP assertion library for testing Express apps without starting a server.
- `nodemon` — auto-restart dev server.

---

## 4. Backend — Middleware

### `backend/src/middleware/requestLogger.js`
**What it does:** An Express middleware function that logs every HTTP request and attaches an `X-Response-Time` header to responses.

**How it works step by step:**
1. When a request arrives, it records the start time using `process.hrtime.bigint()` (nanosecond precision).
2. It monkey-patches `res.writeHead` — right before the response headers are sent to the client, it calculates the elapsed time and sets the `X-Response-Time` header (e.g., `X-Response-Time: 14ms`).
3. It listens for the response `finish` event (normal completion) and `close` event (client disconnected early).
4. When either event fires, it calculates the final duration in milliseconds and prints a log line:
   ```
   [2026-08-09T16:37:19.957Z] GET /api/properties/1155162318 200 8ms
   ```
5. A `logged` boolean guard prevents double-logging when both `finish` and `close` fire on the same response.

**Why `process.hrtime.bigint()` instead of `Date.now()`:** `Date.now()` only has millisecond precision and can drift if the system clock is adjusted. `process.hrtime.bigint()` uses the OS monotonic clock with nanosecond precision, giving accurate sub-millisecond timing that is immune to clock adjustments.

---

## 5. Backend — Route Handlers (API Endpoints)

### `backend/src/routes/health.js`
**What it does:** Provides a `GET /api/health` endpoint for checking if the database is reachable.

**How it works:**
1. Runs `SELECT 1` against the database pool.
2. If the query succeeds → returns `{ status: "ok", database: "database is reachable" }` with status 200.
3. If the query fails (e.g., MySQL container is down) → returns `{ status: "error", message: "ECONNREFUSED" }` with status 500.

---

### `backend/src/routes/properties.js`
**What it does:** The largest backend route file. Handles three endpoints:

#### `GET /api/properties` (Search & Filter)
- Accepts query parameters: `limit`, `offset`, `city`, `state`, `zipcode`, `minPrice`, `maxPrice`, `beds`, `baths`, `sortBy`, `sortOrder`.
- **`validateQueryParams()`** validates every parameter and returns either parsed filter values or an array of error messages.
- **`buildWhereClause()`** constructs a SQL `WHERE` clause from the validated filters. When no city/state/zipcode is provided, it adds data quality filters (e.g., `L_City IS NOT NULL AND L_City != '' AND L_City REGEXP '^[A-Za-z ]+$'`) to exclude bad data rows.
- The main query uses an `EXISTS` subquery against `rets_openhouse` to add a `hasOpenHouse` boolean flag to each property (checking if there's a current open house event).
- Returns: `{ total, limit, offset, results: [...] }`.

#### `POST /api/properties/favorites` (Fetch by IDs)
- Registered **before** `/:id/openhouses` so Express doesn't match "favorites" as an `:id` parameter.
- Accepts `{ ids: ["123", "456", ...] }` in the request body, plus the same query parameters as the search endpoint.
- Validates each ID (must be numeric, max 20 chars).
- Builds an `IN (?, ?, ?)` clause and combines it with the same filter/sort/pagination logic.
- Returns the same shape as the search endpoint.

#### `GET /api/properties/:id/openhouses` (Open Houses for One Property)
- Joins `rets_openhouse` with `rets_property` on `L_DisplayId`.
- Filters for valid date ranges (`OH_StartDate <= OH_EndDate`).
- For each open house, computes a `status` field: `"active"`, `"upcoming"`, or `"expired"` based on today's date.
- Uses **`extractAllData()`** to parse the `all_data` JSON blob and extract specific fields (like `OpenHouseRemarks`, `OpenHouseType`, `AppointmentRequiredYN`, etc.).
- Returns: `{ listingId, openHouses: [...] }`.

#### `GET /api/properties/:id` (Single Property Detail)
- Uses `PROPERTY_DETAIL_COLUMNS` — a configurable array that maps database column names to API field names (e.g., `{ db: 'L_SystemPrice', alias: 'listPrice' }`).
- `buildDetailSelect()` generates the SQL `SELECT` clause from this array.
- Returns a single property object or 404 if not found.

**Key helper functions:**
- **`toTitleCase(str)`** — normalizes city/state names ("portland" → "Portland") so they match the database values.
- **`isValidListingId(id)`** — checks that an ID is non-empty, numeric, and ≤ 20 characters.
- **`SORT_WHITELIST`** — maps API sort names to SQL columns (e.g., `price` → `L_SystemPrice`). Any sort field not in this whitelist is rejected, preventing SQL injection through `ORDER BY`.

---

### `backend/src/routes/openhouses.js`
**What it does:** Provides a `GET /api/openhouses` endpoint for listing all open house events with date range, property filters, and sorting.

**How it works:**
1. Validates all query parameters: `limit` (1–500), `offset`, `startDate`, `endDate` (YYYY-MM-DD format), `city`, `state`, `zipcode`, `minPrice`, `maxPrice`, `beds`, `baths`, `sortBy`, `sortOrder`.
2. Validates that `startDate ≤ endDate`.
3. Uses `isValidDate()` — checks both the format (`YYYY-MM-DD` regex) and that the date is a real calendar date (e.g., rejects `2024-02-30`).
4. Builds SQL with `INNER JOIN` between `rets_openhouse` and `rets_property` — ensures every result has matching data in both tables.
5. Base condition: `OH_StartDate <= OH_EndDate` (excludes corrupt data).
6. Default sort: `OpenHouseDate ASC, OH_StartTime ASC`.
7. For each result, computes `status` (active/upcoming/expired) and extracts details from `all_data` JSON.
8. Returns: `{ total, limit, offset, results: [...] }` with property context fields (address, city, price, beds, baths, sqft, photos).

---

### `backend/src/routes/chat.js`
**What it does:** Provides a `POST /api/chat` endpoint that acts as a proxy between the frontend and an LLM (Large Language Model) hosted on OpenRouter.

**How it works step by step:**
1. Receives `{ messages, currentFilters, pageContext }` from the frontend.
2. **`buildSystemPrompt()`** constructs a detailed system prompt that tells the LLM:
   - It is a real estate filter assistant (nothing else — safety rules block prompt injection, code execution requests, etc.).
   - It must respond ONLY with a JSON object: `{ "message": "...", "filters": { ... } }`.
   - Which filter fields are available (differs for `openhouses` vs. regular pages — the openhouses page adds `startDate`/`endDate`).
   - The user's current filter values (so the LLM knows what's already set).
3. Sends the system prompt + conversation history to OpenRouter at `https://openrouter.ai/api/v1/chat/completions`.
4. Parses the LLM response: strips markdown code fences if present, then `JSON.parse()`. If the LLM returned non-JSON text, wraps it as `{ message: rawText, filters: {} }`.
5. Returns `{ message, filters }` to the frontend.

**Important safety design:** The system prompt contains strict rules preventing the LLM from being jailbroken, revealing system prompts, executing code, or returning anything unrelated to property search.

---

## 6. Backend — Test Files

All backend tests use **Jest** + **supertest**. They import `app.js` directly (not `server.js`), so they test HTTP endpoints without starting a real server.

### `backend/tests/health.test.js`
**Tests 5 scenarios for `GET /api/health`:**
- Returns 200 with `status: "ok"` when MySQL is running.
- Response has JSON content-type.
- Returns 500 with `status: "error"` when database is unreachable (ECONNREFUSED).
- 500 response includes an error message (does not crash).
- Returns 404 for undefined routes (e.g., `GET /api/nonexistent`).

**How mocking works:** Uses `jest.mock('../src/config/db')` to replace the real database pool. The mock's `query` method is programmed per-test to either resolve (database up) or reject (database down).

---

### `backend/tests/properties.test.js`
**Tests 34 scenarios for `GET /api/properties` and `POST /api/properties/favorites`:**
- Default pagination returns 20 results with `total`, `limit`, `offset`.
- Custom pagination (`?limit=10&offset=20`).
- Individual filters work: `city`, `state`, `zipcode`, `minPrice`, `maxPrice`, `beds`, `baths`.
- Multiple filters combine correctly.
- Validation errors: non-numeric prices, limit=0, limit>100, negative offset, invalid zipcode, invalid city, minPrice > maxPrice.
- All filter values use parameterized queries (SQL injection protection).
- Database errors return 500.
- Sorting: single-column, multi-column, invalid sort field, invalid sort order, default ascending, combined with filters, `sortBy=date` uses `OnMarketDate`.
- `StandardStatus` field is included in results.
- Favorites: validation errors for missing/invalid IDs, returns matching properties, supports filters+sort+pagination.

---

### `backend/tests/propertyDetail.test.js`
**Tests scenarios for `GET /api/properties/:id` and `GET /api/properties/:id/openhouses`:**
- Returns all `PROPERTY_DETAIL_COLUMNS` fields.
- Returns 404 for non-existent properties.
- Returns 400 for invalid IDs (non-numeric, too long).
- Open house listing, status computation (active/upcoming/expired), `all_data` JSON extraction, date deduplication logic.

---

### `backend/tests/openhouses.test.js`
**Tests 24 scenarios for `GET /api/openhouses`:**
- Default pagination, custom pagination, empty results.
- Date range filters (`startDate`, `endDate`, both together).
- INNER JOIN ensures data exists in both tables.
- `OH_StartDate <= OH_EndDate` validation.
- Default ordering, custom `sortBy`/`sortOrder`, invalid sort field.
- Listing ID deduplication, date deduplication, `all_data` JSON extraction.
- Property context fields are included.
- Validation: invalid date format, startDate after endDate, limit=0, limit>500, negative offset.
- Database error returns 500.

---

### `backend/tests/requestLogger.test.js`
**Tests 9 scenarios for the `requestLogger` middleware:**
- Logs format: `[ISO_TIMESTAMP] METHOD URL STATUS DURATIONms`.
- Duration is in milliseconds (not seconds, not nanoseconds).
- Logs different HTTP methods and status codes (200, 404, 500).
- Sets `X-Response-Time` header on the response.
- Logs `req.originalUrl` (includes query string), not just `req.url`.
- Logs once even if both `finish` and `close` fire (deduplication guard).
- Works for aborted/closed connections.

---

### `backend/tests/query_performance.js`
**What it does:** A manual diagnostic script (not run by `npm test`). Connects to the live database and runs `EXPLAIN ANALYZE` on the key queries to measure index usage and execution time.

**How to run:** `node backend/tests/query_performance.js`

---

### `backend/tests/check_llm_limit.js`
**What it does:** A manual diagnostic script that tests the OpenRouter LLM API rate limits and response times. Sends sample chat requests and measures latency.

**How to run:** `node backend/tests/check_llm_limit.js`

---

### `backend/tests/explain_indexes.js`
**What it does:** A manual diagnostic script that runs `EXPLAIN` on various queries to verify that the database indexes are being used correctly.

---

### `backend/tests/Before modiyfing index.txt` / `backend/tests/After modifying indexes.txt`
**What they do:** Text files containing before/after snapshots of `EXPLAIN` output, documenting the performance improvement after adding indexes. Used as reference/evidence.

---

## 7. Frontend — Entry & App Shell

### `frontend/vite.config.js`
**What it does:** Vite build tool configuration.

**Key settings:**
- `plugins: [react()]` — enables React JSX support.
- `server.port: 3000` — dev server runs on port 3000.
- `server.proxy: { '/api': 'http://localhost:5000' }` — any request to `/api/*` is proxied to the backend on port 5000. This is why the frontend can call `fetch('/api/properties')` without specifying the backend URL.
- `test.environment: 'jsdom'` — Vitest uses jsdom to simulate a browser environment for component tests.
- `test.setupFiles: './src/test/setup.js'` — runs setup before each test file.

---

### `frontend/src/main.jsx`
**What it does:** The React application entry point. Renders the `<App />` component into the `#root` DOM element.

**How it works:**
1. Imports `createRoot` from `react-dom/client` (React 19 API).
2. Wraps `<App />` in `<StrictMode>` — this enables extra development warnings like detecting side effects, deprecated APIs, and rendering issues.
3. Finds the `<div id="root">` element in `index.html` and mounts the React tree there.

---

### `frontend/src/App.jsx`
**What it does:** The root React component. Sets up the application layout and routing.

**How it works:**
1. `<BrowserRouter>` — enables client-side routing (URL changes without full page reloads).
2. `<div className="app-layout">` — CSS Grid container with two columns: sidebar + main content.
3. `<Sidebar />` — always visible on every page.
4. `<main className="app-content">` — the scrollable content area.
5. `<ErrorBoundary>` — wraps all routes. If any page component throws a render error, the ErrorBoundary catches it and shows a recovery UI instead of a white screen. The sidebar remains functional.
6. `<Routes>` — defines all page routes:
   - `/` → `IntroductionPage`
   - `/search` → `ListingsPage`
   - `/chat-search` → `ChatSearchPage`
   - `/favorites` → `FavoritesPage`
   - `/openhouses` → `OpenHousesPage`
   - `/property/:id` → `PropertyDetailPage`

---

## 8. Frontend — API Layer

### `frontend/src/api/propertyApi.js`
**What it does:** Contains all `fetch()` wrapper functions for the backend REST API. Every page component imports functions from here instead of calling `fetch()` directly.

**Functions:**

| Function | HTTP Method | Endpoint | Purpose |
|---|---|---|---|
| `fetchProperties()` | GET | `/api/properties` | Search properties with filters, sort, pagination |
| `fetchPropertyById(id)` | GET | `/api/properties/:id` | Get single property details |
| `fetchOpenHouses(id)` | GET | `/api/properties/:id/openhouses` | Get open houses for one property |
| `fetchFavoriteProperties()` | POST | `/api/properties/favorites` | Fetch specific properties by ID array |
| `fetchAllOpenHouses()` | GET | `/api/openhouses` | List all open houses with date range and filters |

**How each function works (same pattern):**
1. Builds a `URLSearchParams` object from the provided filters.
2. Only includes non-empty values (empty strings and nulls are skipped).
3. If `sortCriteria` is provided, converts the array of `{field, order}` objects into comma-separated `sortBy` and `sortOrder` query strings.
4. Calls `fetch()` with `cache: 'no-store'` (prevents stale data).
5. If the network request fails entirely → throws `"Unable to connect to the server"`.
6. If the server returns a non-200 status → parses the error body and throws a descriptive error message.
7. Returns the parsed JSON response.

---

### `frontend/src/api/chatApi.js`
**What it does:** Contains the `sendChatMessage()` function for the AI chatbot.

**How `sendChatMessage()` works:**
1. Takes `{ messages, currentFilters, pageContext }`.
2. POSTs JSON to `/api/chat`.
3. Returns `{ message: "...", filters: { ... } }` from the LLM.
4. Error handling follows the same pattern as `propertyApi.js`.

---

## 9. Frontend — Hooks

### `frontend/src/hooks/useFavorites.js`
**What it does:** A custom React hook that manages the user's favorite property IDs in `localStorage`.

**How it works:**
- **`readFavorites()`** — reads the `"favorites"` key from localStorage, parses the JSON array, returns `[]` on any error.
- **`writeFavorites(ids)`** — writes the array to localStorage as JSON.
- **`useFavorites()` hook returns:**
  - `favorites` — array of property ID strings (e.g., `["123", "456"]`).
  - `favoriteCount` — `favorites.length` (used by the sidebar badge).
  - `isFavorite(id)` — returns `true` if the ID is in the favorites array.
  - `toggleFavorite(id)` — adds or removes an ID from favorites and writes to localStorage.
  - `clearFavorites()` — removes all favorites.

**Cross-tab sync:** Listens for the `"storage"` event on `window`. When another browser tab modifies `localStorage`, this hook automatically re-reads and updates state. This means favoriting a property in one tab instantly updates the count in another tab.

---

## 10. Frontend — Utilities

### `frontend/src/utils/format.js`
**What it does:** Pure utility functions for formatting data for display. No React code, no side effects.

**Functions:**

| Function | Input | Output | Example |
|---|---|---|---|
| `parsePhotos(photosStr)` | JSON string or null | Array of image URLs | `'["url1","url2"]'` → `["url1", "url2"]` |
| `formatPrice(price)` | Number or null | USD currency string | `459900` → `"$459,900"` |
| `formatTime(timeStr)` | Time string | 12-hour format | `"0 days 14:00:00"` → `"2:00 PM"` |
| `formatDate(dateStr)` | Date string | Readable date | `"2024-08-15"` → `"Thursday, Aug 15, 2024"` |

**Important detail about `formatDate()`:** When given a date-only string like `"2024-08-15"`, it parses as local midnight (not UTC midnight). This prevents the off-by-one-day bug where `new Date("2024-08-15")` in UTC would display as August 14th in US timezones.

---

### `frontend/src/utils/prefetchCache.js`
**What it does:** Fires the 4 default initial API requests in parallel at app startup (`main.jsx`) before React renders. Stores the resulting Promises in `prefetchPromises` so that pages (`ListingsPage`, `FavoritesPage`, `OpenHousesPage`, and `ChatSearchPage`) can attach `.then()` handlers on mount, awaiting in-flight startup requests without triggering duplicate network calls or showing unnecessary loading spinners.

**Exports:**
- `prefetchInitialData()`: Fires parallel `fetchProperties`, `fetchFavoriteProperties`, and `fetchAllOpenHouses` calls once.
- `prefetchPromises`: Shared object holding active `Promise` instances for page hydration.

---


## 11. Frontend — Components

### `frontend/src/components/Sidebar.jsx`
**What it does:** The fixed left navigation sidebar visible on every page.

**How it works:**
- Defines `navItems` — an array of `{ id, label, icon, path, badge }` objects for each navigation link.
- Uses `useLocation()` to determine which link is active (highlighted).
- Uses `useNavigate()` to handle navigation on click (client-side routing, no page reload).
- Calls `useFavorites()` to get `favoriteCount` and display it as a red badge on the "Favorites" link.
- Each link is a `<button>` (not an `<a>`) because navigation is handled programmatically.

---

### `frontend/src/components/ErrorBoundary.jsx`
**What it does:** A React class component that catches JavaScript errors in its child component tree and displays a recovery UI.

**Why a class component?** React's `getDerivedStateFromError()` and `componentDidCatch()` lifecycle methods are only available in class components. There is no functional component equivalent — this is a React architectural requirement.

**How it works:**
1. **`getDerivedStateFromError(error)`** — static method called when a child throws during rendering. Sets `hasError: true` and stores the error.
2. **`componentDidCatch(error, errorInfo)`** — called after the error is caught. Stores the `errorInfo` (which contains the component stack trace), calls the optional `onError` callback prop, and logs to console.
3. **When `hasError` is true, renders recovery UI with:**
   - An error icon (inline SVG).
   - "Something went wrong" heading.
   - The error message in a `<code>` block.
   - Three action buttons:
     - **"Try Again"** — calls `resetErrorBoundary()` which clears the error state and re-renders children (the crashed component gets a fresh render attempt).
     - **"Reload Page"** — `window.location.reload()`.
     - **"Return to Home"** — `window.location.href = '/'`.
   - A collapsible "Show technical details" section with the full stack trace and component stack.
4. **When `hasError` is false** — renders `this.props.children` normally (transparent pass-through).

**Optional props:**
- `fallback` — a static JSX element to show instead of the default UI.
- `fallbackRender({ error, errorInfo, resetErrorBoundary })` — a render function for custom error UI.
- `onError(error, errorInfo)` — callback when an error is caught.
- `onReset()` — callback when the user clicks "Try Again".

---

### `frontend/src/components/PropertyCard.jsx`
**What it does:** A card component for displaying a single property listing in grids.

**What it renders:**
- `<PropertyImageCarousel>` with photo cycling.
- Price badge overlay (e.g., "$459,900").
- "Open House" green badge (if `hasOpenHouse` is true).
- Favorite heart button (♡ unfavorited, ♥ favorited). Click calls `onToggleFavorite()` with `stopPropagation()` so the card link isn't followed.
- Address, city/state/zip line.
- Stats row: beds · baths · sqft.
- Status badge: "Active" (green) or other statuses.

The entire card is an `<a>` tag with `target="_blank"` — clicking opens the detail page in a new browser tab.

---

### `frontend/src/components/PropertyImageCarousel.jsx`
**What it does:** A simple image carousel used inside `PropertyCard`.

**How it works:**
- Parses the `photosStr` JSON into an array of URLs using `parsePhotos()`.
- If no photos → shows a placeholder image.
- If photos exist → shows one image at a time with prev/next arrow buttons and a counter (e.g., "3 / 7").
- Arrow clicks use `stopPropagation()` and `preventDefault()` so they don't trigger the card's link navigation.

---

### `frontend/src/components/PropertyImageGallery.jsx`
**What it does:** A full image gallery used on the `PropertyDetailPage`. More featured than the Carousel.

**How it works:**
- Shows a large main image.
- Below it, a horizontal strip of thumbnail images. Clicking a thumbnail selects it as the main image.
- Clicking the main image opens a **full-screen lightbox** modal.
- Lightbox supports keyboard navigation: `ArrowLeft`/`ArrowRight` to cycle photos, `Escape` to close.
- Lightbox has prev/next arrows, a close button, and a counter.
- When lightbox is open, `document.body.style.overflow = 'hidden'` prevents background scrolling.

---

### `frontend/src/components/PropertyMap.jsx`
**What it does:** Renders a Google Maps embed iframe for a property's location.

**How it works:**
- Only renders if both `latitude` and `longitude` are provided (returns `null` otherwise).
- Uses the Google Maps Embed API with the API key from `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`.
- Shows a "📍 Get Directions" link that opens Google Maps directions in a new tab.

---

### `frontend/src/components/PropertyFilters.jsx`
**What it does:** A filter form with inputs for city, state, zipcode, price range, beds, and baths.

**Two operating modes:**
1. **Uncontrolled (default):** Manages its own internal state. Used when no chatbot integration is needed.
2. **Controlled:** When `externalFilters` and `onExternalChange` props are provided, the parent owns the state. Used by pages with chatbot integration so the AI can programmatically update filter values.

**How it works:**
- Renders text inputs for city, state, zipcode, minPrice, maxPrice.
- Renders `<select>` dropdowns for beds (Any, 1, 2, 3, 4, 5+) and baths (Any, 1, 2, 3, 4+).
- "Search" button calls `onSearch()` with cleaned filter values (empty strings omitted, "5+" converted to "5").
- "Clear Filters" button resets all inputs and calls `onClear()`.
- **Chatbot highlight animation:** When `changedFields` prop contains field names, those inputs get a CSS animation (green highlight glow) to show the user which fields the AI just changed.

---

### `frontend/src/components/SortControls.jsx`
**What it does:** A multi-column sort control panel showing all 5 sortable fields with direction dropdowns.

**How it works:**
- Displays a row of 5 sort fields: Price, Date Listed, Sqft, Beds, Baths.
- Each field has a direction dropdown: "—" (not sorted), "Low to High" / "High to Low" (or "Oldest First" / "Newest First" for Date).
- User sets directions for whichever fields they want, then clicks "Sort".
- On "Sort" click, collects all fields with non-empty directions into a `sortCriteria` array (e.g., `[{ field: 'price', order: 'asc' }, { field: 'date', order: 'desc' }]`) and calls `onChange(newCriteria)`.
- "Clear" button resets all dropdowns and calls `onChange([])`.

---

### `frontend/src/components/Pagination.jsx`
**What it does:** Page number navigation with prev/next buttons.

**How it works:**
- **`buildPageNumbers(currentPage, totalPages)`** — generates the array of page numbers to display using a sliding window algorithm:
  - Always shows page 1 and the last page.
  - Shows a window of 5 pages around the current page.
  - Uses "…" (ellipsis) to bridge gaps.
  - Example for page 12 of 24: `[1, "…", 10, 11, 12, 13, 14, "…", 24]`.
- Renders "‹ Previous" and "Next ›" buttons (disabled on first/last page).
- Renders numbered page buttons with the current page highlighted.
- Ellipsis markers are non-clickable.
- Calls `onPageChange(pageNumber)` when a page number or prev/next is clicked.

---

### `frontend/src/components/ChatAssistant.jsx`
**What it does:** The AI chatbot panel that appears on Search, Favorites, Open Houses, and Chat Search pages.

**How it works:**
1. **Toggle:** Has an open/close button. When `defaultOpen` is true, starts expanded (used on the Chat Search page).
2. **Message history & Persistence:** Maintains a `messages` state array of `{ role: "user"|"assistant", content: "..." }` objects. Uses a module-level `chatHistoryCache` keyed by `pageContext` so conversation history is preserved across page navigation until "Clear conversation" is clicked.
3. **Sending a message:**
   - Adds user message to the conversation.
   - Calls `sendChatMessage()` from `chatApi.js` with the full conversation history, current filter values, and page context.
   - Receives `{ message, filters }` from the backend.
   - Adds assistant message to the conversation.
   - If `filters` is non-empty, identifies which fields changed and calls `onFiltersChange(newFilters)` — the parent page then updates its filter state.
4. **Changed field highlights:** After the AI updates filters, the `changedFields` state is set with the field names. This is passed to `PropertyFilters` for the green glow animation. After 2.5 seconds, the highlights auto-clear.
5. **Auto-scroll:** Uses a `ref` on the messages container and sets `scrollTop = scrollHeight` when messages update. This scrolls the chat container, not the entire page.
6. **Loading state:** Shows a "thinking" animation while waiting for the LLM response.
7. **Error handling:** Displays error messages in the chat if the backend call fails.

---

## 12. Frontend — Pages

### `frontend/src/pages/IntroductionPage.jsx`
**What it does:** The landing page at route `/`. Shows a hero banner with the IDXExchange branding, feature cards describing the app's capabilities, and a "Start Searching" CTA button that navigates to `/search`.

---

### `frontend/src/pages/ListingsPage.jsx`
**What it does:** The main property search page at route `/search`.

**How it works:**
1. On mount, fetches properties from `GET /api/properties?limit=20&offset=0`.
2. **In-memory caching:** Stores results, filters, sort criteria, and pagination state in a module-level `listingsCache` object. When the user navigates away and comes back, the page restores from cache instead of re-fetching.
3. Renders `<ChatAssistant>` (for AI filter assistance), `<PropertyFilters>` (controlled mode — filters state lives in the page), `<SortControls>`, `<Pagination>` (top and bottom), and a grid of `<PropertyCard>` components.
4. **Filter flow:** User types in filters → clicks Search → `fetchProperties()` is called with the filter values → results update → cache is updated → page is re-rendered.
5. **Sort flow:** User selects sort directions → clicks Sort → `fetchProperties()` is called applying both pending filter form inputs (`filterFormValues`) and `sortCriteria` → results update.
6. **Pagination flow:** User clicks a page number → offset is recalculated → `fetchProperties()` is called → scroll to top.
7. When filters change or are cleared, active sort criteria are preserved and pagination resets to page 1.
8. Each `PropertyCard` receives `isFavorite` and `onToggleFavorite` from `useFavorites()`.

---

### `frontend/src/pages/ChatSearchPage.jsx`
**What it does:** The AI-powered search page at route `/chat-search`. Unlike `ListingsPage`, there are **no manual filter forms** — the chatbot directly controls the search.

**How it works:**
1. On mount, fetches default listings.
2. **In-memory caching:** Uses module-level `chatSearchCache`.
3. The `<ChatAssistant>` is open by default (`defaultOpen={true}`).
4. When the chatbot returns updated `filters`, the page **immediately re-fetches** properties with the new filters — no "Search" button needed.
5. **Conversational response guard:** If the chatbot returns `filters: {}` (e.g., user said "thank you"), the page does NOT re-fetch. It compares the new filters against the current filters and only fetches if something actually changed.
6. Also handles `sortBy`/`sortOrder` from the chatbot response.
7. No `<PropertyFilters>` or `<SortControls>` components are rendered.

---

### `frontend/src/pages/FavoritesPage.jsx`
**What it does:** The favorites management page at route `/favorites`.

**How it works:**
1. Reads favorite IDs from `useFavorites()`.
2. Sends IDs via `fetchFavoriteProperties()` (POST) to get property data.
3. **In-memory caching:** Uses module-level `favoritesCache`. Re-fetches only when the favorites array or filters change.
4. Renders `<ChatAssistant>`, `<PropertyFilters>`, `<SortControls>`, and `<PropertyCard>` grid.
5. **Instant removal:** When a card's heart is unfavorited, that card immediately disappears from the grid (remaining cards shift left) without a full re-fetch.
6. **"Remove All" button:** Clears all favorites from localStorage and empties the grid.

---

### `frontend/src/pages/OpenHousesPage.jsx`
**What it does:** The open house calendar and listing page at route `/openhouses`. The most complex page in the application.

**How it works:**
1. Fetches open house events from `GET /api/openhouses`.
2. **Calendar:** Renders a full-screen `react-big-calendar` component (Month view) populated with open house events.
3. **Date range selection (two-click):**
   - 1st click on a calendar day → selects as start date (highlighted).
   - 2nd click → selects as end date. If the 2nd click is before the 1st, they auto-swap.
   - Re-clicking an endpoint clears it.
   - When a range is set, filters are applied and the event grid updates.
4. **Active filter chip:** Displays `📅 Filtering: Aug 1, 2024 — Aug 31, 2024` with a clear button.
5. **Manual date inputs:** Start/end date text inputs below the calendar for direct entry.
6. Renders `<ChatAssistant>` (with `pageContext="openhouses"` so the AI can set `startDate`/`endDate`), `<PropertyFilters>`, `<SortControls>`, `<Pagination>`.
7. **In-memory caching:** Uses module-level `openHousesCache`.
8. Clicking any open house card or calendar event opens the property detail page in a new tab.

---

### `frontend/src/pages/PropertyDetailPage.jsx`
**What it does:** The full property detail view at route `/property/:id`.

**How it works:**
1. Reads `:id` from the URL using `useParams()`.
2. Fetches property details from `GET /api/properties/:id` and open house schedule from `GET /api/properties/:id/openhouses`.
3. **Left column:** `<PropertyImageGallery>` and a dynamic property details grid (beds, baths, sqft, year built, etc.).
4. **Right column:** Address, price, "Save / Saved" favorite button, description, and `<PropertyMap>`.
5. **Open houses section:** Lists all open house events with computed status badges:
   - 🟢 **Active** — event is happening today.
   - 🔵 **Upcoming** — start date is in the future.
   - 🔴 **Expired** — end date has passed.
6. Shows loading skeleton while data is being fetched and an error message if the fetch fails.

---

## 13. Frontend — Stylesheets

Each component and page has a corresponding CSS file in `frontend/src/stylesheets/`. Here's what each one styles:

| File | What it styles |
|---|---|
| `index.css` | Global CSS reset, base font (Inter from Google Fonts), root CSS variables, body defaults |
| `App.css` | `.app-layout` CSS Grid (sidebar + content columns), `.app-content` scrollable area |
| `Sidebar.css` | Fixed sidebar, brand logo, nav links, active state, favorite badge |
| `ErrorBoundary.css` | Error recovery UI: centered card, icon, buttons, collapsible details panel |
| `PropertyCard.css` | Card layout, image wrapper, price badge, open house badge, favorite heart, status badge, hover effects |
| `PropertyImageCarousel.css` | Carousel image sizing, prev/next arrows, counter overlay |
| `PropertyImageGallery.css` | Main image, thumbnail strip, lightbox modal, lightbox navigation |
| `PropertyMap.css` | Map iframe container, directions link |
| `PropertyFilters.css` | Filter form grid layout, input styling, chatbot highlight animation (`@keyframes chatFieldHighlight`) |
| `SortControls.css` | Sort field dropdowns, Sort/Clear buttons |
| `Pagination.css` | Page number buttons, prev/next buttons, active page, ellipsis |
| `ChatAssistant.css` | Chat panel toggle, message bubbles (user vs. assistant), input area, loading dots animation |
| `IntroductionPage.css` | Hero banner, feature cards, CTA button |
| `ListingsPage.css` | Page header, results count, property grid layout (CSS Grid with auto-fill) |
| `ChatSearchPage.css` | Chat search layout with wider chatbot panel |
| `FavoritesPage.css` | Favorites header with "Remove All" button, empty state |
| `OpenHousesPage.css` | Calendar styling, date range selection highlights, filter chip, event card grid |
| `PropertyDetailPage.css` | Two-column detail layout, gallery column, info column, property details grid, open house list |

---

## 14. Frontend — Test Files

All frontend tests use **Vitest** + **React Testing Library** + **@testing-library/user-event**.

### `frontend/src/test/setup.js`
**What it does:** Imports `@testing-library/jest-dom` to add custom matchers like `toBeInTheDocument()`, `toBeDisabled()`, etc. Runs before every test file.

---

### `frontend/src/test/format.test.js`
**Tests 6 scenarios for utility functions in `format.js`:**
- `parsePhotos()`: valid JSON, null input, invalid JSON.
- `formatPrice()`: formats as USD currency, handles null.
- `formatTime()`: converts "0 days 14:00:00" to "2:00 PM".

---

### `frontend/src/test/propertyApi.test.js`
**Tests 4 scenarios for `propertyApi.js`:**
- `fetchProperties()` constructs correct URL with filters.
- Only non-empty filters are included in the URL.
- Multi-column sort produces correct `sortBy` and `sortOrder` query strings.
- Network errors throw descriptive error messages.

**How mocking works:** Uses `vi.stubGlobal('fetch', ...)` to replace the browser's `fetch()` with a mock that returns controlled responses.

---

### `frontend/src/test/prefetchCache.test.js`
**Tests 4 scenarios for the prefetch cache utility (`prefetchCache.js`):**
- Fires app-boot `prefetchPromises` in parallel for `fetchProperties` and `fetchAllOpenHouses`.
- Checks `localStorage` for favorite IDs and conditionally pre-fetches favorites.
- Allows multiple subscribers (`ListingsPage`, `ChatSearchPage`) to attach `.then()` handlers to the same in-flight Promise without duplicate network calls.
- Catches API errors gracefully so components fall back cleanly to manual fetching.

---

### `frontend/src/test/openHousesApi.test.js`
**Tests 6 scenarios for `fetchAllOpenHouses()`:**
- Constructs URL with `startDate`, `endDate`, property filters.
- Multi-column sort support.
- Error handling for network and server errors.

---

### `frontend/src/test/useFavorites.test.js`
**Tests 5 scenarios for the `useFavorites` hook:**
- Returns empty array initially.
- `toggleFavorite()` adds and removes IDs.
- `isFavorite()` returns correct boolean.
- `clearFavorites()` removes all.
- Persists across re-renders via localStorage.

**How hook testing works:** Uses `renderHook()` from `@testing-library/react` to test the hook outside of a component.

---

### `frontend/src/test/Pagination.test.jsx`
**Tests 14 scenarios for `Pagination` and `buildPageNumbers()`:**
- Renders page numbers and navigation buttons.
- Calls `onPageChange` with correct page number on click.
- Previous/Next buttons disabled on first/last page.
- Sliding window with ellipsis for large page counts.
- Edge cases: 0 total pages, 1 total page.

---

### `frontend/src/test/PropertyFilters.test.jsx`
**Tests 4 scenarios for `PropertyFilters`:**
- Renders all filter inputs (city, state, zipcode, minPrice, maxPrice, beds, baths).
- Calls `onSearch` with correct cleaned filter values on form submit.
- Does not include empty filter values in `onSearch`.
- Calls `onClear` and resets all inputs when Clear button is clicked.

---

### `frontend/src/test/SortControls.test.jsx`
**Tests 7 scenarios for `SortControls`:**
- Renders all 5 sort field dropdowns.
- Each field has correct direction options.
- Calls `onChange` with selected sort criteria on Sort click.
- Clear button resets all dropdowns.
- Initializes dropdowns from existing `sortCriteria` prop.

---

### `frontend/src/test/ChatSearchPage.test.jsx`
**Tests 7 scenarios for `ChatSearchPage`:**
- Renders page header and initial property listings on mount.
- Automatically fetches properties when chatbot updates filters (no manual confirmation needed).
- Automatically applies sorting parameters from chatbot.
- Does NOT re-fetch properties when chatbot responds to conversational messages without filter changes (the guard works).
- Chat panel is open by default.
- Pagination works with AI-filtered results.

**How mocking works:** Mocks both `propertyApi.js` (returns fake property data) and `chatApi.js` (returns fake LLM responses with filter suggestions).

---

### `frontend/src/test/ErrorBoundary.test.jsx`
**Tests 8 scenarios for `ErrorBoundary`:**
- Renders children normally when no error occurs.
- Catches render errors and displays the default recovery UI ("Something went wrong").
- Shows error message in the UI.
- "Try Again" button clears error state and re-renders children.
- Recovers and renders normal child UI after "Try Again" when error condition is resolved.
- "Show technical details" toggle shows stack trace.
- Custom `fallback` prop replaces default UI.
- Custom `fallbackRender` prop receives error/reset function.
- `onError` callback is invoked when error is caught.

---

## 15. Documentation Files

### `docs/TASKS.md`
**What it does:** The intern assignment task list. Describes all weekly tasks from Week 1 through Week 12, including requirements, acceptance criteria, and implementation guidance.

---

### `docs/SUPPORT_TASKS.md`
**What it does:** Supporting documentation for the tasks. Contains database schema details, column mapping explanations, and implementation notes.

---

### `docs/ARCHITECTURE.md`
**What it does:** Brief overview of the 3-tier architecture: React frontend → Express API → MySQL database.

---

### `docs/OVERVIEW.md`
**What it does:** Short project overview describing IDXExchange as a real estate property listing dashboard.

---

### `docs/CODING_STANDARDS.md`
**What it does:** Code quality guidelines — naming conventions, file organization, and testing standards.

---

### `docs/BUGS_EXIST.md`
**What it does:** Documents known bugs and data quality issues in the database (e.g., malformed city names, missing data).

---

### `docs/FLOW.md`
**What it does:** Detailed data flow documentation covering navigation flow, page specifications, user flows for each page, and the API communication architecture.

---

### `docs/LOCAL_RUN_GUIDE.md`
**What it does:** Comprehensive guide detailing how to run IDXExchange locally in Development vs Production modes, step-by-step verification procedures, and log sanitization explanations.

---

### `docs/CLOUD_DEPLOYMENT_GUIDE.md`
**What it does:** Detailed step-by-step guide for deploying IDXExchange to a free cloud stack: Railway (MySQL database migration), Render (Express backend service), and Vercel (React frontend SPA). Includes Railway CLI setup, SSH key authentication, and PowerShell streaming pipelines.

---

### `frontend/vercel.json`
**What it does:** Vercel deployment configuration file handling API rewrites (`/api/*` $\rightarrow$ Render backend URL) and SPA client-side routing fallback (`/*` $\rightarrow$ `/index.html`).

---

### `docs/change_log.md`
**What it does:** Chronological record of all changes made to the codebase, organized by date. Each entry lists what was added, modified, or fixed, and in which files.

---

### `docs/decision_log.md`
**What it does:** Records architectural and design decisions with rationale. Each entry explains *what* was decided, *why*, and *what alternatives were considered*.

---

### `frontend/FLOW.md` / `frontend/README.md` / `backend/README.md`
**What they do:** Subsystem-specific documentation for the frontend and backend, including file structure trees, component lists, test coverage summaries, and setup instructions.
