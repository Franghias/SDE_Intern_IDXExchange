import { fetchProperties, fetchFavoriteProperties, fetchAllOpenHouses } from '../api/propertyApi';
import { format } from 'date-fns';

const STORAGE_KEY = 'favorites';

/**
 * Read favorite IDs from localStorage (duplicated from useFavorites to avoid
 * importing a React hook into a plain utility module).
 */
function readFavoriteIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Prefetch Promises — populated by prefetchInitialData(), consumed by page components.
 * Stores the active Promise objects so pages can await in-flight requests instead of
 * triggering duplicate fetches if navigated to while initial prefetch is still pending.
 */
export const prefetchPromises = {
  listings: null,
  favorites: null,
  openHousesCards: null,
  openHousesCalendar: null,
};

let prefetched = false;

/**
 * Fire initial API calls in parallel at app boot.
 * Stores Promises in `prefetchPromises` for pages to await on mount.
 * Runs at most once — subsequent calls are no-ops.
 */
export function prefetchInitialData() {
  if (prefetched) return;
  prefetched = true;

  const now = new Date();
  const calendarStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
  const calendarEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');

  // 1. Listings page — default unfiltered fetch (~10s query)
  prefetchPromises.listings = fetchProperties({ limit: 20, offset: 0 }).catch(() => null);

  // 2. Favorites page — fetch saved favorite IDs from localStorage
  const favIds = readFavoriteIds();
  if (favIds.length > 0) {
    prefetchPromises.favorites = fetchFavoriteProperties({ ids: favIds, limit: 20, offset: 0 })
      .then((data) => ({ data, ids: favIds }))
      .catch(() => null);
  }

  // 3. Open Houses page — paginated card list (default, no date filter)
  prefetchPromises.openHousesCards = fetchAllOpenHouses({ limit: 20, offset: 0 }).catch(() => null);

  // 4. Open Houses page — calendar month events
  prefetchPromises.openHousesCalendar = fetchAllOpenHouses({ limit: 500, offset: 0, startDate: calendarStart, endDate: calendarEnd }).catch(() => null);
}

