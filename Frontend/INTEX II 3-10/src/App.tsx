import { useEffect, useMemo, useState, type FormEvent } from "react";

type Page = "landing" | "impact" | "contributions" | "login";
type SetPage = (page: Page) => void;

type SampaguitaIconProps = {
  size?: number;
  bg: string;
  petalColor: string;
  centerColor: string;
};

type LogoProps = { light?: boolean };

type NavBarProps = { setPage: SetPage };

type MetricCardProps = {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
};

type DashboardOverview = {
  safehouseCount: number;
  activeResidentCount: number;
  partnerCount: number;
  totalMonetaryAmount: number;
  topPost?: {
    postId: number;
    platform?: string;
    createdAt?: string;
    campaignName?: string;
    engagementRate?: number;
    reach?: number;
    donationReferrals?: number;
    estimatedDonationValuePhp?: number;
  } | null;
};

type DonationSummary = {
  totalDonationRows: number;
  totalMonetaryAmount: number;
  totalEstimatedValue: number;
  byType: Array<{
    donationType?: string;
    count: number;
    totalAmount: number;
    totalEstimatedValue: number;
  }>;
};

type DashboardKpis = {
  donor: {
    totalSupporters: number;
    activeSupporters: number;
    totalDonations: number;
    uniqueDonors: number;
    repeatDonors: number;
    recurringDonationCount: number;
    totalMonetaryAmount: number;
    avgMonetaryDonation: number;
    repeatDonorRate: number;
    recurringDonationRate: number;
  };
  operations: {
    activeResidents: number;
    highRiskResidents: number;
    reintegrationReadyResidents: number;
    processSessions: number;
    sessionsWithProgress: number;
    homeVisits: number;
    visitsWithSafetyConcern: number;
    progressSessionRate: number;
    safetyConcernVisitRate: number;
  };
  outreach: {
    socialPostCount: number;
    avgEngagementRate: number;
    totalReach: number;
    totalDonationReferrals: number;
    totalEstimatedDonationValuePhp: number;
    ctaPostCount: number;
    ctaPostsWithReferrals: number;
    ctaReferralRate: number;
    topCampaignByReferrals?: {
      campaignName: string;
      postCount: number;
      donationReferrals: number;
      estimatedDonationValuePhp: number;
    } | null;
  };
};

type PublicImpactSnapshot = {
  snapshotId: number;
  snapshotDate?: string;
  headline?: string;
  summaryText?: string;
  metricPayloadJson?: string;
  isPublished?: boolean;
  publishedAt?: string;
};

type Organization = {
  orgId: number;
  orgName?: string;
  legalName?: string;
  missionStatement?: string;
  operationsCountry?: string;
  website?: string;
};

type SocialMediaPost = {
  postId: number;
  platform?: string;
  createdAt?: string;
  campaignName?: string;
  postType?: string;
  engagementRate?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  donationReferrals?: number;
  estimatedDonationValuePhp?: number;
};

type Supporter = {
  supporterId: number;
  displayName?: string;
  status?: string;
  country?: string;
};

type PublicDonation = {
  donationId: number;
  donationDate?: string;
  donationType?: string;
  campaignName?: string;
  channelSource?: string;
  currencyCode?: string;
  amount?: number;
  estimatedValue?: number;
};

type AuthMe = {
  id: number;
  userName: string;
  email: string;
  isActive: boolean;
  isApproved: boolean;
  roles: string[];
};

type AdminProofResponse = {
  message: string;
  check: {
    generatedAtUtc: string;
    donations: number;
    supporters: number;
    residents: number;
    safehouses: number;
    socialPosts: number;
  };
};

