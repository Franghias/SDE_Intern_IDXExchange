import '../stylesheets/Pagination.css';

/**
 * Build the array of page numbers and ellipsis markers to display.
 *
 * Sliding window rules:
 *   - Always show page 1 so the user can jump back to the start.
 *   - Show a window of 5 consecutive pages around the current page.
 *   - Always show the last page.
 *   - Use '…' to bridge gaps between page 1, the window, and the last page.
 *
 * Examples (totalPages = 24):
 *   page 1  → 1,2,3,4,5, … 24
 *   page 4  → 1,2,3,4,5,6, … 24
 *   page 5  → 1, … 3,4,5,6,7, … 24
 *   page 22 → 1, … 20,21,22,23,24
 *   page 23 → 1, … 20,21,22,23,24
 *
 * @param {number} currentPage - 1-indexed current page
 * @param {number} totalPages  - total number of pages
 * @returns {Array<number|string>} page numbers and '…' markers
 */
export function buildPageNumbers(currentPage, totalPages) {
  if (totalPages <= 1) return [];

  const WINDOW_SIZE = 5;

  // Compute window start and end, clamped to valid range
  let windowStart = Math.max(1, currentPage - 2);
  let windowEnd = windowStart + WINDOW_SIZE - 1;

  // If window extends past totalPages, slide it back
  if (windowEnd >= totalPages) {
    windowEnd = totalPages;
    windowStart = Math.max(1, windowEnd - WINDOW_SIZE + 1);
  }

  const pages = [];

  // Always include page 1
  if (windowStart > 1) {
    pages.push(1);
    if (windowStart > 2) {
      pages.push('…');
    }
  }

  // Add window pages
  for (let i = windowStart; i <= windowEnd; i++) {
    pages.push(i);
  }

  // Add ellipsis + last page if not already included
  if (windowEnd < totalPages) {
    if (windowEnd < totalPages - 1) {
      pages.push('…');
    }
    pages.push(totalPages);
  }

  return pages;
}

/**
 * Pagination component with previous/next arrows, page numbers,
 * and smart ellipsis for large page counts.
 *
 * Hidden entirely when totalPages <= 1.
 */
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = buildPageNumbers(currentPage, totalPages);

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        className="pagination__btn pagination__prev"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        «
      </button>

      {pages.map((page, index) =>
        page === '…' ? (
          <span key={`ellipsis-${index}`} className="pagination__ellipsis">
            …
          </span>
        ) : (
          <button
            key={page}
            className={`pagination__btn pagination__page ${page === currentPage ? 'pagination__page--active' : ''
              }`}
            aria-current={page === currentPage ? 'page' : undefined}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        )
      )}

      <button
        className="pagination__btn pagination__next"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
      >
        »
      </button>
    </nav>
  );
}

export default Pagination;
