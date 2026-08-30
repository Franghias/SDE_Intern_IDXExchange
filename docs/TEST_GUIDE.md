# IDXExchange — Complete Testing Guide

This document provides a comprehensive, file-by-file breakdown of **every test file and test scenario** in the IDXExchange project. It details the testing philosophy, test runners, mocking strategies, and the specific behaviors validated across both the backend and frontend suites.

---

## 1. Testing Overview & Summary

The project maintains **185 automated tests** with a 100% pass rate:
- **Backend**: **101 tests** across **5 test suites** using **Jest** + **supertest**.
- **Frontend**: **84 tests** across **13 test suites** using **Vitest** + **React Testing Library** + **@testing-library/user-event**.
- **Diagnostic Scripts**: **3 manual performance & benchmark scripts** for database query explain plans and LLM API measurement.

### Quick Test Commands

```bash
# Run all backend tests (from backend/ directory)
cd backend
npm test

# Run all frontend tests (from frontend/ directory)
cd frontend
npm test

# Run a specific frontend test file
npx vitest run src/test/SortControls.test.jsx
```

---

## 2. Backend Test Suites (`backend/tests/`)

The backend test suite imports the Express `app` directly (from `backend/src/app.js`) and uses `supertest` to dispatch HTTP requests against mocked database pools.

```
backend/tests/
├── health.test.js             # 10 tests — Health check, database connectivity, CORS & rate limiting
├── properties.test.js         # 34 tests — Search, filter, multi-sort, pagination, SQL injection, & favorites
├── propertyDetail.test.js     # 24 tests — Single property, column selection, string formatting, & open houses
├── openhouses.test.js         # 24 tests — Open house listings, date ranges, INNER JOINs, & validation
└── requestLogger.test.js      # 9 tests  — Nanosecond timing, response headers, & log redaction
```

---

### A. `backend/tests/health.test.js` (10 Tests)

**Target:** `GET /api/health` ([`backend/src/routes/health.js`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/backend/src/routes/health.js)), CORS Security ([`backend/src/app.js`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/backend/src/app.js)), & Rate Limiting ([`backend/src/middleware/rateLimiter.js`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/backend/src/middleware/rateLimiter.js))  
**Mocking:** Replaces `backend/src/config/db.js` connection pool `query` method.

| Test Scenario | Description & Assertion |
|---|---|
| `returns 200 with status "ok"` | Resolves `pool.query('SELECT 1')` and asserts response status is `200` with `{ status: "ok", database: "database is reachable" }`. |
| `response has JSON content-type` | Asserts `Content-Type` header matches `application/json`. |
| `returns 500 when database is down` | Rejects `pool.query` with `ECONNREFUSED` and asserts status is `500` with `{ status: "error" }`. |
| `includes error message in 500 response` | Verifies that database connection error messages are safely returned without crashing the process. |
| `returns 404 for undefined routes` | Dispatches `GET /api/nonexistent` and validates Express 404 handler. |
| `allows authorized canonical Vercel origin` | Verifies `Origin: https://propertysearchsdeintern.vercel.app` receives `200` and `Access-Control-Allow-Origin`. |
| `allows authorized Vercel preview deployment origin` | Verifies `Origin: https://propertysearchsdeintern-hsujzxyf0-franghias-projects.vercel.app` is permitted. |
| `allows authorized local dev origins` | Verifies `Origin: http://localhost:5173` is permitted. |
| `rejects unauthorized third-party origins` | Verifies `Origin: https://malicious-site.example.com` receives `403 Forbidden` with CORS blocked message. |
| `returns standard RateLimit draft-7 headers` | Dispatches request with `x-test-ratelimit: true` and validates `RateLimit` (`limit=300, remaining=...`) and `RateLimit-Policy` headers. |

---

### B. `backend/tests/properties.test.js` (34 Tests)

**Target:** `GET /api/properties` and `POST /api/properties/favorites` ([`backend/src/routes/properties.js`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/backend/src/routes/properties.js))

