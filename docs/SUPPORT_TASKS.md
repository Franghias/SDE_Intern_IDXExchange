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


<!-- ### WEEK 7: PAGINATION UI + COMPONENT TESTING -->