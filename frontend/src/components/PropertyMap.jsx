import '../stylesheets/PropertyMap.css';

/**
 * Google Maps Embed API component.
 * Only renders when both latitude and longitude are present.
 * Includes a "Get Directions" link that opens Google Maps in a new tab.
 */
function PropertyMap({ latitude, longitude, address }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Don't render if coordinates are missing
  if (!latitude || !longitude) return null;

  const mapSrc = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${latitude},${longitude}&zoom=15`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  return (
    <div className="property-map" id="property-map">
      <h3 className="property-map__title">Location</h3>
      <div className="property-map__container">
        <iframe
          className="property-map__iframe"
          src={mapSrc}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map of ${address || 'property location'}`}
        />
      </div>
      <a
        className="property-map__directions"
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        📍 Get Directions
      </a>
    </div>
  );
}

export default PropertyMap;
