import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPropertyById, fetchOpenHouses } from '../api/propertyApi';
import { formatPrice, formatTime, formatDate } from '../utils/format';
import { useFavorites } from '../hooks/useFavorites';
import PropertyImageGallery from '../components/PropertyImageGallery';
import PropertyMap from '../components/PropertyMap';
import '../stylesheets/PropertyDetailPage.css';

/**
 * Fields rendered by dedicated components — excluded from the generic "Property Details" grid.
 */
const SPECIAL_FIELDS = new Set([
  'listingId', 'displayId', 'address', 'city', 'state', 'zipCode',
  'listPrice', 'beds', 'baths', 'sqft', 'yearBuilt', 'description',
  'photos', 'latitude', 'longitude', 'status',
  'listAgentFullName', 'listAgentOfficePhone', 'listAgentEmail',
  'listAgentDirectPhone', 'listOfficeEmail',
]);

/**
 * Open house fields rendered by dedicated UI — excluded from the details grid.
 */
const OPEN_HOUSE_SPECIAL_FIELDS = new Set([
  'date', 'startTime', 'endTime', 'status', 'listingId',
  'startDate', 'endDate', 'OpenHouseRemarks',
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

  const { isFavorite, toggleFavorite } = useFavorites();

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

  const favState = isFavorite(property.displayId);

  // Collect extra fields (those not in SPECIAL_FIELDS) for the "Property Details" section
  const extraFields = Object.entries(property).filter(
    ([key, value]) => !SPECIAL_FIELDS.has(key) && value != null && value !== ''
  );

  const hasAgentInfo = Boolean(
    property.listAgentFullName ||
    property.listAgentOfficePhone ||
    property.listAgentEmail ||
    property.listAgentDirectPhone ||
    property.listOfficeEmail
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
          {/* Header row with price and favorite button */}
          <div className="detail-page__header-row">
            <h1 className="detail-page__price" id="property-price">
              {formatPrice(property.listPrice)}
            </h1>
            <button
              className={`detail-page__favorite-btn${favState ? ' detail-page__favorite-btn--active' : ''}`}
              onClick={() => toggleFavorite(property.displayId)}
              aria-label={favState ? 'Remove from favorites' : 'Add to favorites'}
              title={favState ? 'Remove from favorites' : 'Add to favorites'}
            >
              <span className="detail-page__favorite-icon">{favState ? '♥' : '♡'}</span>
              <span>{favState ? 'Saved' : 'Save'}</span>
            </button>
          </div>

          {/* Status badge */}
          {property.status && (
            <span
              className={`detail-page__status-badge ${property.status === 'Active'
                ? 'detail-page__status-badge--active'
                : 'detail-page__status-badge--inactive'
                }`}
            >
              {property.status}
            </span>
          )}

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
              <svg className="detail-page__stat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 4v16M2 8h20v12M2 17h20M6 8v3M10 8v3" />
              </svg>
              <span className="detail-page__stat-value">{property.beds}</span>
              <span className="detail-page__stat-label">Beds</span>
            </div>
            <div className="detail-page__stat">
              <svg className="detail-page__stat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-2.12 0 1.5 1.5 0 0 0 0 2.12L7 8" />
                <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1Z" />
                <path d="M6 12V5a2 2 0 0 1 2-2h3" />
              </svg>
              <span className="detail-page__stat-value">{property.baths}</span>
              <span className="detail-page__stat-label">Baths</span>
            </div>
            <div className="detail-page__stat">
              <svg className="detail-page__stat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 3v18" />
              </svg>
              <span className="detail-page__stat-value">
                {property.sqft?.toLocaleString() ?? '—'}
              </span>
              <span className="detail-page__stat-label">Square Feet</span>
            </div>
            {property.yearBuilt && (
              <div className="detail-page__stat">
                <svg className="detail-page__stat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="detail-page__stat-value">{property.yearBuilt}</span>
                <span className="detail-page__stat-label">Year Built</span>
              </div>
            )}
          </div>

          {/* Listing Agent Information (placed on top of Description section) */}
          {hasAgentInfo && (
            <div className="detail-page__section" id="listing-agent-info">
              <h3 className="detail-page__section-title">Listing Agent Information</h3>
              <div className="detail-page__agent-grid">
                {property.listAgentFullName && (
                  <div className="detail-page__agent-item">
                    <span className="detail-page__agent-label">Agent Name</span>
                    <span className="detail-page__agent-value">{property.listAgentFullName}</span>
                  </div>
                )}
                {property.listAgentDirectPhone && (
                  <div className="detail-page__agent-item">
                    <span className="detail-page__agent-label">Direct Phone</span>
                    <span className="detail-page__agent-value">{property.listAgentDirectPhone}</span>
                  </div>
                )}
                {property.listAgentOfficePhone && (
                  <div className="detail-page__agent-item">
                    <span className="detail-page__agent-label">Office Phone</span>
                    <span className="detail-page__agent-value">{property.listAgentOfficePhone}</span>
                  </div>
                )}
                {property.listAgentEmail && (
                  <div className="detail-page__agent-item">
                    <span className="detail-page__agent-label">Agent Email</span>
                    <span className="detail-page__agent-value">{property.listAgentEmail}</span>
                  </div>
                )}
                {property.listOfficeEmail && (
                  <div className="detail-page__agent-item">
                    <span className="detail-page__agent-label">Office Email</span>
                    <span className="detail-page__agent-value">{property.listOfficeEmail}</span>
                  </div>
                )}
              </div>
            </div>
          )}

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
        <h3 className="detail-page__section-title">Open House</h3>
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

                {/* all_data details grid */}
                {(() => {
                  const extraFields = Object.entries(oh).filter(
                    ([key, value]) => !OPEN_HOUSE_SPECIAL_FIELDS.has(key) && value != null && value !== ''
                  );
                  return extraFields.length > 0 && (
                    <div className="detail-page__openhouse-details-grid">
                      {extraFields.map(([key, value]) => (
                        <div className="detail-page__openhouse-detail-item" key={key}>
                          <span className="detail-page__openhouse-detail-label">{toLabel(key)}</span>
                          <span className="detail-page__openhouse-detail-value">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

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
