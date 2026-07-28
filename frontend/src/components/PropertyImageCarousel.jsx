import { useState } from 'react';
import { parsePhotos } from '../utils/format';
import '../stylesheets/PropertyImageCarousel.css';

const PLACEHOLDER_IMG = 'https://placehold.co/400x260/1a1a2e/e0e0e0?text=No+Photo';

/**
 * Image carousel for property listing cards.
 * Cycles through photos with prev/next arrows and a counter.
 * Arrows use stopPropagation to prevent card link navigation.
 */
function PropertyImageCarousel({ photosStr }) {
  const photos = parsePhotos(photosStr);
  const [currentIndex, setCurrentIndex] = useState(0);

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
        src={photos[currentIndex]}
        alt={`Photo ${currentIndex + 1} of ${photos.length}`}
        loading="lazy"
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
            {currentIndex + 1} / {photos.length}
          </span>
        </>
      )}
    </div>
  );
}

export default PropertyImageCarousel;
