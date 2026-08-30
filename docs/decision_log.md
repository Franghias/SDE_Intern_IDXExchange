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

#### 2026-07-14 — Week 7: Pagination UI + Component Testing

**Decision: Sliding window of 5 pages + always-visible last page**
- Pagination shows a window of 5 consecutive page numbers centered (±2) around the current page
- The last page is always shown, separated by an ellipsis (`…`) when it isn't adjacent to the window
- When the window overlaps with the last page, it merges without ellipsis (e.g., page 23 of 24 → `20,21,22,23,24`)
- When close to page 1, the window starts at 1 (e.g., page 1 → `1,2,3,4,5, … 24`)
- User specified this exact behavior: page numbers are clickable, not just arrows

**Decision: Unicode characters `«` and `»` for Previous/Next buttons**
- Per SUPPORT_TASKS.md guidance: use these specific unicode arrows
- Previous (`«`) is disabled on page 1; Next (`»`) is disabled on the last page
- Both use `aria-label` for accessibility (`"Previous page"`, `"Next page"`)

**Decision: Dual pagination placement (above grid and below grid)**
- Per SUPPORT_TASKS.md: pagination arrows appear below the filter section AND at the bottom of the results container
- Both instances are identical `<Pagination>` components with the same state
- Both include the items-per-page dropdown
- Both are hidden when `totalPages <= 1`

**Decision: Items-per-page dropdown with 5 fixed options**
- User specified: 10, 20, 30, 40, 50 only — no free-text input
- Default value: 20 (matches the existing `limit: 20` from prior weeks)
- Changing items-per-page resets to page 1 and re-fetches with the new limit
- Active filters are preserved when changing the page size

**Decision: Pagination state managed in ListingsPage**
- `currentPage` (1-indexed), `itemsPerPage`, and computed `totalPages` live in ListingsPage state
- `offset` is derived: `(currentPage - 1) * itemsPerPage`
- `handleSearch` and `handleClear` both reset `currentPage` to 1 before fetching
- `handlePageChange` preserves `activeFilters` and only changes offset
- `handleItemsPerPageChange` preserves `activeFilters`, resets page to 1, and re-fetches with new limit

**Decision: Scroll to top on page change**
- `window.scrollTo({ top: 0, behavior: 'smooth' })` is called in `handlePageChange`
- Smooth scroll gives visual feedback that the page has changed
- Not triggered on filter changes or items-per-page changes (those already render at the top)

**Decision: Results summary shows range**
- Changed from "Showing 20 of 487 properties" to "Showing 1–20 of 487 properties"
- Range format: `Showing {rangeStart}–{rangeEnd} of {total} properties`
- When total is 0, rangeStart is also 0 (displays "Showing 0–0 of 0")

**Decision: `buildPageNumbers` exported as a named export for testability**
- The sliding window algorithm is a pure function exported separately from the component
- Allows direct unit testing of the algorithm without rendering the component
- 5 dedicated tests cover edge cases: empty, small counts, large counts, end merging, adjacency

**Decision: All pagination tests in a single test file**
- Created `src/test/Pagination.test.jsx` with 14 tests (9 component + 5 algorithm)
- Component tests use React Testing Library + userEvent for interaction testing
- Algorithm tests use direct function calls for precise edge-case coverage
- Consistent with existing test organization (tests in `src/test/` directory)

**Decision: Always include page 1 in pagination output**
- User requested page 1 always be visible so users can jump back to the original search (limit 20, offset 0) from any page
- If the sliding window starts at page 2, page 1 is prepended without ellipsis (adjacent)
- If the sliding window starts at page 3+, page 1 is prepended with an ellipsis separator
- When on page 1, the window already starts at 1 so no extra logic is needed
- Examples: page 5 of 24 → `1, … 3,4,5,6,7, … 24`; page 4 of 7 → `1,2,3,4,5,6,7`

#### 2026-07-22 — Week 8: Property Detail Page End-to-End

**Decision: Open detail page in a new browser tab**
- User requested that clicking a property card opens the detail page in a new tab, so users can continue browsing listings while viewing details
- PropertyCard uses an `<a>` tag with `target="_blank"` and `rel="noopener noreferrer"` instead of React Router `<Link>`
- The `/property/:id` route still exists in the router for the new tab to render correctly
- Carousel arrow buttons use `e.stopPropagation()` and `e.preventDefault()` to prevent the link from navigating when clicking arrows

**Decision: React Router replaces state-based routing**
- Replaced `useState('introduction')` routing in App.jsx with `react-router-dom`'s `BrowserRouter` + `Routes`
- Three routes: `/` (Introduction), `/search` (Listings), `/property/:id` (Detail)
- Sidebar now uses `useNavigate()` and `useLocation()` instead of `onNavigate` prop
- IntroductionPage uses `useNavigate()` instead of `onNavigateToSearch` prop
- Enables browser back/forward navigation and direct URL access

**Decision: Configurable `PROPERTY_DETAIL_COLUMNS` array**
- Per SUPPORT_TASKS.md: backend property detail endpoint should allow adding/removing columns without code changes
- Created `PROPERTY_DETAIL_COLUMNS` array at the top of `properties.js` — each entry maps a DB column to an API field name
- `buildDetailSelect()` function dynamically builds the SQL SELECT clause from this array
- Adding `{ db: 'SOME_COLUMN', alias: 'someField' }` to the array automatically includes it in the API response
- Frontend renders any field not in `SPECIAL_FIELDS` (core fields like price, address, photos) dynamically in the "Property Details" grid
- This means backend column additions auto-appear on the frontend without frontend code changes

**Decision: `hasOpenHouse` flag via LEFT JOIN subquery**
- Per SUPPORT_TASKS.md: show green "Open House" badge on property cards for properties with active open houses
- Added a LEFT JOIN against a subquery that counts active open houses per property
- Active definition: `OH_StartDate <= OH_EndDate AND OH_EndDate >= CURDATE() AND OH_StartDate <= CURDATE()`
- Boolean `hasOpenHouse` returned on each listing result; avoids N+1 API calls per card
- Only active open houses trigger the badge (not expired or upcoming)

**Decision: Three-state open house labels (active/expired/upcoming)**
- User confirmed all three states should be shown:
  - **Active** (green): `OH_StartDate ≤ today` AND `OH_EndDate ≥ today`
  - **Expired** (red): `OH_StartDate ≤ today` AND `OH_EndDate < today`
  - **Upcoming** (blue): `OH_StartDate > today`
- Status is computed server-side and returned as a `status` field on each open house
- Frontend renders colored badges: green for active, red for expired, blue for upcoming

