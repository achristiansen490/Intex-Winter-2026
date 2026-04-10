import type { Role } from '../context/AuthContext';

const STAFF_ROLES: Role[] = ['Supervisor', 'CaseManager', 'SocialWorker', 'FieldWorker'];

/** Default home path for a role (primary portal entry). */
export function getHomePathForRole(role: Role | null): string {
  switch (role) {
    case 'Admin':
      return '/admin';
    case 'Supervisor':
    case 'CaseManager':
    case 'SocialWorker':
    case 'FieldWorker':
      return '/staff';
    case 'Resident':
      return '/resident';
    case 'Donor':
      return '/donor';
    default:
      return '/';
  }
}

function pathnameOnly(full: string): string {
  const q = full.indexOf('?');
  const h = full.indexOf('#');
  let end = full.length;
  if (q !== -1) end = Math.min(end, q);
  if (h !== -1) end = Math.min(end, h);
  return full.slice(0, end);
}

/**
 * Blocks open redirects: same-origin style path only, no scheme, no path traversal.
 */
export function isSafeReturnPath(full: string): boolean {
  const t = full.trim();
  if (!t.startsWith('/') || t.startsWith('//')) return false;
  if (t.includes('://') || /[\s<>"']/.test(t)) return false;
  const pathPart = pathnameOnly(t);
  for (const seg of pathPart.split('/')) {
    if (seg === '.' || seg === '..') return false;
  }
  return true;
}

/** Whether this role may open this pathname (pathname only, no query). */
export function canRoleAccessPath(role: Role, pathname: string): boolean {
  if (pathname === '/' || pathname.startsWith('/impact') || pathname.startsWith('/privacy') || pathname.startsWith('/pending-approval')) {
    return true;
  }
  if (pathname.startsWith('/donate')) {
    return role === 'Donor';
  }
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return true;
  }
  if (pathname.startsWith('/admin')) {
    return role === 'Admin';
  }
  if (pathname.startsWith('/staff')) {
    return STAFF_ROLES.includes(role);
  }
  if (pathname.startsWith('/resident')) {
    return role === 'Resident';
  }
  if (pathname.startsWith('/donor')) {
    return role === 'Donor';
  }
  return false;
}

/**
 * After login (or when already authenticated): safe internal return URL, else role home.
 * `returnUrl` should be the raw decoded query value (path + optional ?search + optional #hash).
 */
export function resolvePostLoginTarget(role: Role | null, returnUrl: string | null): string {
  if (!role) return '/';
  if (returnUrl && isSafeReturnPath(returnUrl)) {
    const path = pathnameOnly(returnUrl);
    if (canRoleAccessPath(role, path)) {
      return returnUrl;
    }
  }
  return getHomePathForRole(role);
}
