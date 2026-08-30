import { useState, useEffect, useCallback } from 'react';
import { fetchProperties } from '../api/propertyApi';
import { useFavorites } from '../hooks/useFavorites';
import { prefetchPromises } from '../utils/prefetchCache';
import ChatAssistant from '../components/ChatAssistant';
import PropertyFilters, { INITIAL_FILTERS } from '../components/PropertyFilters';
import PropertyCard from '../components/PropertyCard';
import Pagination from '../components/Pagination';
import SortControls from '../components/SortControls';
import '../stylesheets/ListingsPage.css';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

/**
 * Module-level cache: persists across component mount/unmount cycles so that
 * navigating away and back does NOT re-fetch data from the server.
 * The cache is updated every time a fresh fetch occurs (search, sort, pagination, etc.).
 */
let listingsCache = null;

function ListingsPage() {
  const [properties, setProperties] = useState(listingsCache?.properties ?? []);
  const [total, setTotal] = useState(listingsCache?.total ?? 0);
  const [loading, setLoading] = useState(!listingsCache);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState(listingsCache?.activeFilters ?? {});
  const [currentPage, setCurrentPage] = useState(listingsCache?.currentPage ?? 1);
  const [itemsPerPage, setItemsPerPage] = useState(listingsCache?.itemsPerPage ?? 20);
  const [sortCriteria, setSortCriteria] = useState(listingsCache?.sortCriteria ?? []);

  // Lifted filter state for chatbot ↔ PropertyFilters sync
  const [filterFormValues, setFilterFormValues] = useState(listingsCache?.filterFormValues ?? { ...INITIAL_FILTERS });
  const [changedFields, setChangedFields] = useState([]);

  const { isFavorite, toggleFavorite } = useFavorites();

  const totalPages = Math.ceil(total / itemsPerPage);

  const loadProperties = useCallback(async (filters = {}, page = 1, limit = 20, criteria = sortCriteria) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      const data = await fetchProperties({
        limit,
        offset,
        ...filters,
        sortCriteria: criteria.length > 0 ? criteria : undefined,
      });
      setProperties(data.results);
      setTotal(data.total);

      // Update module-level cache with fresh data
      listingsCache = {
        ...listingsCache,
        properties: data.results,
        total: data.total,
        activeFilters: filters,
        currentPage: page,
        itemsPerPage: limit,
        sortCriteria: criteria,
      };
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sortCriteria]);

  // On mount: await prefetch Promise if available, otherwise fetch.
  // Subsequent visits restore from the module-level cache instead.
  useEffect(() => {
    if (!listingsCache) {
      if (prefetchPromises.listings) {
        setLoading(true);
        prefetchPromises.listings.then((data) => {
          if (data && data.results) {
            setProperties(data.results);
            setTotal(data.total);
            listingsCache = {
              properties: data.results,
              total: data.total,
              activeFilters: {},
              currentPage: 1,
              itemsPerPage: 20,
              sortCriteria: [],
              filterFormValues: { ...INITIAL_FILTERS },
            };
          } else {
            loadProperties({}, 1, itemsPerPage, sortCriteria);
          }
          setLoading(false);
        });
      } else {
        loadProperties({}, 1, itemsPerPage, sortCriteria);
      }
    }
  }, []);

  function handleSearch(filters) {
    setActiveFilters(filters);
    setCurrentPage(1);
    if (listingsCache) listingsCache.filterFormValues = filterFormValues;
    loadProperties(filters, 1, itemsPerPage, sortCriteria);
  }

  function handleClear() {
    setActiveFilters({});
    setFilterFormValues({ ...INITIAL_FILTERS });
    setCurrentPage(1);
    if (listingsCache) listingsCache.filterFormValues = { ...INITIAL_FILTERS };
    loadProperties({}, 1, itemsPerPage, sortCriteria);
  }

  function handlePageChange(page) {
    setCurrentPage(page);
    const pagElem = document.getElementById('pagination-top');
    if (pagElem) {
      pagElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    loadProperties(activeFilters, page, itemsPerPage, sortCriteria);
  }

  function handleItemsPerPageChange(e) {
    const newLimit = Number(e.target.value);
    setItemsPerPage(newLimit);
    setCurrentPage(1);
    loadProperties(activeFilters, 1, newLimit, sortCriteria);
  }

  function handleSortChange(newCriteria) {
    setSortCriteria(newCriteria);
    setCurrentPage(1);
    setActiveFilters(filterFormValues);
    if (listingsCache) {
      listingsCache.sortCriteria = newCriteria;
      listingsCache.filterFormValues = filterFormValues;
    }
    const sortElem = document.getElementById('sort-controls');
    if (sortElem) {
      sortElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    loadProperties(filterFormValues, 1, itemsPerPage, newCriteria);
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
      if (listingsCache) listingsCache.sortCriteria = newCriteria;
    }

    // Track which fields changed for highlight animation
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
    if (listingsCache) listingsCache.filterFormValues = filterFields;

    // Clear highlights after delay
    if (changed.length > 0) {
      setTimeout(() => setChangedFields([]), 2500);
    }
  }

  // Compute the "Showing X–Y of Z" range
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(currentPage * itemsPerPage, total);

  return (
    <div className="listings-page">
      <div className="listings-page__header">
        <h2 className="listings-page__title">Find Properties</h2>
        <p className="listings-page__subtitle">
          Search and filter through available real estate listings.
        </p>
      </div>

      <ChatAssistant
        filters={filterFormValues}
        onFiltersChange={handleChatFiltersChange}
        pageContext="listings"
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
        <div className="listings-page__loading" id="loading-state">
          <div className="spinner" />
          <p>Loading properties…</p>
        </div>
      )}

      {error && (
        <div className="listings-page__error" id="error-state">
          <span className="listings-page__error-icon">⚠</span>
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <p className="listings-page__count" id="property-count">
            Showing <strong>{rangeStart}–{rangeEnd}</strong> of{' '}
            <strong>{total.toLocaleString()}</strong> properties
            {Object.keys(activeFilters).length > 0 && (
              <span className="listings-page__filter-tag"> (filtered)</span>
            )}
          </p>

          {properties.length === 0 ? (
            <div className="listings-page__empty" id="no-results">
              <span className="listings-page__empty-icon">🔎</span>
              <h2>No properties found</h2>
              <p>Try adjusting your filters or clearing them to see all listings.</p>
            </div>
          ) : (
            <div className="listings-page__grid" id="property-grid">
              {properties.map((property) => (
                <PropertyCard
                  key={property.listingId}
                  property={property}
                  isFavorite={isFavorite(property.propertyId)}
                  onToggleFavorite={toggleFavorite}
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

export default ListingsPage;
