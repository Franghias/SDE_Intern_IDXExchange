### This is the file for logging the date, the week, what we decided, and any other relevant information about the decision. 

#### 2026-06-23 — Week 1: Setup Database

**Decision: Use `.env` file for all environment-specific configuration**
- Credentials (MySQL root password, database name, port) are stored in `.env`
- `.env.example` is committed as a template; `.env` is gitignored
- `docker-compose.yml` references env vars so nothing is hardcoded

**Decision: Use permissive `sql_mode` for MariaDB compatibility**
- The provided SQL dumps were exported from MariaDB 10.2
- They use `'0000-00-00 00:00:00'` defaults and `int(11)` display widths
- Setting `sql_mode=NO_AUTO_VALUE_ON_ZERO` allows MySQL 8 to import them without errors
- This disables strict mode features like `NO_ZERO_DATE` and `STRICT_TRANS_TABLES`

**Decision: Auto-import SQL via Docker's `/docker-entrypoint-initdb.d/`**
- The `database/` folder is mounted as the init directory
- Both `rets_openhouse.sql` and `rets_property.sql` are imported on first container start
- The property file (~632 MB) takes several minutes to import
- A healthcheck is configured so we can tell when import is complete

**Decision: Remove `--default-authentication-plugin` for MySQL 8.4 compatibility**
- MySQL 8.4 removed this deprecated flag entirely
- The `mysql_native_password` plugin is still available but no longer configurable via this flag
- The container was crashing on startup with `unknown variable` error until this was removed

#### 2026-06-24 — Week 2: Setup Backend + Basic REST API

**Decision: Separate `backend/.env` for backend configuration**
- Backend has its own `.env` with `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `PORT`
- Decoupled from the root `.env` which is used by Docker Compose
- `backend/.env.example` committed as a template; `backend/.env` is gitignored

**Decision: Use `mysql2/promise` connection pool**
- Chose `mysql2` over `mysql` (deprecated) — it supports promises natively and is actively maintained
- Connection pool (limit: 10) reuses connections across requests instead of creating/destroying per query
- Pool handles reconnection automatically if a connection drops

**Decision: Express server on port 5000**
- Port 5000 avoids conflict with React dev server (port 3000) in later weeks
- Port is configurable via `PORT` env var

**Decision: Use `nodemon` for development auto-restart**
- `npm run dev` uses nodemon to watch for file changes and restart the server
- `npm test` runs the tests
- `npm start` uses `node` directly for production-like runs

**Decision: Separate `app.js` from `server.js` for testability**
- `app.js` exports the configured Express app (middleware + routes)
- `server.js` imports the app and calls `app.listen()`
- This allows `supertest` to test routes without starting a real HTTP server
- Standard Express testing pattern recommended by the supertest docs

#### 2026-06-26 — Week 3: Property Search Endpoint with Filters & Indexing

**Decision: Data quality filters in every query**
- Every SELECT against `rets_property` skips rows with NULL/blank city, state, zip, price, beds, or baths
- Also skips: negative prices/beds/baths, non-5-digit zips, non-alphabetic city/state
- These are applied as a base WHERE clause so dirty data never reaches the API consumer
- Trade-off: slightly slower queries, but prevents confusing/invalid results

**Decision: Title Case normalization for city and state**
- DB values are inconsistent (e.g., "PORTLAND", "portland", "Portland")
- Input is normalized to Title Case before querying, and matching uses `LOWER()` for case-insensitive comparison
- This ensures `?city=portland` and `?city=PORTLAND` both work correctly

**Decision: Composite index strategy**
- Created `(L_State, L_City, L_SystemPrice)` for state+city+price queries
- Created `(L_State, L_City, L_Keyword2, LM_Dec_3, L_SystemPrice)` for full-filter queries
- Column order follows leftmost-prefix rule: most selective first, range column last
- Per SUPPORT_TASKS.md guidance on composite index design

**Decision: Validation returns all errors at once**
- When multiple query params are invalid, all errors are collected and returned in a single 400 response
- `{ status: "error", errors: ["limit must be...", "minPrice must be..."] }`
- Better UX than failing on the first invalid param

**Decision: Expose state as a query filter**
- Not in the original Week 3 requirements but added per user request
- Supports composite index usage and is consistent with city filter
- Uses same Title Case normalization and alphabetic validation

**Decision: EXPLAIN verification as a standalone script**
- Created `tests/explain_indexes.js` as a manual script (not a Jest test)
- Connects to the live database and runs EXPLAIN on 6 representative queries
- Prints index usage details (key, possible_keys, rows) for manual verification
- Kept separate from unit tests since it requires a running MySQL instance