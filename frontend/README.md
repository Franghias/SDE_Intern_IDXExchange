# IDXExchange — Frontend

React application built with Vite and React Router that displays property listings and property detail pages from the backend API. Features a split-screen dashboard, property photo carousels, full-screen galleries, interactive Google Maps, and open house schedules.

## File Structure

```
frontend/
├── index.html                        # HTML entry point — loads main.jsx
├── vite.config.js                    # Vite config — dev server, API proxy, Vitest config
├── .env                              # VITE_GOOGLE_MAPS_API_KEY (gitignored)
├── .env.example                      # Template for frontend environment variables
├── src/
│   ├── main.jsx                      # React entry — renders <App /> into #root inside StrictMode
│   ├── App.jsx                       # React Router setup (BrowserRouter, Routes, Route)
│   ├── api/
│   │   ├── propertyApi.js            # API client (fetchProperties, fetchPropertyById, fetchOpenHouses)
│   │   └── propertyApi.test.js       # API client tests (4 tests)
│   ├── utils/
│   │   └── format.js                 # parsePhotos(), formatPrice(), formatTime(), formatDate()
│   ├── test/
│   │   └── Pagination.test.jsx       # Pagination tests (14 tests)
│   │   └── propertyApi.test.js       # Property API tests (4 tests)
│   │   └── PropertyFilters.test.jsx  # PropertyFilters tests (4 tests)
│   │   └── setup.js                  # Vitest setup — loads jest-dom matchers
│   ├── stylesheets/
│   │   ├── index.css                 # Global design tokens + CSS reset
│   │   ├── App.css                   # Dashboard grid layout
│   │   ├── Sidebar.css               # Sidebar nav styles
│   │   ├── IntroductionPage.css      # Hero + feature cards
│   │   ├── PropertyCard.css          # Card styles + price/openhouse badges
│   │   ├── PropertyFilters.css       # Filter form layout + inputs
│   │   ├── ListingsPage.css          # Page layout + responsive grid
│   │   ├── Pagination.css            # Pagination controls + items-per-page dropdown
│   │   ├── PropertyDetailPage.css    # Property detail layout, stats, open house badges
│   │   ├── PropertyImageCarousel.css # Photo carousel overlay controls on listing cards
│   │   ├── PropertyImageGallery.css  # Main photo, thumbnail strip, full-screen lightbox
│   │   └── PropertyMap.css           # Google Maps Embed iframe + Get Directions link
│   ├── components/
│   │   ├── Sidebar.jsx               # Fixed left navigation bar (uses useNavigate/useLocation)
│   │   ├── PropertyCard.jsx          # Property card (target="_blank", carousel, Open House badge)
│   │   ├── PropertyFilters.jsx       # Filter form (7 inputs)
│   │   ├── Pagination.jsx            # Page navigation (sliding window + arrows)
│   │   ├── PropertyImageCarousel.jsx # Multi-photo carousel for cards with counter
│   │   ├── PropertyImageGallery.jsx  # Photo gallery + scrollable thumbnails + lightbox
│   │   └── PropertyMap.jsx           # Google Maps Embed API iframe component
│   └── pages/
│       ├── IntroductionPage.jsx      # Landing page — hero + features
│       ├── ListingsPage.jsx          # Search page — filters + pagination + card grid
│       └── PropertyDetailPage.jsx    # Detail page — gallery, specs, map, open houses
└── public/
    └── favicon.svg
```

## How It Works

### Render & Routing Flow

```
index.html
  → loads main.jsx
  → renders <App />
  → <App /> wraps layout with <BrowserRouter> and <Routes>
  → Sidebar uses useLocation() to highlight active navigation link
  → Routes:
      /             → <IntroductionPage />
      /search       → <ListingsPage />
      /property/:id → <PropertyDetailPage />
```

### `App.jsx` & Routing

`App.jsx` establishes the overall dashboard layout:
- A fixed `<Sidebar />` on the left (`260px` fixed column on desktop)
- A main content canvas on the right rendering the active route via React Router:
  - **`/`**: Introduction landing page
  - **`/search`**: Property listings page with filters & pagination
  - **`/property/:id`**: Property detail page (rendered when clicked from listings or opened directly)

### `Sidebar.jsx` — Navigation component

