# IDXExchange — Application Data & User Flow

This document details the user navigation flow, component interactions, and data/state flow across the IDXExchange full-stack application.

---

## 1. Global Navigation Flow
The application uses a split-screen dashboard architecture (`App.jsx` + `Sidebar.jsx`). The sidebar remains persistent across all routes while page views dynamically render in the main canvas wrapped by `<ErrorBoundary>` (`ErrorBoundary.jsx`). If an unhandled render error occurs in any view, the Error Boundary catches the crash and displays an actionable recovery UI ("Try Again", "Reload Page", "Return to Home", and technical stack trace) without disrupting the sidebar.

```
                    ┌─────────────────────────┐
                    │      User Session       │
                    └────────────┬────────────┘
                                 │
     ┌───────────────────────────┼───────────────────────────┬───────────────────────────┐
     ▼                           ▼                           ▼                           ▼
┌───────────┐               ┌───────────┐               ┌───────────┐               ┌───────────┐
│     /     │               │  /search  │               │ /favorites│               │/openhouses│
│ Intro     │               │ Search    │               │ Favorites │               │ OpenHouse │
│ Page      │               │ Page      │               │ Page      │               │ Calendar  │
└───────────┘               └─────┬─────┘               └─────┬─────┘               └─────┬─────┘
                                  │                           │                           │
                                  └─────────────┬─────────────┘                           │
                                                ▼                                         │
                                   ┌─────────────────────────┐                            │
                                   │  Property Card Click    │                            │
                                   │  (opens in new tab)     │                            │
                                   └────────────┬────────────┘                            │
                                                ▼                                         │
                                   ┌─────────────────────────┐                            │
                                   │ /property/:id           │◄───────────────────────────┘
                                   │ Property Detail Page    │
                                   └─────────────────────────┘
```

---

## 2. Page Specifications & User Flows

### A. Introduction Page (`/`)
- **User Action**: Land on home page or click "Introduction" in sidebar.
- **Content**: Hero banner highlighting platform capabilities, value proposition cards, CTA button directing to `/search`.

### B. Search Listings Page (`/search`)
- **User Action**: Search and filter property listings with real-time feedback and optional AI chatbot assistance.
- **User Flow**:
  1. Initial load fetches default paginated listings from `GET /api/properties?limit=20&offset=0`.
  2. **In-Memory Caching**: Results, pagination, sort, and form state are saved in `listingsCache`. Re-visiting the page restores state without network requests.
  3. **AI Chatbot Assistance**: User can open `ChatAssistant` above search filters to describe desired properties in natural language. Chatbot populates filter inputs (city, state, zipcode, price, beds, baths) with visual field highlights. Each page maintains an independent conversation history. Message auto-scrolling is scoped strictly inside the chat container (`scrollTop`), preventing window/page scrolling.
  4. **Filtering**: Submitting `PropertyFilters` updates search parameters (city, zipcode, minPrice, maxPrice, beds, baths) and resets view to Page 1.
  5. **Multi-Column Sorting**: User selects sort fields and direction (Asc/Desc) via `SortControls`. Sort criteria persist across pagination changes but reset when filter inputs change.
  6. **Favoriting**: Toggling the heart icon (♡ / ♥) on any card calls `useFavorites` hook to update `localStorage` and update live sidebar badge counter.
  7. **Card Navigation**: Clicking a card opens `/property/:id` in a new tab.

### C. AI Conversational Search Page (`/chat-search`)
- **User Action**: Dedicated natural language property search where chatbot filter suggestions directly update property listings without manual form confirmation.
- **User Flow**:
  1. Initial load fetches default paginated listings from `GET /api/properties?limit=20&offset=0`.
  2. **In-Memory Caching**: State is saved in module-level `chatSearchCache`. Re-visiting the page restores previous conversation and listings.
  3. **Direct AI Execution**: Embedded `ChatAssistant` (expanded by default) receives user prompts and gets filter/sort parameters from `POST /api/chat`.
  4. **No Manual Forms**: `PropertyFilters` and `SortControls` forms are omitted. When the chatbot returns updated filter or sort parameters (`sortBy` and `sortOrder` for Price, Date Listed, Sqft, Beds, Baths), the page immediately re-executes `fetchProperties(filters)` and updates the property grid in real time.
  5. **Conversational Response Guard**: Conversational messages (e.g. "thank you", "thanks", "hello") return `filters: {}`. The page guards against executing redundant backend property requests (`GET /api/properties`) when filter values have not changed.
  6. **Pagination**: Users can paginate through AI-filtered results via top and bottom `Pagination` controls.