**Decision: Open house validation rules enforced via INNER JOIN + WHERE**
- Per SUPPORT_TASKS.md: open houses must exist in both `rets_openhouse` and `rets_property` (INNER JOIN)
- `L_DisplayId` in `rets_openhouse` must match `L_DisplayId` in `rets_property`
- `OH_StartDate <= OH_EndDate` filter in WHERE clause
- `OH_StartDate` and `OH_EndDate` returned in the response for frontend date display

**Decision: PropertyImageCarousel for listing cards, PropertyImageGallery for detail page**
- Two separate photo components per TASKS.md requirements
- Carousel: lightweight, prev/next arrows, counter overlay (X / Y), shows/hides arrows on hover
- Gallery: main image + scrollable thumbnail strip + full-screen lightbox with Escape/click-outside close and arrow key navigation
- Both parse `L_Photos` from its JSON array format using the shared `parsePhotos()` utility

**Decision: Google Maps Embed API via iframe**
- Per TASKS.md: use Google Maps Embed API (iframe-based, no npm package)
- API key stored in `VITE_GOOGLE_MAPS_API_KEY` (Vite env var prefix, not `REACT_APP_`)
- Map only renders when both `latitude` and `longitude` are present and non-null
- "Get Directions" link opens Google Maps directions in a new tab
- Per Ponytail principle: prefer standard APIs (iframe) over npm packages

**Decision: `VITE_` prefix for environment variables instead of `REACT_APP_`**
- The project uses Vite, not Create React App
- Vite exposes env vars prefixed with `VITE_` via `import.meta.env`
- Created `frontend/.env` and `frontend/.env.example` with `VITE_GOOGLE_MAPS_API_KEY`

**Decision: Dynamic "Property Details" grid on detail page**
- Fields not in the `SPECIAL_FIELDS` set (core fields rendered by dedicated components) are auto-rendered in a two-column grid
- `toLabel()` converts camelCase field names to readable labels (e.g., "propertyType" → "Property Type")
- When backend adds a column to `PROPERTY_DETAIL_COLUMNS`, it automatically appears in this grid
- Removes need for frontend code changes when backend columns are modified

**Decision: Parallel data fetching on detail page**
- `Promise.all([fetchPropertyById(id), fetchOpenHouses(id)])` loads both datasets simultaneously
- Open house fetch failure is caught independently — the page still shows property data if open houses fail
- Reduces perceived load time vs. sequential requests

**Decision: Place "Property Details" section inside photo column below photos**
- Positioned the dynamic "Property Details" grid inside `.detail-page__gallery-col` directly below `<PropertyImageGallery>`
- Keeps photo column organized with image gallery on top and property specifications below it
- Preserves responsive two-column desktop and single-column mobile layout without extra DOM wrappers

**Decision: Display `all_data` fields in open house cards as a full-width details grid**
- The backend already returns selected keys from `rets_openhouse.all_data` via the `OPEN_HOUSE_ALL_DATA_KEYS` whitelist and the `extractAllData()` helper
- Previously only `OpenHouseRemarks` was rendered on the frontend; the other returned keys (`OffMarketDate`, `AppointmentRequiredYN`, `PropertyType`, `OpenHouseStatus`, `OpenHouseType`, `PropertySubTypeAdditional`, `OpenHouseAttendedBy`, `PropertySubType`, `LivestreamOpenHouseURL`) were silently ignored
- Now all non-null, non-empty keys from the open house response are rendered in a two-column details grid inside each open house card, below the date/time row
- Keys already rendered by dedicated UI (`date`, `startTime`, `endTime`, `status`, `listingId`, `startDate`, `endDate`, `OpenHouseRemarks`) are excluded via an `OPEN_HOUSE_SPECIAL_FIELDS` set to avoid duplication
- The grid uses the same `toLabel()` camelCase-to-readable conversion as the Property Details section
- Grid is full-width (spans the entire Open Houses section area), consistent with the user's request
- To add more keys in the future, only the backend's `OPEN_HOUSE_ALL_DATA_KEYS` array needs to be updated — the frontend renders whatever keys the API returns
- No new dependencies, no new files — follows Ponytail principle of reusing existing patterns

#### 2026-07-28 — Week 9: Advanced Feature (Sorting) + StandardStatus

**Decision: Whitelist-based sort column mapping for security**
- Created a `SORT_WHITELIST` object mapping API-facing names (e.g., `price`) to actual SQL column names (e.g., `L_SystemPrice`)
- The warning in TASKS.md explicitly states that using wrong column names silently returns unsorted results
- Only whitelisted keys are accepted — invalid `sortBy` values return 400
- Column names are never derived from user input directly; only the whitelist value is injected into SQL

**Decision: Multi-column sorting with comma-separated params**
- Backend accepts comma-separated `sortBy` and `sortOrder` query params (e.g., `?sortBy=price,date&sortOrder=asc,desc`)
- Each field/order pair is validated independently against the whitelist
- If counts don't match between `sortBy` and `sortOrder`, backend returns 400
- Builds an `ORDER BY` clause with multiple columns (e.g., `ORDER BY p.L_SystemPrice ASC, p.OnMarketDate DESC`)

**Decision: All-fields-visible sort UI with per-field direction dropdowns**
- All 5 sort fields (Price, Date Listed, Sqft, Beds, Baths) are displayed simultaneously as labeled dropdowns
- Each dropdown has three options: "—" (no sort), ascending, descending
- Date Listed uses "Oldest First / Newest First" labels; all others use "Low to High / High to Low"
- A single "Sort" button applies all selected criteria at once; "Clear" resets all to "—"
- Sort controls appear once above the top pagination (not duplicated at the bottom)
- This is simpler than the previous tag-based add-one-at-a-time pattern — users see all options at a glance

**Decision: Use "Oldest First / Newest First" labels for date sort direction**
- Other columns use "Low to High / High to Low" which is straightforward for numeric values
- For dates, "Low to High" is ambiguous — "Oldest First" / "Newest First" is immediately intuitive
- The sort direction options dynamically switch based on the selected field

**Decision: Sort state behavior — persists on page change, resets on filter change**
- Sort criteria persist when navigating between pages (requirement from TASKS.md)
- When new filters are applied (`handleSearch`) or cleared (`handleClear`), sort criteria reset to empty
- This prevents confusing behavior where old sort state applies to a new filter result set

