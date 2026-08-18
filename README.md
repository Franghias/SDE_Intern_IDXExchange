# IDXExchange

A full-stack real estate listing platform with AI-assisted search filter assistant, in-memory page caching, searchable property grid, multi-column sorting, favorite property bookmarking, open house calendar with date range filtering, property detail pages with photo carousels, full-screen galleries, interactive Google Maps, and open house schedules.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (:3000)                         │
│                                                                 │
│   React Router (BrowserRouter) + ErrorBoundary                  │
│   ├── /           → IntroductionPage (hero + features)          │
│   ├── /search     → ListingsPage (chat assistant + filters/sort)│
│   │                 ├── ChatAssistant (collapsible AI chat)     │
│   │                 ├── PropertyFilters                         │
│   │                 ├── SortControls (multi-column)             │
│   │                 ├── Pagination (top & bottom)               │
│   │                 └── PropertyCard[] (target="_blank")        │
│   │                       ├── PropertyImageCarousel             │
│   │                       ├── Open House Badge (green)          │
│   │                       ├── Status Badge (Active/Pending)     │
│   │                       └── Favorite Heart Button (♡ / ♥)     │
│   │                                                             │
│   ├── /chat-search → ChatSearchPage (conversational AI search)  │
│   │                 ├── ChatAssistant (open by default)         │
│   │                 ├── Direct API execution on filter update   │
│   │                 ├── Pagination (top & bottom)               │
│   │                 └── PropertyCard[] (target="_blank")        │
│   │                                                             │
│   ├── /favorites  → FavoritesPage (saved listings view)         │
│   │                 ├── Remove All Button (header)              │
│   │                 ├── ChatAssistant & PropertyFilters         │
│   │                 ├── SortControls (multi-column)             │
│   │                 └── PropertyCard[] (instant list shift)     │
│   │                                                             │
│   ├── /openhouses → OpenHousesPage (calendar + filters + cards) │
│   │                 ├── ChatAssistant (AI dates + filters)      │
│   │                 ├── react-big-calendar (month view)         │
│   │                 ├── Date Range Filter (start/end inputs)   │
│   │                 ├── PropertyFilters & SortControls          │
│   │                 ├── Pagination (top & bottom)               │
│   │                 └── OpenHouseCard[] (date/time/status)      │
│   │                                                             │
│   └── /property/:id → PropertyDetailPage (opens in new tab)     │
│                         ├── Save / Saved Favorite Button        │
│                         ├── PropertyImageGallery (lightbox)     │
│                         ├── PropertyDetails (dynamic grid)      │
│                         ├── PropertyMap (Google Maps iframe)    │
│                         └── Open Houses (active/expired/upcom)  │
│                                                                 │
│   useFavorites Hook (localStorage persistence + cross-tab sync) │
│   ErrorBoundary (catches rendering crashes + recovery UI)       │
│                                                                 │
│   fetch('/api/properties?city=Portland&sortBy=price,date')      │
│   fetch('/api/properties/:id')                                  │
│   fetch('/api/properties/:id/openhouses')                       │
│   fetchFavoriteProperties({ ids, ...filters, sortCriteria })    │
│   fetchAllOpenHouses({ startDate, endDate, sortCriteria, ... }) │
│   sendChatMessage({ messages, currentFilters, pageContext })    │
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
│     ├── requestLogger (middleware + high-res ms + X-Response-Time)│
│     ├── /api/health       → health.js      → SELECT 1          │
│     ├── /api/chat         → chat.js        → OpenRouter API    │
│     ├── /api/properties   → properties.js  → SELECT ... FROM   │
│     │        ├── /              (search + hasOpenHouse + sort)  │
│     │        ├── /favorites     (POST: ID list query + sort)    │
│     │        ├── /:id           (driven by PROPERTY_DETAIL_COLS)│
│     │        └── /:id/openhouses (JOIN + status logic)          │
│     └── /api/openhouses   → openhouses.js  → INNER JOIN        │
│                  └── /         (date range + filters + sort)    │
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
│ └─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
IDXExchange/
├── backend/                  # Node.js + Express REST API
│   ├── src/
│   │   ├── server.js         # Entry point — starts Express
│   │   ├── app.js            # Express app (middleware + routes)
│   │   ├── config/db.js      # MySQL connection pool
│   │   ├── utils/logger.js   # Zero-dependency logger (URL redaction + error sanitization)
│   │   ├── middleware/       # Request logger (URL query redaction + duration + X-Response-Time)
│   │   └── routes/           # health.js, properties.js, openhouses.js, chat.js
│   ├── tests/                # Jest + Supertest (91 tests across 5 test suites)
│   ├── .env                  # Backend env vars (LLM_API_KEY, DB vars)
│   └── package.json
│
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── main.jsx          # React entry point — wraps App in StrictMode
│   │   ├── App.jsx           # React Router setup + ErrorBoundary
│   │   ├── api/              # API client (propertyApi, chatApi)
│   │   ├── hooks/            # useFavorites hook (localStorage + cross-tab sync)
│   │   ├── utils/            # parsePhotos, formatPrice, formatTime, formatDate, prefetchCache
│   │   ├── test/             # Vitest setup + tests (76 tests across 12 suites)
│   │   ├── stylesheets/      # All CSS stylesheets
│   │   ├── components/       # UI components (Sidebar, PropertyCard, PropertyFilters, ChatAssistant, ErrorBoundary, etc.)
│   │   └── pages/            # IntroductionPage, ListingsPage, ChatSearchPage, FavoritesPage, OpenHousesPage, PropertyDetailPage
│   ├── .env                  # VITE_GOOGLE_MAPS_API_KEY (gitignored)
│   ├── .env.example          # Template for frontend env vars
│   ├── vercel.json           # Vercel deployment config (API proxy rewrites + SPA fallback)
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
│   ├── LOCAL_RUN_GUIDE.md   # Dev vs Production local workflow & verification guide
│   ├── CLOUD_DEPLOYMENT_GUIDE.md # Railway + Render + Vercel deployment guide
│   ├── FILE_GUIDE.md        # Comprehensive file-by-file reference guide
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

