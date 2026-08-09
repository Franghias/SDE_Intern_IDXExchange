import { formatPrice } from '../utils/format';
import PropertyImageCarousel from './PropertyImageCarousel';
import '../stylesheets/PropertyCard.css';

/**
 * Property listing card with image carousel, price badge, stats,
 * optional "Open House" green badge, and favorite heart button.
 * Opens the detail page in a new tab on click.
 */
function PropertyCard({ property, isFavorite = false, onToggleFavorite }) {
  const detailUrl = `/property/${property.propertyId}`;

  function handleFavoriteClick(e) {
    e.stopPropagation();
    e.preventDefault();
    if (onToggleFavorite) {
      onToggleFavorite(property.propertyId);
    }
  }

  return (
    <a
      className="property-card"
      id={`property-${property.listingId}`}
      href={detailUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="property-card__image-wrapper">
        <PropertyImageCarousel photosStr={property.photos} />
        <span className="property-card__price-badge">
          {formatPrice(property.listPrice)}
        </span>
        {property.hasOpenHouse && (
          <span className="property-card__openhouse-badge">Open House</span>
        )}
        {onToggleFavorite && (
          <button
            className={`property-card__favorite-btn${isFavorite ? ' property-card__favorite-btn--active' : ''}`}
            onClick={handleFavoriteClick}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? '♥' : '♡'}
          </button>
        )}
      </div>

      <div className="property-card__body">
        <h2 className="property-card__address">{property.address}</h2>
        <p className="property-card__location">
          {property.city}, {property.state} {property.zipCode}
        </p>

        <div className="property-card__stats">
          <span className="property-card__stat">
            <strong>{property.beds}</strong> beds
          </span>
          <span className="property-card__divider">·</span>
          <span className="property-card__stat">
            <strong>{property.baths}</strong> baths
          </span>
          <span className="property-card__divider">·</span>
          <span className="property-card__stat">
            <strong>{property.sqft?.toLocaleString() ?? '—'}</strong> sqft
          </span>
        </div>

        {property.status && (
          <span
            className={`property-card__status-badge ${
              property.status === 'Active'
                ? 'property-card__status-badge--active'
                : 'property-card__status-badge--inactive'
            }`}
          >
            {property.status}
          </span>
        )}
      </div>
    </a>
  );
}

export default PropertyCard;

