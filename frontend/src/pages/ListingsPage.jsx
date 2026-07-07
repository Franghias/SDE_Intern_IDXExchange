import { useState, useEffect } from 'react';
import { fetchProperties } from '../api/propertyApi';
import PropertyCard from '../components/PropertyCard';
import '../stylesheets/ListingsPage.css';

function ListingsPage() {
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProperties() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProperties({ limit: 20, offset: 0 });
        if (!cancelled) {
          setProperties(data.results);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProperties();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="listings-page">
        <div className="listings-page__loading" id="loading-state">
          <div className="spinner" />
          <p>Loading properties…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="listings-page">
        <div className="listings-page__error" id="error-state">
          <span className="listings-page__error-icon">⚠</span>
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="listings-page">
      <p className="listings-page__count" id="property-count">
        Showing <strong>{properties.length}</strong> of{' '}
        <strong>{total.toLocaleString()}</strong> properties
      </p>

      <div className="listings-page__grid" id="property-grid">
        {properties.map((property) => (
          <PropertyCard key={property.listingId} property={property} />
        ))}
      </div>
    </div>
  );
}

export default ListingsPage;