**Decision: Replace `L_Status` with `StandardStatus` column**
- `PROPERTY_DETAIL_COLUMNS` now maps `StandardStatus` → `status` instead of `L_Status`
- The listings query also selects `p.StandardStatus AS status` so PropertyCard can display it
- `status` was added to the `SPECIAL_FIELDS` set in PropertyDetailPage to prevent duplicate rendering (dedicated badge + generic grid)

**Decision: Consistent status badge styling across card and detail page**
- PropertyCard: status badge floated to bottom-right of the card body
- PropertyDetailPage: status badge placed between price and address
- Both use the same color scheme: green background/text for "Active", red for any other status
- Uses semi-transparent background with colored text (e.g., `rgba(34, 197, 94, 0.12)` + `#16a34a`) for a modern look

#### 2026-07-29 — Week 9: Advanced Feature (Favorites)

**Decision: Encapsulated `useFavorites` hook for localStorage management**
- Created `useFavorites` custom hook in `frontend/src/hooks/useFavorites.js`
- Manages favorite property IDs stored as a JSON array under `localStorage` key `'favorites'`
- All `localStorage` read/write operations are isolated inside the hook — no inline `localStorage` calls in UI components
- Cross-tab sync implemented via window `storage` event listener so changes in one tab immediately reflect in other open tabs

**Decision: Backend `POST /api/properties/favorites` endpoint for ID-filtered requests**
- Added `POST /api/properties/favorites` endpoint in `backend/src/routes/properties.js`
- Used `POST` method instead of `GET` because the list of favorited IDs in the request body may be large
- Accepts `{ ids: ["100002222", ...] }` and validates each ID using `isValidListingId`
- Reuses existing property query pipeline (`buildWhereClause`, `hasOpenHouse` subquery JOIN, data quality rules, `validateQueryParams` for limit/offset/filters/sort)
- Adds `p.L_DisplayId IN (...)` clause to fetch only favorited properties matching active filters

**Decision: Heart toggle button on PropertyCard with event propagation prevention**
- Added heart toggle button (`.property-card__favorite-btn`) positioned at the top-left of `PropertyCard`
- Button uses `e.stopPropagation()` and `e.preventDefault()` to prevent card click navigation when favoriting/unfavoriting
- Heart icon switches between filled (`♥`, red) and outlined (`♡`, white) states based on `isFavorite` prop

**Decision: FavoritesPage layout parity with Search page + instant list shift**
- `FavoritesPage` shares full feature parity with `ListingsPage` (supports `PropertyFilters`, `SortControls`, `Pagination`, per-page selector)
- When a user unfavorites a card on the `FavoritesPage`, state immediately filters out that property card (`properties.filter(...)`) so remaining cards instantly shift left in order
- Header contains a prominent "Remove All" button (`favorites-page__remove-all-btn`) that clears all saved favorites at once
- Shows empty state ("No favorite properties yet") when no properties are saved or match filters

**Decision: Detail page favorite button integration**
- Added a "Save" / "Saved" favorite button next to the property price header on `PropertyDetailPage.jsx`
- Uses `useFavorites` hook to read and toggle favorite status directly from the detail view
- Displays filled heart (`♥`) and active red background when saved

**Decision: Sidebar navigation link with live count badge**
- Updated `Sidebar.jsx` with a new "Favorites" nav link (`/favorites`) with heart icon (`❤️`)
- Renders a live pill badge displaying `favoriteCount` whenever count is > 0

#### 2026-08-05 — Week 10: Conversational AI Chatbot Assistant & Open House Filters/Sorting

**Decision: Backend OpenRouter LLM proxy endpoint (`POST /api/chat`)**
- Integrated OpenRouter API using model `inclusionai/ling-3.0-flash:free`
- Configured via environment variables `LLM_API_KEY` and `LLM_MODEL` in `backend/.env` and `backend/.env.example`
- Endpoints proxied through the Express backend to keep API key hidden from client bundles
- System prompt strictly enforces security rules: denies off-topic requests, prompt injections, role-play/jailbreak attempts, SQL/code execution, and dangerous/unsafe behaviors
- LLM outputs structured JSON containing `{ message: string, filters: object }` for automated filter field populating

**Decision: Reusable ChatAssistant component with independent per-page conversation memory**
- Created `ChatAssistant.jsx` component placed above search filters on `ListingsPage` and `FavoritesPage`, and above the calendar section on `OpenHousesPage`
- Features a collapsible chat panel with toggle button, message bubbles, typing indicator dots, filter change badge animations, and clear conversation button
- Each page maintains an independent conversation history state in memory that resets when navigating between pages
- Chatbot fills in search filter inputs automatically (city, state, zipcode, minPrice, maxPrice, beds, baths, startDate, endDate) without triggering search execution, allowing users to review and click "Search" to finalize

**Decision: Lifted filter state & dual-mode PropertyFilters**
- Refactored `PropertyFilters.jsx` to support controlled mode via `externalFilters` and `onExternalChange` props
- Maintained backward compatibility for uncontrolled mode when props are omitted
- Added `changedFields` prop with animation highlighting (`.property-filters__field--changed`) so users visually see which inputs were auto-filled by the chatbot

**Decision: Extended Open Houses endpoint with Property Filters & Multi-Column Sorting**
- Enhanced `GET /api/openhouses` route to accept property query parameters (`city`, `state`, `zipcode`, `minPrice`, `maxPrice`, `beds`, `baths`) and `sortBy`/`sortOrder` multi-column sorting parameters
- Integrated `PropertyFilters` and `SortControls` components directly on `OpenHousesPage` below the calendar section
- Added `SortControls` below `PropertyFilters` on `FavoritesPage` and `ListingsPage` without requiring `totalPages > 1` so sorting is available even when result sets fit on a single page

#### 2026-08-06 — Week 10: In-Memory Page Cache Optimization & Date Range Math

**Decision: Module-Level In-Memory Caching for Page Views**
- React Router unmounts page components when changing routes, causing state loss and unnecessary network API calls when users re-visit pages.
- Created module-level cache variables (`listingsCache`, `favoritesCache`, `openHousesCache`) that survive component unmounting.
- Page components check their respective cache on mount. If present, state is restored from cache and initial API calls are bypassed.
- Any explicit user interaction (submitting search filters, clearing filters, changing sort criteria, selecting calendar slots/date ranges, or changing pages/page limits) updates the cache and executes a fresh fetch.

**Decision: Explicit Fetch Pattern for Favorites Page**
- `FavoritesPage` previously used a reactive `useEffect` watching filter and pagination state, which triggered unexpected fetches on mount.
- Refactored `FavoritesPage` so `useEffect` only watches the `favorites` array (to detect additions/removals made on other pages).
- All UI actions (search, clear, sort, pagination) explicitly trigger `loadFavoriteProperties` and update `favoritesCache`.

