/**
 * Parse a photos JSON string into an array of URLs.
 * Returns an empty array if the input is null, empty, or invalid JSON.
 */
export function parsePhotos(photosStr) {
  if (!photosStr) return [];
  try {
    const parsed = JSON.parse(photosStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Format a number as USD currency (e.g., 459900 → "$459,900").
 */
export function formatPrice(price) {
  if (price == null) return 'N/A';
  return price.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}
