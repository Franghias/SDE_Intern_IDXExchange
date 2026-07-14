### This is the file for logging the date, the week, what we decided, and any other relevant information about the decision. 

#### 2026-06-23 — Week 1: Setup Database

**Decision: Use `.env` file for all environment-specific configuration**
- Credentials (MySQL root password, database name, port) are stored in `.env`
- `.env.example` is committed as a template; `.env` is gitignored
- `docker-compose.yml` references env vars so nothing is hardcoded

**Decision: Use permissive `sql_mode` for MariaDB compatibility**
- The provided SQL dumps were exported from MariaDB 10.2
- They use `'0000-00-00 00:00:00'` defaults and `int(11)` display widths
- Setting `sql_mode=NO_AUTO_VALUE_ON_ZERO` allows MySQL 8 to import them without errors
- This disables strict mode features like `NO_ZERO_DATE` and `STRICT_TRANS_TABLES`

**Decision: Auto-import SQL via Docker's `/docker-entrypoint-initdb.d/`**
- The `database/` folder is mounted as the init directory
- Both `rets_openhouse.sql` and `rets_property.sql` are imported on first container start
- The property file (~632 MB) takes several minutes to import
- A healthcheck is configured so we can tell when import is complete

**Decision: Remove `--default-authentication-plugin` for MySQL 8.4 compatibility**
- MySQL 8.4 removed this deprecated flag entirely
- The `mysql_native_password` plugin is still available but no longer configurable via this flag
- The container was crashing on startup with `unknown variable` error until this was removed

#### 2026-06-24 — Week 2: Setup Backend + Basic REST API

**Decision: Separate `backend/.env` for backend configuration**
- Backend has its own `.env` with `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `PORT`
- Decoupled from the root `.env` which is used by Docker Compose
- `backend/.env.example` committed as a template; `backend/.env` is gitignored

**Decision: Use `mysql2/promise` connection pool**
- Chose `mysql2` over `mysql` (deprecated) — it supports promises natively and is actively maintained
- Connection pool (limit: 10) reuses connections across requests instead of creating/destroying per query
- Pool handles reconnection automatically if a connection drops

**Decision: Express server on port 5000**
- Port 5000 avoids conflict with React dev server (port 3000) in later weeks
- Port is configurable via `PORT` env var

**Decision: Use `nodemon` for development auto-restart**
- `npm run dev` uses nodemon to watch for file changes and restart the server
- `npm test` runs the tests
- `npm start` uses `node` directly for production-like runs

**Decision: Separate `app.js` from `server.js` for testability**
- `app.js` exports the configured Express app (middleware + routes)
- `server.js` imports the app and calls `app.listen()`
- This allows `supertest` to test routes without starting a real HTTP server
- Standard Express testing pattern recommended by the supertest docs

#### 2026-06-26 — Week 3: Property Search Endpoint with Filters & Indexing

**Decision: Data quality filters in every query**
- Every SELECT against `rets_property` skips rows with NULL/blank city, state, zip, price, beds, or baths
- Also skips: negative prices/beds/baths, non-5-digit zips, non-alphabetic city/state
- These are applied as a base WHERE clause so dirty data never reaches the API consumer
- Trade-off: slightly slower queries, but prevents confusing/invalid results

**Decision: Title Case normalization for city and state**
- DB values are inconsistent (e.g., "PORTLAND", "portland", "Portland")
- Input is normalized to Title Case before querying, and matching uses `LOWER()` for case-insensitive comparison
- This ensures `?city=portland` and `?city=PORTLAND` both work correctly

**Decision: Composite index strategy**
- Created `(L_State, L_City, L_SystemPrice)` for state+city+price queries
- Created `(L_State, L_City, L_Keyword2, LM_Dec_3, L_SystemPrice)` for full-filter queries
- Column order follows leftmost-prefix rule: most selective first, range column last
- Per SUPPORT_TASKS.md guidance on composite index design

**Decision: Validation returns all errors at once**
- When multiple query params are invalid, all errors are collected and returned in a single 400 response
- `{ status: "error", errors: ["limit must be...", "minPrice must be..."] }`
- Better UX than failing on the first invalid param

**Decision: Expose state as a query filter**
- Not in the original Week 3 requirements but added per user request
- Supports composite index usage and is consistent with city filter
- Uses same Title Case normalization and alphabetic validation

**Decision: EXPLAIN verification as a standalone script**
- Created `tests/explain_indexes.js` as a manual script (not a Jest test)
- Connects to the live database and runs EXPLAIN on 6 representative queries
- Prints index usage details (key, possible_keys, rows) for manual verification
- Kept separate from unit tests since it requires a running MySQL instance

#### 2026-06-29 — Week 4: Property Detail & Open House Endpoints

**Decision: Use `L_DisplayId` for property lookup, with fallback logic for open houses**
- The `:id` route parameter is matched against `L_DisplayId` in both `rets_property` and `rets_openhouse`
- For open house listing ID display: if `L_ListingID === L_DisplayId`, use `L_DisplayId`; otherwise use `L_ListingID`
- Per SUPPORT_TASKS.md guidance and user clarification

**Decision: Date column selection logic for open houses**
- If all three date columns (`OpenHouseDate`, `OH_StartDate`, `OH_EndDate`) are equal, use `OpenHouseDate`
- If they differ, use `OH_StartDate` as the display date
- In practice, the sample data shows all three are always equal, but the fallback handles edge cases

**Decision: Configurable `all_data` key extraction**
- All keys from the `all_data` JSON blob are extracted via a configurable `OPEN_HOUSE_ALL_DATA_KEYS` array
- Adding or removing a key from this array controls which fields appear in the API response
- Designed for easy future modification without changing logic — just edit the array
- Invalid JSON in `all_data` returns an empty object (graceful degradation, no error)

**Decision: ID validation — alphanumeric, max 20 characters**
- Listing IDs in the database are numeric strings (~10 digits)
- Validation accepts alphanumeric characters up to 20 chars to allow some flexibility
- Special characters, empty strings, and oversized IDs return 400
- Same validation function (`isValidListingId`) is reused by both `/:id` and `/:id/openhouses`

**Decision: Route registration order — openhouses before :id**
- `/:id/openhouses` is registered before `/:id` in the Express router
- Without this, Express would match `/:id` first and treat "openhouses" as a property ID
- Per TASKS.md requirement: "Route order is correct — /openhouses must be registered before /:id"

**Decision: Request logger as global middleware**
- Created as a separate middleware file (`middleware/requestLogger.js`) rather than inline in `app.js`
- Registered globally with `app.use()` before all route handlers
- Uses `res.on('finish')` to capture the final status code and compute elapsed time
- Follows Ponytail principle: separate file keeps `app.js` focused on wiring

**Decision: No separate route file for detail endpoints**
- Both `/:id` and `/:id/openhouses` are added to the existing `properties.js` router
- They're sub-routes of `/api/properties`, so they belong in the same file
- Follows Ponytail principle: avoid unnecessary files

#### 2026-07-02 — Week 5: React Setup + Listings Page

**Decision: Use Vite instead of Create React App**
- ARCHITECTURE.md originally said "Create React App" but CRA is deprecated and unmaintained
- User confirmed switch to Vite — faster builds, active maintenance, native ES modules
- Updated ARCHITECTURE.md to reflect "React (Use Vite)"
- Template: `react` (JavaScript, not TypeScript — consistent with backend)

**Decision: Vite proxy for API requests**
- Configured `vite.config.js` with `server.proxy` to forward `/api` → `http://localhost:5000`
- Avoids CORS issues during development without touching backend config
- Frontend fetch calls use relative paths (`/api/properties`) — no hardcoded base URL
- Vite dev server runs on port 3000 (matching the deliverable requirement)