type LandingPageProps = {
  setPage: SetPage;
  overview: DashboardOverview | null;
  organization: Organization | null;
  snapshot: PublicImpactSnapshot | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

type ImpactDashboardProps = {
  overview: DashboardOverview | null;
  summary: DonationSummary | null;
  kpis: DashboardKpis | null;
  posts: SocialMediaPost[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

type ContributionsPageProps = {
  summary: DonationSummary | null;
  kpis: DashboardKpis | null;
  recentDonations: PublicDonation[];
  supporters: Supporter[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

type PublicDataState = {
  overview: DashboardOverview | null;
  summary: DonationSummary | null;
  kpis: DashboardKpis | null;
  snapshots: PublicImpactSnapshot[];
  organizations: Organization[];
  posts: SocialMediaPost[];
  supporters: Supporter[];
  recentDonations: PublicDonation[];
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :focus-visible {
    outline: 3px solid #D4A44C;
    outline-offset: 3px;
    border-radius: 4px;
  }
  .skip-link {
    position: absolute; top: -100%; left: 1rem;
    background: #2A4A35; color: #FBF8F2;
    padding: 0.5rem 1rem; border-radius: 0 0 6px 6px;
    font-size: 14px; font-weight: 600; z-index: 9999;
    text-decoration: none;
  }
  .skip-link:focus { top: 0; }
  .sr-only {
    position: absolute; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0,0,0,0); white-space: nowrap; border: 0;
  }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .hero-btns { display: flex; gap: 12px; flex-wrap: wrap; }
  .footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
  .footer-links { display: flex; gap: 20px; flex-wrap: wrap; list-style: none; }
  .nav-links-desktop { display: flex; align-items: center; gap: 24px; }
  .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 8px; flex-direction: column; gap: 5px; }
  .mobile-menu { display: none; flex-direction: column; background: rgba(251,248,242,0.98); border-top: 0.5px solid rgba(44,43,40,0.1); padding: 1rem 1.5rem; gap: 0.75rem; }
  .mobile-menu.open { display: flex; }
  .dash-main { padding: 1.5rem 2rem; max-width: 1100px; margin: 0 auto; }

  @media (max-width: 900px) {
    .grid-4 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: 1fr; }
    .grid-2 { grid-template-columns: 1fr; }
  }

  @media (max-width: 768px) {
    .nav-links-desktop { display: none; }
    .hamburger { display: flex; }
    .dash-main { padding: 1rem; }
    .hero-section { padding: 3rem 1.25rem 2.5rem !important; }
    .mission-grid { padding: 2rem 1.25rem !important; gap: 1.5rem !important; }
    .footer-inner { flex-direction: column; align-items: flex-start; }
  }
`;

const c = {
  ivory: "#FBF8F2",
  rose: "#C4867A",
  roseLight: "#F0D8D4",
  sage: "#6B9E7E",
  sageLight: "#D4EAD9",
  forest: "#2A4A35",
  gold: "#D4A44C",
  goldLight: "#F5E6C8",
  text: "#2C2B28",
  muted: "#7A786F",
  white: "#FFFFFF",
};

const SHARED_HERO_IMG = 'url("/Smiles under the sun.png")';
const HERO_BG = `linear-gradient(135deg,rgba(42,74,53,0.56) 0%,rgba(196,134,122,0.34) 58%,rgba(212,164,76,0.22) 100%), ${SHARED_HERO_IMG} center top/cover no-repeat`;
const DASH_BANNER_BG = `linear-gradient(120deg,rgba(42,74,53,0.74) 0%,rgba(196,134,122,0.44) 100%), ${SHARED_HERO_IMG} center/cover no-repeat`;

function formatInt(value: number | undefined | null) {
  const n = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat("en-US").format(Number.isFinite(n) ? n : 0);
}

function formatMoney(value: number | undefined | null, currency = "PHP") {
  const n = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function formatPercent(value: number | undefined | null) {
  const n = typeof value === "number" ? value : 0;
  const safe = Number.isFinite(n) ? n : 0;
  return `${(safe * 100).toFixed(1)}%`;
}

function formatDate(value: string | undefined) {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function parseErrorMessage(raw: unknown) {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "message" in raw && typeof raw.message === "string") return raw.message;
  return "Request failed.";
}

function hasPositive(value: number | undefined | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as unknown;
      message = parseErrorMessage(body);
    } catch {
      // ignore JSON parsing error for non-json responses
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const payload = (await res.json()) as unknown;
      message = parseErrorMessage(payload);
    } catch {
      // ignore JSON parsing error for non-json responses
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

function SampaguitaIcon({ size = 32, bg, petalColor, centerColor }: SampaguitaIconProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" focusable="false">
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <ellipse
            key={i}
            cx={12 + 5.5 * Math.cos(((angle - 90) * Math.PI) / 180)}
            cy={12 + 5.5 * Math.sin(((angle - 90) * Math.PI) / 180)}
            rx="2.8"
            ry="4.2"
            fill={petalColor}
            opacity="0.92"
            transform={`rotate(${angle},${12 + 5.5 * Math.cos(((angle - 90) * Math.PI) / 180)},${12 + 5.5 * Math.sin(((angle - 90) * Math.PI) / 180)})`}
          />
        ))}
        <circle cx="12" cy="12" r="3" fill={centerColor} />
        <circle cx="12" cy="12" r="1.4" fill={petalColor} opacity="0.6" />
      </svg>
    </div>
  );
}

function Logo({ light = false }: LogoProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <SampaguitaIcon
        size={32}
        bg={light ? c.gold : c.forest}
        petalColor={light ? c.forest : c.ivory}
        centerColor={light ? c.forest : c.gold}
      />
      <span
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 16,
          fontWeight: 400,
          color: light ? c.ivory : c.forest,
          letterSpacing: "0.01em",
        }}
      >
        Hiraya Haven
      </span>
    </div>
  );
}

function NavBar({ setPage }: NavBarProps) {
  const [open, setOpen] = useState(false);
  const links: { label: string; page: Page }[] = [
    { label: "Home", page: "landing" },
    { label: "Impact", page: "impact" },
    { label: "Donors & Contributions", page: "contributions" },
    { label: "Admin Login", page: "login" },
  ];

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header>
        <nav
          aria-label="Main navigation"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "rgba(251,248,242,0.96)",
            backdropFilter: "blur(8px)",
            borderBottom: "0.5px solid rgba(44,43,40,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 2rem",
              height: 56,
            }}
          >
            <button
              onClick={() => setPage("landing")}
              aria-label="Hiraya Haven — return to home page"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
            >
              <Logo />
            </button>

            <div className="nav-links-desktop">
              {links.map(({ label, page }) => (
                <button
                  key={label}
                  onClick={() => setPage(page)}
                  style={{
                    fontSize: 13,
                    color: c.muted,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 2px",
                  }}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setPage("contributions")}
                style={{
                  background: c.gold,
                  color: c.forest,
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "8px 18px",
                  borderRadius: 24,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Give Hope
              </button>
            </div>

            <button
              className="hamburger"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-nav-menu"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  style={{
                    display: "block",
                    width: 22,
                    height: 2,
                    background: c.forest,
                    borderRadius: 2,
                    transform: open
                      ? i === 0
                        ? "rotate(45deg) translate(5px,5px)"
                        : i === 2
                          ? "rotate(-45deg) translate(5px,-5px)"
                          : "scaleX(0)"
                      : "none",
                    transition: "transform 0.2s",
                  }}
                />
              ))}
            </button>
          </div>

          <div id="mobile-nav-menu" className={`mobile-menu${open ? " open" : ""}`} role="menu">
            {links.map(({ label, page }) => (
              <button
                key={label}
                role="menuitem"
                onClick={() => {
                  setPage(page);
                  setOpen(false);
                }}
                style={{
                  fontSize: 15,
                  color: c.text,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: "10px 0",
                  borderBottom: "0.5px solid rgba(44,43,40,0.08)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>
      </header>
    </>
  );
}

function DataStatus({ isLoading, error, onRetry }: { isLoading: boolean; error: string | null; onRetry: () => void }) {
  if (!isLoading && !error) return null;

  return (
    <div
      role="status"
      style={{
        margin: "0 0 1rem",
        background: error ? c.roseLight : c.sageLight,
        border: `0.5px solid ${error ? c.rose : c.sage}`,
        color: c.text,
        padding: "0.75rem 1rem",
        borderRadius: 10,
        fontSize: 13,
      }}
    >
      {isLoading ? "Loading live data from API..." : error}
      {error && (
        <button
          onClick={onRetry}
          style={{
            marginLeft: 12,
            background: c.white,
            border: `0.5px solid ${c.rose}`,
            color: c.text,
            padding: "4px 10px",
            borderRadius: 14,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

function EmptyDataHint({ message }: { message: string }) {
  return (
    <div
      style={{
        margin: "0 0 1rem",
        background: c.goldLight,
        border: `0.5px solid ${c.gold}`,
        color: c.text,
        padding: "0.75rem 1rem",
        borderRadius: 10,
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

function MetricCard({ label, value, sub, accent }: MetricCardProps) {
  return (
    <div
      style={{
        background: c.white,
        border: "0.5px solid rgba(44,43,40,0.12)",
        padding: "12px 14px",
        borderRadius: accent ? "0 8px 8px 0" : 8,
        borderLeft: accent ? `3px solid ${accent}` : undefined,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: c.muted,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: accent || c.forest }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: c.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function LandingPage({ setPage, overview, organization, snapshot, isLoading, error, onRetry }: LandingPageProps) {
  const heroTitle = snapshot?.headline || "Healing hearts, rebuilding futures.";
  const heroCopy = snapshot?.summaryText || organization?.missionStatement || "We provide safe homes and comprehensive rehabilitation for girls who are survivors of abuse and trafficking in the Philippines.";

  return (
    <main id="main-content">
      <section aria-labelledby="hero-heading" className="hero-section" style={{ background: HERO_BG, padding: "5rem 2.5rem 4rem" }}>
        <p
          aria-hidden="true"
          style={{
            display: "inline-block",
            background: "rgba(255,255,255,0.15)",
            color: c.sageLight,
            fontSize: 12,
            letterSpacing: "0.12em",
            padding: "5px 14px",
            borderRadius: 20,
            marginBottom: "1.5rem",
            textTransform: "uppercase",
          }}
        >
          Live impact data
        </p>
        <h1
          id="hero-heading"
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "clamp(28px,5vw,52px)",
            fontWeight: 400,
            lineHeight: 1.2,
            color: c.ivory,
            margin: "0 0 1rem",
            maxWidth: 700,
          }}
        >
          {heroTitle}
        </h1>
        <p style={{ fontSize: 15, color: "rgba(251,248,242,0.85)", maxWidth: 560, lineHeight: 1.75, margin: "0 0 2rem" }}>{heroCopy}</p>

        <div className="hero-btns">
          <button
            onClick={() => setPage("contributions")}
            style={{
              background: c.gold,
              color: c.forest,
              fontSize: 14,
              fontWeight: 600,
              padding: "12px 28px",
              borderRadius: 28,
              border: "none",
              cursor: "pointer",
            }}
          >
            View Contributions
          </button>
          <button
            onClick={() => setPage("impact")}
            style={{
              background: "transparent",
              color: c.ivory,
              fontSize: 14,
              padding: "12px 28px",
              borderRadius: 28,
              border: "1px solid rgba(251,248,242,0.45)",
              cursor: "pointer",
            }}
          >
            Open Impact Dashboard
          </button>
        </div>
      </section>

      <section style={{ padding: "1.25rem 2.5rem", background: c.ivory }}>
        <DataStatus isLoading={isLoading} error={error} onRetry={onRetry} />
      </section>

      <div className="grid-3" role="list" aria-label="Impact at a glance" style={{ background: c.ivory, borderBottom: "0.5px solid rgba(44,43,40,0.1)" }}>
        {[
          [formatInt(overview?.activeResidentCount), "Active residents"],
          [formatInt(overview?.safehouseCount), "Active safehouses"],
          [formatInt(overview?.partnerCount), "Active partners"],
        ].map(([num, label]) => (
          <div key={label} role="listitem" style={{ padding: "1.5rem", textAlign: "center", borderRight: "0.5px solid rgba(44,43,40,0.1)" }}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400, color: c.forest }} aria-label={`${num} ${label}`}>
              {num}
            </div>
            <div aria-hidden="true" style={{ fontSize: 13, color: c.muted, marginTop: 3 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <section aria-labelledby="mission-heading" className="grid-3 mission-grid" style={{ background: c.ivory, gap: "2rem", padding: "3rem 2.5rem" }}>
        <h2 id="mission-heading" className="sr-only">
          Mission and organization profile
        </h2>
        <article>
          <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, background: c.roseLight, marginBottom: 14 }} />
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: 17, color: c.forest, marginBottom: 8, fontWeight: 400 }}>Organization</h3>
          <p style={{ fontSize: 14, color: c.muted, lineHeight: 1.7 }}>{organization?.orgName || organization?.legalName || "Hiraya Haven"}</p>
        </article>

        <article>
          <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, background: c.sageLight, marginBottom: 14 }} />
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: 17, color: c.forest, marginBottom: 8, fontWeight: 400 }}>Operations</h3>
          <p style={{ fontSize: 14, color: c.muted, lineHeight: 1.7 }}>{organization?.operationsCountry || "Philippines"}</p>
        </article>

        <article>
          <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, background: c.goldLight, marginBottom: 14 }} />
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: 17, color: c.forest, marginBottom: 8, fontWeight: 400 }}>Total monetary donations</h3>
          <p style={{ fontSize: 14, color: c.muted, lineHeight: 1.7 }}>{formatMoney(overview?.totalMonetaryAmount, "PHP")}</p>
        </article>
      </section>

      <footer style={{ background: c.ivory, borderTop: "0.5px solid rgba(44,43,40,0.1)", padding: "1.5rem 2.5rem" }}>
        <div className="footer-inner">
          <Logo />
          <nav aria-label="Footer links">
            <ul className="footer-links">
              {["Impact", "Contributions", "Admin"].map((l) => (
                <li key={l}>
                  <button
                    onClick={() => setPage(l === "Impact" ? "impact" : l === "Contributions" ? "contributions" : "login")}
                    style={{ fontSize: 13, color: c.muted, textDecoration: "none", background: "none", border: "none", cursor: "pointer" }}
                  >
                    {l}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <p style={{ fontSize: 12, color: c.muted }}>API source: {API_BASE}</p>
        </div>
      </footer>
    </main>
  );
}

function ImpactDashboard({ overview, summary, kpis, posts, isLoading, error, onRetry }: ImpactDashboardProps) {
  const topCampaigns = posts
    .filter((post) => post.postId > 0 && (post.campaignName || post.platform || hasPositive(post.reach)))
    .slice(0, 6);
  const donationTypeRows = (summary?.byType || []).filter((row) => row.count > 0 || hasPositive(row.totalEstimatedValue));
  const impactHasData =
    hasPositive(overview?.safehouseCount) ||
    hasPositive(overview?.activeResidentCount) ||
    hasPositive(overview?.partnerCount) ||
    hasPositive(summary?.totalDonationRows) ||
    topCampaigns.length > 0;

  return (
    <main id="main-content" className="dash-main">
      <section aria-label="Impact dashboard" style={{ background: DASH_BANNER_BG, borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
        <p style={{ fontSize: 12, color: "rgba(251,248,242,0.65)", marginBottom: 3 }}>Public impact dashboard</p>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 24, color: c.ivory, fontWeight: 400, marginBottom: 4 }}>Real-time program and donor outcomes</h1>
        <p style={{ fontSize: 13, color: c.gold }}>Connected to live backend endpoints</p>
      </section>

      <DataStatus isLoading={isLoading} error={error} onRetry={onRetry} />
      {!isLoading && !error && !impactHasData && (
        <EmptyDataHint message="No impact rows are available yet. Once source tables are populated, these cards update automatically." />
      )}

      <section aria-labelledby="overview-metrics" style={{ marginBottom: "1rem" }}>
        <h2 id="overview-metrics" className="sr-only">
          Overview metrics
        </h2>
        <div className="grid-4" style={{ marginBottom: 10 }}>
          <MetricCard label="Active residents" value={formatInt(kpis?.operations.activeResidents ?? overview?.activeResidentCount)} sub="Current caseload" />
          <MetricCard label="Active safehouses" value={formatInt(overview?.safehouseCount)} sub="Housing operations" accent={c.sage} />
          <MetricCard label="Active partners" value={formatInt(overview?.partnerCount)} sub="In-country coordination" accent={c.gold} />
          <MetricCard label="Monetary donations" value={formatMoney(summary?.totalMonetaryAmount, "PHP")} sub={`${formatInt(summary?.totalDonationRows)} total donation records`} />
        </div>
      </section>

      <section aria-labelledby="kpi-metrics" style={{ marginBottom: "1rem" }}>
        <h2 id="kpi-metrics" className="sr-only">
          Additional project KPIs
        </h2>
        <div className="grid-4">
          <MetricCard
            label="High-risk residents"
            value={formatInt(kpis?.operations.highRiskResidents)}
            sub="Current risk level contains High/Critical"
            accent={c.rose}
          />
          <MetricCard
            label="Reintegration ready"
            value={formatInt(kpis?.operations.reintegrationReadyResidents)}
            sub="Residents with reintegration-ready status"
            accent={c.gold}
          />
          <MetricCard
            label="Session progress rate"
            value={formatPercent(kpis?.operations.progressSessionRate)}
            sub={`${formatInt(kpis?.operations.sessionsWithProgress)} of ${formatInt(kpis?.operations.processSessions)} sessions`}
            accent={c.sage}
          />
          <MetricCard
            label="CTA referral rate"
            value={formatPercent(kpis?.outreach.ctaReferralRate)}
            sub={`${formatInt(kpis?.outreach.ctaPostsWithReferrals)} of ${formatInt(kpis?.outreach.ctaPostCount)} CTA posts`}
            accent={c.forest}
          />
        </div>
      </section>

      <div className="grid-2">
        <section style={{ background: c.white, border: "0.5px solid rgba(44,43,40,0.1)", borderRadius: 10, padding: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: c.forest, marginBottom: 6 }}>Top social media campaigns</h2>
          <p style={{ fontSize: 12, color: c.muted, marginBottom: 12 }}>Source: `/api/socialmediaposts?take=6`</p>
          <ul style={{ listStyle: "none" }}>
            {topCampaigns.length === 0 && <li style={{ fontSize: 13, color: c.muted }}>No campaign data available.</li>}
            {topCampaigns.map((post) => (
              <li
                key={post.postId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "0.5px solid rgba(44,43,40,0.08)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: c.text }}>{post.campaignName || "Untitled campaign"}</div>
                  <div style={{ fontSize: 11, color: c.muted }}>
                    {(post.platform || "Unknown platform") + " · " + formatDate(post.createdAt)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.forest }}>{formatInt(post.reach)} reach</div>
                  <div style={{ fontSize: 11, color: c.muted }}>{(post.engagementRate ?? 0).toFixed(2)}% engagement</div>
                </div>
              </li>
            ))}
          </ul>
          {kpis?.outreach.topCampaignByReferrals && (
            <div style={{ marginTop: 10, fontSize: 12, color: c.muted }}>
              Top campaign by referrals: <strong>{kpis.outreach.topCampaignByReferrals.campaignName}</strong> (
              {formatInt(kpis.outreach.topCampaignByReferrals.donationReferrals)} referrals)
            </div>
          )}
        </section>

        <section style={{ background: c.white, border: "0.5px solid rgba(44,43,40,0.1)", borderRadius: 10, padding: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: c.forest, marginBottom: 6 }}>Donation mix by type</h2>
          <p style={{ fontSize: 12, color: c.muted, marginBottom: 12 }}>Source: `/api/donations/summary`</p>
          <div style={{ fontSize: 12, color: c.muted, marginBottom: 10 }}>
            Total reach: {formatInt(kpis?.outreach.totalReach)} · Estimated post-driven donation value:{" "}
            {formatMoney(kpis?.outreach.totalEstimatedDonationValuePhp, "PHP")}
          </div>
          <ul style={{ listStyle: "none" }}>
            {donationTypeRows.map((row) => (
              <li
                key={row.donationType || "Unknown"}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "0.5px solid rgba(44,43,40,0.08)",
                }}
              >
                <span style={{ fontSize: 13, color: c.text }}>{row.donationType || "Unknown"}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: c.sage }}>
                  {formatInt(row.count)} · {formatMoney(row.totalEstimatedValue, "PHP")}
                </span>
              </li>
            ))}
            {donationTypeRows.length === 0 && <li style={{ fontSize: 13, color: c.muted }}>No donation summary data available.</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}

function DonorsContributionsPage({ summary, kpis, recentDonations, supporters, isLoading, error, onRetry }: ContributionsPageProps) {
  const activeSupporters = useMemo(
    () => supporters.filter((s) => (s.status || "").toLowerCase() === "active").length,
    [supporters],
  );
  const validDonations = useMemo(
    () =>
      recentDonations.filter(
        (row) => row.donationId > 0 && (hasPositive(row.amount) || hasPositive(row.estimatedValue) || !!row.campaignName),
      ),
    [recentDonations],
  );
  const donationTypeRows = useMemo(
    () => (summary?.byType || []).filter((row) => row.count > 0 || hasPositive(row.totalEstimatedValue)),
    [summary?.byType],
  );
  const donorHasData =
    hasPositive(kpis?.donor.totalDonations) ||
    hasPositive(summary?.totalDonationRows) ||
    hasPositive(activeSupporters) ||
    validDonations.length > 0;

  return (
    <main id="main-content" className="dash-main">
      <section style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, color: c.forest, fontWeight: 400, marginBottom: 6 }}>Donors & Contributions</h1>
        <p style={{ fontSize: 14, color: c.muted }}>Public financial transparency view tied to live backend records.</p>
      </section>

      <DataStatus isLoading={isLoading} error={error} onRetry={onRetry} />
      {!isLoading && !error && !donorHasData && (
        <EmptyDataHint message="No donor contribution rows are available yet. This page is ready and will fill as soon as records exist." />
      )}

      <section className="grid-4" style={{ marginBottom: "1rem" }}>
        <MetricCard label="Total donations" value={formatInt(kpis?.donor.totalDonations ?? summary?.totalDonationRows)} />
        <MetricCard label="Monetary total" value={formatMoney(kpis?.donor.totalMonetaryAmount ?? summary?.totalMonetaryAmount, "PHP")} accent={c.sage} />
        <MetricCard label="Estimated value" value={formatMoney(summary?.totalEstimatedValue, "PHP")} accent={c.gold} />
        <MetricCard
          label="Active supporters"
          value={formatInt(kpis?.donor.activeSupporters ?? activeSupporters)}
          sub={`${formatInt(kpis?.donor.totalSupporters ?? supporters.length)} total supporter records`}
        />
      </section>

      <section className="grid-4" style={{ marginBottom: "1rem" }}>
        <MetricCard label="Unique donors" value={formatInt(kpis?.donor.uniqueDonors)} sub="Supporters with at least one donation" accent={c.sage} />
        <MetricCard label="Repeat donor rate" value={formatPercent(kpis?.donor.repeatDonorRate)} sub={`${formatInt(kpis?.donor.repeatDonors)} repeat donors`} accent={c.gold} />
        <MetricCard
          label="Recurring gift rate"
          value={formatPercent(kpis?.donor.recurringDonationRate)}
          sub={`${formatInt(kpis?.donor.recurringDonationCount)} recurring donations`}
          accent={c.forest}
        />
        <MetricCard label="Avg monetary gift" value={formatMoney(kpis?.donor.avgMonetaryDonation, "PHP")} sub="Average donation amount (Monetary type)" />
      </section>

      <div className="grid-2">
        <section style={{ background: c.white, border: "0.5px solid rgba(44,43,40,0.1)", borderRadius: 10, padding: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: c.forest, marginBottom: 8 }}>Recent contribution entries</h2>
          <p style={{ fontSize: 12, color: c.muted, marginBottom: 10 }}>Source: `/api/donations/public?take=12`</p>
          <ul style={{ listStyle: "none" }}>
            {validDonations.length === 0 && <li style={{ fontSize: 13, color: c.muted }}>No recent donations found.</li>}
            {validDonations.map((row) => (
              <li
                key={row.donationId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 0",
                  borderBottom: "0.5px solid rgba(44,43,40,0.08)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: c.text }}>{row.campaignName || "General contribution"}</div>
                  <div style={{ fontSize: 11, color: c.muted }}>{(row.donationType || "Unknown") + " · " + formatDate(row.donationDate)}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.sage }}>{formatMoney(row.amount ?? row.estimatedValue, row.currencyCode || "PHP")}</div>
              </li>
            ))}
          </ul>
        </section>

        <section style={{ background: c.white, border: "0.5px solid rgba(44,43,40,0.1)", borderRadius: 10, padding: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: c.forest, marginBottom: 8 }}>Contribution categories</h2>
          <p style={{ fontSize: 12, color: c.muted, marginBottom: 10 }}>Source: `/api/donations/summary`</p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", fontSize: 11, color: c.muted, paddingBottom: 6 }}>Type</th>
                <th style={{ textAlign: "right", fontSize: 11, color: c.muted, paddingBottom: 6 }}>Count</th>
                <th style={{ textAlign: "right", fontSize: 11, color: c.muted, paddingBottom: 6 }}>Est. Value</th>
              </tr>
            </thead>
            <tbody>
              {donationTypeRows.map((row) => (
                <tr key={row.donationType || "Unknown"}>
                  <td style={{ fontSize: 13, color: c.text, padding: "8px 0", borderTop: "0.5px solid rgba(44,43,40,0.08)" }}>{row.donationType || "Unknown"}</td>
                  <td style={{ fontSize: 13, color: c.text, textAlign: "right", padding: "8px 0", borderTop: "0.5px solid rgba(44,43,40,0.08)" }}>{formatInt(row.count)}</td>
                  <td style={{ fontSize: 13, color: c.sage, textAlign: "right", padding: "8px 0", borderTop: "0.5px solid rgba(44,43,40,0.08)" }}>
                    {formatMoney(row.totalEstimatedValue, "PHP")}
                  </td>
                </tr>
              ))}
              {donationTypeRows.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ fontSize: 13, color: c.muted, padding: "8px 0", borderTop: "0.5px solid rgba(44,43,40,0.08)" }}>
                    No contribution category data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

function AdminLoginPage() {
  const [email, setEmail] = useState("admin@hirayahaven.org");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(localStorage.getItem("hiraya_token"));
  const [profile, setProfile] = useState<AuthMe | null>(null);
  const [adminProof, setAdminProof] = useState<AdminProofResponse | null>(null);
  const [adminProofError, setAdminProofError] = useState<string | null>(null);
  const [isCheckingAdminProof, setIsCheckingAdminProof] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setProfile(null);
        setAdminProof(null);
        setAdminProofError(null);
        return;
      }

      try {
        const me = await apiGet<AuthMe>("/api/auth/me", token);
        setProfile(me);
        setError(null);

        setIsCheckingAdminProof(true);
        const proof = await apiGet<AdminProofResponse>("/api/dashboard/admin-proof", token);
        setAdminProof(proof);
        setAdminProofError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Session invalid.";
        if (message.includes("403") || message.toLowerCase().includes("forbidden")) {
          setAdminProof(null);
          setAdminProofError("Signed in, but this account is not authorized for admin-only dashboard proof.");
        } else {
          localStorage.removeItem("hiraya_token");
          setToken(null);
          setProfile(null);
          setAdminProof(null);
          setError(message);
        }
      } finally {
        setIsCheckingAdminProof(false);
      }
    };

    void loadProfile();
  }, [token]);

  const runAdminProofCheck = async () => {
    if (!token) return;
    setIsCheckingAdminProof(true);
    setAdminProofError(null);

    try {
      const proof = await apiGet<AdminProofResponse>("/api/dashboard/admin-proof", token);
      setAdminProof(proof);
    } catch (err) {
      setAdminProof(null);
      setAdminProofError(err instanceof Error ? err.message : "Admin proof check failed.");
    } finally {
      setIsCheckingAdminProof(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("hiraya_token");
    setToken(null);
    setProfile(null);
    setAdminProof(null);
    setAdminProofError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setAdminProof(null);
    setAdminProofError(null);

    try {
      const result = await apiPost<{ token: string }>("/api/auth/login", { email, password });
      localStorage.setItem("hiraya_token", result.token);
      setToken(result.token);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main id="main-content" className="dash-main">
      <section style={{ maxWidth: 520, margin: "0 auto", background: c.white, border: "0.5px solid rgba(44,43,40,0.12)", borderRadius: 12, padding: "1.25rem" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, color: c.forest, fontWeight: 400, marginBottom: 6 }}>Admin Login</h1>
        <p style={{ fontSize: 13, color: c.muted, marginBottom: 16 }}>
          Uses `/api/auth/login`, `/api/auth/me`, and protected `/api/dashboard/admin-proof` to verify role-based admin access.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13, color: c.text }}>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              style={{ border: "0.5px solid rgba(44,43,40,0.2)", borderRadius: 8, padding: "10px 12px", fontSize: 14 }}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 13, color: c.text }}>
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              style={{ border: "0.5px solid rgba(44,43,40,0.2)", borderRadius: 8, padding: "10px 12px", fontSize: 14 }}
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              background: c.forest,
              color: c.ivory,
              fontSize: 14,
              fontWeight: 600,
              padding: "10px 16px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {error && <p style={{ marginTop: 12, color: "#9A3E3E", fontSize: 13 }}>{error}</p>}

        {profile && (
          <div style={{ marginTop: 14, background: c.sageLight, border: `0.5px solid ${c.sage}`, borderRadius: 10, padding: "0.75rem" }}>
            <p style={{ fontSize: 13, color: c.text, marginBottom: 2 }}>
              Signed in as <strong>{profile.userName}</strong> ({profile.email})
            </p>
            <p style={{ fontSize: 12, color: c.muted }}>Roles: {profile.roles.join(", ")}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => void runAdminProofCheck()}
                disabled={isCheckingAdminProof}
                style={{
                  background: c.white,
                  border: `0.5px solid ${c.forest}`,
                  color: c.forest,
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 14,
                  cursor: "pointer",
                  opacity: isCheckingAdminProof ? 0.7 : 1,
                }}
              >
                {isCheckingAdminProof ? "Checking admin proof..." : "Run admin proof check"}
              </button>
              <button
                onClick={handleSignOut}
                style={{
                  background: c.white,
                  border: `0.5px solid ${c.rose}`,
                  color: c.text,
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 14,
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        )}

        {adminProof && (
          <div style={{ marginTop: 12, background: c.goldLight, border: `0.5px solid ${c.gold}`, borderRadius: 10, padding: "0.75rem" }}>
            <p style={{ fontSize: 13, color: c.text, marginBottom: 4 }}>
              <strong>Admin proof passed:</strong> {adminProof.message}
            </p>
            <p style={{ fontSize: 12, color: c.muted }}>
              {formatDate(adminProof.check.generatedAtUtc)} · Donations: {formatInt(adminProof.check.donations)} · Supporters: {formatInt(adminProof.check.supporters)} · Residents: {formatInt(adminProof.check.residents)} · Safehouses: {formatInt(adminProof.check.safehouses)} · Social posts: {formatInt(adminProof.check.socialPosts)}
            </p>
          </div>
        )}

        {adminProofError && <p style={{ marginTop: 12, color: "#9A3E3E", fontSize: 13 }}>{adminProofError}</p>}
      </section>
    </main>
  );
}
export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<PublicDataState>({
    overview: null,
    summary: null,
    kpis: null,
    snapshots: [],
    organizations: [],
    posts: [],
    supporters: [],
    recentDonations: [],
  });

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [overview, summary, kpis, snapshots, organizations, posts, supporters, recentDonations] = await Promise.all([
          apiGet<DashboardOverview>("/api/dashboard/overview"),
          apiGet<DonationSummary>("/api/donations/summary"),
          apiGet<DashboardKpis>("/api/dashboard/kpis"),
          apiGet<PublicImpactSnapshot[]>("/api/publicimpactsnapshots"),
          apiGet<Organization[]>("/api/organizations"),
          apiGet<SocialMediaPost[]>("/api/socialmediaposts?take=8"),
          apiGet<Supporter[]>("/api/supporters"),
          apiGet<PublicDonation[]>("/api/donations/public?take=12"),
        ]);

        if (isCancelled) return;

        setData({ overview, summary, kpis, snapshots, organizations, posts, supporters, recentDonations });
      } catch (err) {
        if (isCancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load API data.");
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [reloadKey]);

  const publishedSnapshot = useMemo(
    () => data.snapshots.find((s) => s.isPublished) ?? data.snapshots[0] ?? null,
    [data.snapshots],
  );
  const organization = data.organizations[0] ?? null;

  const retryLoad = () => setReloadKey((v) => v + 1);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      <div style={{ minHeight: "100vh", background: c.ivory }}>
        <NavBar setPage={setPage} />

        {page === "landing" && (
          <LandingPage
            setPage={setPage}
            overview={data.overview}
            organization={organization}
            snapshot={publishedSnapshot}
            isLoading={isLoading}
            error={error}
            onRetry={retryLoad}
          />
        )}

        {page === "impact" && (
          <ImpactDashboard
            overview={data.overview}
            summary={data.summary}
            kpis={data.kpis}
            posts={data.posts}
            isLoading={isLoading}
            error={error}
            onRetry={retryLoad}
          />
        )}

        {page === "contributions" && (
          <DonorsContributionsPage
            summary={data.summary}
            kpis={data.kpis}
            recentDonations={data.recentDonations}
            supporters={data.supporters}
            isLoading={isLoading}
            error={error}
            onRetry={retryLoad}
          />
        )}

        {page === "login" && <AdminLoginPage />}
      </div>
    </>
  );
}