**Decision: Calendar Month Boundary Calculation via Day 0**
- In `OpenHousesPage.jsx`, calendar events for the current month are fetched using `new Date(year, month + 1, 0)`.
- Passing day `0` to JavaScript's `Date` constructor evaluates to the final day of month N (e.g. `2026-08-31` for August), accurately capturing all events in the month without bleeding into the next month.

#### 2026-08-06 — Week 10: Chatbot Prompt Hardening & Non-Disruptive Scroll UX

**Decision: Strict System Prompt Enforcement & JSON Mode in OpenRouter Payload (`chat.js`)**
- Added explicit negative prompt constraints in `buildSystemPrompt()` prohibiting plain text preambles, markdown code fences, XML tags, and `<tool_call>` blocks.
- Included concrete multi-field JSON output example (`minPrice` and `maxPrice` set simultaneously).
- Passed `response_format: { type: 'json_object' }` and lowered `temperature` to `0.1` in the OpenRouter API request payload to enforce valid JSON generation at the model level.

**Decision: Non-Disruptive Internal Chat Scroll (`ChatAssistant.jsx`)**
- Replaced page-level `messagesEndRef.current.scrollIntoView()` with container-level `messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight`.
- Ensures auto-scrolling is restricted to the internal chat panel message log without causing the main browser page/window to scroll or jump down to filter sections when the chatbot outputs responses.

#### 2026-08-06 — Week 10: Dedicated AI Chatbot Search Page (`/chat-search`)

**Decision: Dedicated Conversational AI Search Page without Manual Filter or Sort Controls**
- Created `ChatSearchPage.jsx` component routed at `/chat-search` with sidebar navigation link "AI Search" (icon: 🤖).
- Dedicated page renders `ChatAssistant` (expanded by default) without `PropertyFilters` or `SortControls` manual form inputs.
- When `ChatAssistant` receives filter updates from the LLM, `ChatSearchPage` immediately executes `fetchProperties(filters)` without requiring manual user search button clicks.
- Implemented module-level caching (`chatSearchCache`) to preserve conversation and active property grid state across navigation cycles.
- Added comprehensive unit tests in `ChatSearchPage.test.jsx` verifying automatic API execution, component rendering, loading, error, and empty states.

**Decision: Conversational Sorting Field & Ordering Capabilities (`chat.js` & `ChatAssistant.jsx`)**
- Expanded system prompt in `chat.js` to instruct the LLM on sorting capabilities for `price`, `date` (Date Listed), `sqft`, `beds`, and `baths`.
- Defined clear ordering direction rules for the LLM: `asc` (Low to High / Oldest First) and `desc` (High to Low / Newest First).
- Updated `isKnownFilter` and `formatFieldName` in `ChatAssistant.jsx` to recognize `sortBy` and `sortOrder` filter keys and render visual highlight badges when sorting is auto-applied by the chatbot.

#### 2026-08-09 — Week 10: Dynamic Timezone Date Formatting & Conversational Filter Guards

**Decision: Local Midnight Construction for `YYYY-MM-DD` Date Strings (`format.js`)**
- JavaScript's standard `new Date("YYYY-MM-DD")` constructor parses date-only strings as UTC midnight (`00:00:00Z`). In timezones behind UTC (such as US Central UTC-5 or Eastern UTC-4), `toLocaleDateString()` converted UTC midnight to the previous evening (e.g. July 31st for August 1st).
- Updated `formatDate` to split `YYYY-MM-DD` and instantiate `new Date(year, month - 1, day)`, constructing the Date object at local midnight in the user's browser timezone.
- Using `toLocaleDateString(locale || undefined, ...)` dynamically formats dates matching the user's selected range across any global timezone.

**Decision: Conversational Filter Response Guard & Strict LLM Prompt Instruction (`chat.js`, `ChatAssistant.jsx`, `ChatSearchPage.jsx`)**
- Updated system prompt in `chat.js` to instruct the LLM to return `"filters": {}` when user sends conversational messages (e.g. "thank you", "thanks", "hello", "hi") and prohibit echoing unchanged filters.
- Added strict value-difference checking in `ChatAssistant.jsx` and `ChatSearchPage.jsx` using `new Set([...Object.keys(newFilters), ...Object.keys(activeFilters)])` so `onFiltersChange` and backend property re-fetches execute ONLY when filter values actually change.
- Ensures new filter requests (e.g. price change from $450k to $550k) execute immediately, while conversational follow-ups do not trigger redundant API queries.

#### 2026-08-09 — Week 9: Part B — Database Query Performance Optimization & EXPLAIN Analysis

**Decision: Sargable Column Equality vs Functional `LOWER()` in SQL (`properties.js`)**
- Wrapping `L_City` or `L_State` in `LOWER()` inside the SQL WHERE clause (`LOWER(L_City) = LOWER(?)`) broke B-Tree index accessibility, forcing MySQL into an index range scan on `L_SystemPrice` and memory evaluation of ~21,000 rows (taking ~5.7 seconds).
- Normalizing user input in JavaScript (`toTitleCase()`) combined with MySQL 8's case-insensitive default collation (`utf8mb4_0900_ai_ci`) allows direct SQL equality (`L_City = ?`), enabling instant index traversal on `idx_city` (~3.2 ms latency, >1,700x speedup).

#### 2026-08-25 — Week 8 & Week 10: Property Detail Column Curation, RESO String Formatting & Unit Test Suite

**Decision: PROPERTY_DETAIL_COLUMNS Array Curation & Targeted Field Exclusions (`properties.js`)**
- Configured `PROPERTY_DETAIL_COLUMNS` array in `properties.js` to serve as the single source of truth driving the single property endpoint (`GET /api/properties/:id`).
- Curated columns from `rets_property` SQL schema to return rich real estate data (architectural style, structure type, property condition, HOA details, heating/cooling, water source, roof, view, fireplace/interior/pool/community/security/spa/lot features, appliances, fencing, garage capacity, listing terms, disclosures, room type).
- Explicitly excluded 8 specific columns (`lotSizeAcres`, `lotSizeSquareFeet`, `storiesTotal`, `mainLevelBedrooms`, `halfBaths`, `countyOrParish`, `commonWalls`, `commonInterest`) to streamline the property detail card view.