**Decision: Keep backend field names, adapt frontend**
- User confirmed: do NOT rename backend response fields (`listingId`, `zipCode`, `beds`, `baths`)
- Frontend components use the backend field names directly
- Added `L_Photos AS photos` and `L_DisplayId AS propertyId` to the listing query (new fields, not renames)

**Decision: Parse L_Photos on the frontend**
- `L_Photos` is stored as a JSON string in MySQL and returned as a raw string by the backend
- Frontend `parsePhotos()` utility handles `JSON.parse()` with graceful fallback to `[]`
- Avoids adding JSON parsing logic to the listing endpoint (which returns many rows)
- Per Ponytail principle: keep functions short and focused

**Decision: Extract shared utilities into `utils/format.js`**
- `parsePhotos()` and `formatPrice()` extracted to avoid duplication if reused in later weeks
- Both are pure functions with no side effects — easy to test
- Follows Ponytail principle: reuse, avoid duplication

**Decision: Dark theme design system with CSS custom properties**
- All colors, fonts, and spacing defined as CSS custom properties in `stylesheets/index.css`
- Components reference these tokens instead of hardcoding values
- Makes future theme changes (or light mode) a single-file edit
- Vanilla CSS per user preference — no CSS framework

#### 2026-07-07 — Week 6: CSS Consolidation

**Decision: Consolidate all CSS files into `src/stylesheets/` directory**
- Moved `index.css`, `App.css`, `PropertyCard.css`, and `ListingsPage.css` from their co-located positions into a single `stylesheets/` directory
- Co-location (CSS next to its component) is common in React projects, but a centralized stylesheet directory provides a single place to manage all styles
- Makes it easier to find and audit all CSS in one directory rather than searching across `src/`, `components/`, and `pages/`
- Import paths in JSX files updated to reference `../stylesheets/` or `./stylesheets/`

#### 2026-07-07 — Week 6: Filters UI + Testing

