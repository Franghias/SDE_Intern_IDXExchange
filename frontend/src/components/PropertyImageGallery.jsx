import { useState, useEffect, useCallback } from 'react';
import { parsePhotos } from '../utils/format';
import '../stylesheets/PropertyImageGallery.css';

const PLACEHOLDER_IMG = 'https://placehold.co/800x500/1a1a2e/e0e0e0?text=No+Photo';

/**
 * Image gallery for the property detail page.
 * Main image + thumbnail strip + full-screen lightbox.
 * Automatically filters out 404 / broken media records so they are not shown to users.
 */
function PropertyImageGallery({ photosStr }) {
  const initialPhotos = parsePhotos(photosStr);
  const [failedPhotos, setFailedPhotos] = useState(new Set());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Filter out any photo URLs that failed to load or returned a 404 Media record not found response
  const validPhotos = initialPhotos.filter((p) => !failedPhotos.has(p));
  const hasPhotos = validPhotos.length > 0;

  // Keep selected index within bounds if photos are removed due to 404s
  const safeIndex = Math.min(selectedIndex, Math.max(0, validPhotos.length - 1));
  const currentPhoto = hasPhotos ? validPhotos[safeIndex] : PLACEHOLDER_IMG;

  function handleImageError(url) {
    if (!url || url === PLACEHOLDER_IMG) return;
    setFailedPhotos((prev) => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }

  // Lightbox keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!lightboxOpen) return;
    if (e.key === 'Escape') {
      setLightboxOpen(false);
    } else if (e.key === 'ArrowLeft') {
      setSelectedIndex((prev) => (prev === 0 ? validPhotos.length - 1 : prev - 1));
    } else if (e.key === 'ArrowRight') {
      setSelectedIndex((prev) => (prev === validPhotos.length - 1 ? 0 : prev + 1));
    }
  }, [lightboxOpen, validPhotos.length]);

  useEffect(() => {
    if (lightboxOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxOpen, handleKeyDown]);

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      setLightboxOpen(false);
    }
  }

  return (
    <div className="gallery">
      {/* Main image */}
      <div
        className="gallery__main"
        onClick={() => hasPhotos && setLightboxOpen(true)}
        role={hasPhotos ? 'button' : undefined}
        tabIndex={hasPhotos ? 0 : undefined}
        aria-label={hasPhotos ? 'Open full-screen gallery' : undefined}
      >
        <img
          className="gallery__main-image"
          src={currentPhoto}
          alt={hasPhotos ? `Photo ${safeIndex + 1} of ${validPhotos.length}` : 'No photo'}
          onError={() => handleImageError(currentPhoto)}
        />
        {hasPhotos && (
          <span className="gallery__expand-hint">🔍 Click to enlarge</span>
        )}
      </div>

      {/* Thumbnail strip */}
      {validPhotos.length > 1 && (
        <div className="gallery__thumbnails" id="gallery-thumbnails">
          {validPhotos.map((photo, i) => (
            <button
              key={photo + i}
              className={`gallery__thumb${i === safeIndex ? ' gallery__thumb--active' : ''}`}
              onClick={() => setSelectedIndex(i)}
              aria-label={`View photo ${i + 1}`}
            >
              <img
                src={photo}
                alt={`Thumbnail ${i + 1}`}
                loading="lazy"
                onError={() => handleImageError(photo)}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && hasPhotos && (
        <div className="lightbox" onClick={handleOverlayClick} role="dialog" aria-label="Photo lightbox">
          <button
            className="lightbox__close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close lightbox"
          >
            ✕
          </button>

          {validPhotos.length > 1 && (
            <button
              className="lightbox__arrow lightbox__arrow--prev"
              onClick={() => setSelectedIndex((prev) => (prev === 0 ? validPhotos.length - 1 : prev - 1))}
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          <img
            className="lightbox__image"
            src={validPhotos[safeIndex]}
            alt={`Photo ${safeIndex + 1} of ${validPhotos.length}`}
            onError={() => handleImageError(validPhotos[safeIndex])}
          />

          {validPhotos.length > 1 && (
            <button
              className="lightbox__arrow lightbox__arrow--next"
              onClick={() => setSelectedIndex((prev) => (prev === validPhotos.length - 1 ? 0 : prev + 1))}
              aria-label="Next photo"
            >
              ›
            </button>
          )}

          <span className="lightbox__counter">
            {safeIndex + 1} / {validPhotos.length}
          </span>
        </div>
      )}
    </div>
  );
}

export default PropertyImageGallery;
