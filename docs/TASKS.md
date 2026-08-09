### WEEK 1: SETUP DATABASE
#### Requirements
- Start a MySQL 8 container named idx-mysql-local on port 3306 with a database called rets. (Use docker-compose)
- Import the schema from rets_property.sql and rets_openhouse.sql into the database
(run rest_openhouse.sql and rest_property.sql in the database directory)
#### Deliverables
- Show the database schema and verify that the database contains data by running some basic queries.


### WEEK 2: SETUP BACKEND + BASIC REST API
#### Requirements
- Initialize a Node.js project in a backend/ folder
- Install express, mysql2, dotenv, and cors. Install nodemon as a dev dependency
<!-- - Create an example .env file with my database credentials -->
<!-- - Create a README.md file to document the project -->
- Create a MySQL connection pool module
- Create a GET /api/health endpoint that queries the database and returns connection status
- Server must auto-restart on file changes during development
#### Deliverables
- npm run dev starts the server without errors
- GET /api/health returns { status: "ok", database: "connected" } when MySQL
is running
- GET /api/health returns a 500 error (not a crash) when MySQL is unreachable
- .env is listed in .gitignore


### WEEK 3: PROPERTY SEARCH ENDPOINT WITH FILTERS & INDEXING
#### Requirements
- Create a properties route file and mount it at /api/properties
- Implement GET /api/properties with pagination (limit and offset query params)
- Add filter support for: city, zipcode, minPrice, maxPrice, beds, baths
- Validate all query parameters — return 400 with a descriptive message for invalid inputs
- Create database indexes on the columns you filter by
- Measure query performance before and after adding indexes using EXPLAIN
#### Deliverables
- GET /api/properties returns 20 properties by default with a total count
- Pagination works: ?limit=10&offset=20 returns properties 21-30
- Filtering works: ?city=Portland returns only Portland properties
- Multiple filters combine: ?city=Portland&minPrice=300000&beds=3
- Invalid inputs return 400: ?minPrice=abc, ?limit=0, ?limit=200
- All filter values use parameterized queries (no string concatenation)
- SHOW INDEXES FROM rets_property shows your new indexes
- EXPLAIN shows your indexes are being used (key column is not NULL)
#### Example
When giving an example request to the API, use the following format:
```
GET /api/properties?city=Portland&minPrice=300000&beds=3&limit=20&offset=0
```

Response:
```
{
"total": 87,
"limit": 20,
"offset": 0,
"results": [...]
}
```


### WEEK 4: PROPERTY DETAIL & OPEN HOUSE ENDPOINTS
#### Requirements
- Implement GET /api/properties/:id — returns a single property or 404
- Implement GET /api/properties/:id/openhouses — returns open house events for a property
- Validate the listing ID parameter on both endpoints
- Add request logging middleware (method, URL, timestamp, response time)
#### Deliverables
- GET /api/properties/:id returns the full property object
- GET /api/properties/:id returns 404 with a helpful message for unknown IDs
- GET /api/properties/:id/openhouses returns an array (empty array is OK, not an error)
- Open houses are ordered by date and start time
- Malformed or oversized IDs return 400
- Every request prints a log line with method, URL, status code, and duration in ms
- Route order is correct — /openhouses must be registered before /:id