#### 1. Default & Custom Pagination (4 tests)
- Returns default `limit: 20`, `offset: 0`, and `total` count.
- Applies custom pagination parameters (`?limit=10&offset=20`).
- Validates pagination bounds (rejects `limit=0`, `limit>100`, and negative offsets).

#### 2. Property Filtering (8 tests)
- Filters by `city` (case-insensitive Title-Case normalization).
- Filters by `state` (2-letter state code validation).
- Filters by `zipcode` (5-digit US ZIP format).
- Filters by `minPrice` and `maxPrice` numeric bounds.
- Filters by `beds` and `baths` minimum count.
- Validates combined multi-field queries.
- Rejects invalid inputs (e.g. `minPrice > maxPrice`, non-numeric strings).

#### 3. SQL Injection & Parameterization Security (3 tests)
- Verifies that all user inputs are passed as parameterized `?` query arguments.
- Proves SQL injection payloads in city, zipcode, or price fields are safely escaped.

#### 4. Multi-Column Sorting (8 tests)
- Single-column sorting (`sortBy=price&sortOrder=asc`).
- Multi-column sorting (`sortBy=price,date&sortOrder=asc,desc`).
- Validates `SORT_WHITELIST` (rejects non-whitelisted columns to prevent SQL injection in `ORDER BY`).
- Verifies `sortBy=date` routes to `OnMarketDate`.
- Preserves default sort order when invalid directions are supplied.

#### 5. Data Quality Rules & `StandardStatus` (4 tests)
- Asserts that corrupt database rows (NULL/empty city, negative prices) are excluded when filters are absent.
- Verifies `StandardStatus` (Active, Pending, Closed) is included in every property object.
- Validates correlated `EXISTS` subquery adding `hasOpenHouse` boolean.

#### 6. Favorites Fetching Endpoint `POST /api/properties/favorites` (7 tests)
- Rejects missing or non-array `ids` body with 400.
- Rejects non-numeric ID strings.
- Queries `IN (?, ?, ?)` for valid property IDs.
- Combines favorites ID matching with search filters, multi-column sorting, and pagination.

---

### C. `backend/tests/propertyDetail.test.js` (24 Tests)

**Target:** `GET /api/properties/:id` and `GET /api/properties/:id/openhouses` ([`backend/src/routes/properties.js`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/backend/src/routes/properties.js))

#### 1. Single Property Details & Column Selection (8 tests)
- Returns configured fields from `PROPERTY_DETAIL_COLUMNS`.
- Verifies 8 removed columns (`lotSizeAcres`, `lotSizeSquareFeet`, `storiesTotal`, etc.) are excluded.
- Validates 404 status when property ID is not found.
- Validates 400 status for malformed or non-numeric IDs.

#### 2. RESO PascalCase String Formatting & Raw Fields (6 tests)
- Validates `formatValueString()` splits PascalCase words and adds comma spacing (`"CentralAir,EnergyStarQualifiedEquipment"` $\rightarrow$ `"Central Air, Energy Star Qualified Equipment"`).
- Confirms `RAW_STRING_FIELDS` (`photos`, `address`, `description`, `emails`, `phones`) preserve exact original characters.

#### 3. Date & Listing Agent Formatting (4 tests)
- Verifies `onMarketDate` formats to human-readable format (`"August 25, 2026"`).
- Verifies listing agent contact fields (`listAgentFullName`, `listAgentOfficePhone`, `listAgentEmail`) are returned.

#### 4. Open Houses for Single Property (6 tests)
- Fetches open houses for listing ID with `OH_StartDate <= OH_EndDate` filter.
- Computes server-side status: `active` (today), `upcoming` (future), or `expired` (past).
- Extracts and parses extra JSON fields from `all_data` column.

---

### D. `backend/tests/openhouses.test.js` (24 Tests)

**Target:** `GET /api/openhouses` ([`backend/src/routes/openhouses.js`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/backend/src/routes/openhouses.js))

#### 1. Date Range & Calendar Query (8 tests)
- Filters by `startDate` only (`OpenHouseDate >= ?`).
- Filters by `endDate` only (`OpenHouseDate <= ?`).
- Filters by date range (`startDate` to `endDate`).
- Validates strict calendar dates using `isValidDate()` (rejects invalid dates like `2024-02-30`).
- Rejects inverted ranges where `startDate > endDate`.

