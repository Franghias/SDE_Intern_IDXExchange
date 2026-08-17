/**
 * Lightweight logger with automatic sensitive-value redaction.
 *
 * Redacts query-string values for keys that match common secret patterns
 * (key, token, secret, password, auth, authorization, email, ssn, credential).
 * Also provides a sanitizeError() helper that strips stack traces and internal
 * details before they reach HTTP responses.
 *
 * Follows Ponytail: zero external dependencies, single focused file.
 */

/** Keys whose values should be masked in logged URLs and objects. */
const SENSITIVE_KEYS = /^(key|token|secret|password|passwd|pwd|auth|authorization|api_key|apikey|access_token|refresh_token|email|ssn|credential)$/i;

/**
 * Redact sensitive query-string values from a URL path.
 * Example: /api/foo?token=abc123&page=1 → /api/foo?token=[REDACTED]&page=1
 */
function redactUrl(url) {
  const qIndex = url.indexOf('?');
  if (qIndex === -1) return url;

  const path = url.slice(0, qIndex);
  const query = url.slice(qIndex + 1);

  const redacted = query
    .split('&')
    .map((pair) => {
      const eqIndex = pair.indexOf('=');
      if (eqIndex === -1) return pair;
      const paramKey = pair.slice(0, eqIndex);
      if (SENSITIVE_KEYS.test(paramKey)) {
        return `${paramKey}=[REDACTED]`;
      }
      return pair;
    })
    .join('&');

  return `${path}?${redacted}`;
}

/**
 * Return a generic, safe error message suitable for HTTP responses.
 * Prevents leaking stack traces, SQL driver details, or hostnames.
 */
function sanitizeError(err) {
  if (!err) return 'An unexpected error occurred.';
  // Only pass through known safe, hand-written messages
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred.';
}

/** ISO-stamped info log. */
function info(message) {
  console.log(`[${new Date().toISOString()}] INFO  ${message}`);
}

/** ISO-stamped warn log. */
function warn(message) {
  console.warn(`[${new Date().toISOString()}] WARN  ${message}`);
}

/**
 * ISO-stamped error log.
 * Accepts an optional Error object whose message (not stack) is appended.
 */
function error(message, err) {
  const suffix = err && err.message ? `: ${err.message}` : '';
  console.error(`[${new Date().toISOString()}] ERROR ${message}${suffix}`);
}

module.exports = { redactUrl, sanitizeError, info, warn, error };
