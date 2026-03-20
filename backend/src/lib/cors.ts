/**
 * CORS origin helper. Normalizes CORS_ORIGIN (strip trailing slash, trim) so
 * it matches the browser's Origin header (which never includes trailing slash).
 * Uses CORS_ORIGIN when set regardless of NODE_ENV (Render Docker may not set it).
 * Add-only changelog: 2026-03-20 — created; 2026-03-20 — use CORS_ORIGIN when set, add allow-all.
 */

const LOCALHOST_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:4200',
  'http://localhost:5173',
  'http://localhost:8000',
];

/**
 * Returns the allowed CORS origin, or false if not set.
 * Normalizes: trims whitespace, removes trailing slash (browser sends origin without it).
 * Special: CORS_ORIGIN=* allows all origins (for debugging; logs warning).
 */
export function getCorsOrigin(): string | false {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) return false;
  return raw.replace(/\/+$/, '');
}

/**
 * Returns CORS config for Express/Socket.IO.
 * Uses CORS_ORIGIN when set (regardless of NODE_ENV). Otherwise localhost array for dev.
 */
export function getCorsConfig():
  | string
  | false
  | string[] {
  const origin = getCorsOrigin();
  if (origin === '*') {
    console.warn('CORS_ORIGIN=* allows all origins — use only for debugging');
    return '*';
  }
  if (origin) {
    return origin;
  }
  return LOCALHOST_ORIGINS;
}