Fixed-width left sidebar using React Router `useNavigate` and `useLocation`:
- IDXExchange brand logo
- Navigation links: Introduction (`/`), Search (`/search`)
- Active link highlighted with primary color accent
- On mobile (≤768px), collapses to a horizontal top bar

### `IntroductionPage.jsx` — Landing page

Displays on `/`:
- **Hero section** — large gradient headline, explanatory subtext, "Start Searching" CTA button (navigates to `/search`)
- **Feature grid** — 4 cards showcasing platform features

### `ListingsPage.jsx` — Search page

Displays on `/search`:
- Integrates `<PropertyFilters />` and dual `<Pagination />` components (top and bottom)
- Renders a responsive grid of `<PropertyCard />` components
- Shows empty state ("No properties found") if filters return 0 results
- Manages pagination state (`currentPage`, `itemsPerPage`) and filter state

### `PropertyCard.jsx` — Listing Card component

Receives a property object and renders:
- **`PropertyImageCarousel`** — enables cycling through photos with prev/next arrows and a `"X / Y"` counter. Arrow clicks use `e.stopPropagation()` so they cycle photos without triggering link navigation.
- **Price badge** — USD formatted price tag
- **Open House badge** — green badge displayed at top-right if `property.hasOpenHouse` is true
- **Address & Stats** — street address, city, state, beds, baths, sqft
- **Link navigation** — standard `<a>` tag with `target="_blank"` so clicking opens the detail page (`/property/:id`) in a **new browser tab**.

### `PropertyDetailPage.jsx` — Detail page

Displays on `/property/:id`:
- Fetches property data (`fetchPropertyById`) and open house schedules (`fetchOpenHouses`) in parallel on mount
- **Left Column**:
  - `<PropertyImageGallery />`: Main image, scrollable thumbnail strip, and click-to-enlarge full-screen lightbox (supports Escape key, click-outside, and arrow keys).
  - **Property Details**: Dynamic grid rendering any extra fields returned by the backend `PROPERTY_DETAIL_COLUMNS` configuration.
- **Right Column**:
  - Price, Address, Stats bar (Beds, Baths, Sqft, Year Built), Description
- **Below Column Layout**:
  - `<PropertyMap />`: Interactive Google Maps iframe (rendered when latitude/longitude are present) with a "Get Directions" link.
- **Open Houses Section**:
  - List of open house events with formatted dates, times, agent remarks, and status badges:
    - 🟢 **Active**: green badge
    - 🔴 **Expired**: red badge
    - 🔵 **Upcoming**: blue badge

### `PropertyMap.jsx` — Map component

Renders an `<iframe>` using the Google Maps Embed API (`https://www.google.com/maps/embed/v1/place`).
- Reads API key from `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`.
- Only renders if both `latitude` and `longitude` are present.
- Includes a "Get Directions" link opening Google Maps in a new tab.

### `utils/format.js` — Shared utilities

| Function | Purpose |
|----------|---------| 
| `parsePhotos(str)` | `JSON.parse` a photos string into an array. Returns `[]` if null, empty, or invalid. |
| `formatPrice(price)` | Formats a number as USD (`459900` → `$459,900`). Returns `N/A` if null. |
| `formatTime(timeStr)` | Formats time strings like `"0 days 14:00:00"` to `"2:00 PM"`. |
| `formatDate(dateStr)` | Formats ISO date strings to readable format (`"Sat, Jun 15, 2026"`). |

## Setup

```bash
# Install dependencies
npm install

# Create .env from template and add your Google Maps API key
cp .env.example .env

# Start dev server (port 3000)
npm run dev

# Run tests (Vitest)
npm test

# Build for production
npm run build
```

> **Note:** The backend must be running on port 5000 for the API proxy to work during development.

## Testing

Tests use **Vitest** + **React Testing Library** + **jest-dom**.

```bash
npm test         # Single run (vitest run)
npx vitest       # Watch mode
```

| Test file | Tests | What's covered |
|-----------|-------|----------------|
| `propertyApi.test.js` | 4 | URL construction, filter inclusion, network errors, server errors |
| `PropertyFilters.test.jsx` | 4 | Renders inputs, onSearch values, empty exclusion, onClear reset |
| `Pagination.test.jsx` | 14 | Page numbers, disabled prev/next, page click, ellipsis, hidden when ≤1 page, aria-current, buildPageNumbers algorithm edge cases |
