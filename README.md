# IDXExchange

A full-stack real estate listing platform with a searchable property grid, property detail pages with photos, and open house schedules.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (:3000)                         │
│                                                                 │
│   ┌──────────┐  ┌──────────────────────────────────────┐       │
│   │ Sidebar  │  │  Main Content Canvas                  │       │
│   │          │  │                                        │       │
│   │ • Intro  │  │  IntroductionPage (hero + features)    │       │
│   │ • Search │  │  ListingsPage (filters + card grid)    │       │
│   │          │  │    └── PropertyFilters                  │       │
│   │          │  │    └── Pagination (top)                 │       │
│   │          │  │    └── PropertyCard[]                   │       │
│   │          │  │    └── Pagination (bottom)              │       │
│   └──────────┘  └──────────────────────────────────────┘       │
│                                                                 │
│   fetch('/api/properties?city=Portland&beds=3')                 │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │
          │  Vite dev proxy (vite.config.js)
          │  /api/* → http://localhost:5000
          │
┌─────────▼───────────────────────────────────────────────────────┐
│                    Express Backend (:5000)                       │
│                                                                 │
│   server.js → app.js                                            │
│     ├── requestLogger (middleware)                               │
│     ├── /api/health       → health.js      → SELECT 1          │
│     └── /api/properties   → properties.js  → SELECT ... FROM   │
│              ├── /              (listing search + filters)       │
│              ├── /:id           (property detail)               │
│              └── /:id/openhouses (open house events)            │
│                        │                                        │
│                   db.js (connection pool)                        │
│                        │                                        │
└────────────────────────┼────────────────────────────────────────┘
                         │
                         │  mysql2/promise (port 3306)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  MySQL 8 Docker Container                        │
│                  (idx-mysql-local)                               │
│                                                                 │
│   Database: rets                                                │
│     ├── rets_property  (53,122 rows — listings, photos, coords) │
│     └── rets_openhouse (4,282 rows — open house events)         │
│                                                                 │
│   Imported from database/ SQL files on first container start    │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
IDXExchange/
├── backend/                  # Node.js + Express REST API
│   ├── src/
│   │   ├── server.js         # Entry point — starts Express
│   │   ├── app.js            # Express app (middleware + routes)
│   │   ├── config/db.js      # MySQL connection pool
│   │   ├── middleware/       # Request logger
│   │   └── routes/           # health.js, properties.js
│   ├── tests/                # Jest + Supertest (38 tests)
│   ├── .env                  # Backend env vars (gitignored)
│   └── package.json
│
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── main.jsx          # React entry point
│   │   ├── App.jsx           # Dashboard layout (sidebar + content)
│   │   ├── api/              # API client (fetchProperties) + tests
│   │   ├── utils/            # parsePhotos, formatPrice
│   │   ├── test/             # Vitest setup + Pagination tests (22 tests)
│   │   ├── stylesheets/      # All CSS (index, App, Sidebar, IntroductionPage,
│   │   │                     #   PropertyCard, PropertyFilters, ListingsPage, Pagination)
│   │   ├── components/       # Sidebar, PropertyCard, PropertyFilters, Pagination + tests
│   │   └── pages/            # IntroductionPage, ListingsPage
│   ├── vite.config.js        # Dev server + API proxy + Vitest config
│   └── package.json
│
├── database/                 # SQL imports (mounted into Docker)
│   ├── 01_rets_openhouse.sql
│   ├── 02_rets_property.sql
│   └── 03_add_indexes.sql
│
├── docs/                     # Project documentation
│   ├── ARCHITECTURE.md
│   ├── CODING_STANDARDS.md
│   ├── OVERVIEW.md
│   ├── TASKS.md
│   ├── SUPPORT_TASKS.md
│   ├── change_log.md
│   └── decision_log.md
│
├── docker-compose.yml        # MySQL 8 container config
├── .env                      # Docker env vars (gitignored)
└── .gitignore
```

## How the Pieces Connect

### 1. Database (MySQL in Docker)

Docker Compose starts a MySQL 8 container (`idx-mysql-local`) on port 3306. On first start, it automatically imports the SQL files from the `database/` directory via Docker's `/docker-entrypoint-initdb.d/` mechanism. This creates two tables:

- **`rets_property`** — 53,122 property listings with address, price, beds, baths, photos (JSON), coordinates, etc.
- **`rets_openhouse`** — 4,282 open house events linked to properties by `L_DisplayId`

### 2. Backend (Express API)

The Express server connects to MySQL using a connection pool (`db.js`). It exposes REST endpoints under `/api/`:

- **`GET /api/health`** — Runs `SELECT 1` to verify the database is reachable
- **`GET /api/properties`** — Queries `rets_property` with filters (city, price, beds, etc.) and pagination. Returns JSON with `total`, `limit`, `offset`, and `results` array
- **`GET /api/properties/:id`** — Fetches a single property by `L_DisplayId`
- **`GET /api/properties/:id/openhouses`** — Fetches open house events from `rets_openhouse`

Every request is logged by the `requestLogger` middleware with method, URL, status code, and duration.

### 3. Frontend (React + Vite)

The React app runs on port 3000 with a split-screen dashboard layout: a fixed sidebar on the left and a main content canvas on the right.

**Navigation** uses React state (`currentPage` in `App.jsx`) to swap between two pages:
- **Introduction** — hero section with headline, CTA, and feature cards
- **Search** — property filters + listings grid

The Vite dev server proxies any request starting with `/api` to the Express backend at `http://localhost:5000`.

The data flow through the frontend:

1. **`App`** renders `<Sidebar />` + the active page based on `currentPage` state
2. **`ListingsPage`** renders `<PropertyFilters />` + `<Pagination />` (top) above the grid, and `<Pagination />` (bottom) below the grid
3. User fills in filters (city, state, ZIP, price range, beds, baths) and clicks Search
4. **`PropertyFilters`** strips empty values and calls `onSearch(filters)`
5. **`ListingsPage`** resets to page 1, calls `fetchProperties({ limit, offset: 0, ...filters })`
6. **API client** (`propertyApi.js`) adds only non-empty filter values to the URL
7. **`ListingsPage`** receives the response and renders a `PropertyCard` for each result
8. User can change pages via `<Pagination />` — filters are preserved, only `offset` changes
9. User can change items per page (10/20/30/40/50) — resets to page 1, preserves filters
10. If no results match, a "No properties found" message is shown with a suggestion to adjust filters

### The full request lifecycle

```
User opens http://localhost:3000
  → Vite serves index.html + React app
  → React mounts <App /> with Sidebar + IntroductionPage
  → User clicks "Search" in sidebar or "Start Searching" CTA
  → App swaps to <ListingsPage />
   → useEffect calls fetchProperties({ limit: 20, offset: 0 })
   → Pagination renders below filters and below the grid (page 1 active)
   → User applies filters (e.g. city=Portland, beds=3)
   → PropertyFilters strips empty values, calls onSearch({ city: 'Portland', beds: '3' })
   → ListingsPage resets to page 1, fetchProperties({ limit: 20, offset: 0, city: 'Portland', beds: '3' })
   → fetch('/api/properties?limit=20&offset=0&city=Portland&beds=3')
  → Vite proxy forwards to http://localhost:5000/api/properties?...
  → Express requestLogger records the request
  → properties.js validates query params
  → properties.js builds SQL with data quality filters
  → mysql2 sends query to MySQL via connection pool
  → MySQL returns rows from rets_property
  → Express sends JSON response { total, limit, offset, results }
  → Vite proxy relays response to browser
   → ListingsPage updates state with results, computes totalPages
   → React renders PropertyCard components for matching properties
   → Each PropertyCard parses photos JSON and shows the first image
   → Pagination updates to reflect total pages (e.g. 1,2,3,4,5 … 24)
   → User clicks page 3 → fetchProperties preserves filters, sets offset=40
   → User changes per-page to 50 → resets to page 1, offset=0
   → requestLogger logs: [timestamp] GET /api/properties?... 200 45ms
```

## Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (for MySQL)
- [Node.js](https://nodejs.org/) 18+

### 1. Start the database

```bash
# From project root
docker compose up -d

# Wait for the import to complete (rets_property is ~632 MB, takes several minutes)
docker compose logs -f mysql
# Look for: "ready for connections"
```

### 2. Start the backend

```bash
cd backend
cp .env.example .env   # First time only — edit if needed
npm install
npm run dev            # Starts on http://localhost:5000
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev            # Starts on http://localhost:3000
```

Open `http://localhost:3000` to see the property listings.

### 4. Run tests

```bash
# Backend tests (Jest + Supertest)
cd backend
npm test               # Runs 38 tests

# Frontend tests (Vitest + React Testing Library)
cd frontend
npm test               # Runs 22 tests
```

## Environment Variables

### Root `.env` (Docker Compose)

| Variable | Description |
|----------|-------------|
| `MYSQL_ROOT_PASSWORD` | MySQL root password |
| `MYSQL_DATABASE` | Database name (default: `rets`) |
| `MYSQL_PORT` | Host port for MySQL (default: `3306`) |

### `backend/.env` (Express)

| Variable | Description |
|----------|-------------|
| `DB_HOST` | MySQL host (default: `localhost`) |
| `DB_USER` | MySQL user |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name |
| `DB_PORT` | MySQL port (default: `3306`) |
| `PORT` | Express server port (default: `5000`) |
