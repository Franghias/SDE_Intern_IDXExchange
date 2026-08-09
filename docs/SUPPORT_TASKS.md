## This is file is to support the Weekly tasks and provide additional help.

### WEEK 1: SETUP DATABASE
Both sql files are structured similar to this inside: 

```
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- 
-- Database: `rets`
--

-- --------------------------------------------------------

--
-- Table structure for table `rets_openhouse`
--

CREATE TABLE `rets_openhouse` (
  `id` int(11) NOT NULL COMMENT 'ID',
  `L_ListingID` varchar(255) NOT NULL COMMENT 'SystemID',
  `L_DisplayId` varchar(255) NOT NULL COMMENT 'MLS #',
)
```

<!-- ### WEEK 2: SETUP BACKEND + BASIC REST API -->

### WEEK 3: PROPERTY SEARCH ENDPOINT WITH FILTERS & INDEXING
- The columns are in `rets_property` table:
  - State -> L_State (varchar(50))
  - City -> L_City (varchar(50))
  - Zip -> L_Zip (varchar(20))
  - Price -> L_SystemPrice (int(10))
  - Beds -> L_Keyword2 (int(10))
  - Baths -> LM_Dec_3 (decimal(34,1))

- Create minPrice and maxPrice in the range of `Price` column.
- Indexing on `rets_property` table:
  - City
  - Zip
  - Price
- Utilize multiple indexes at once using composite index following this:
  - (State, City, Beds, Baths, Price)
  - (State, City, Price)

- Use parameterised queries to prevent SQL injection.

- Adjust State and City to be **capitalized** (first letter uppercase, rest lowercase) for accurate filtering, since the values are not consistent.

- When writing the SQL query, **SKIP** any rows that have the following:
  - Any value in any columns above is `NULL` or blank.
  - Price is less than `0`.
  - Beds or Baths is less than `0`.
  - Zip is not 5 digits or not a number.
  - State or City is not alphabetic.


### WEEK 4: PROPERTY DETAIL & OPEN HOUSE ENDPOINTS
- Some columns in `rets_openhouse` table:
  - `OpenHouseDate`, `OH_StartDate`, `OH_EndDate` format YYYY-MM-DD
  - `OH_StartTime` and `OH_EndTime` format example: 0 days 14:00:00
  - `API_OH_StartDate` and `API_OH_EndDate` format example: YYYY-MM-DD HH:MM:SS
  - `all_data` is JSON Blob. Example: {"key":"value", "key2":"value2", ...etc}

- Check if all three columns `OpenHouseDate`, `OH_StartDate`, `OH_EndDate` have the same value then **ONLY** use `OpenHouseDate`, else use `OH_StartDate`.
- Check if two columns `L_ListingID` and `L_DisplayId` have the same value then **ONLY** use `L_DisplayId`, else use `L_ListingID`.


<!-- ### WEEK 5: REACT SETUP + LISTINGS PAGE -->

### WEEK 6: FILTERS UI + TESTING
# Product Requirements Document: Website Layout & User Interface

## 1. Global Layout Architecture
Every page within the application must adhere to a strict split-screen, multi-column dashboard layout.

### Left Column: Navigation Bar
- **Width:** Fixed width (e.g., 240px to 280px) or responsive narrow sidebar.
- **Content:** Main application logo, profile/settings quick links, and primary navigation links (Introduction, Search, etc.).
- **Behavior:** Stays sticky/fixed on the left side of the screen while the main content area scrolls.

### Right/Middle Area: Main Content Canvas
- **Width:** Spans the remaining width of the screen.
- **Behavior:** Dynamically swaps out views based on the active route selected in the left navigation bar. Content within this area should follow a modern, clean UI aesthetic with generous padding, card layouts, and subtle shadows.

---

## 2. Page Specifications

### Page A: Introduction Page
*Purpose: Introduce users to what the website provides.*

- **Layout Structure:**
  - **Hero Section:** Large, prominent typography introducing the core value proposition of the website. Should include an eye-catching call-to-action (CTA) button.
  - **Feature Grid / Value Proposition Cards:** Split columns or a grid detailing specific services, features, or benefits the website provides. Each feature block should feature a modern icon, short title, and a brief explanatory paragraph.
  - **Visual Elements:** High-quality imagery, abstract design patterns, or screenshots of the platform embedded neatly within cards or background sections to showcase product offerings.

### Page B: Search Page
*Purpose: Display all available property listings with robust filtering options.*

