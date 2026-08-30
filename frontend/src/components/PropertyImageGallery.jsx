import { useState, useEffect, useCallback, useRef } from 'react';
import { parsePhotos } from '../utils/format';
import '../stylesheets/PropertyImageGallery.css';

const PLACEHOLDER_IMG = 'https://placehold.co/800x500/1a1a2e/e0e0e0?text=No+Photo';

/**
 * Image gallery for the property detail page.
 * Main image (with touch swipe & prev/next arrows) + thumbnail strip + full-screen lightbox.
 * Automatically filters out 404 / broken media records so they are not shown to users.
 */
function PropertyImageGallery({ photosStr }) {
  const initialPhotos = parsePhotos(photosStr);
  const [failedPhotos, setFailedPhotos] = useState(new Set());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const thumbnailsRef = useRef(null);

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

  const handlePrev = useCallback((e) => {
    if (e) e.stopPropagation();
    if (validPhotos.length <= 1) return;
    setSelectedIndex((prev) => (prev === 0 ? validPhotos.length - 1 : prev - 1));
  }, [validPhotos.length]);

  const handleNext = useCallback((e) => {
    if (e) e.stopPropagation();
    if (validPhotos.length <= 1) return;
    setSelectedIndex((prev) => (prev === validPhotos.length - 1 ? 0 : prev + 1));
  }, [validPhotos.length]);

  // Touch swipe gesture handlers (mobile swipe left/right)
  function handleTouchStart(e) {
    if (e.touches && e.touches[0]) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  }

  function handleTouchEnd(e) {
    if (!e.changedTouches || !e.changedTouches[0] || validPhotos.length <= 1) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Trigger swipe if predominantly horizontal and at least 35px threshold
    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        handleNext(); // Swiped left -> next photo
      } else {
        handlePrev(); // Swiped right -> previous photo
      }
    }
  }

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailsRef.current) {
      const activeThumb = thumbnailsRef.current.querySelector('.gallery__thumb--active');
      if (activeThumb && typeof activeThumb.scrollIntoView === 'function') {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [safeIndex]);

  // Lightbox keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!lightboxOpen) return;
    if (e.key === 'Escape') {
      setLightboxOpen(false);
    } else if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    }
  }, [lightboxOpen, handlePrev, handleNext]);

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
      {/* Main image with touch swipe and navigation controls */}
      <div
        className="gallery__main"
        onClick={() => hasPhotos && setLightboxOpen(true)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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

        {/* Previous / Next overlay arrow buttons */}
        {validPhotos.length > 1 && (
          <>
            <button
              type="button"
              className="gallery__nav-btn gallery__nav-btn--prev"
              onClick={handlePrev}
              aria-label="Previous photo"
              title="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              className="gallery__nav-btn gallery__nav-btn--next"
              onClick={handleNext}
              aria-label="Next photo"
              title="Next photo"
            >
              ›
            </button>
          </>
        )}

        {/* Photo counter & expand hints */}
        {hasPhotos && (
          <div className="gallery__overlay-meta">
            {validPhotos.length > 1 && (
              <span className="gallery__counter-badge">
                📷 {safeIndex + 1} / {validPhotos.length}
              </span>
            )}
            <span className="gallery__expand-hint">🔍 Click to enlarge</span>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {validPhotos.length > 1 && (
        <div className="gallery__thumbnails" id="gallery-thumbnails" ref={thumbnailsRef}>
          {validPhotos.map((photo, i) => (
            <button
              key={photo + i}
              type="button"
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

      {/* Lightbox with touch swipe support */}
      {lightboxOpen && hasPhotos && (
        <div
          className="lightbox"
          onClick={handleOverlayClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          role="dialog"
          aria-label="Photo lightbox"
        >
          <button
            type="button"
            className="lightbox__close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close lightbox"
          >
            ✕
          </button>

          {validPhotos.length > 1 && (
            <button
              type="button"
              className="lightbox__arrow lightbox__arrow--prev"
              onClick={handlePrev}
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
              type="button"
              className="lightbox__arrow lightbox__arrow--next"
              onClick={handleNext}
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
