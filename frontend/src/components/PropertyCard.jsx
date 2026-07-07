import { parsePhotos, formatPrice } from '../utils/format';
import '../stylesheets/PropertyCard.css';

const PLACEHOLDER_IMG = 'https://placehold.co/400x260/1a1a2e/e0e0e0?text=No+Photo';

function PropertyCard({ property }) {
  const photos = parsePhotos(property.photos);
  const photoUrl = photos.length > 0 ? photos[0] : PLACEHOLDER_IMG;

  return (
    <article className="property-card" id={`property-${property.listingId}`}>
      <div className="property-card__image-wrapper">
        <img
          className="property-card__image"
          src={photoUrl}
          alt={`${property.address}, ${property.city}`}
          loading="lazy"
        />
        <span className="property-card__price-badge">
          {formatPrice(property.listPrice)}
        </span>
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
      </div>
    </article>
  );
}

export default PropertyCard;