#### 2. INNER JOIN Integration & Property Context (6 tests)
- Ensures `rets_openhouse` INNER JOINs `rets_property` on `L_DisplayId`.
- Verifies property context fields (address, city, price, beds, baths, sqft, photos) are returned alongside event times.

#### 3. Sorting & Pagination (6 tests)
- Default sorting: `OpenHouseDate ASC, OH_StartTime ASC`.
- Custom sort fields and order.
- Large calendar limit support (up to `limit=500` for month calendar views).

#### 4. Status Computation & Error Handling (4 tests)
- Computes `status` dynamically.
- Handles database connection error with HTTP 500.

---

### E. `backend/tests/requestLogger.test.js` (9 Tests)

**Target:** `requestLogger` middleware ([`backend/src/middleware/requestLogger.js`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/backend/src/middleware/requestLogger.js))

| Test Scenario | Description & Assertion |
|---|---|
| `logs ISO timestamp, method, URL, status, duration` | Validates log format matching `[ISO_TIMESTAMP] METHOD URL STATUS DURATIONms`. |
| `uses nanosecond precision via process.hrtime.bigint` | Confirms duration calculation is immune to clock drift and accurate in milliseconds. |
| `sets X-Response-Time header` | Verifies response header (e.g. `X-Response-Time: 12ms`) is attached before headers write. |
| `preserves query string in req.originalUrl` | Ensures full URL queries are captured in logs for auditability. |
| `prevents double-logging on finish and close` | Asserts boolean deduplication guard fires log output exactly once per request. |
| `handles client abort / connection close` | Verifies aborted connections still log elapsed time cleanly. |

---

## 3. Frontend Test Suites (`frontend/src/test/`)

Frontend tests run in a simulated browser environment (**jsdom**) configured in `vite.config.js` and loaded via `frontend/src/test/setup.js`.

```
frontend/src/test/
├── setup.js                            # Vitest DOM matcher setup
├── SortControls.test.jsx               # 7 tests  — Multi-column sort dropdowns, active states, & clear
├── PropertyFilters.test.jsx            # 4 tests  — Search filter form inputs, onSearch, & onClear
├── Pagination.test.jsx                 # 14 tests — Sliding window page numbers, ellipsis, & buttons
├── PropertyDetailPage.test.jsx         # 8 tests  — Detail view, stats icons, agent card, & Google map
├── ChatAssistantPersistence.test.jsx   # 4 tests  — Multi-page chat history isolation & cache clearing
├── ChatSearchPage.test.jsx             # 7 tests  — AI conversational search, direct execution, & guards
├── heartFavorite.test.jsx              # 6 tests  — Heart bookmark button integration across all pages
├── useFavorites.test.js                # 5 tests  — Hook localStorage reading, writing, & cross-tab sync
├── format.test.js                      # 7 tests  — Price, photo parser, 12h time, & local midnight dates
├── prefetchCache.test.js               # 4 tests  — Promise-based app startup pre-caching & hydration
├── propertyApi.test.js                 # 4 tests  — REST API client query param serialization & errors
├── openHousesApi.test.js               # 6 tests  — Open houses API client date range serialization
└── ErrorBoundary.test.jsx              # 8 tests  — React ErrorBoundary crash recovery UI & reset callbacks
```

---

### A. `SortControls.test.jsx` (7 Tests)

**Component:** `<SortControls />` ([`frontend/src/components/SortControls.jsx`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/frontend/src/components/SortControls.jsx))