### WEEK 5: REACT SETUP + LISTINGS PAGE
#### Requirements
- Create a React app in a frontend/ folder
- Configure a proxy so API calls to /api/* go to your Express server
- Create an API client module with functions for fetching properties
- Build a ListingsPage component with a grid of PropertyCard components
- Each PropertyCard must display: first photo (parsed from L_Photos JSON array),
price, address, city/state, beds, baths, and sqft
- Handle loading and error states
#### Deliverables
- React app runs on port 3000 without errors
- Property grid shows cards with real data from the database
- L_Photos is correctly parsed as a JSON array — the first photo URL is displayed
- Loading state shows while data is fetching
- Error message shows if the backend is unreachable
- Property count (e.g. "Showing 20 of 487 properties") is displayed
- Cards have a hover effect
- API client handles HTTP errors and throws meaningful error messages
#### Example
When giving an example request to the API, use the following format:
```
GET /api/properties?limit=20&offset=0
```
Response for backend:
```
{
    "total": 487,
    "limit": 20,
    "offset": 0,
    "results": [
        {
            "propertyId": 100002222,
            "listPrice": 459900,
            "address": "123 Main St",
            "city": "Portland",
            "state": "OR",
            "postalCode": "97201",
            "bedrooms": 3,
            "bathrooms": 2,
            "sqft": 1500,
            "photos": ["https://example.com/photo1.jpg", ...]
        }
    ]
}
```


### WEEK 6: FILTERS UI + TESTING
#### Requirements
- Build a PropertyFilters component with inputs for: city, ZIP code, min price, max price, beds (dropdown), baths (dropdown)
- Integrate filters into the ListingsPage — searching updates the property list
- A "Clear Filters" button resets the form and reloads all properties
- Write 4 unit tests for your API client module
- Write 4 unit tests for the PropertyFilters component
#### Deliverables
- Filter form displays all six inputs
- Submitting the form fetches new results matching the filters
- Multiple filters can be combined
- Empty filter values are not sent to the API (simply add values to the URL if the user fills the input, else do not add)
- Clear button resets the form and results
- If no properties found, show a helpful message
- npm test passes all tests


### WEEK 7: PAGINATION UI + COMPONENT TESTING
#### Requirements  
- Add pagination state to ListingsPage (currentPage, itemsPerPage)
- Build a Pagination component that displays page numbers, previous/next
buttons, and ellipsis for large page counts
- Changing pages must scroll to top and preserve active filters
- Changing filters must reset to page 1
- Write tests covering all Pagination component behaviors
#### Deliverables
- Pagination controls appear below the property grid
- Previous is disabled on page 1; Next is disabled on the last page
- Clicking a page number navigates to that page
- Page numbers use ellipsis correctly for large counts (e.g. 1 ... 4 5 6 ... 24)
- Results summary shows "Showing X-Y of Z properties"
- Applying new filters resets to page 1
- Pagination is hidden when there is only one page
- All component tests pass


### WEEK 8: PROPERTY DETAIL PAGE END-TO-END
#### Requirements: 
- Install React Router and set up routes: / for ListingsPage, /property/:id for PropertyDetailPage
- Make property cards clickable — clicking navigates to the detail page
- Build PropertyDetailPage displaying: price, address, stats (beds/baths/sqft/year built), description, property details, and open houses
- Build a PropertyImageCarousel component for listing cards (multiple photos, prev/next arrows, counter)
- Build a PropertyImageGallery component for the detail page (main image, thumbnail strip, lightbox on click)
- Both photo components must parse L_Photos from its JSON array format
- Build a PropertyMap component using the Google Maps Embed API (iframe-based, no npm package)
- Display the map on the detail page using LMD_MP_Latitude and LMD_MP_Longitude
- Display open houses with date, start/end time, and remarks (remarks are inside the all_data JSON field)
- Add the key to frontend/.env as REACT_APP_GOOGLE_MAPS_API_KEY=your_key
- Restrict the key to localhost:3000 and the Maps Embed API only
### Deliverables:
- Clicking a card navigates to /api/properties/[listing-id]
- Back button returns to the listings page
- Detail page shows all property fields listed above
- PropertyImageCarousel: arrow buttons cycle through photos, counter shows X / Y
- PropertyImageCarousel: arrows do not navigate to the detail page (stopPropagation)
- PropertyImageGallery: thumbnail strip scrolls, clicking a thumbnail updates main image
- PropertyImageGallery: clicking main image opens a full-screen lightbox
- Lightbox closes on click-outside or Escape key; left/right arrows navigate photos
- PropertyMap renders an iframe with the correct property location
- Map only renders when both lat and lng are present
- Get Directions link opens Google Maps in a new tab
- Open houses show date, formatted times, and remarks if available
- If no open houses, shows "No open houses scheduled"
- Visiting /property/invalid-id shows an error, not a crash


### WEEK 9: Advanced Feature (Required) + Performance Optimization
#### Part A — Advanced Feature
##### 1. Sorting:

##### Requirements:
- Allow users to sort properties by price, date listed, square footage, beds, and baths.
- Backend: Accept `sortBy` and `sortOrder` query parameters
- Backend: Validate `sortBy` against a whitelist of actual column names from `rets_property` (not RESO names)
- Frontend: Add sort controls to the listings page
- Frontend: Sort state must be preserved when changing pages, but reset when filters change
⚠ The sort field whitelist must use the actual SQL column names (e.g. L_SystemPrice, not ListPrice). Using wrong names will silently return unsorted results.

##### Acceptance Criteria:
- Sorting by price low-to-high and high-to-low works correctly
- Sorting by date listed works correctly
- Invalid sortBy values are rejected with a 400 error
- Sort persists across page changes
- Sort resets when new filters are applied

##### 2. Favorites:

##### Requirements:
- Create a useFavorites custom hook that persists favorites in localStorage
- Add a heart button to each PropertyCard
- Heart click must not trigger card navigation (stopPropagation)
- Add a "Favorites" view that links to another page showing only saved properties

##### Acceptance Criteria:
- Favoriting a property persists across page refreshes
- Unfavoriting removes the property immediately from the Favorites view
- The heart icon shows filled/empty state correctly
- Favorites count is shown somewhere in the UI
- A custom hook is used (not inline localStorage calls in the component)

##### 3. Open House Calendar:

##### Requirements:
- Add a new backend endpoint: `GET /api/openhouses?startDate=&endDate=` supporting property filters (`city`, `state`, `zipcode`, `minPrice`, `maxPrice`, `beds`, `baths`) and multi-column sorting (`sortBy`, `sortOrder`).
- Build frontend `OpenHousesPage.jsx` using `react-big-calendar` with month view.
- Support 2-click interactive date range selection on the calendar (1st click = start date, 2nd click = end date with auto-swap, re-click = deselect) and manual start/end date inputs.
- Highlight days with events (`.calendar-day--has-event`), range endpoints (`.calendar-day--range-endpoint`), and interval days (`.calendar-day--in-range`).
- Style event pills by status (`.calendar-event--active`, `.calendar-event--upcoming`, `.calendar-event--expired`).
- Clicking an event opens the property detail page `/property/:id` in a new tab.
- Display open house card grid below calendar with photo carousel, price, status, address, date, time window, bed/bath/sqft specs, and OpenHouseType tag.
- Integrate `PropertyFilters` and `SortControls` components below the calendar with top and bottom pagination controls.
- Implement active filter chip (`📅 Filtering: ...`) with clear action and dynamic local timezone date formatting.
- Preserve view state across route navigation using module-level `openHousesCache`.
- Integrate `ChatAssistant` for natural language date and property filter queries.

##### Acceptance Criteria:
- Month view calendar renders open house events on their respective dates.
- Interactive 2-click slot selection applies date range filters immediately.
- Backend `GET /api/openhouses` accurately filters by date range and returns total counts.
- Event clicks and card clicks navigate to property detail pages in new tabs (`_blank`).
- Property filters and sort controls function seamlessly on open house listings.
- Filter and pagination state persists across component mount/unmount cycles via `openHousesCache`.


### WEEK 10: AI Conversational Chatbot Assistant, In-Memory Caching, Dedicated AI Search, Timezone Date Formatting & Conversational Guards
#### Requirements
- **Express LLM Proxy (`POST /api/chat`)**: Proxy to OpenRouter API (`cohere/north-mini-code:free`) configured via `LLM_API_KEY` and `LLM_MODEL`. Enforces security rules (blocks injections, jailbreaks, system commands, off-topic requests) and outputs structured JSON `{ message, filters }` for filter/sort fields (`city`, `state`, `zipcode`, `minPrice`, `maxPrice`, `beds`, `baths`, `startDate`, `endDate`, `sortBy`, `sortOrder`).
- **Conversational Chat Guard**: Instruct LLM in system prompt to set `"filters": {}` for greetings ("hi", "hello"), polite remarks ("thank you", "thanks"), small talk, or non-filter requests. Compare filter value differences in `ChatAssistant.jsx` and `ChatSearchPage.jsx` (`new Set([...Object.keys(newFilters), ...Object.keys(activeFilters)])`) so `onFiltersChange` and backend property fetches (`GET /api/properties`) execute ONLY when filter values actually change.
- **Dynamic Local Timezone Date Formatting**: Update `formatDate` in `frontend/src/utils/format.js` to parse `YYYY-MM-DD` date-only strings as local midnight (`new Date(year, month - 1, day)`), ensuring date range displays (`Filtering: ...`) match selected dates in the user's browser timezone without UTC offset shifts.
- **Dedicated AI Search Page (`/chat-search`)**: Route `/chat-search` with sidebar navigation link "AI Search" (🤖). Renders `ChatAssistant` expanded by default without manual filter/sort forms, executing property API searches directly upon chatbot filter updates.
- **In-Memory Component Page Caching**: Implement module-level cache variables (`listingsCache`, `favoritesCache`, `openHousesCache`, `chatSearchCache`) that survive React Router component unmounts, bypassing initial network requests when navigating back to visited routes.
- **Unit & Integration Testing**: 53 frontend tests pass across 8 test suites (`openHousesApi.test.js`, `propertyApi.test.js`, `PropertyFilters.test.jsx`, `Pagination.test.jsx`, `SortControls.test.jsx`, `useFavorites.test.js`, `ChatSearchPage.test.jsx`, `format.test.js`).

#### Deliverables
- `POST /api/chat` returns structured `{ message, filters }` JSON with strict safety enforcement.
- Conversational follow-ups (e.g. "thank you") return empty filters and do NOT trigger redundant property search queries.
- Filtering by date range (e.g. `2024-08-01` to `2024-08-31`) displays exact selected dates in any global timezone.
- `/chat-search` route and sidebar link render expanded AI chatbot and update results grid in real time.
- Navigating away and back to `/search`, `/favorites`, `/openhouses`, or `/chat-search` restores cached state without re-fetching API data.
- All 53 Vitest unit tests pass cleanly.


#### Part B — Performance Optimization
##### Requirements:
- Write a script to run EXPLAIN and EXPLAIN ANALYZE on complex filter queries and interpret the output (documenting what each column means).
- Eliminate query bottlenecks (such as non-sargable functional wrappers `LOWER()` on columns and temporary table materialization in derived joins).
- Add composite indexes for common filter and sort combinations (`idx_city_price`, `idx_date_startTime_displayId`) and measure improvement.
- Ensure all 79 backend tests and 53 frontend tests pass cleanly with sub-10ms query execution times.

##### Deliverables:
- Performance script `backend/tests/query_performance.js` runnable via `npm run perf` with detailed column documentation and live latency measurements.
- Composite indexes added to `database/03_add_indexes.sql` and applied to MySQL container.
- Query optimizations in `backend/src/routes/properties.js` and `backend/src/routes/openhouses.js` reducing search latency from ~5,747ms to ~3.2ms (>1,700x speedup).
- Comprehensive benchmark and score summary documented in `backend/OPTIMIZATION_REPORT.md`.


