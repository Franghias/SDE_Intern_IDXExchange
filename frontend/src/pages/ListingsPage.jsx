import { useState, useEffect, useCallback } from 'react';
import { fetchProperties } from '../api/propertyApi';
import PropertyFilters from '../components/PropertyFilters';
import PropertyCard from '../components/PropertyCard';
import Pagination from '../components/Pagination';
import '../stylesheets/ListingsPage.css';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

function ListingsPage() {
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const totalPages = Math.ceil(total / itemsPerPage);

  const loadProperties = useCallback(async (filters = {}, page = 1, limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      const data = await fetchProperties({ limit, offset, ...filters });
      setProperties(data.results);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  // useEffect(() => {
  //   loadProperties({}, 1, itemsPerPage);
  // }, [loadProperties, itemsPerPage]);

  // Only loads once on the first render, not on subsequent renders. 
  // This is due to the empty dependency array [].
  useEffect(() => {
    loadProperties({}, 1, itemsPerPage);
  }, []);

  function handleSearch(filters) {
    setActiveFilters(filters);
    setCurrentPage(1);
    loadProperties(filters, 1, itemsPerPage);
  }

  function handleClear() {
    setActiveFilters({});
    setCurrentPage(1);
    loadProperties({}, 1, itemsPerPage);
  }

  function handlePageChange(page) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadProperties(activeFilters, page, itemsPerPage);
  }

  function handleItemsPerPageChange(e) {
    const newLimit = Number(e.target.value);
    setItemsPerPage(newLimit);
    setCurrentPage(1);
    loadProperties(activeFilters, 1, newLimit);
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

      <PropertyFilters onSearch={handleSearch} onClear={handleClear} />

      {/* Top pagination — below filters, above grid */}
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
                <PropertyCard key={property.listingId} property={property} />
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