| Test Scenario | Validation |
|---|---|
| `renders all 5 sort field dropdowns` | Asserts Price, Date Listed, Sqft, Beds, and Baths labels and selects exist in DOM. |
| `each dropdown defaults to "—"` | Checks initial value of all selects is empty string `""`. |
| `pre-selects direction for active sort criteria` | Passes `sortCriteria={[{ field: 'price', order: 'desc' }]}` and verifies Price select is `'desc'`. |
| `calls onChange with selected criteria on Sort click` | Uses `userEvent.selectOptions` to pick Price "Low to High" and Date "Newest First", clicks "Apply Sort", and checks `onChange` payload. |
| `clears all selections on Clear click` | Clicks Clear and verifies `onChange([])` is dispatched and all dropdowns reset to `""`. |
| `shows "Oldest First / Newest First" for Date Listed` | Validates date-specific select options instead of "Low to High". |
| `shows "Low to High / High to Low" for Price` | Validates numeric-specific select options. |

---

### B. `PropertyFilters.test.jsx` (4 Tests)

**Component:** `<PropertyFilters />` ([`frontend/src/components/PropertyFilters.jsx`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/frontend/src/components/PropertyFilters.jsx))

| Test Scenario | Validation |
|---|---|
| `calls onSearch with filter values on submit` | Fills City "Portland", Min Price "300000", Beds "3", submits form, and asserts `onSearch` payload. |
| `omits empty filter values` | Verifies fields left blank are not included in the dispatched search payload. |
| `calls onClear and resets all inputs` | Clicks "Clear Filters" button, verifies inputs reset to empty/default, and asserts `onClear` callback. |
| `syncs with external controlled props` | Tests controlled mode when `externalFilters` and `onExternalChange` are supplied by parent. |

---

### C. `Pagination.test.jsx` (14 Tests)

**Component:** `<Pagination />` ([`frontend/src/components/Pagination.jsx`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/frontend/src/components/Pagination.jsx))

| Test Scenario | Validation |
|---|---|
| `renders page numbers and buttons` | Verifies numbered buttons, Previous, and Next buttons render. |
| `disables Previous on page 1` | Checks `disabled` attribute on Previous button when `currentPage=1`. |
| `disables Next on last page` | Checks `disabled` attribute on Next button when `currentPage=totalPages`. |
| `calls onPageChange when number is clicked` | Clicks page 3 and verifies `onPageChange(3)`. |
| `calls onPageChange for Prev/Next` | Clicks Next from page 2 and verifies `onPageChange(3)`. |
| `generates sliding window with ellipsis` | Tests sliding window algorithm for 20+ pages (e.g. `[1, '...', 9, 10, 11, 12, 13, '...', 20]`). |
| `highlights current active page` | Asserts `.pagination__btn--active` class on current page number. |
| `returns null when totalPages <= 1` | Confirms pagination does not render for single-page result sets. |

---

### D. `PropertyDetailPage.test.jsx` (8 Tests)

**Page:** `<PropertyDetailPage />` ([`frontend/src/pages/PropertyDetailPage.jsx`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/frontend/src/pages/PropertyDetailPage.jsx))

| Test Scenario | Validation |
|---|---|
| `renders loading spinner while fetching` | Asserts `.detail-page__loading` spinner is visible before promises resolve. |
| `renders error state on fetch failure` | Rejects API call and validates error boundary message and retry button. |
| `renders main property info, stats, and description` | Mocks `fetchPropertyById` and verifies address, price, beds, baths, Square Feet, and description render. |
| `renders listing agent contact card` | Verifies Listing Agent Information section renders agent name, phone, and email above description. |
| `renders map with directions link encoded with address` | Verifies Google Maps container and checks "📍 Get Directions" link URL is encoded with street address `L_Address`. |
| `renders dynamic Property Details grid` | Verifies RESO property attributes (Property Type, Flooring, Cooling, Amenities, Interior Features) render with Title Case labels. |
| `renders scheduled open houses when present` | Mocks `fetchOpenHouses` and asserts open house date cards and status badges render. |
| `handles favorite save/unsave toggle button` | Clicks "Save" button, verifies localStorage favorite toggling, and checks UI update to "Saved". |

---

### E. `ChatAssistantPersistence.test.jsx` (4 Tests)

**Component:** `<ChatAssistant />` ([`frontend/src/components/ChatAssistant.jsx`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/frontend/src/components/ChatAssistant.jsx))