**Decision: Server-Side RESO PascalCase String Formatting (`formatValueString`)**
- RESO/MLS database fields often store raw concatenated PascalCase strings without spaces or with unspaced commas (e.g. `CentralAir,EnergyStarQualifiedEquipment`).
- Implemented `formatValueString()` in `properties.js` to split PascalCase words and normalize comma spacing prior to JSON serialization.
- Defined `RAW_STRING_FIELDS` set (`listingId`, `displayId`, `address`, `city`, `state`, `zipCode`, `description`, `photos`, `status`, `parcelNumber`, `latitude`, `longitude`) to preserve raw format for image URLs, descriptions, IDs, and address fields.

**Decision: Long Date Formatting for `onMarketDate`**
- Formatted `onMarketDate` in `properties.js` using `toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })` so property detail payloads output formatted dates like `"August 25, 2026"`.

**Decision: Property Detail Unit Testing Strategy (`propertyDetail.test.js` & `PropertyDetailPage.test.jsx`)**
- Backend: Expanded `propertyDetail.test.js` to verify column selection in SQL queries, string formatting transformation, raw field preservation, and column removals.
- Frontend: Created `PropertyDetailPage.test.jsx` with Vitest and React Testing Library to test component rendering, loading spinner, error fallback UI, Property Details grid rendering with converted Title Case labels (`toLabel`), open house list, and favorite toggle button interaction.
- Total unit tests: **95 backend tests** (5 suites) and **82 frontend tests** (13 suites) passing with 100% success rate.

**Decision: Correlated `EXISTS` Subquery over Derived Table `LEFT JOIN (GROUP BY)` (`properties.js`)**
- Previously, `GET /api/properties` and `POST /api/properties/favorites` executed an inline derived table that aggregated all 4,282 rows of `rets_openhouse` using `GROUP BY L_DisplayId` into an internal temporary table (`Using temporary`) on every request.
- Replaced with `EXISTS (SELECT 1 FROM rets_openhouse WHERE oh.L_DisplayId = p.L_DisplayId AND ...)` which executes lightweight index lookups on `idx_L_DisplayId` solely for the 20 paginated results, completely eliminating temporary table materialization.

**Decision: Targeted Data Quality Constraints to Avoid Redundant SQL Regex Overhead (`properties.js`)**
- Express route validation already validates incoming filter formats (e.g., `city` matches `^[A-Za-z\s]+$`).
- Refactored `buildWhereClause()` so that when a specific filter is provided, redundant SQL regex checks on that column are skipped while maintaining data quality constraints when filters are absent.

**Decision: Exact Indexed Matching on Open Houses City Filter (`openhouses.js`)**
- Replaced `p.L_City LIKE '%...%'` with normalized exact equality `p.L_City = ?` and `p.L_State = ?`.
- Allows MySQL's query optimizer to use `idx_city` or composite indexes on `rets_property` during join resolution, dropping open house search latency from ~1,133 ms down to ~2.2 ms.

**Decision: Composite Indexes for Common Filter + Sort Combinations (`03_add_indexes.sql`)**
- Added `idx_city_price (L_City, L_SystemPrice)` on `rets_property` to eliminate filesort passes for city searches ordered by price.
- Added `idx_date_startTime_displayId (OpenHouseDate, OH_StartTime, L_DisplayId)` on `rets_openhouse` to support date range index scanning, date/time ordered retrieval, and property display ID joining in a single index structure.

#### 2026-08-09 — Request Logging Middleware Enhancement & React Error Boundary

**Decision: High-Precision Nanosecond Timing via `process.hrtime.bigint()` & `X-Response-Time` HTTP Header (`requestLogger.js`)**
- `Date.now()` is subject to clock drift and has millisecond precision that may round fast sub-millisecond responses to 0ms.
- Upgraded duration tracking in `requestLogger.js` to `process.hrtime.bigint()` for nanosecond precision converted to integer milliseconds.
- Attached `X-Response-Time: <ms>ms` response header using a wrapper around `res.writeHead`, ensuring clients and debugging proxies can inspect response duration directly without checking server logs.

**Decision: Lifecycle Listener Deduplication Guard on `finish` and `close` (`requestLogger.js`)**
- Express requests can finish normally (`finish` event) or abort prematurely due to client disconnections or socket resets (`close` event).
- Attached listeners to both `finish` and `close` with a `logged` boolean guard flag.
- Guarantees every completed or aborted request is timed and logged exactly once without duplicate terminal output.

**Decision: React 19 Class-Based `ErrorBoundary` with Actionable Recovery UI & Diagnostics (`ErrorBoundary.jsx`)**
- React functional components cannot catch rendering errors (React still requires class components with `static getDerivedStateFromError` and `componentDidCatch`).
- Built `<ErrorBoundary>` providing an actionable recovery card with three user choices: "Try Again" (`resetErrorBoundary`), "Reload Page" (`window.location.reload()`), and "Return to Home" (`/`).
- Included collapsible technical stack trace details for development debugging while keeping the primary UI clean, user-friendly, and styled according to design tokens (`ErrorBoundary.css`).

**Decision: Main Content Canvas Placement for `ErrorBoundary` in `App.jsx`**
- In `App.jsx`, placed `<ErrorBoundary>` inside `<main className="app-content">` wrapping `<Routes>`.
- Preserves the fixed `<Sidebar>` navigation bar even if an uncaught render error occurs on a specific route view, allowing users to safely navigate back to other views (e.g. from a failing Property Detail back to Search).

#### 2026-08-11 — LLM Sort Sync, Favorites Badge Consistency & Initial Page Data Pre-Caching

**Decision: Intercept `sortBy` & `sortOrder` in `handleChatFiltersChange` and `useEffect` Sync in `SortControls`**
- The LLM returns flat filter keys `{ sortBy: "price", sortOrder: "asc" }`, whereas `SortControls` and the backend query builders expect array structures `sortCriteria: [{ field: "price", order: "asc" }]`.
- Intercepted `sortBy` and `sortOrder` in `handleChatFiltersChange` across `ListingsPage`, `FavoritesPage`, `OpenHousesPage`, and `ChatSearchPage` to convert them into `sortCriteria` arrays and update state.
- Added a `useEffect` inside `SortControls.jsx` listening to `sortCriteria` changes so local dropdown selections resync visually when the LLM modifies sorting.

**Decision: Custom In-Tab DOM Event `favoritesUpdated` for Badge Sync (`useFavorites.js`)**
- Browser `storage` events only fire across separate browser tabs/windows when `localStorage` is mutated, leaving in-tab component state (such as the `<Sidebar>` badge on the Favorites page) out of sync when a favorite is toggled.
- Added `window.dispatchEvent(new CustomEvent('favoritesUpdated'))` in `writeFavorites()`.
- Added a listener for `favoritesUpdated` in `useFavorites.js` alongside the `storage` event listener, enabling instant same-tab badge synchronization without unnecessary component coupling.

