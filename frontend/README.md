# IDXExchange — Frontend

React application built with Vite and React Router that displays property listings, AI chatbot search assistance, in-memory page caching, multi-column sorting, favorite bookmarks, open house calendar, and property detail pages from the backend API. Features a split-screen dashboard layout, photo carousels, full-screen galleries, interactive Google Maps, and open house schedules.

## File Structure

```
frontend/
├── index.html                        # HTML entry point — loads main.jsx
├── vercel.json                       # Vercel deployment config (API proxy rewrites + SPA fallback)
├── vite.config.js                    # Vite config — dev server, API proxy, Vitest config
├── .env                              # VITE_GOOGLE_MAPS_API_KEY (gitignored)
├── .env.example                      # Template for frontend environment variables
├── src/
│   ├── main.jsx                      # React entry — pre-caches default API queries and renders <App /> into #root
│   ├── App.jsx                       # React Router setup + ErrorBoundary
│   ├── api/
│   │   ├── propertyApi.js            # API client (fetchProperties, fetchFavoriteProperties, fetchPropertyById, fetchOpenHouses, fetchAllOpenHouses)
│   │   └── chatApi.js                # Chat API client (sendChatMessage)
│   ├── hooks/
│   │   └── useFavorites.js           # Favorites hook — localStorage + cross-tab & same-tab event sync
│   ├── utils/
│   │   ├── format.js                 # Format utilities (formatDate, formatPrice, formatTime, parsePhotos)
│   │   └── prefetchCache.js          # Promise-based initial page data pre-caching utility
│   ├── test/                         # Vitest unit & component tests (76 tests across 12 suites)
│   │   ├── ChatAssistantPersistence.test.jsx # Per-page chat persistence tests (4 tests)
│   │   ├── ChatSearchPage.test.jsx   # Dedicated Chat Search Page tests (7 tests)
│   │   ├── ErrorBoundary.test.jsx    # React Error Boundary & recovery UI tests (8 tests)
│   │   ├── format.test.js            # Format utility tests (7 tests)
│   │   ├── heartFavorite.test.jsx    # Heart favorite component tests across all pages (6 tests)
│   │   ├── openHousesApi.test.js     # Open Houses API tests (6 tests)
│   │   ├── Pagination.test.jsx       # Pagination tests (14 tests)
│   │   ├── prefetchCache.test.js     # Promise pre-cache tests (4 tests)
│   │   ├── propertyApi.test.js       # Property API tests (4 tests)
│   │   ├── PropertyFilters.test.jsx  # PropertyFilters tests (4 tests)
│   │   ├── SortControls.test.jsx     # SortControls tests (7 tests)
│   │   ├── useFavorites.test.js      # useFavorites hook tests (5 tests)
│   │   └── setup.js                  # Vitest setup — loads jest-dom matchers
│   ├── stylesheets/                  # CSS stylesheets for all components and pages
│   ├── components/                   # UI components (Sidebar, PropertyCard, PropertyFilters, SortControls, ChatAssistant,
│   │                                 #   Pagination, PropertyImageCarousel, PropertyImageGallery, PropertyMap, ErrorBoundary)
│   └── pages/                        # IntroductionPage, ListingsPage, ChatSearchPage, FavoritesPage, OpenHousesPage, PropertyDetailPage
```
## Available Scripts

- `npm run dev` — Starts Vite development server on `http://localhost:3000` with HMR
- `npm run build` — Builds production-ready static bundle in `dist/`
- `npm run preview` — Previews production build locally on `http://localhost:4173`
- `npm test` — Runs all 76 unit and component tests via Vitest (12 test suites)
- `npm run lint` — Runs oxlint fast code linter

