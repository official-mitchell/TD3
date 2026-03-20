/**
 * CORS origin helper. Normalizes CORS_ORIGIN (strip trailing slash, trim) so
 * it matches the browser's Origin header (which never includes trailing slash).
 * Add-only changelog: 2026-03-20 — created for production CORS fix.
 */

/**
 * Returns the allowed CORS origin for production, or false if not set.
 * Normalizes: trims whitespace, removes trailing slash (browser sends origin without it).
 */
export function getCorsOrigin(): string | false {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) return false;
  return raw.replace(/\/+$/, '');
}

/**
 * Returns CORS config for Express/Socket.IO based on NODE_ENV.
 * Production: single normalized origin or false. Development: localhost array.
 */
export function getCorsConfig():
  | string
  | false
  | string[] {
  if (process.env.NODE_ENV === 'production') {
    const origin = getCorsOrigin();
    return origin || false;
  }
  return [
    'http://localhost:3000',
    'http://localhost:4200',
    'http://localhost:5173',
    'http://localhost:8000',
  ];
}
