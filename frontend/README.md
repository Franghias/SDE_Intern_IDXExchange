# IDXExchange — Frontend

React application built with Vite that displays property listings from the backend API. Features a split-screen dashboard with sidebar navigation, an introduction page, and a search page with filters.

## File Structure

```
frontend/
├── index.html                        # HTML entry point — loads main.jsx
├── vite.config.js                    # Vite config — dev server, API proxy, Vitest config
├── src/
│   ├── main.jsx                      # React entry — renders <App /> into #root
│   ├── App.jsx                       # Dashboard layout — sidebar + content canvas
│   ├── api/
│   │   ├── propertyApi.js            # API client — fetchProperties()
│   │   └── propertyApi.test.js       # API client tests (4 tests)
│   ├── utils/
│   │   └── format.js                 # parsePhotos(), formatPrice()
│   ├── test/
│   │   └── setup.js                  # Vitest setup — loads jest-dom matchers
│   ├── stylesheets/
│   │   ├── index.css                 # Global design tokens + CSS reset
│   │   ├── App.css                   # Dashboard grid layout
│   │   ├── Sidebar.css               # Sidebar nav styles
│   │   ├── IntroductionPage.css      # Hero + feature cards
│   │   ├── PropertyCard.css          # Card styles + hover effects
│   │   ├── PropertyFilters.css       # Filter form layout + inputs
│   │   └── ListingsPage.css          # Page layout + responsive grid
│   ├── components/
│   │   ├── Sidebar.jsx               # Fixed left navigation bar
│   │   ├── PropertyCard.jsx          # Single property card
│   │   ├── PropertyFilters.jsx       # Filter form (7 inputs)
│   │   └── PropertyFilters.test.jsx  # PropertyFilters tests (4 tests)
│   └── pages/
│       ├── IntroductionPage.jsx      # Landing page — hero + features
│       └── ListingsPage.jsx          # Search page — filters + card grid
└── public/
    └── favicon.svg
```

## How It Works

### Render flow

```
index.html
  → loads main.jsx
  → renders <App />
  → <App /> renders <Sidebar /> + active page based on currentPage state
  → Sidebar has "Introduction" and "Search" nav links
  → Clicking "Search" swaps to <ListingsPage />
  → <ListingsPage /> renders <PropertyFilters /> + property grid
  → User fills in filters and clicks Search
  → PropertyFilters strips empty values and calls onSearch(filters)
  → ListingsPage calls fetchProperties({ limit: 20, offset: 0, ...filters })
  → fetchProperties() sends GET /api/properties with filter query params
  → Vite proxy forwards to Express backend (localhost:5000)
  → Response comes back with { total, limit, offset, results }
  → <ListingsPage /> maps results into <PropertyCard /> components
  → Each <PropertyCard /> parses the photos JSON and displays the first image
```

### `main.jsx` → `App.jsx`

`main.jsx` mounts the React app into the `#root` div in `index.html`. It wraps `<App />` in `<StrictMode>` for development warnings.

`App.jsx` renders a dashboard layout:
- A fixed `<Sidebar />` on the left (260px)
- A main content canvas on the right that shows either `<IntroductionPage />` or `<ListingsPage />`
- Navigation is state-based (`currentPage` variable) — no React Router yet

### `Sidebar.jsx` — Navigation component

Fixed-width left sidebar with:
- IDXExchange brand logo
- Navigation links: Introduction, Search
- Active link highlighted with primary color accent
- On mobile (≤768px), collapses to a horizontal top bar

### `IntroductionPage.jsx` — Landing page

Displays on first visit:
- **Hero section** — large gradient headline, explanatory subtext, "Start Searching" CTA button
- **Feature grid** — 4 cards showcasing platform features (Search & Filter, Real-Time Data, Photo Galleries, Open House Info)
- CTA navigates to the Search page via the `onNavigateToSearch` callback

### `ListingsPage.jsx` — Search page

Manages four states:

| State | What renders |
|-------|-------------|
| **Loading** | Centered spinner with "Loading properties…" text |
| **Error** | Warning icon + error message (e.g., "Unable to connect to the server") |
| **Data** | Property count + grid of PropertyCards |
| **Empty** | "No properties found" message with suggestion to adjust filters |

Integrates `<PropertyFilters />`:
- `handleSearch(filters)` updates active filters and re-fetches properties
- `handleClear()` resets filters and loads all properties
- Shows "(filtered)" tag on the property count when filters are active

### `PropertyFilters.jsx` — Filter form

7 filter inputs:

| Input | Type | Notes |
|-------|------|-------|
| City | Text | e.g. "Portland" |
| State | Text | e.g. "Oregon" |
| ZIP Code | Text | e.g. "97201" |
| Min Price | Number | Minimum listing price |
| Max Price | Number | Maximum listing price |
| Beds | Dropdown | Any, 1, 2, 3, 4, 5+ |
| Baths | Dropdown | Any, 1, 2, 3, 4+ |

- "Any" is the default for dropdowns — it maps to empty string (no filter)
- "5+" and "4+" are converted to `5` and `4` before sending to the API
- Empty values are excluded from the `onSearch` callback
- "Clear Filters" resets all inputs to defaults

### `PropertyCard.jsx` — Card component

Receives a single property object as a prop and displays:
- **Photo** — first URL from the parsed `photos` JSON string (or a placeholder if unavailable)
- **Price badge** — formatted as USD, overlaid on the photo
- **Address** — street address with text overflow ellipsis
- **Location** — city, state, zip code
- **Stats** — beds · baths · sqft

Hover effect: the card lifts up (`translateY(-6px)`), shadow deepens, and the photo gently zooms in.

### `api/propertyApi.js` — API client

`fetchProperties({ limit, offset, city, state, zipcode, minPrice, maxPrice, beds, baths })` handles:
1. **Filter params** — only non-empty values are added to the URL query string
2. **Network errors** — if `fetch()` throws (backend unreachable), wraps it in a user-friendly message
3. **HTTP errors** — if `response.ok` is false, extracts the error message from the JSON body
4. **Success** — returns the parsed JSON response

All fetch calls use relative paths (`/api/properties`). The Vite dev server proxy forwards these to the Express backend.

### `utils/format.js` — Shared utilities

| Function | Purpose |
|----------|---------| 
| `parsePhotos(str)` | `JSON.parse` a photos string into an array. Returns `[]` if null, empty, or invalid. |
| `formatPrice(price)` | Formats a number as USD (`459900` → `$459,900`). Returns `N/A` if null. |

### `stylesheets/index.css` — Design system

Defines CSS custom properties (design tokens) used by all components:

| Token | Value | Purpose |
|-------|-------|---------|
| `--color-bg` | `#0f0f13` | Page background |
| `--color-surface` | `#1a1a24` | Card/sidebar background |
| `--color-primary` | `#6366f1` | Accent / brand color |
| `--color-text` | `#f0f0f5` | Primary text |
| `--color-text-muted` | `#8888a0` | Secondary text |
| `--font-family` | Inter, system stack | Typography |

Components reference these tokens instead of hardcoding colors. Changing the theme is a single-file edit.

## Setup

```bash
# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev

# Run tests (Vitest)
npm test

# Build for production
npm run build
```

> **Note:** The backend must be running on port 5000 for the API proxy to work during development.

## Testing

Tests use **Vitest** + **React Testing Library** + **jest-dom**. Configuration is in `vite.config.js` under the `test` block.

```bash
npm test         # Single run (vitest run)
npx vitest       # Watch mode
```

| Test file | Tests | What's covered |
|-----------|-------|----------------|
| `propertyApi.test.js` | 4 | URL construction, filter inclusion, network errors, server errors |
| `PropertyFilters.test.jsx` | 4 | Renders inputs, onSearch values, empty exclusion, onClear reset |