**Decision: Promise-Based Startup Pre-Caching Strategy (`prefetchCache.js` & `main.jsx`)**
- Fired initial default REST requests (`GET /api/properties?limit=20&offset=0`, `POST /api/properties/favorites?limit=20&offset=0`, `GET /api/openhouses?limit=20&offset=0`, and `GET /api/openhouses?limit=500...`) in parallel in `prefetchCache.js` before React renders in `main.jsx`.
- Stored active `Promise` instances (`prefetchPromises`) instead of plain response data to solve race conditions: if a user navigates to `ListingsPage` or `ChatSearchPage` while the 11-second properties query is still in-flight, the component attaches a `.then()` listener to the active Promise rather than triggering a duplicate 11-second backend fetch.
- Preserved `prefetchPromises` so multiple pages (e.g. both `ListingsPage` and `ChatSearchPage`) can attach listeners to and consume the same initial prefetched response cleanly.

**Decision: Dual Parse-Time and Runtime `onError` 404 Image Filtering (`PropertyImageGallery.jsx`, `PropertyImageCarousel.jsx`, `format.js`)**
- External image CDN servers sometimes return HTTP 404 with JSON bodies like `{"code":"404","message":"Media record not found!"}` instead of image data.
- Handled this at two layers:
  1. **Parse-time filter (`parsePhotos`)**: Filters out string items containing `"code":"404"` or `"Media record not found!"` when parsing JSON photo arrays.
  2. **Runtime `onError` filter (`PropertyImageGallery.jsx` & `PropertyImageCarousel.jsx`)**: Added `onError={() => handleImageError(url)}` handlers to main gallery images, thumbnails, lightbox images, and card carousel images. Failed URLs are added to `failedPhotos` state and filtered out from `validPhotos`, cleanly recalculating photo indexes and falling back to `PLACEHOLDER_IMG` ('No Photo') if all images fail.

#### 2026-08-13 — AI Support Filter Fixes, Persistent Chat State & Sort Criteria Caching

**Decision: Per-Page Context Module Cache for Chat Conversation Memory (`ChatAssistant.jsx`)**
- Stored chat messages in a module-level `chatHistoryCache` object keyed by `pageContext` (`listings`, `openhouses`, `favorites`, `chatsearch`).
- Restores page-specific conversation history when navigating between pages, preventing loss of chat history when components unmount and remount.
- Purges only the active page context cache entry when "Clear conversation" is clicked.

**Decision: System Prompt Rules for City Full Name, State 2-Letter Upper, and Filter Replacement (`backend/src/routes/chat.js`)**
- Added explicit instructions in `buildSystemPrompt()`:
  - **City Formatting Rule**: `city` filter MUST always be full Title-Case city names (e.g. "LA" → "Los Angeles", "NYC" → "New York"). Shorthand abbreviations are forbidden.
  - **State Formatting Rule**: `state` filter MUST always be 2 uppercase capital letters (e.g. "CA", "NY").
  - **Filter Replacement vs Incremental Updates**: LLM evaluates active filter values from context. For filter setting/replacement requests ("set filter to..."), omitted active filter keys are set to `""` (empty string) in `filters` to reset them on the frontend. For incremental requests ("add...", "also..."), existing active filters are preserved.

**Decision: Sort Criteria Preservation & Pending Filter Synchronization (`ListingsPage.jsx`, `FavoritesPage.jsx`, `OpenHousesPage.jsx`)**
- Updated `handleSearch`, `handleClear`, and `loadOpenHouses` so active `sortCriteria` is preserved when users apply/clear property filters or select date ranges/calendar slots.
- Updated `handleSortChange` across `ListingsPage.jsx`, `FavoritesPage.jsx`, and `OpenHousesPage.jsx` so that clicking the Sort button in `SortControls` applies both pending filter form inputs (`filterFormValues`) and the new `sortCriteria` simultaneously, setting `activeFilters(filterFormValues)`.
- Rendered `<SortControls>` unconditionally below filters across all pages for consistent accessibility.
- Preserves active `sortCriteria` in module caches (`listingsCache`, `favoritesCache`, `openHousesCache`) across filter updates and route navigation, saving user time.

**Decision: Automatic Filter Reset on Chat Conversation Clear (`ChatAssistant.jsx`)**
- Updated `handleClearChat()` in `ChatAssistant.jsx` to call `onFiltersChange(getResetFilters(pageContext, filters))`.
- Clears active filter fields on the page so that `CURRENT FILTER VALUES` passed in the backend system prompt (`buildSystemPrompt`) resets to empty `{}`.
- Guarantees complete context isolation: starting a new conversation after clearing chat contains zero residual filter context from the previous chat session.

#### 2026-08-17 — Log Sanitization & Pre-Cloud Deployment Security Hardening

**Decision: Lightweight logger utility with built-in sensitive-value redaction (`backend/src/utils/logger.js`)**
- Created a single focused utility module instead of introducing a third-party logging library (e.g. winston, pino), following Ponytail principles: prefer standard libraries, avoid unnecessary dependencies, keep functions short and focused.
- `redactUrl()` uses a regex-based key matcher (`SENSITIVE_KEYS`) to mask query-string values for common secret patterns (key, token, secret, password, auth, authorization, api_key, apikey, access_token, refresh_token, email, ssn, credential) as `[REDACTED]`.
- `sanitizeError()` returns a generic safe message for HTTP responses, ensuring raw Error objects (containing SQL driver details, hostnames, ports, stack traces) never reach the client.

**Decision: Sanitize HTTP access logs via `redactUrl()` in `requestLogger.js`**
- URLs with sensitive query parameters (e.g. `?token=abc123&page=1`) are automatically masked before being written to stdout, preventing credential leakage in cloud log aggregation services (CloudWatch, Stackdriver, etc.).
- Non-sensitive parameters (city, limit, offset, sortBy, etc.) remain visible for debugging purposes.

**Decision: Remove raw `err.message` from all HTTP error responses**
- All route handlers (`health.js`, `chat.js`, `properties.js`, `openhouses.js`) now return generic, safe error messages to clients (e.g. `"Database connection unavailable"`, `"Failed to fetch properties"`) instead of raw `err.message` values that could expose database hostnames, port numbers, SQL driver versions, or connection pool details.
- Full error details are still logged server-side via `logger.error()` for debugging, but never sent in HTTP response bodies.

