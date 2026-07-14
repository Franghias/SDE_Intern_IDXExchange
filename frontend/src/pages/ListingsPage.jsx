import { useState, useEffect, useCallback } from 'react';
import { fetchProperties } from '../api/propertyApi';
import PropertyFilters from '../components/PropertyFilters';
import PropertyCard from '../components/PropertyCard';
import '../stylesheets/ListingsPage.css';

function ListingsPage() {
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});

  const loadProperties = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProperties({ limit: 20, offset: 0, ...filters });
      setProperties(data.results);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  function handleSearch(filters) {
    setActiveFilters(filters);
    loadProperties(filters);
  }

  function handleClear() {
    setActiveFilters({});
    loadProperties();
  }

  return (
    <div className="listings-page">
      <div className="listings-page__header">
        <h2 className="listings-page__title">Find Properties</h2>
        <p className="listings-page__subtitle">
          Search and filter through available real estate listings.
        </p>
      </div>

      <PropertyFilters onSearch={handleSearch} onClear={handleClear} />

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
            Showing <strong>{properties.length}</strong> of{' '}
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
        </>
      )}
    </div>
  );
}

export default ListingsPage;
