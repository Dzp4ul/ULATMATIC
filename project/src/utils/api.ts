/**
 * Central API base URL.
 * - On production (DigitalOcean), API and frontend are on the same domain,
 *   so we use relative paths (empty string = same origin).
 * - On local dev, Vite proxy handles /api → /api
 */
const API_BASE = '';

export default API_BASE;
