### WEEK 1: SETUP DATABASE
#### Requirements
- Start a MySQL 8 container named idx-mysql-local on port 3306 with a database called rets. (Use docker-compose)
- Import the schema from rets_property.sql and rets_openhouse.sql into the database
(run rest_openhouse.sql and rest_property.sql in the database directory)
#### Deliverables
- Show the database schema and verify that the database contains data by running some basic queries.


### WEEK 2: SETUP BACKEND + BASIC REST API
#### Requirements
- Initialize a Node.js project in a backend/ folder
- Install express, mysql2, dotenv, and cors. Install nodemon as a dev dependency
<!-- - Create an example .env file with my database credentials -->
<!-- - Create a README.md file to document the project -->
- Create a MySQL connection pool module
- Create a GET /api/health endpoint that queries the database and returns connection status
- Server must auto-restart on file changes during development
#### Deliverables
- npm run dev starts the server without errors
- GET /api/health returns { status: "ok", database: "connected" } when MySQL
is running
- GET /api/health returns a 500 error (not a crash) when MySQL is unreachable
- .env is listed in .gitignore


### WEEK 3: PROPERTY SEARCH ENDPOINT WITH FILTERS & INDEXING
#### Requirements
- Create a properties route file and mount it at /api/properties
- Implement GET /api/properties with pagination (limit and offset query params)
- Add filter support for: city, zipcode, minPrice, maxPrice, beds, baths
- Validate all query parameters — return 400 with a descriptive message for invalid inputs
- Create database indexes on the columns you filter by
- Measure query performance before and after adding indexes using EXPLAIN
#### Deliverables
- GET /api/properties returns 20 properties by default with a total count
- Pagination works: ?limit=10&offset=20 returns properties 21-30
- Filtering works: ?city=Portland returns only Portland properties
- Multiple filters combine: ?city=Portland&minPrice=300000&beds=3
- Invalid inputs return 400: ?minPrice=abc, ?limit=0, ?limit=200
- All filter values use parameterized queries (no string concatenation)
- SHOW INDEXES FROM rets_property shows your new indexes
- EXPLAIN shows your indexes are being used (key column is not NULL)
#### Example
When giving an example request to the API, use the following format:
```
GET /api/properties?city=Portland&minPrice=300000&beds=3&limit=20&offset=0
```

Response:
```
{
"total": 87,
"limit": 20,
"offset": 0,
"results": [...]
}
```


### WEEK 4: PROPERTY DETAIL & OPEN HOUSE ENDPOINTS
#### Requirements
- Implement GET /api/properties/:id — returns a single property or 404
- Implement GET /api/properties/:id/openhouses — returns open house events for a property
- Validate the listing ID parameter on both endpoints
- Add request logging middleware (method, URL, timestamp, response time)
#### Deliverables
- GET /api/properties/:id returns the full property object
- GET /api/properties/:id returns 404 with a helpful message for unknown IDs
- GET /api/properties/:id/openhouses returns an array (empty array is OK, not an error)
- Open houses are ordered by date and start time
- Malformed or oversized IDs return 400
- Every request prints a log line with method, URL, status code, and duration in ms
- Route order is correct — /openhouses must be registered before /:id


### WEEK 5: REACT SETUP + LISTINGS PAGE
#### Requirements
- Create a React app in a frontend/ folder
- Configure a proxy so API calls to /api/* go to your Express server
- Create an API client module with functions for fetching properties
- Build a ListingsPage component with a grid of PropertyCard components
- Each PropertyCard must display: first photo (parsed from L_Photos JSON array),
price, address, city/state, beds, baths, and sqft
- Handle loading and error states
#### Deliverables
- React app runs on port 3000 without errors
- Property grid shows cards with real data from the database
- L_Photos is correctly parsed as a JSON array — the first photo URL is displayed
- Loading state shows while data is fetching
- Error message shows if the backend is unreachable
- Property count (e.g. "Showing 20 of 487 properties") is displayed
- Cards have a hover effect
- API client handles HTTP errors and throws meaningful error messages
#### Example
When giving an example request to the API, use the following format:
```
GET /api/properties?limit=20&offset=0
```
Example response from backend:
```
{
    "total": 487,
    "limit": 20,
    "offset": 0,
    "results": [...]
}
```