| Test Scenario | Validation |
|---|---|
| `persists history across unmount and remount for same context` | Sends message in `"listings"` context, unmounts component, remounts, and verifies messages are restored from cache. |
| `maintains separate history for different pageContexts` | Verifies `"listings"` chat history does not leak into `"openhouses"` or `"favorites"` chat sessions. |
| `clears conversation history on Clear click` | Clicks "Clear conversation" and verifies module cache and message list are emptied. |
| `passes empty strings to clear filters when instructed by backend` | Verifies backend reset instructions (`filters: { city: "" }`) dispatch empty strings to reset parent state. |

---

### F. `ChatSearchPage.test.jsx` (7 Tests)

**Page:** `<ChatSearchPage />` ([`frontend/src/pages/ChatSearchPage.jsx`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/frontend/src/pages/ChatSearchPage.jsx))

| Test Scenario | Validation |
|---|---|
| `renders header and initial property listings` | Mounts page, verifies `<ChatAssistant defaultOpen={true}>` and initial grid of property cards. |
| `automatically fetches properties when chatbot updates filters` | Simulates chatbot filter update (`city: "Seattle"`) and verifies immediate property fetch without manual submit. |
| `applies sorting parameters from chatbot` | Verifies chatbot sort instructions (`sortBy: "price", sortOrder: "asc"`) trigger sorted query. |
| `guards against redundant fetches on conversational messages` | Sends "thank you" (returning `filters: {}`), asserts page does not execute duplicate `fetchProperties`. |
| `does not render manual PropertyFilters or SortControls` | Confirms manual form controls are excluded in favor of pure conversational AI interaction. |
| `handles empty search results state` | Returns 0 properties and asserts empty state icon and guidance message. |
| `handles backend error state` | Rejects API call and verifies error recovery retry button. |

---

### G. `heartFavorite.test.jsx` (6 Tests)

**Cross-Component Integration:** Tests the heart bookmark button across `PropertyCard` (Search, Favorites, Open Houses) and `PropertyDetailPage`.

| Test Scenario | Validation |
|---|---|
| `renders heart button on PropertyCard and toggles state` | Clicks heart (♡ $\rightarrow$ ♥), verifies `localStorage` array updates, and checks icon state. |
| `prevents card link navigation when heart is clicked` | Verifies `e.stopPropagation()` and `e.preventDefault()` prevent opening detail tab on heart click. |
| `renders heart on open house cards` | Verifies heart button functionality within open house event cards. |
| `removes card immediately on favorites page` | Unfavorites a card in `<FavoritesPage />` and verifies instant optimistic removal from DOM. |
| `updates sidebar counter badge` | Asserts favorite count badge in sidebar updates in sync with heart toggles. |

---

### H. `useFavorites.test.js` (5 Tests)

**Hook:** `useFavorites` ([`frontend/src/hooks/useFavorites.js`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/frontend/src/hooks/useFavorites.js))

| Test Scenario | Validation |
|---|---|
| `reads initial favorites from localStorage` | Pre-populates `localStorage.setItem('favorites', '["101", "102"]')` and asserts `favorites` array. |
| `toggles favorite IDs in localStorage` | Calls `toggleFavorite('103')` and asserts item is added/removed from storage. |
| `calculates favoriteCount accurately` | Checks `favoriteCount === favorites.length`. |
| `clears all favorites` | Calls `clearFavorites()` and verifies `localStorage` key is emptied. |
| `syncs across browser tabs via storage event` | Dispatches `new StorageEvent('storage', { key: 'favorites' })` and verifies hook updates state. |

---

### I. `format.test.js` (7 Tests)

**Utility:** `format.js` ([`frontend/src/utils/format.js`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/frontend/src/utils/format.js))

