### This is the file for finding bugs which already exist in the database or codebase

#### 2026-07-02 — Week 4: Property Detail & Open House Endpoints
`Bug`: L_ListingID == '552066853' does not have value in rets_property but has value in rets_openhouse.

#### 2026-07-21 - Week 7 Tasks: Pagination & Component Testing
##### In ListingPage.jsx:
`Bug`: After changing perPage limit (offset), the page updates successfully along with the existing filters but then reloads into original filters (currentPage = 1, perPage = 20) after a few seconds.
`Fixing Method`: Adjust useEffect to only initiate once on the first render, not on subsequent renders. This is due to the empty dependency array `[]`.