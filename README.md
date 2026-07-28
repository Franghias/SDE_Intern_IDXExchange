# IDXExchange

A full-stack real estate listing platform with a searchable property grid, property detail pages with photo carousels, full-screen galleries, interactive Google Maps, and open house schedules.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (:3000)                         │
│                                                                 │
│   React Router (BrowserRouter)                                  │
│   ├── /           → IntroductionPage (hero + features)          │
│   ├── /search     → ListingsPage (filters + card grid)          │
│   │                 ├── PropertyFilters                         │
│   │                 ├── Pagination (top & bottom)               │
│   │                 └── PropertyCard[] (target="_blank")        │
│   │                       └── PropertyImageCarousel             │
│   │                       └── Open House Badge (green)          │
│   │                                                             │
│   └── /property/:id → PropertyDetailPage (opens in new tab)     │
│                         ├── PropertyImageGallery (lightbox)     │
│                         ├── PropertyDetails (dynamic grid)      │
│                         ├── PropertyMap (Google Maps iframe)    │
│                         └── Open Houses (active/expired/upcom)  │
│                                                                 │
│   fetch('/api/properties?city=Portland&beds=3')                 │
│   fetch('/api/properties/:id')                                  │
│   fetch('/api/properties/:id/openhouses')                       │
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
│              ├── /              (listing search + hasOpenHouse) │
│              ├── /:id           (driven by PROPERTY_DETAIL_COLS)│
│              └── /:id/openhouses (JOIN + status logic)          │
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
│   │   └── routes/           # health.js, properties.js (configurable columns)
│   ├── tests/                # Jest + Supertest (38 tests)
│   ├── .env                  # Backend env vars (gitignored)
│   └── package.json
│
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── main.jsx          # React entry point — wraps App in StrictMode
│   │   ├── App.jsx           # React Router setup (BrowserRouter, Routes, Route)
│   │   ├── api/              # API client (fetchProperties, fetchPropertyById, fetchOpenHouses)
│   │   ├── utils/            # parsePhotos, formatPrice, formatTime, formatDate
│   │   ├── test/             # Vitest setup + tests (22 tests)
│   │   ├── stylesheets/      # All CSS (index, App, Sidebar, IntroductionPage, PropertyCard,
│   │   │                     #   PropertyFilters, ListingsPage, Pagination, PropertyDetailPage,
│   │   │                     #   PropertyImageCarousel, PropertyImageGallery, PropertyMap)
│   │   ├── components/       # Sidebar, PropertyCard, PropertyFilters, Pagination,
│   │   │                     #   PropertyImageCarousel, PropertyImageGallery, PropertyMap
│   │   └── pages/            # IntroductionPage, ListingsPage, PropertyDetailPage
│   ├── .env                  # VITE_GOOGLE_MAPS_API_KEY (gitignored)
│   ├── .env.example          # Template for frontend env vars
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
- **`GET /api/properties`** — Queries `rets_property` with filters and pagination. Includes a `hasOpenHouse` boolean flag indicating whether the property has an active open house
- **`GET /api/properties/:id`** — Fetches property details dynamically using a configurable `PROPERTY_DETAIL_COLUMNS` array
- **`GET /api/properties/:id/openhouses`** — Fetches open house events from `rets_openhouse` joined with `rets_property`, adding server-side status logic (`active`, `expired`, `upcoming`)

Every request is logged by the `requestLogger` middleware with method, URL, status code, and duration.

### 3. Frontend (React + Vite)

The React app runs on port 3000 with a split-screen dashboard layout: a fixed sidebar on the left and a main content canvas on the right.

**Navigation** uses `react-router-dom` to route between pages:
- `/` — **Introduction Page** (hero section with headline, CTA, and feature cards)
- `/search` — **Search Page** (property filters + listings grid + pagination + photo carousels)
- `/property/:id` — **Property Detail Page** (photo gallery + lightbox, dynamic details grid, Google Maps embed, and open house schedule)

Clicking any property card on the Search page opens the detail page in a **new browser tab** (`target="_blank"`), allowing users to keep browsing listings while examining property details.

### The full request lifecycle

```
User opens http://localhost:3000
  → Vite serves index.html + React app
  → React mounts <App /> with BrowserRouter + Routes
  → User navigates to /search (ListingsPage)
   → useEffect calls fetchProperties({ limit: 20, offset: 0 })
   → Express executes query with LEFT JOIN to count active open houses
   → Returns properties with hasOpenHouse boolean flag
   → PropertyCard renders with photo carousel (PropertyImageCarousel) and green "Open House" badge
   → User clicks a property card → opens /property/100002222 in a NEW TAB
  → In the new tab: PropertyDetailPage mounts
   → Parallel fetch: fetchPropertyById(100002222) and fetchOpenHouses(100002222)
   → Express builds SELECT query using backend PROPERTY_DETAIL_COLUMNS array
   → Express joins rets_openhouse & rets_property, calculates active/expired/upcoming statuses
   → PropertyDetailPage renders:
       - Left column: PropertyImageGallery (photos + thumbnail strip + full-screen lightbox)
                      and dynamic "Property Details" grid (renders any extra backend columns)
       - Right column: Price, Address, Stats bar, Description
       - Below layout: PropertyMap (Google Maps Embed iframe + Get Directions link)
       - Below map: Open Houses section with colored status badges (active=green, expired=red, upcoming=blue)
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
cp .env.example .env   # First time only — add your VITE_GOOGLE_MAPS_API_KEY
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

### `frontend/.env` (Vite)

| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key (Maps Embed API enabled) |
