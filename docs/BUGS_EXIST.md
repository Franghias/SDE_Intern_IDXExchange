### This is the file for finding bugs which already exist in the database or codebase

`Bug`: The property detail section is not displayed below the photo gallery in desktop view.
- **The Bug**:
  - The `.sidebar` is `position: fixed; width: 260px;`. Since it is `fixed`, it is taken **out of the normal layout flow**.
  - The browser's CSS Grid engine auto-places the next available *in-flow* element—which is `<main className="app-content">`—into the **first grid column** (260px wide).
  - `.app-content` had `margin-left: 260px;`. Pushing it left by 260px inside a 260px column left exactly `0px` of width to render the contents.

- **The Fix**:
  - We explicitly tell the browser to place `.app-content` into the **second grid column** by adding `grid-column: 2;`.
  - Since it is in column 2, it automatically starts at 260px, so we remove the `margin-left: 260px;` style.

#### 2026-07-02 — Week 4: Property Detail & Open House Endpoints
`Bug`: L_ListingID == '552066853' does not have value in rets_property but has value in rets_openhouse.

#### 2026-07-21 - Week 7 Tasks: Pagination & Component Testing
##### In ListingPage.jsx:
`Bug`: After changing perPage limit (offset), the page updates successfully along with the existing filters but then reloads into original filters (currentPage = 1, perPage = 20) after a few seconds.
`Fixing Method`: Adjust useEffect to only initiate once on the first render, not on subsequent renders. This is due to the empty dependency array `[]`.