| Test Scenario | Input $\rightarrow$ Expected Output |
|---|---|
| `parsePhotos valid JSON` | `'["url1.jpg", "url2.jpg"]'` $\rightarrow$ `['url1.jpg', 'url2.jpg']` |
| `parsePhotos invalid/null` | `null` or `'bad json'` $\rightarrow$ `[]` |
| `formatPrice valid number` | `459900` $\rightarrow$ `"$459,900"` |
| `formatPrice null/undefined` | `null` $\rightarrow$ `"$0"` or `"N/A"` |
| `formatTime database string` | `"0 days 14:30:00"` $\rightarrow$ `"2:30 PM"` |
| `formatDate local midnight` | `"2024-08-15"` $\rightarrow$ parses local midnight avoiding UTC day-shift bugs. |
| `formatDate with custom locale` | Validates localized calendar formatting. |

---

### J. `prefetchCache.test.js` (4 Tests)

**Utility:** `prefetchCache.js` ([`frontend/src/utils/prefetchCache.js`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/frontend/src/utils/prefetchCache.js))

| Test Scenario | Validation |
|---|---|
| `prefetches initial API calls in parallel` | Verifies `prefetchInitialData()` initiates search, favorites, and open house requests once on app startup. |
| `stores Promises in prefetchPromises object` | Confirms Promises are accessible by page components during mounting hydration. |
| `deduplicates in-flight requests` | Ensures multiple calls to `prefetchInitialData()` do not trigger redundant network requests. |
| `cleans up resolved promises after consumption` | Verifies cache lifecycle after page components attach `.then()` handlers. |

---

### K. `propertyApi.test.js` & `openHousesApi.test.js` (10 Tests Combined)

**API Clients:** `propertyApi.js` & `chatApi.js` ([`frontend/src/api/`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/frontend/src/api/))

- Serializes query parameters (skips empty strings, nulls, and undefined).
- Converts `sortCriteria` arrays to comma-separated `sortBy` and `sortOrder` query strings.
- Dispatches POST body with JSON headers for `fetchFavoriteProperties`.
- Maps HTTP non-200 responses to standardized user-friendly Error instances.
- Handles network connectivity drops with `"Unable to connect to the server"` message.

---

### L. `ErrorBoundary.test.jsx` (8 Tests)

**Component:** `<ErrorBoundary />` ([`frontend/src/components/ErrorBoundary.jsx`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/frontend/src/components/ErrorBoundary.jsx))

| Test Scenario | Validation |
|---|---|
| `catches render errors and displays recovery UI` | Renders throwing component and asserts default crash UI with "Something went wrong" heading. |
| `recovers when error is resolved and Try Again clicked` | Resolves throw condition, clicks "Try Again", and verifies children re-render normally. |
| `invokes onReset callback on Try Again` | Verifies `onReset` prop is called when user triggers recovery. |
| `invokes onError callback with error and errorInfo` | Verifies `onError(error, errorInfo)` receives stack trace and error instance. |
| `toggles technical details and stack trace` | Clicks "Show technical details" toggle and asserts stack trace block expands/collapses. |
| `renders custom fallback JSX element` | Tests static `fallback={<p>Custom Error</p>}` prop. |
| `renders custom fallbackRender function` | Tests `fallbackRender={({ error, resetErrorBoundary }) => ...}` prop. |
| `passes through children when no error occurs` | Validates normal transparent rendering of non-throwing children. |

---

## 4. Manual Performance & Diagnostic Scripts (`backend/tests/`)

These diagnostic scripts are run manually from the terminal for database query optimization, EXPLAIN plan inspection, and LLM throughput testing:

1. **`backend/tests/query_performance.js`**:
   - Executes live `EXPLAIN ANALYZE` on key database queries (`GET /api/properties`, `GET /api/openhouses`, `POST /api/properties/favorites`).
   - Measures index usage, temporary table materialization, and sub-millisecond execution times.
   - Run with: `node backend/tests/query_performance.js`.

2. **`backend/tests/explain_indexes.js`**:
   - Inspects B-Tree index traversal paths across `idx_city`, `idx_price`, `idx_city_price`, and `idx_date_startTime_displayId`.
   - Run with: `node backend/tests/explain_indexes.js`.

3. **`backend/tests/check_llm_limit.js`**:
   - Benchmarks OpenRouter API latency and verifies rate-limiting response handling.
   - Run with: `node backend/tests/check_llm_limit.js`.
