import { useState } from 'react';
import { parsePhotos } from '../utils/format';
import '../stylesheets/PropertyImageCarousel.css';

const PLACEHOLDER_IMG = 'https://placehold.co/400x260/1a1a2e/e0e0e0?text=No+Photo';

/**
 * Image carousel for property listing cards.
 * Cycles through photos with prev/next arrows and a counter.
 * Arrows use stopPropagation to prevent card link navigation.
 * Filters out 404 / broken media record images dynamically.
 */
function PropertyImageCarousel({ photosStr }) {
  const initialPhotos = parsePhotos(photosStr);
  const [failedPhotos, setFailedPhotos] = useState(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  const photos = initialPhotos.filter((p) => !failedPhotos.has(p));

  function handleImageError(url) {
    if (!url || url === PLACEHOLDER_IMG) return;
    setFailedPhotos((prev) => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }

  if (photos.length === 0) {
    return (
      <img
        className="carousel__image"
        src={PLACEHOLDER_IMG}
        alt="No photo available"
        loading="lazy"
      />
    );
  }

  const safeIndex = Math.min(currentIndex, Math.max(0, photos.length - 1));

  function handlePrev(e) {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }

  function handleNext(e) {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }

  return (
    <div className="carousel">
      <img
        className="carousel__image"
        src={photos[safeIndex]}
        alt={`Photo ${safeIndex + 1} of ${photos.length}`}
        loading="lazy"
        onError={() => handleImageError(photos[safeIndex])}
      />

      {photos.length > 1 && (
        <>
          <button
            className="carousel__arrow carousel__arrow--prev"
            onClick={handlePrev}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            className="carousel__arrow carousel__arrow--next"
            onClick={handleNext}
            aria-label="Next photo"
          >
            ›
          </button>
          <span className="carousel__counter">
            {safeIndex + 1} / {photos.length}
          </span>
        </>
      )}
    </div>
  );
}

export default PropertyImageCarousel;