- **`rets_property`** — 53,122 property listings with address, price, beds, baths, photos (JSON), coordinates, `StandardStatus`, etc.
- **`rets_openhouse`** — 4,282 open house events linked to properties by `L_DisplayId`

### 2. Backend (Express API)

The Express server connects to MySQL using a connection pool (`db.js`). It exposes REST endpoints under `/api/`:

- **`GET /api/health`** — Runs `SELECT 1` to verify the database is reachable
- **`GET /api/properties`** — Queries `rets_property` with filters, multi-column sorting, pagination, and a `hasOpenHouse` boolean flag
- **`POST /api/properties/favorites`** — Accepts an array of property display IDs in JSON body (`{ ids: [...] }`) and returns matching properties with filter, sort, and pagination support
- **`GET /api/properties/:id`** — Fetches property details dynamically using a configurable `PROPERTY_DETAIL_COLUMNS` array
- **`GET /api/properties/:id/openhouses`** — Fetches open house events from `rets_openhouse` joined with `rets_property`, adding server-side status logic (`active`, `expired`, `upcoming`)
- **`GET /api/openhouses`** — Lists all open houses with optional `startDate`/`endDate` filtering, INNER JOIN with `rets_property` for property context, pagination (up to 500), and status computation

Every request is logged by the `requestLogger` middleware with timestamp, method, URL, status code, duration in milliseconds, and attaches an `X-Response-Time` header.

### 3. Frontend (React + Vite)

The React app runs on port 3000 with a split-screen dashboard layout: a fixed sidebar on the left and a main content canvas on the right protected by a React Error Boundary (`ErrorBoundary.jsx`).

**Navigation** uses `react-router-dom` to route between pages:
- `/` — **Introduction Page** (hero section with headline, CTA, and feature cards)
- `/search` — **Search Page** (property filters + multi-column sort + listings grid + pagination + photo carousels + favorite heart buttons)
- `/favorites` — **Favorites Page** (view and manage favorited listings, with Remove All button, filters, sort, pagination, and instant card removal)
- `/openhouses` — **Open Houses Page** (react-big-calendar with range selection, date range filter panel, open house cards with property details, pagination)
- `/property/:id` — **Property Detail Page** (Save/Saved favorite button, photo gallery + lightbox, dynamic details grid, Google Maps embed, and open house schedule)

Favorites state is managed globally by the custom `useFavorites` hook, which persists to `localStorage` and syncs across browser tabs in real time.

Clicking any property card on the Search or Favorites page opens the detail page in a **new browser tab** (`target="_blank"`), allowing users to keep browsing listings while examining property details.

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
cp .env.example .env   # First time only — add your VITE_GOOGLE_MAPS_API_KEY
npm install
npm run dev            # Starts on http://localhost:3000
```

Open `http://localhost:3000` to see the property listings.

### 4. Run tests & performance benchmarks

```bash
# Backend tests (88 tests across 5 suites)
cd backend
npm test

# Query Performance & EXPLAIN Benchmark Suite
npm run perf

# Frontend tests (67 Vitest tests across 10 suites)
cd frontend
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
| `DB_HOST` / `MYSQLHOST` | MySQL host (default: `localhost` for local dev) |
| `DB_USER` / `MYSQLUSER` | MySQL user |
| `DB_PASSWORD` / `MYSQLPASSWORD` | MySQL password |
| `DB_NAME` / `MYSQLDATABASE` | Database name |
| `DB_PORT` / `MYSQLPORT` | MySQL port (default: `3306`) |
| `MYSQL_URL` / `MYSQL_PUBLIC_URL` | Optional full connection URL string (Railway cloud / TCP proxy) |
| `PORT` | Express server port (default: `5000`) |

### `frontend/.env` (Vite)

| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key (Maps Embed API enabled) |


