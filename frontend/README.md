# IDXExchange — Frontend

React application built with Vite that displays property listings from the backend API.

## File Structure

```
frontend/
├── index.html                        # HTML entry point — loads main.jsx
├── vite.config.js                    # Vite config — dev server port + API proxy
├── src/
│   ├── main.jsx                      # React entry — renders <App /> into #root
│   ├── App.jsx                       # App root — header + ListingsPage
│   ├── api/
│   │   └── propertyApi.js            # API client — fetchProperties()
│   ├── utils/
│   │   └── format.js                 # parsePhotos(), formatPrice()
│   ├── stylesheets/
│   │   ├── index.css                 # Global design tokens + CSS reset
│   │   ├── App.css                   # App header styles
│   │   ├── PropertyCard.css          # Card styles + hover effects
│   │   └── ListingsPage.css          # Page layout + responsive grid
│   ├── components/
│   │   └── PropertyCard.jsx          # Single property card
│   └── pages/
│       └── ListingsPage.jsx          # Main listings page with grid
└── public/
    └── favicon.svg
```

## How It Works

### Render flow

```
index.html
  → loads main.jsx
  → renders <App />
  → <App /> renders header + <ListingsPage />
  → <ListingsPage /> calls fetchProperties() on mount
  → fetchProperties() sends GET /api/properties to Vite proxy
  → Vite proxy forwards to Express backend (localhost:5000)
  → Response comes back with { total, limit, offset, results }
  → <ListingsPage /> maps results into <PropertyCard /> components
  → Each <PropertyCard /> parses the photos JSON and displays the first image
```

### `main.jsx` → `App.jsx`

`main.jsx` mounts the React app into the `#root` div in `index.html`. It wraps `<App />` in `<StrictMode>` for development warnings.

`App.jsx` renders a simple layout:
- A branded header ("IDXExchange")
- `<ListingsPage />` as the main content

### `ListingsPage.jsx` — Page component

Manages three states:

| State | What renders |
|-------|-------------|
| **Loading** | Centered spinner with "Loading properties…" text |
| **Error** | Warning icon + error message (e.g., "Unable to connect to the server") |
| **Data** | Property count ("Showing 20 of 487 properties") + grid of PropertyCards |

On mount, it calls `fetchProperties({ limit: 20, offset: 0 })` inside a `useEffect`. A cancellation flag prevents state updates if the component unmounts before the fetch completes.

### `PropertyCard.jsx` — Card component

Receives a single property object as a prop and displays:
- **Photo** — first URL from the parsed `photos` JSON string (or a placeholder if unavailable)
- **Price badge** — formatted as USD, overlaid on the photo
- **Address** — street address with text overflow ellipsis
- **Location** — city, state, zip code
- **Stats** — beds · baths · sqft

Hover effect: the card lifts up (`translateY(-6px)`), shadow deepens, and the photo gently zooms in.

### `api/propertyApi.js` — API client

`fetchProperties({ limit, offset })` handles:
1. **Network errors** — if `fetch()` throws (backend unreachable), wraps it in a user-friendly message
2. **HTTP errors** — if `response.ok` is false, extracts the error message from the JSON body
3. **Success** — returns the parsed JSON response

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
| `--color-surface` | `#1a1a24` | Card background |
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

# Build for production
npm run build
```

> **Note:** The backend must be running on port 5000 for the API proxy to work during development.
