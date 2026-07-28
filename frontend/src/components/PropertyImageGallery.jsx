import { useState, useEffect, useCallback } from 'react';
import { parsePhotos } from '../utils/format';
import '../stylesheets/PropertyImageGallery.css';

const PLACEHOLDER_IMG = 'https://placehold.co/800x500/1a1a2e/e0e0e0?text=No+Photo';

/**
 * Image gallery for the property detail page.
 * Main image + thumbnail strip + full-screen lightbox.
 */
function PropertyImageGallery({ photosStr }) {
  const photos = parsePhotos(photosStr);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const currentPhoto = photos.length > 0 ? photos[selectedIndex] : PLACEHOLDER_IMG;
  const hasPhotos = photos.length > 0;

  // Lightbox keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!lightboxOpen) return;
    if (e.key === 'Escape') {
      setLightboxOpen(false);
    } else if (e.key === 'ArrowLeft') {
      setSelectedIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    } else if (e.key === 'ArrowRight') {
      setSelectedIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    }
  }, [lightboxOpen, photos.length]);

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
          alt={hasPhotos ? `Photo ${selectedIndex + 1} of ${photos.length}` : 'No photo'}
        />
        {hasPhotos && (
          <span className="gallery__expand-hint">🔍 Click to enlarge</span>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="gallery__thumbnails" id="gallery-thumbnails">
          {photos.map((photo, i) => (
            <button
              key={i}
              className={`gallery__thumb${i === selectedIndex ? ' gallery__thumb--active' : ''}`}
              onClick={() => setSelectedIndex(i)}
              aria-label={`View photo ${i + 1}`}
            >
              <img src={photo} alt={`Thumbnail ${i + 1}`} loading="lazy" />
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

          {photos.length > 1 && (
            <button
              className="lightbox__arrow lightbox__arrow--prev"
              onClick={() => setSelectedIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))}
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          <img
            className="lightbox__image"
            src={photos[selectedIndex]}
            alt={`Photo ${selectedIndex + 1} of ${photos.length}`}
          />

          {photos.length > 1 && (
            <button
              className="lightbox__arrow lightbox__arrow--next"
              onClick={() => setSelectedIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))}
              aria-label="Next photo"
            >
              ›
            </button>
          )}

          <span className="lightbox__counter">
            {selectedIndex + 1} / {photos.length}
          </span>
        </div>
      )}
    </div>
  );
}

export default PropertyImageGallery;
