# IDXExchange — Frontend

React application built with Vite and React Router that displays property listings, AI chatbot search assistance, in-memory page caching, multi-column sorting, favorite bookmarks, open house calendar, and property detail pages from the backend API. Features a split-screen dashboard layout, photo carousels, full-screen galleries, interactive Google Maps, and open house schedules.

## File Structure

```
frontend/
├── index.html                        # HTML entry point — loads main.jsx
├── vite.config.js                    # Vite config — dev server, API proxy, Vitest config
├── .env                              # VITE_GOOGLE_MAPS_API_KEY (gitignored)
├── .env.example                      # Template for frontend environment variables
├── src/
│   ├── main.jsx                      # React entry — renders <App /> into #root inside StrictMode
│   ├── App.jsx                       # React Router setup + ErrorBoundary
│   ├── api/
│   │   ├── propertyApi.js            # API client (fetchProperties, fetchFavoriteProperties, fetchPropertyById, fetchOpenHouses, fetchAllOpenHouses)
│   │   └── chatApi.js                # Chat API client (sendChatMessage)
│   ├── hooks/
│   │   └── useFavorites.js           # Favorites hook — localStorage + cross-tab sync
│   ├── utils/
│   │   └── format.js                 # parsePhotos(), formatPrice(), formatTime(), formatDate()
│   ├── test/
│   │   ├── ChatSearchPage.test.jsx   # Dedicated Chat Search Page tests (7 tests)
│   │   ├── ErrorBoundary.test.jsx    # React Error Boundary & recovery UI tests (8 tests)
│   │   ├── format.test.js            # Format utility tests (formatDate, formatPrice, formatTime, parsePhotos) (6 tests)
│   │   ├── openHousesApi.test.js     # Open Houses API tests (6 tests)
│   │   ├── Pagination.test.jsx       # Pagination tests (14 tests)
│   │   ├── propertyApi.test.js       # Property API tests (4 tests)
│   │   ├── PropertyFilters.test.jsx  # PropertyFilters tests (4 tests)
│   │   ├── SortControls.test.jsx     # SortControls tests (7 tests)
│   │   ├── useFavorites.test.js      # useFavorites hook tests (5 tests)
│   │   └── setup.js                  # Vitest setup — loads jest-dom matchers
│   ├── stylesheets/                  # CSS stylesheets (index, App, Sidebar, IntroductionPage,
│   │                                 # PropertyCard, PropertyFilters, SortControls, ChatAssistant, ListingsPage, ChatSearchPage,
│   │                                 # FavoritesPage, OpenHousesPage, Pagination, PropertyDetailPage,
│   │                                 # PropertyImageCarousel, PropertyImageGallery, PropertyMap, ErrorBoundary)
│   ├── components/
│   │   ├── Sidebar.jsx               # Navigation bar with live favorite count badge & AI Search link
│   │   ├── PropertyCard.jsx          # Card with image carousel, badges, and favorite heart button
│   │   ├── PropertyFilters.jsx       # Filter form (7 inputs, controlled/uncontrolled dual mode)
│   │   ├── SortControls.jsx          # Multi-column sort controls
│   │   ├── ChatAssistant.jsx         # Conversational AI chatbot for filter assistance (per-page memory)
│   │   ├── Pagination.jsx            # Page navigation (sliding window + arrows)
│   │   ├── PropertyImageCarousel.jsx # Multi-photo carousel for cards with counter
│   │   ├── PropertyImageGallery.jsx  # Photo gallery + scrollable thumbnails + lightbox
│   │   ├── PropertyMap.jsx           # Google Maps Embed API iframe component
│   │   └── ErrorBoundary.jsx         # Error Boundary component with rich recovery UI
│   └── pages/
│       ├── IntroductionPage.jsx      # Landing page — hero + features
│       ├── ListingsPage.jsx          # Search page — chatbot + filters + sort + pagination + grid
│       ├── ChatSearchPage.jsx        # AI Search page — chatbot (open by default) + direct API execution + grid
│       ├── FavoritesPage.jsx         # Favorites page — chatbot + saved listings, Remove All button, filters + sort
│       ├── OpenHousesPage.jsx        # Open Houses page — chatbot + calendar range picker + filters + sort + cards grid
│       └── PropertyDetailPage.jsx    # Detail page — gallery, specs, map, open houses, Save button
```

## Setup & Testing

```bash
# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev

# Run tests (Vitest — 61 tests across 9 suites)
npm test

# Build for production
npm run build
```

| Test file | Tests | What's covered |
|-----------|-------|----------------|
| `ErrorBoundary.test.jsx` | 8 | Render safe child, catch render crash, recovery UI ("Try Again", "Reload", "Home"), callbacks, custom fallbacks, stack trace toggle |
| `ChatSearchPage.test.jsx` | 7 | Render, auto API fetch, sorting, empty/error retry, conversational non-filter message guard |
| `format.test.js` | 6 | Dynamic timezone local date parsing, price formatting, time formatting, photo JSON parsing |
| `openHousesApi.test.js` | 6 | URL construction with startDate/endDate, limit/offset, error handling, empty string exclusion |
| `propertyApi.test.js` | 4 | URL construction, filter inclusion, network errors, server errors |
| `PropertyFilters.test.jsx` | 4 | Renders inputs, onSearch values, empty exclusion, onClear reset |
| `Pagination.test.jsx` | 14 | Page numbers, disabled prev/next, page click, ellipsis, hidden when ≤1 page, aria-current |
| `SortControls.test.jsx` | 7 | Render fields, order selection, onChange callback, tags, remove, clear, hide used |
| `useFavorites.test.js` | 5 | Empty initial, toggle add/remove, localStorage persistence, clearFavorites, cross-tab sync |