**Decision: Hide LLM API key configuration instructions from client responses (`chat.js`)**
- When `LLM_API_KEY` is missing or set to the placeholder value, the chat endpoint now returns HTTP 503 with `"Chat service is currently unavailable."` instead of HTTP 500 with `"LLM API key is not configured. Please set LLM_API_KEY in the backend .env file."`.
- Prevents exposing backend `.env` file structure, environment variable names, and configuration instructions to end users.

**Decision: Stop logging raw OpenRouter error response bodies and LLM output content**
- `chat.js` no longer logs the full `errorBody` from failed OpenRouter API calls or the raw `rawContent` from non-JSON LLM responses.
- Prevents leaking full prompt contents, API response details, or model output to cloud log streams.

**Decision: Conditionally render ErrorBoundary stack traces based on `import.meta.env.PROD`**
- In production builds, `error.message`, `error.stack`, and `errorInfo.componentStack` are hidden from end users.
- The "Show technical details" toggle button is only rendered in development mode.
- Prevents exposing React component hierarchy, internal file paths, and JavaScript stack traces to end users in production deployments.

**Decision: Sanitize `backend/.env` and extend `.gitignore` for cloud deployment**
- Replaced the live OpenRouter API key in `backend/.env` with the placeholder value `your_openrouter_api_key_here` to prevent credential leakage if the `.env` file is ever accidentally committed.
- Extended `.gitignore` to cover `frontend/.env`, `frontend/.env.local`, `backend/.env.local`, and root `.env.local` files.

**Decision: Sanitize server startup log message (`server.js`)**
- Changed startup log from `Server running on http://localhost:${PORT}` to `Server running on port ${PORT}`.
- Prevents exposing the internal hostname/URL pattern in cloud log streams, which could aid reconnaissance in cloud environments.

#### 2026-08-18 — Railway & Cloud Database Connection Flexibility

**Decision: Support Railway MySQL connection URLs and standard Railway env vars in `db.js`**
- Updated `backend/src/config/db.js` to dynamically detect connection URL strings (`MYSQL_URL`, `MYSQL_PUBLIC_URL`, `DATABASE_URL`, `DB_URL`) and pass them to `mysql2/promise` connection pool.
- Added fallback checking for Railway's default discrete environment variables (`MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT`) before defaulting to local dev variables (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`).
- Maintains 100% backward compatibility for local development (`npm run dev` and `docker-compose`) while enabling zero-config cloud deployments on Railway / Render.

#### 2026-08-26 — Property Listing Agent Details, Centered Stat Icons, Map Directions Address Link & Layout Updates

**Decision: Inclusion of Full Agent Contact Fields in `PROPERTY_DETAIL_COLUMNS` & `RAW_STRING_FIELDS` (`properties.js`)**
- Added `ListAgentFullName`, `ListAgentOfficePhone`, `ListAgentEmail`, `ListAgentDirectPhone`, and `ListOfficeEmail` to `PROPERTY_DETAIL_COLUMNS` in `properties.js`.
- Added all agent fields to `RAW_STRING_FIELDS` so string formatting logic (`formatValueString`) preserves email addresses, phone numbers, and agent names without word-splitting.

**Decision: Dedicated "Listing Agent Information" Card Above Description (`PropertyDetailPage.jsx`)**
- Excluded agent fields from generic Property Details grid by registering them in `SPECIAL_FIELDS`.
- Created a structured "Listing Agent Information" card rendered directly **on top of the Description section** when agent details are present, providing easy contact access for buyers.

**Decision: Centered Stat Box Icons & "Square Feet" Labeling (`PropertyDetailPage.jsx` & `PropertyDetailPage.css`)**
- Added descriptive SVG icons to Beds, Baths, Square Feet, and Year Built stat boxes.
- Updated label from `Sqft` to `Square Feet`.
- Styled `.detail-page__stats` and `.detail-page__stat` using flexbox vertical and horizontal centering (`align-items: center; justify-content: center; text-align: center`) so stat icons, values, and labels sit perfectly centered inside the dark container box.

**Decision: Address-Based Google Maps Link (`L_Address`) & Flex Header Layout (`PropertyMap.jsx` & `PropertyMap.css`)**
- Confirmed map iframe rendering remains guarded by `if (!latitude || !longitude) return null;`.
- Changed `directionsUrl` in `PropertyMap.jsx` to use `encodeURIComponent(address)` (`L_Address` with city/state) instead of raw coordinates so opening Google Maps navigates directly to the street address.
- Created `.property-map__header` flexbox container placing the "Location" title on the left and the "📍 Get Directions" link on the right side of the same line above the map.

#### 2026-08-27 — Mobile & Smartphone View Optimization

**Decision: Fixed Bottom Navigation Bar on Mobile Screens (`<= 768px`) (`Sidebar.css`)**
- Replaced horizontally crowded top text buttons with a fixed bottom navigation bar (`.sidebar__nav`) featuring icons (`🏠`, `🔍`, `🤖`, `❤️`, `📅`), compact labels, and live favorite count badges on screens $\le 768\text{px}$.
- Separated brand logo (`.sidebar__brand`) into a fixed glassmorphic top header bar (`54px`), maintaining clean brand identity while offering single-thumb mobile navigation.

**Decision: Content Padding Offsets & Momentum Scroll Container (`App.css`)**
- Added `padding-top: 54px; padding-bottom: 74px` to `.app-content` on mobile screens $\le 768\text{px}$ so page content and buttons are never covered by fixed top/bottom headers.
- Enabled `-webkit-overflow-scrolling: touch` and `overflow-x: hidden` to eliminate horizontal scroll glitches and ensure native momentum scrolling.

**Decision: Touch-Friendly Tap Targets ($\ge 44\text{px}$) & Active Touch Feedback**
- Standardized touch target sizes ($\ge 44\text{px}$) across favorite heart buttons, filter search/clear actions, sort dropdowns, and chat inputs.
- Applied `:active { transform: scale(0.98); }` and `-webkit-tap-highlight-color: transparent` across interactive components for native smartphone touch responsiveness.

**Decision: Horizontal Touch Scroll Container for Open Houses Calendar (`OpenHousesPage.css`)**
- Wrapped `react-big-calendar` in an `overflow-x: auto; -webkit-overflow-scrolling: touch` container on screens $\le 640\text{px}$.
- Allows smooth horizontal swiping across the monthly calendar grid without forcing document-level horizontal scroll.

#### 2026-08-30 — Full-Canvas Page Expansion (1600px), Responsive Grid Auto-Filling & Mobile Sort Redesign

