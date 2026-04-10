const DEFAULT_PROD_API_BASE =
  'https://hiraya-backend-b5hfcmcufmhqb2eh.francecentral-01.azurewebsites.net';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  // Local dev: use relative `/api` so Vite can proxy (vite.config.ts). Optional override:
  // VITE_API_DIRECT_URL=https://... when you must talk to a remote API from the dev server.
  if (import.meta.env.DEV) {
    const direct = (import.meta.env.VITE_API_DIRECT_URL as string | undefined)?.trim() ?? '';
    if (direct) return trimTrailingSlash(direct);
    return '';
  }

  const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';
  if (configured) return trimTrailingSlash(configured);

  // Production fallback so auth still works if VITE_API_BASE_URL is not set at build time.
  return DEFAULT_PROD_API_BASE;
}

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
