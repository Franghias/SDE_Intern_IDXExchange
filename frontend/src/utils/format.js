/**
 * Parse a photos JSON string into an array of URLs.
 * Returns an empty array if the input is null, empty, or invalid JSON.
 */
export function parsePhotos(photosStr) {
  if (!photosStr) return [];
  try {
    const parsed = JSON.parse(photosStr);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => {
      if (typeof item !== 'string') return false;
      // Filter out 404 error payloads or "Media record not found" response strings
      if (item.includes('"code":"404"') || item.includes('"code": "404"') || item.includes('Media record not found')) {
        return false;
      }
      return item.trim().length > 0;
    });
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

/**
 * Format a time string like "0 days 14:00:00" or "14:00:00" into "2:00 PM".
 */
export function formatTime(timeStr) {
  if (!timeStr) return '';
  // Extract HH:MM:SS from strings like "0 days 14:00:00" or plain "14:00:00"
  const match = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return timeStr;
  const hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
}

/**
 * Format a date string (YYYY-MM-DD or ISO) into a readable format.
 */
export function formatDate(dateStr, locale) {
  if (!dateStr) return '';

  let date;
  // If dateStr is a date-only string (YYYY-MM-DD), parse as local year/month/day
  // so it represents midnight in the user's local timezone, rather than UTC midnight.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateStr);
  }

  if (isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString(locale || undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
