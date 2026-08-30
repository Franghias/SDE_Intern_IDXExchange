import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchFavoriteProperties } from '../api/propertyApi';
import { useFavorites } from '../hooks/useFavorites';
import { prefetchPromises } from '../utils/prefetchCache';
import ChatAssistant from '../components/ChatAssistant';
import PropertyFilters, { INITIAL_FILTERS } from '../components/PropertyFilters';
import PropertyCard from '../components/PropertyCard';
import Pagination from '../components/Pagination';
import SortControls from '../components/SortControls';
import '../stylesheets/FavoritesPage.css';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

/**
 * Module-level cache: persists across component mount/unmount cycles so that
 * navigating away and back does NOT re-fetch data from the server.
 * The cache is updated every time a fresh fetch occurs (search, sort, pagination, etc.).
 */
let favoritesCache = null;

function FavoritesPage() {
  const [properties, setProperties] = useState(favoritesCache?.properties ?? []);
  const [total, setTotal] = useState(favoritesCache?.total ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState(favoritesCache?.activeFilters ?? {});
  const [currentPage, setCurrentPage] = useState(favoritesCache?.currentPage ?? 1);
  const [itemsPerPage, setItemsPerPage] = useState(favoritesCache?.itemsPerPage ?? 20);
  const [sortCriteria, setSortCriteria] = useState(favoritesCache?.sortCriteria ?? []);

  // Lifted filter state for chatbot ↔ PropertyFilters sync
  const [filterFormValues, setFilterFormValues] = useState(favoritesCache?.filterFormValues ?? { ...INITIAL_FILTERS });
  const [changedFields, setChangedFields] = useState([]);

  const { favorites, favoriteCount, isFavorite, toggleFavorite, clearFavorites } = useFavorites();

  // Track the previous favorites snapshot so we only re-fetch when favorites actually change
  const prevFavoritesRef = useRef(favoritesCache?.favoritesSnapshot ?? null);

  const totalPages = Math.ceil(total / itemsPerPage);

  const loadFavoriteProperties = useCallback(
    async (favIds, filters = {}, page = 1, limit = 20, criteria = sortCriteria) => {
      if (!favIds || favIds.length === 0) {
        setProperties([]);
        setTotal(0);
        setLoading(false);
        favoritesCache = {
          ...favoritesCache,
          properties: [],
          total: 0,
          activeFilters: filters,
          currentPage: page,
          itemsPerPage: limit,
          sortCriteria: criteria,
          favoritesSnapshot: favIds ? [...favIds] : [],
        };
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const offset = (page - 1) * limit;
        const data = await fetchFavoriteProperties({
          ids: favIds,
          limit,
          offset,
          ...filters,
          sortCriteria: criteria.length > 0 ? criteria : undefined,
        });
        setProperties(data.results);
        setTotal(data.total);

        // Update module-level cache with fresh data
        favoritesCache = {
          ...favoritesCache,
          properties: data.results,
          total: data.total,
          activeFilters: filters,
          currentPage: page,
          itemsPerPage: limit,
          sortCriteria: criteria,
          favoritesSnapshot: [...favIds],
        };
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [sortCriteria]
  );

  // On mount: await prefetch Promise if available and favorites haven't changed,
  // otherwise fetch. Re-fetches automatically when favorites list changes.
  useEffect(() => {
    const prevSnapshot = prevFavoritesRef.current;
    const favChanged =
      !prevSnapshot ||
      prevSnapshot.length !== favorites.length ||
      prevSnapshot.some((id, i) => id !== favorites[i]);

    if (!favoritesCache || favChanged) {
      if (!favoritesCache && prefetchPromises.favorites) {
        setLoading(true);
        prefetchPromises.favorites.then((res) => {
          if (
            res &&
            res.data &&
            res.ids.length === favorites.length &&
            res.ids.every((id, i) => id === favorites[i])
          ) {
            const data = res.data;
            setProperties(data.results);
            setTotal(data.total);
            prevFavoritesRef.current = [...favorites];
            favoritesCache = {
              properties: data.results,
              total: data.total,
              activeFilters: {},
              currentPage: 1,
              itemsPerPage: 20,
              sortCriteria: [],
              favoritesSnapshot: [...favorites],
              filterFormValues: { ...INITIAL_FILTERS },
            };
          } else {
            prevFavoritesRef.current = [...favorites];
            loadFavoriteProperties(favorites, activeFilters, currentPage, itemsPerPage, sortCriteria);
          }
          setLoading(false);
        });
      } else {
        prevFavoritesRef.current = [...favorites];
        loadFavoriteProperties(favorites, activeFilters, currentPage, itemsPerPage, sortCriteria);
      }
    }
  }, [favorites]);

  function handleSearch(filters) {
    setActiveFilters(filters);
    setCurrentPage(1);
    if (favoritesCache) favoritesCache.filterFormValues = filterFormValues;
    loadFavoriteProperties(favorites, filters, 1, itemsPerPage, sortCriteria);
  }

  function handleClear() {
    setActiveFilters({});
    setFilterFormValues({ ...INITIAL_FILTERS });
    setCurrentPage(1);
    if (favoritesCache) favoritesCache.filterFormValues = { ...INITIAL_FILTERS };
    loadFavoriteProperties(favorites, {}, 1, itemsPerPage, sortCriteria);
  }

  function handlePageChange(page) {
    setCurrentPage(page);
    const pagElem = document.getElementById('pagination-top');
    if (pagElem) {
      pagElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    loadFavoriteProperties(favorites, activeFilters, page, itemsPerPage, sortCriteria);
  }

  function handleItemsPerPageChange(e) {
    const newLimit = Number(e.target.value);
    setItemsPerPage(newLimit);
    setCurrentPage(1);
    loadFavoriteProperties(favorites, activeFilters, 1, newLimit, sortCriteria);
  }

  function handleSortChange(newCriteria) {
    setSortCriteria(newCriteria);
    setCurrentPage(1);
    setActiveFilters(filterFormValues);
    if (favoritesCache) {
      favoritesCache.sortCriteria = newCriteria;
      favoritesCache.filterFormValues = filterFormValues;
    }
    const sortElem = document.getElementById('sort-controls');
    if (sortElem) {
      sortElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    loadFavoriteProperties(favorites, filterFormValues, 1, itemsPerPage, newCriteria);
  }

  function handleRemoveFavorite(id) {
    // Optimistically remove property card immediately so cards shift left
    setProperties((prev) => prev.filter((p) => p.propertyId !== String(id)));
    setTotal((prev) => Math.max(0, prev - 1));
    toggleFavorite(id);
  }

  function handleRemoveAll() {
    setProperties([]);
    setTotal(0);
    clearFavorites();
  }

  /**
   * Called by ChatAssistant when the LLM suggests new filter values.
   * Updates the form fields visually without triggering a search.
   * Sort fields (sortBy/sortOrder) are intercepted and converted to sortCriteria.
   */
  function handleChatFiltersChange(newFilters) {
    // Extract sort fields from the LLM response before processing filter fields
    const { sortBy, sortOrder, ...filterFields } = newFilters;

    // Convert LLM sort response to sortCriteria array if present
    if (sortBy) {
      const newCriteria = [{ field: sortBy, order: sortOrder || 'asc' }];
      setSortCriteria(newCriteria);
      if (favoritesCache) favoritesCache.sortCriteria = newCriteria;
    }

    const changed = [];
    for (const key of Object.keys(filterFields)) {
      if (filterFields[key] !== filterFormValues[key]) {
        changed.push(key);
      }
    }
    if (sortBy) changed.push('sortBy');
    if (sortOrder) changed.push('sortOrder');

    setChangedFields(changed);
    setFilterFormValues(filterFields);
    if (favoritesCache) favoritesCache.filterFormValues = filterFields;

    if (changed.length > 0) {
      setTimeout(() => setChangedFields([]), 2500);
    }
  }

  // Compute the "Showing X–Y of Z" range
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(currentPage * itemsPerPage, total);

  return (
    <div className="favorites-page">
      <div className="favorites-page__header">
        <div>
          <h2 className="favorites-page__title">Favorite Properties</h2>
          <p className="favorites-page__subtitle">
            View and manage your saved real estate listings.
          </p>
        </div>
        {favoriteCount > 0 && (
          <button
            className="favorites-page__remove-all-btn"
            onClick={handleRemoveAll}
            id="remove-all-favorites"
          >
            <span>🗑️</span> Remove All
          </button>
        )}
      </div>

      <ChatAssistant
        filters={filterFormValues}
        onFiltersChange={handleChatFiltersChange}
        pageContext="favorites"
      />

      <PropertyFilters
        onSearch={handleSearch}
        onClear={handleClear}
        externalFilters={filterFormValues}
        onExternalChange={setFilterFormValues}
        changedFields={changedFields}
      />

      {/* Sort controls — below filters */}
      <SortControls
        sortCriteria={sortCriteria}
        onChange={handleSortChange}
      />

      {/* Top pagination — below sort, above grid */}
      {!loading && !error && totalPages > 1 && (
        <div className="pagination-controls" id="pagination-top">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
          <div className="items-per-page">
            <label htmlFor="items-per-page-top" className="items-per-page__label">
              Per page:
            </label>
            <select
              id="items-per-page-top"
              className="items-per-page__select"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading && (
        <div className="favorites-page__loading" id="loading-state">
          <div className="spinner" />
          <p>Loading favorite properties…</p>
        </div>
      )}

      {error && (
        <div className="favorites-page__error" id="error-state">
          <span className="favorites-page__error-icon">⚠</span>
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <p className="favorites-page__count" id="property-count">
            Showing <strong>{rangeStart}–{rangeEnd}</strong> of{' '}
            <strong>{total.toLocaleString()}</strong> favorites
            {Object.keys(activeFilters).length > 0 && (
              <span className="favorites-page__filter-tag"> (filtered)</span>
            )}
          </p>

          {favorites.length === 0 || properties.length === 0 ? (
            <div className="favorites-page__empty" id="no-favorites">
              <span className="favorites-page__empty-icon">❤️</span>
              <h2>No favorite properties yet</h2>
              <p>Browse listings and tap the heart icon on any card to save properties here.</p>
            </div>
          ) : (
            <div className="favorites-page__grid" id="property-grid">
              {properties.map((property) => (
                <PropertyCard
                  key={property.listingId}
                  property={property}
                  isFavorite={isFavorite(property.propertyId)}
                  onToggleFavorite={handleRemoveFavorite}
                />
              ))}
            </div>
          )}

          {/* Bottom pagination — below grid */}
          {totalPages > 1 && (
            <div className="pagination-controls" id="pagination-bottom">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
              <div className="items-per-page">
                <label htmlFor="items-per-page-bottom" className="items-per-page__label">
                  Per page:
                </label>
                <select
                  id="items-per-page-bottom"
                  className="items-per-page__select"
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                >
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default FavoritesPage;
