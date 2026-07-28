import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPropertyById, fetchOpenHouses } from '../api/propertyApi';
import { formatPrice, formatTime, formatDate } from '../utils/format';
import PropertyImageGallery from '../components/PropertyImageGallery';
import PropertyMap from '../components/PropertyMap';
import '../stylesheets/PropertyDetailPage.css';

/**
 * Fields rendered by dedicated components — excluded from the generic "Property Details" grid.
 */
const SPECIAL_FIELDS = new Set([
  'listingId', 'displayId', 'address', 'city', 'state', 'zipCode',
  'listPrice', 'beds', 'baths', 'sqft', 'yearBuilt', 'description',
  'photos', 'latitude', 'longitude',
]);

/**
 * Convert a camelCase key into a readable label.
 * e.g. "propertyType" → "Property Type"
 */
function toLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function PropertyDetailPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [openHouses, setOpenHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch property detail and open houses in parallel
        const [propertyData, ohData] = await Promise.all([
          fetchPropertyById(id),
          fetchOpenHouses(id).catch(() => ({ openHouses: [] })),
        ]);
        if (!cancelled) {
          setProperty(propertyData);
          setOpenHouses(ohData.openHouses || []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-page__loading">
          <div className="spinner" />
          <p>Loading property details…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail-page">
        <div className="detail-page__error">
          <span className="detail-page__error-icon">⚠</span>
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <Link to="/search" className="detail-page__back-link">← Back to listings</Link>
        </div>
      </div>
    );
  }

  if (!property) return null;

  // Collect extra fields (those not in SPECIAL_FIELDS) for the "Property Details" section
  const extraFields = Object.entries(property).filter(
    ([key, value]) => !SPECIAL_FIELDS.has(key) && value != null && value !== ''
  );

  return (
    <div className="detail-page">
      <Link to="/search" className="detail-page__back-link" id="back-to-listings">
        ← Back to listings
      </Link>

      <div className="detail-page__layout">
        {/* Left column: Gallery */}
        <div className="detail-page__gallery-col">
          <PropertyImageGallery photosStr={property.photos} />

          {/* Property Details (dynamic — driven by backend column config) */}
          {extraFields.length > 0 && (
            <div className="detail-page__section" id="property-details">
              <h3 className="detail-page__section-title">Property Details</h3>
              <div className="detail-page__details-grid">
                {extraFields.map(([key, value]) => (
                  <div className="detail-page__detail-item" key={key}>
                    <span className="detail-page__detail-label">{toLabel(key)}</span>
                    <span className="detail-page__detail-value">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Info */}
        <div className="detail-page__info-col">
          {/* Price */}
          <h1 className="detail-page__price" id="property-price">
            {formatPrice(property.listPrice)}
          </h1>

          {/* Address */}
          <p className="detail-page__address" id="property-address">
            {property.address}
          </p>
          <p className="detail-page__location">
            {property.city}, {property.state} {property.zipCode}
          </p>

          {/* Stats */}
          <div className="detail-page__stats" id="property-stats">
            <div className="detail-page__stat">
              <span className="detail-page__stat-value">{property.beds}</span>
              <span className="detail-page__stat-label">Beds</span>
            </div>
            <div className="detail-page__stat">
              <span className="detail-page__stat-value">{property.baths}</span>
              <span className="detail-page__stat-label">Baths</span>
            </div>
            <div className="detail-page__stat">
              <span className="detail-page__stat-value">
                {property.sqft?.toLocaleString() ?? '—'}
              </span>
              <span className="detail-page__stat-label">Sqft</span>
            </div>
            {property.yearBuilt && (
              <div className="detail-page__stat">
                <span className="detail-page__stat-value">{property.yearBuilt}</span>
                <span className="detail-page__stat-label">Year Built</span>
              </div>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div className="detail-page__section" id="property-description">
              <h3 className="detail-page__section-title">Description</h3>
              <p className="detail-page__description">{property.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <PropertyMap
        latitude={property.latitude}
        longitude={property.longitude}
        address={`${property.address}, ${property.city}, ${property.state}`}
      />

      {/* Open Houses */}
      <div className="detail-page__section" id="open-houses">
        <h3 className="detail-page__section-title">Open Houses</h3>
        {openHouses.length === 0 ? (
          <p className="detail-page__no-openhouses">No open houses scheduled</p>
        ) : (
          <div className="detail-page__openhouses">
            {openHouses.map((oh, i) => (
              <div className="detail-page__openhouse-card" key={i}>
                <div className="detail-page__openhouse-header">
                  <span className="detail-page__openhouse-date">
                    {formatDate(oh.date)}
                  </span>
                  <span className={`detail-page__openhouse-status detail-page__openhouse-status--${oh.status}`}>
                    {oh.status === 'expired' && 'Expired'}
                    {oh.status === 'active' && 'Active'}
                    {oh.status === 'upcoming' && 'Upcoming'}
                  </span>
                </div>
                <div className="detail-page__openhouse-times">
                  {formatTime(oh.startTime)} — {formatTime(oh.endTime)}
                </div>
                {oh.OpenHouseRemarks && (
                  <p className="detail-page__openhouse-remarks">{oh.OpenHouseRemarks}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertyDetailPage;
