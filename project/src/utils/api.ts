/**
 * Central API base URL.
 * - On production (DigitalOcean), API and frontend are on the same domain,
 *   so we use relative paths (empty string = same origin).
 * - On local dev, Vite proxy handles /api → /api
 */
const API_BASE = '';

const ASSET_BASE = (import.meta.env.VITE_ASSET_BASE_URL ?? '').trim().replace(/\/+$/, '');

export function resolveAssetUrl(path?: string | null): string | null {
  const raw = String(path ?? '').trim();
  if (!raw) return null;

  if (/^(https?:|blob:|data:)/i.test(raw)) {
    return raw;
  }

  const normalizedPath = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${ASSET_BASE}/${normalizedPath}`;
}

export default API_BASE;