- **Layout Structure:**
  - **Top/Header Section:** Page title (e.g., "Find Properties") with brief context or a quick search bar.
  - **Filter Control Panel:** - **Placement:** Positioned either as a horizontal bar just below the header or as a sticky sidebar on the left side of the main content canvas.
    - **Filter Components:** - Location selector (dropdown or autocomplete search).
      - Property Type selectors (e.g., House, Apartment, Commercial) using pill buttons or checkboxes.
      - Price Range selector (dual-slider component or minimum/maximum input fields).
      - Additional amenities filters (Bedrooms, Bathrooms, Sq Ft).
      - Clear Filters / Apply Filters actions.
  - **Results Display Grid:**
    - Display properties in a responsive multi-column grid card layout (e.g., 2 to 4 cards per row depending on viewport size).
    - **Property Card Specs:** - High-quality property image header with hover zoom effects.
      - Price tag badge overlay or prominent placement.
      - Core details layout: Title, location, and metadata icons (e.g., `🛏️ 3 Beds | 🛁 2 Baths | 📐 1,200 sqft`).
      - "View Details" or favorite bookmark interactive buttons.


### WEEK 7: PAGINATION UI + COMPONENT TESTING
- Add arrows using unicode characters: `«` and `»` for previous and next buttons.
- Those arrows appear below the filter section and in the bottom of the results container.
- These arrows serve as the Previous and Next buttons for the pagination, in addition to page numbers.


### WEEK 8: PROPERTY DETAIL PAGE END-TO-END
- Add a list in backend where I can add columns manually in order to display them in the frontend for both rets_property table and rets_openhouse tables.
- Design the /api/properties/:id in the backend so that whenever I add or remove columns in that list for rets_property table, it can automatically update to show/hide the columns in the frontend.
- Rules for openhouses:
  - Only allows openhouse from backend if and only if:
    - It has data in both rets_openhouse and rets_property.
    - `L_ListingID` in `rets_openhouse` and `L_DisplayId` in `rets_property` is the same.
    - `OH_StartDate` has to smaller or equal to `OH_EndDate`.
    - `OH_StartDate` has to smaller or equal to Today.
    - If `OH_EndDate` is not equal or bigger than today, has the lable expired with the text "Expired" with red color.
    
  - In listing page, add a small label or icon with the text "Open House" with green color to indicate if the property has an open house (in the propertyCard and on the right side).
  - In the property detail page, add a section that displays all the open houses for the property.


### WEEK 9: Advanced Feature (Required) + Performance Optimization
#### Part A — Advanced Feature
##### 1. Sorting:
- Sort is only have two types for all for columns (price, date listed, square footage, and beds): 
  - Low to High (Ascending)
  - High to Low (Descending)
- Column that can be sorted: 
  - Price -> L_SystemPrice (in rets_property table) (current format: 545000)
  - Date listed -> OnMarketDate (in rets_property table) (current format: YYYY-MM-DD) (for high to low, put the newest date first)
  - Square footage -> LM_Int2_3 (in rets_property table) (current format: 2025)
  - Beds -> L_Keyword2 (in rets_property table) (current format: 2)
  - Baths -> LM_Dec_3 (in rets_property table) (current format: 2.0)
- Place frontend sort section to be in the same rows with pagination and Per page and on the left side.
- It contains a dropdown with the options:
  - Price: Low to High, High to Low
  - Date listed: Low to High, High to Low
  - Square footage: Low to High, High to Low
  - Beds: Low to High, High to Low
  - Baths: Low to High, High to Low
- The sort works for all filters at once (for example, if I filter by city, price, and beds, the sort will work for all of them at once).
- Add tests for this sort feature.

