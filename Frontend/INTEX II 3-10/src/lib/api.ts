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

/** Keep in sync with <code>AuthContext</code> token storage. */
const TOKEN_KEY = 'hh_token';

/** Default headers for authenticated JSON calls to the API. */
export function authHeaders(extra?: HeadersInit): HeadersInit {
  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) ?? '' : '';
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  if (!extra) return base;
  return { ...base, ...(extra as Record<string, string>) };
}

/** <code>fetch</code> to <code>apiUrl(path)</code> with bearer + JSON content type. */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers as Record<string, string> | undefined) },
  });
}

/**
 * When the response is OK, parse JSON; otherwise return <code>fallback</code>.
 * Never throws on HTML or empty bodies (common for 401/403 from IIS/proxies).
 */
export async function jsonIfOk<T>(response: Response, fallback: T): Promise<T> {
  if (!response.ok) return fallback;
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

/**
 * Parse JSON from the response body for any status (e.g. 4xx/5xx error payloads).
 * Never throws on HTML or empty bodies. Use when you need <code>message</code> / validation details
 * after <code>!response.ok</code>, or when the caller handles success and failure from one parsed object.
 * For successful responses only, prefer <code>jsonIfOk</code>.
 */
export async function jsonBody<T>(response: Response, fallback: T): Promise<T> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}
