const DEFAULT_PROD_API_BASE =
  'https://hiraya-backend-b5hfcmcufmhqb2eh.francecentral-01.azurewebsites.net';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';
  if (configured) return trimTrailingSlash(configured);

  // In local dev we rely on Vite proxy with relative /api paths.
  if (import.meta.env.DEV) return '';

  // Production fallback so auth still works if VITE_API_BASE_URL is not set yet.
  return DEFAULT_PROD_API_BASE;
}

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