- This is not part of the sort feature but I want to do these:
  - Display the column `StandardStatus` in rets_property to be in the property card that I can see in ListingPage.jsx and PropertyDetailPage.jsx. Display if the status value is 'Active' with green color placed in the bottom right corner in the PropertyCard.jsx that shows in ListingPage.jsx. If the status is not 'Active', display it with red color and its value (for example, 'Pending' with red color).
  - Adjust properties.js and other relevants files to use `StandardStatus` instead of `L_Status`.

  ##### 2. Favorites:
  - Add endpoint from the frontend `/property/favorites` and backend `/api/properties/favorites`.
  - To access the Favorite page, simply add the sidebar with the word `Favorite`, which is similar to Introduction and Search pages.
  - In the frontend, add a list for the favorited properties and the data will come from the backend endpoint.
  - In the backend, it will check the login status by the cookies
  - The Favorite page has the same features as the Search page (filters, sort, pagination, etc.)

  ##### 3. Open House Calendar Page (Created August 2, 2026):
  - **Component Structure (`OpenHousesPage.jsx` & `OpenHousesPage.css`)**:
    - **Header**: Page title and subtitle with guidance on calendar and date range filtering.
    - **AI Chatbot (`ChatAssistant`)**: Positioned above the calendar and filters with full support for date range parsing (`startDate`, `endDate`) and property filter criteria.
    - **Month-View Calendar**: Built with `react-big-calendar` and `date-fns` (`dateFnsLocalizer`).
      - Interactive 2-click slot picking: 1st click sets start date, 2nd click sets end date (auto-swaps if end < start) and immediately triggers search.
      - Re-clicking endpoints deselects or clears range.
      - Day cell styling (`dayPropGetter`): `.calendar-day--has-event` (days with open house events), `.calendar-day--range-endpoint` (start/end selections), `.calendar-day--in-range` (interval highlight).
      - Event styling (`eventPropGetter`): `.calendar-event--active` (green), `.calendar-event--upcoming` (blue/purple), `.calendar-event--expired` (red/muted).
      - Event clicks open the target property in a new tab (`/property/:id`).
    - **Manual Date Range Form**: Inputs for `Start Date` (`#range-start`) and `End Date` (`#range-end`) with "Apply Filter" and "Clear Filter" actions.
    - **Property Filters & Sort Controls**: Embedded `PropertyFilters` and `SortControls` components placed below the calendar.
    - **Active Filter Chip**: Displays `📅 Filtering: <start> — <end>` with clear button and dynamic local timezone date formatting.
    - **Open House Card Grid**: Cards display `PropertyImageCarousel`, list price, status badge, address, formatted date (`formatDate`), time range (`formatTime`), bed/bath/sqft stats, and `OpenHouseType` tag.
    - **Top & Bottom Pagination**: Full pagination controls with items-per-page selector (`[10, 20, 30, 40, 50]`).
    - **Module-Level In-Memory Cache**: `openHousesCache` preserves calendar events, card results, active range, date inputs, pagination, sort, and property filters across component navigation.

### WEEK 10: AI Conversational Chatbot Assistant, In-Memory Caching, Dedicated AI Search, Timezone Date Formatting & Conversational Guards
- **Chat API Proxy (`POST /api/chat`)**:
  - Express backend endpoint proxies requests to OpenRouter API (`cohere/north-mini-code:free`).
  - System prompt enforces security rules, JSON-only format (`{ message: string, filters: object }`), and sorting capabilities (`sortBy` and `sortOrder` for `price`, `date`, `sqft`, `beds`, `baths`).
- **Conversational Response & Redundant Query Guard**:
  - System prompt instructs LLM: `If the user's message is polite ("thank you", "thanks", "ok"), a greeting ("hi", "hello"), small talk, or does NOT ask to change any search filters, set "filters": {} (an empty object).`
  - Frontend components (`ChatAssistant.jsx` and `ChatSearchPage.jsx`) compare keys across both new and active filters (`new Set([...Object.keys(newFilters), ...Object.keys(activeFilters)])`). `onFiltersChange` and `loadProperties` are only called if at least one filter value changed.
- **Dynamic Local Timezone Date Formatting (`format.js`)**:
  - Parsed `YYYY-MM-DD` date-only strings using `new Date(year, month - 1, day)` (local midnight) instead of `new Date("YYYY-MM-DD")` (UTC midnight).
  - Formats date strings using `date.toLocaleDateString(locale || undefined, ...)`. Ensures date displays like `Filtering: Wednesday, Jul 31, 2024` accurately render as `Thursday, Aug 1, 2024` across all global timezones without offset shifts.
- **In-Memory Component Page Caching**:
  - Module-level variables (`listingsCache`, `favoritesCache`, `openHousesCache`, `chatSearchCache`) save page state during React Router route transitions.
  - Submitting new filters, changing sort options, picking date ranges, or changing page numbers updates the cache and executes fresh API fetches.

### WEEK 9: PART B — PERFORMANCE OPTIMIZATION & INDEXING GUIDANCE
- **Sargable Query Optimization (`LOWER()` removal)**:
  - Do NOT wrap SQL columns inside functions like `LOWER(p.L_City)` in WHERE clauses. This disables B-Tree index traversal.
  - Normalize user strings in JavaScript using `toTitleCase()`. MySQL's `utf8mb4_0900_ai_ci` collation performs case-insensitive comparisons natively using index keys.
- **Correlated `EXISTS` vs Derived `LEFT JOIN`**:
  - For checking existence of related records (such as `hasOpenHouse`), use `EXISTS (SELECT 1 FROM rets_openhouse WHERE ...)` instead of `LEFT JOIN (SELECT ... GROUP BY)`.
  - Correlated `EXISTS` avoids temporary table materialization across 4,000+ open house rows and executes only targeted index probes on paginated items.
- **Composite Indexes**:
  - `rets_property`: `idx_city_price (L_City, L_SystemPrice)` eliminates filesort when sorting city filtered results by price.
  - `rets_openhouse`: `idx_date_startTime_displayId (OpenHouseDate, OH_StartTime, L_DisplayId)` supports date range scans and time sorting in a single index structure.


