import type { Role } from '../context/AuthContext';

// ── Staff (labels vary by role; slugs are stable) ───────────────────────────

export const STAFF_SLUG_TO_LABELS: Record<string, readonly string[]> = {
  dashboard: ['Dashboard'],
  caseload: ['Caseload', 'My Residents', 'Residents'],
  'session-notes': ['Session Notes'],
  visits: ['Visits & Conferences', 'Home Visits'],
  'intervention-plans': ['Intervention Plans'],
  incidents: ['Incident Reports'],
  'health-records': ['Health Records'],
  'education-records': ['Education Records'],
  donors: ['Donors'],
  reports: ['Reports'],
  'pending-approvals': ['Pending Approvals'],
};

export function getStaffNavItems(role: Role | null): string[] {
  switch (role) {
    case 'Supervisor':
      return ['Dashboard', 'Caseload', 'Donors', 'Session Notes', 'Visits & Conferences', 'Reports', 'Pending Approvals'];
    case 'CaseManager':
      return ['Dashboard', 'Caseload', 'Session Notes', 'Visits & Conferences', 'Intervention Plans', 'Reports'];
    case 'SocialWorker':
      return ['Dashboard', 'My Residents', 'Session Notes', 'Home Visits', 'Incident Reports'];
    case 'FieldWorker':
      return ['Dashboard', 'Residents', 'Health Records', 'Education Records', 'Home Visits', 'Incident Reports'];
    default:
      return ['Dashboard'];
  }
}

export function staffNavItemToSlug(item: string): string {
  for (const [slug, labels] of Object.entries(STAFF_SLUG_TO_LABELS)) {
    if (labels.includes(item)) return slug;
  }
  return 'dashboard';
}

export function staffSlugToNavItem(slug: string | null, role: Role | null): string {
  const nav = getStaffNavItems(role);
  if (!slug) return nav[0] ?? 'Dashboard';
  const candidates = STAFF_SLUG_TO_LABELS[slug];
  if (!candidates) return nav[0] ?? 'Dashboard';
  const hit = candidates.find((l) => nav.includes(l));
  return hit ?? nav[0] ?? 'Dashboard';
}

// ── Donor ─────────────────────────────────────────────────────────────────────

const DONOR_NAV_TO_SLUG: Record<string, string> = {
  'My Impact': 'impact',
  'Donation History': 'donation-history',
  'Active Campaigns': 'campaigns',
  'My Profile': 'profile',
};

const DONOR_SLUG_TO_NAV: Record<string, string> = Object.fromEntries(
  Object.entries(DONOR_NAV_TO_SLUG).map(([nav, slug]) => [slug, nav]),
);

export const DONOR_NAV_ITEMS = ['My Impact', 'Donation History', 'Active Campaigns', 'My Profile'] as const;

export function donorNavItemToSlug(item: string): string {
  return DONOR_NAV_TO_SLUG[item] ?? 'impact';
}

export function donorSlugToNavItem(slug: string | null): string {
  if (!slug) return 'My Impact';
  return DONOR_SLUG_TO_NAV[slug] ?? 'My Impact';
}

// ── Resident ──────────────────────────────────────────────────────────────────

const RESIDENT_NAV_TO_SLUG: Record<string, string> = {
  'My Profile': 'profile',
  'My Progress': 'progress',
  'Health & Wellbeing': 'health',
  'Education': 'education',
  'Visit Schedule': 'visits',
  'My Goals': 'goals',
};

export const RESIDENT_NAV_ITEMS = [
  'My Profile',
  'My Progress',
  'Health & Wellbeing',
  'Education',
  'Visit Schedule',
  'My Goals',
] as const;

const RESIDENT_SLUG_TO_NAV: Record<string, string> = Object.fromEntries(
  Object.entries(RESIDENT_NAV_TO_SLUG).map(([nav, s]) => [s, nav]),
);

export function residentNavItemToSlug(item: string): string {
  return RESIDENT_NAV_TO_SLUG[item] ?? 'profile';
}

export function residentSlugToNavItem(slug: string | null): string {
  if (!slug) return 'My Profile';
  return RESIDENT_SLUG_TO_NAV[slug] ?? 'My Profile';
}

// ── Admin (in-portal tabs only; Pipelines uses /admin/pipelines) ─────────────

const ADMIN_NAV_TO_SLUG: Record<string, string> = {
  Dashboard: 'dashboard',
  Users: 'users',
  'Pending Approvals': 'pending-approvals',
  Residents: 'residents',
  Staff: 'staff',
  Safehouses: 'safehouses',
  Donations: 'donations',
  'Audit Log': 'audit-log',
  Reports: 'reports',
  'Social Media Impact': 'social-media-impact',
  Settings: 'settings',
};

const ADMIN_SLUG_TO_NAV: Record<string, string> = Object.fromEntries(
  Object.entries(ADMIN_NAV_TO_SLUG).map(([nav, slug]) => [slug, nav]),
);

export function adminNavItemToSlug(item: string): string {
  return ADMIN_NAV_TO_SLUG[item] ?? 'dashboard';
}

export function adminSlugToNavItem(slug: string | null): string {
  if (!slug) return 'Dashboard';
  return ADMIN_SLUG_TO_NAV[slug] ?? 'Dashboard';
}