### D. Favorites Page (`/favorites`)
- **User Action**: Manage bookmarked properties with chatbot, filters, and sorting.
- **User Flow**:
  1. Hook `useFavorites` reads property IDs array from `localStorage`.
  2. **In-Memory Caching**: Saved results and filter inputs are cached in `favoritesCache`. Re-visiting the page restores state without re-fetching unless favorites array or filters change.
  3. `POST /api/properties/favorites` posts ID list with active filter/sort/pagination query params.
  4. **Instant Removal**: Unfavoriting a property card immediately shifts remaining cards left and updates the list total without full reload.
  5. **Remove All**: Header button clears all favorites from `localStorage` and empties grid state.

### E. Open Houses Page (`/openhouses`)
- **User Action**: Browse open houses and filter events using calendar, date range controls, chatbot, property filters, and sorting.
- **User Flow**:
  1. Initial page load fetches open house listings via `GET /api/openhouses` and populates the `react-big-calendar` with month events.
  2. **In-Memory Caching**: Results, calendar events, date ranges, and filter form inputs are saved in `openHousesCache`. Re-visiting the page restores calendar selection and cards without extra network requests.
  3. **AI Chatbot Assistance**: Independent `ChatAssistant` located above the calendar parses event dates (`startDate`, `endDate`), property attributes, and sorting criteria.
  4. **Calendar Range Selection**:
     - **1st Click**: Selects Start Date (highlighted with indicator dot and endpoint background).
     - **2nd Click**: Selects End Date (auto-swaps if selected before start date). Applies range filter (`startDate` & `endDate`) and updates open house grid.
     - **Re-click Endpoint**: Toggles/clears endpoint selection.
  5. **Direct Range & Property Filters**: Users can set manual start/end date inputs or use `PropertyFilters` located below the calendar.
  6. **Multi-Column Sorting**: `SortControls` allows sorting open house results by price, date, sqft, beds, baths.
  7. **Active Filter Chip**: Displays `📅 Filtering: <start> — <end>` with dynamic local timezone formatting and clear action.
  8. **Pagination**: Top and bottom `Pagination` controls with items-per-page selector (`[10, 20, 30, 40, 50]`).
  9. **Event Card Navigation**: Clicking any open house card or calendar event navigates directly to the property's detail page `/property/:id` in a new tab (`_blank`).

### F. Property Detail Page (`/property/:id`)
- **User Action**: View complete details of a specific property.
- **User Flow**:
  1. Route fetches single property via `GET /api/properties/:id` and open house schedules via `GET /api/properties/:id/openhouses`.
  2. **Gallery**: Main photo display with thumbnail bar and full-screen Lightbox modal.
  3. **Map**: Renders Google Maps Embed iframe using latitude & longitude coordinates.
  4. **Open House Schedule**: Lists upcoming and past open houses with status badges (`Active`, `Upcoming`, `Expired`).

---

## 3. Data & API Communication Flow

```
┌─────────────────────────┐
│     React Frontend      │ (ErrorBoundary wrapper)
└────────────┬────────────┘
             │ HTTP REST Requests (Vite proxy /api/* -> :5000)
             ▼
┌─────────────────────────┐
│     Express Server      │ (middleware: cors, requestLogger with ms duration + X-Response-Time)
└────────────┬────────────┘
             │ Parameterized SQL queries (mysql2 pool) / OpenRouter API (/api/chat)
             ▼
┌─────────────────────────┐
│   MySQL 8 (rets DB)     │ (tables: rets_property, rets_openhouse)
└─────────────────────────┘
  (Optimized B-Tree & composite indexes: idx_city, idx_city_price, idx_date_startTime_displayId)
```

### Endpoints:
- `GET /api/health` — DB connection sanity check.
- `GET /api/properties` — Search, filter, multi-sort, and `hasOpenHouse` indicator query (sub-5ms index-accelerated query).
- `POST /api/properties/favorites` — Fetch specific property IDs with search/sort capabilities.
- `GET /api/properties/:id` — Single property detail driven by `PROPERTY_DETAIL_COLUMNS`.
- `GET /api/properties/:id/openhouses` — Open house schedule for a single property.
- `GET /api/openhouses` — List and filter open houses by date range (`startDate`/`endDate`), property filters, and multi-column sorting (`sortBy`/`sortOrder`) with INNER JOIN to `rets_property`.
- `POST /api/chat` — Conversational AI search filter assistant proxying to OpenRouter (`cohere/north-mini-code:free`).