**Decision: Split-screen dashboard layout with fixed sidebar**
- Implemented the PRD layout from SUPPORT_TASKS.md: fixed 260px left sidebar + scrollable main content canvas
- Sidebar uses `position: fixed` so it stays visible during page scroll
- Content area uses `margin-left: 260px` to avoid overlap with the fixed sidebar
- CSS Grid (`grid-template-columns: 260px 1fr`) provides the two-column structure
- Responsive: on mobile (≤768px), sidebar collapses to a horizontal top bar
- All layout uses vanilla CSS per user preference — no CSS framework

**Decision: Client-side routing via React state (no React Router)**
- React Router is specified as a Week 8 task, so it's not installed yet
- Navigation between Introduction and Search pages uses a `currentPage` state variable in `App.jsx`
- Sidebar nav buttons call `setCurrentPage()` to swap the rendered page component
- Simple and sufficient for two pages; React Router will replace this in Week 8

**Decision: Introduction page with hero + feature cards**
- PRD requires an Introduction page with hero section and feature grid
- Hero section uses gradient text (`linear-gradient` with `-webkit-background-clip: text`) for visual impact
- CTA button ("Start Searching") navigates to the Search page via the same state-based routing
- Feature grid shows 4 cards with emoji icons — avoids adding an icon library dependency
- Per Ponytail principle: prefer standard libraries first, avoid unnecessary dependencies

**Decision: 7 filter inputs (adding state filter)**
- TASKS.md Week 6 lists 6 inputs: city, ZIP code, min price, max price, beds, baths
- User confirmed adding a `state` filter since the backend already supports it
- Total: 7 inputs — city (text), state (text), ZIP code (text), min price (number), max price (number), beds (dropdown), baths (dropdown)

**Decision: "Any" as default option in bed/bath dropdowns**
- Beds dropdown: Any, 1, 2, 3, 4, 5+
- Baths dropdown: Any, 1, 2, 3, 4+
- "Any" maps to an empty string — it signals "no filter" and is excluded from the API request
- "5+" and "4+" are converted to `5` and `4` respectively before sending to the backend
- "Any" gives users a clear way to remove a previously selected filter without confusion

**Decision: Empty values excluded from API request**
- Per TASKS.md: "Empty filter values are not sent to the API (simply add values to the URL if the user fills the input, else do not add)"
- `fetchProperties()` iterates over filter entries and only calls `params.set()` for non-empty, non-null values
- `PropertyFilters` strips empty strings and "Any" selections before calling `onSearch`
- This ensures the backend only receives intentional filter values

**Decision: Vitest instead of Jest for frontend testing**
- ARCHITECTURE.md originally said "Jest + React Testing Library"
- User confirmed switch to Vitest — it integrates natively with Vite (shared config, same transform pipeline)
- No need for separate Babel/transform config that Jest would require in a Vite project
- Test config added inline in `vite.config.js` under the `test` block (no separate config file)
- Backend continues to use Jest + Supertest (CommonJS environment, different needs)
- Updated ARCHITECTURE.md to reflect: "Vitest + React Testing Library (frontend), Jest + Supertest (backend)"

**Decision: Test setup file for jest-dom matchers**
- Created `src/test/setup.js` that imports `@testing-library/jest-dom`
- This provides custom matchers like `toBeInTheDocument()`, `toHaveValue()` globally
- Referenced in `vite.config.js` via `test.setupFiles` so it loads before every test file
- Avoids repeating the import in every individual test file

**Decision: Mock `fetch` in API client tests with `vi.stubGlobal`**
- API client tests mock the global `fetch` function rather than making real HTTP requests
- Uses Vitest's `vi.stubGlobal('fetch', ...)` to replace fetch with a mock
- Each test restores mocks via `vi.restoreAllMocks()` to prevent test pollution
- Tests verify URL construction, filter inclusion/exclusion, and error handling without a running backend

**Decision: All new CSS files placed in `stylesheets/` directory**
- Consistent with the CSS consolidation decision from earlier in Week 6
- New files: `Sidebar.css`, `IntroductionPage.css`, `PropertyFilters.css`
- All CSS imports in components use `../stylesheets/` paths
- Per Ponytail principle: avoid unnecessary files and keep a predictable structure

#### 2026-07-11 — Week 6: Desktop Layout Bug Fix

**Decision: Position .app-content in CSS Grid column 2 on desktop**
- Resolved layout issue where the page content was hidden (collapsed to 0px width) on desktop views.
- Because `.sidebar` uses `position: fixed`, it is taken out of the grid flow. This caused the first in-flow element, `.app-content`, to be auto-placed in column 1 (260px wide).
- Combined with `.app-content`'s `margin-left: 260px;`, this collapsed the width of `.app-content` to 0px.
- Changed `.app-content` to explicitly use `grid-column: 2;` on desktop and removed the redundant `margin-left: 260px;`.
- On mobile, updated `.app-content` to use `grid-column: 1;` so that it displays correctly in the stacked layout.