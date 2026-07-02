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

<!-- ### WEEK 6: FILTERS UI + TESTING -->

<!-- ### WEEK 7: PAGINATION UI + COMPONENT TESTING -->