**Decision: Unified Full-Canvas Page Expansion with `max-width: 1600px` and `margin: 0 auto` (`*.css`)**
- On wide desktop monitors (>1200px), `.app-layout` allocates `260px` for `.sidebar` and `1fr` (~1180px–1660px+) for `.app-content`.
- Rather than constraining Introduction (`960px`), Property Detail (`1200px`), or Favorites (`1400px`) to narrower widths, all page containers (`.intro-page`, `.detail-page`, `.favorites-page`, `.listings-page`, `.openhouses-page`, `.chat-search-page`) were unified to `padding: 40px 40px 48px; max-width: 1600px; margin: 0 auto;`.
- Ensures visual consistency across the application so navigating between Search, Introduction, AI Search, Open Houses, Favorites, and Property Details provides an expansive, centered, and balanced presentation.

**Decision: Dynamic Auto-Filling Grid Columns (`repeat(auto-fill, minmax(320px, 1fr))`) over Hardcoded 3-Column Templates**
- Hardcoded 3-column definitions (`repeat(3, 1fr)`) stretched cards unnaturally on ultra-wide screens and squeezed them on intermediate widths (900px–1200px).
- Replaced with `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))` across `ListingsPage.css`, `OpenHousesPage.css`, `ChatSearchPage.css`, and `FavoritesPage.css`.
- The browser automatically calculates the optimal column count (1 to 4 columns) based on available container width, filling space gracefully.

**Decision: Card Enclosure and Responsive 2-Column Grid for Sort Controls (`SortControls.jsx` & `SortControls.css`)**
- Previously, `SortControls` rendered as a loose row of dropdowns that collapsed into 5 tall, stacked rows on mobile screens ($\le 768\text{px}$), creating a cluttered vertical layout.
- Wrapped `SortControls` in a themed surface card (`background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 14px; padding: 16px 20px;`) matching `PropertyFilters`.
- Added a title header (`⇅ Sort Listings`) with an active sort counter badge (`X active`).
- Transformed mobile layout into a compact **2-column responsive grid** (`repeat(2, 1fr)`) with uppercase labels above inputs and subtle active border glow (`.sort-controls__select--active`).
- Redesigned action buttons on mobile into a full-width side-by-side flex layout with 42px touch tap targets.

#### 2026-08-30 — Mobile Detail Page Sequence, Photo Swipe Navigation & Targeted Smooth Scrolling

**Decision: CSS `display: contents` and Flexbox `order` for Mobile Detail Flow (`PropertyDetailPage.jsx`, `PropertyDetailPage.css`)**
- On desktop, property details use a 2-column layout (Left: Gallery + Details; Right: Main Info + Description; Bottom: Map + Open Houses).
- Mobile requirements required a specialized single-column sequence: 1. Picture $\rightarrow$ 2. Open House $\rightarrow$ 3. Overall Content $\rightarrow$ 4. Property Details $\rightarrow$ 5. Description $\rightarrow$ 6. Location Map.
- Rather than duplicating DOM elements with conditional React rendering, `.detail-page__layout`, `.detail-page__gallery-col`, and `.detail-page__info-col` use `display: contents;` on screens $\le 900\text{px}$, allowing `.detail-page` to assign numeric `order` values directly to the sections. Desktop layout remains fully intact with zero layout shifts.

**Decision: Native Touch Swipe Gestures & Overlay Arrow Controls (`PropertyImageGallery.jsx`, `PropertyImageGallery.css`)**
- Mobile users frequently browse photo galleries by swiping left and right.
- Added `onTouchStart` and `onTouchEnd` gesture listeners calculating horizontal delta ($\Delta X$) with a $35\text{px}$ threshold on both the main gallery image and the full-screen lightbox.
- Added overlay previous/next arrows and a photo counter badge (`📷 X / Total`) with `e.stopPropagation()` so users can also tap or swipe without accidentally opening the lightbox.
- Enhanced thumbnail strip with `scroll-snap-type: x mandatory` and automatic `scrollIntoView` centering for the active thumbnail.

**Decision: Targeted Element Scrolling over Window Top Scrolling (`*.jsx`)**
- Previously, applying sort or changing pages dispatched `window.scrollTo({ top: 0, behavior: 'smooth' })`, which pulled the user's viewport all the way above headers and filters on long pages.
- Replaced with element-level smooth scrolling targeting `#sort-controls` on sort changes and `#pagination-top` on pagination page transitions, keeping the user anchored to relevant content.

#### 2026-08-30 — Backend Render CORS Security Hardening & Vercel Origin Whitelisting

**Decision: Strict Whitelist & Pattern-Based CORS Origin Enforcement (`backend/src/app.js`)**
- Default `cors()` middleware enables open `Access-Control-Allow-Origin: *`, which permits any unauthorized third-party website to make cross-origin requests to the Render backend API.
- Implemented a secure origin validator in `backend/src/app.js` with:
  1. Whitelisted canonical production domain: `https://propertysearchsdeintern.vercel.app`.
  2. Whitelisted preview deployment snapshot: `https://propertysearchsdeintern-hsujzxyf0-franghias-projects.vercel.app`.
  3. Dynamic regex pattern: `/^https:\/\/propertysearchsdeintern.*\.vercel\.app$/` to safely allow future feature branch/PR preview deployments under your Vercel team without requiring manual backend redeployments.
  4. Local development ports (`localhost:5173`, `localhost:3000`).
  5. Permission for requests with no `Origin` header (such as Vercel serverless edge rewrites proxying `/api/*`, server-to-server calls, curl, and health monitors).
- Unauthorized origins are rejected with `403 Forbidden` and a sanitized error payload.

**Decision: Tiered Anti-Scraping Rate Limiting & Reverse Proxy Trust (`backend/src/middleware/rateLimiter.js`)**
- Direct public APIs without rate limits are vulnerable to automated scrapers executing bulk pagination loops and malicious bots flooding LLM chatbot endpoints to drain OpenRouter credits.
- Implemented two-tiered rate limiting with `express-rate-limit`:
  1. `apiLimiter`: 300 requests per 15-minute window for `/api/*` endpoints to prevent database connection exhaustion and mass data scraping.
  2. `chatLimiter`: 15 requests per minute for `/api/chat` to protect LLM token quotas.
- Enabled `app.set('trust proxy', 1)` on Express to ensure client IP addresses are correctly extracted from `X-Forwarded-For` headers behind Render's reverse proxy load balancers.
- Uses standard IETF `draft-7` headers (`RateLimit`, `RateLimit-Policy`) for standards compliance.