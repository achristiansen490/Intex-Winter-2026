import { useState } from "react";

type Page = "landing" | "donor" | "staff";

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

type SidebarProps = {
  id: string;
  items: string[];
  active: string;
  setActive: (item: string) => void;
  user: string;
};

type LandingPageProps = { setPage: SetPage };

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
  .grid-chart { display: grid; grid-template-columns: 1fr 240px; gap: 12px; }
  .grid-bottom { display: grid; grid-template-columns: 1fr 200px; gap: 12px; }
  .cta-band { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; }
  .footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
  .footer-links { display: flex; gap: 20px; flex-wrap: wrap; list-style: none; }
  .hero-btns { display: flex; gap: 12px; flex-wrap: wrap; }
  .welcome-banner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
  .nav-links-desktop { display: flex; align-items: center; gap: 24px; }
  .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 8px; flex-direction: column; gap: 5px; }
  .mobile-menu { display: none; flex-direction: column; background: rgba(251,248,242,0.98); border-top: 0.5px solid rgba(44,43,40,0.1); padding: 1rem 1.5rem; gap: 0.75rem; }
  .mobile-menu.open { display: flex; }
  .dash-layout { display: flex; min-height: calc(100vh - 56px); }
  .dash-main { flex: 1; overflow-y: auto; padding: 1.5rem 2rem; }
  .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; }
  .sidebar-overlay.open { display: block; }
  .sidebar-toggle { display: none; }

  @media (max-width: 768px) {
    .nav-links-desktop { display: none; }
    .hamburger { display: flex; }
    .grid-3 { grid-template-columns: 1fr; }
    .grid-4 { grid-template-columns: repeat(2, 1fr); }
    .grid-chart { grid-template-columns: 1fr; }
    .grid-bottom { grid-template-columns: 1fr; }
    .sidebar-nav {
      position: fixed !important;
      top: 0; left: -260px; height: 100vh;
      width: 240px !important; z-index: 300;
      transition: left 0.25s ease;
    }
    .sidebar-nav.open { left: 0; }
    .sidebar-toggle { display: flex; }
    .sidebar-close { display: flex !important; }
    .dash-main { padding: 1rem; }
    .cta-band { flex-direction: column; align-items: flex-start; }
    .footer-inner { flex-direction: column; align-items: flex-start; }
    .welcome-banner { flex-direction: column; align-items: flex-start; }
    .hero-section { padding: 3rem 1.25rem 2.5rem !important; }
    .mission-grid { padding: 2rem 1.25rem !important; gap: 1.5rem !important; }
    .cta-section { padding: 2rem 1.25rem !important; }
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
const STAFF_BANNER_BG = `linear-gradient(120deg,rgba(42,74,53,0.76) 0%,rgba(107,158,126,0.5) 100%), ${SHARED_HERO_IMG} center/cover no-repeat`;

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
  const links: { label: string; page: Page | null }[] = [
    { label: "About", page: null },
    { label: "Impact", page: null },
    { label: "For Donors", page: "donor" },
    { label: "Staff Login", page: "staff" },
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
                  onClick={() => page && setPage(page)}
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
                onClick={() => setPage("donor")}
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
                  if (page) {
                    setPage(page);
                  }
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
            <button
              onClick={() => {
                setPage("donor");
                setOpen(false);
              }}
              style={{
                background: c.gold,
                color: c.forest,
                fontSize: 14,
                fontWeight: 600,
                padding: "10px 20px",
                borderRadius: 24,
                border: "none",
                cursor: "pointer",
                marginTop: 4,
                alignSelf: "flex-start",
              }}
            >
              Give Hope
            </button>
          </div>
        </nav>
      </header>
    </>
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

function Sidebar({ id, items, active, setActive, user }: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setOpen(true)}
        aria-label="Open sidebar navigation"
        aria-expanded={open}
        aria-controls={id}
        style={{
          position: "fixed",
          bottom: 20,
          left: 20,
          zIndex: 150,
          background: c.forest,
          color: c.ivory,
          border: "none",
          borderRadius: "50%",
          width: 48,
          height: 48,
          fontSize: 20,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ☰
      </button>

      <div className={`sidebar-overlay${open ? " open" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />

      <nav
        id={id}
        aria-label="Dashboard navigation"
        className={`sidebar-nav${open ? " open" : ""}`}
        style={{
          background: c.forest,
          width: 200,
          display: "flex",
          flexDirection: "column",
          padding: "1.25rem 0",
          flexShrink: 0,
        }}
      >
        <button
          className="sidebar-close"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
          style={{
            display: "none",
            alignSelf: "flex-end",
            marginRight: "0.75rem",
            background: "none",
            border: "none",
            color: c.ivory,
            fontSize: 20,
            cursor: "pointer",
            marginBottom: 8,
          }}
        >
          ✕
        </button>

        <div
          style={{
            padding: "0 1rem 1.25rem",
            borderBottom: "0.5px solid rgba(255,255,255,0.1)",
            marginBottom: "0.75rem",
          }}
        >
          <Logo light />
        </div>

        <ul style={{ listStyle: "none", flex: 1 }}>
          {items.map((item) => (
            <li key={item}>
              <button
                onClick={() => {
                  setActive(item);
                  setOpen(false);
                }}
                aria-current={active === item ? "page" : undefined}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 1rem",
                  fontSize: 13,
                  background: "none",
                  color: active === item ? c.gold : "rgba(251,248,242,0.65)",
                  borderLeft: `3px solid ${active === item ? c.gold : "transparent"}`,
                  border: "none",
                  borderRight: "none",
                  borderTop: "none",
                  borderBottom: "none",
                  cursor: "pointer",
                  ...(active === item ? { background: "rgba(212,164,76,0.18)" } : {}),
                }}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>

        <div
          style={{
            padding: "0.75rem 1rem",
            borderTop: "0.5px solid rgba(255,255,255,0.1)",
            fontSize: 12,
            color: "rgba(251,248,242,0.5)",
          }}
        >
          {user}
        </div>
      </nav>
    </>
  );
}

function LandingPage({ setPage }: LandingPageProps) {
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
          A beacon of hope & safety
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
            maxWidth: 620,
          }}
        >
          Healing <em style={{ color: c.roseLight, fontStyle: "italic" }}>hearts</em>, rebuilding{" "}
          <span style={{ color: c.gold }}>futures.</span>
        </h1>
        <p style={{ fontSize: 15, color: "rgba(251,248,242,0.85)", maxWidth: 480, lineHeight: 1.75, margin: "0 0 2rem" }}>
          We provide safe homes and comprehensive rehabilitation for girls who are survivors of abuse and trafficking in the Philippines.
        </p>
        <div className="hero-btns">
          <button
            onClick={() => setPage("donor")}
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
            Give Hope Today
          </button>
          <button
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
            Learn Our Approach
          </button>
        </div>
      </section>

      <div className="grid-3" role="list" aria-label="Impact at a glance" style={{ background: c.ivory, borderBottom: "0.5px solid rgba(44,43,40,0.1)" }}>
        {[
          ["247", "Girls served"],
          ["8", "Active safehouses"],
          ["7 years", "Of impact"],
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
          Our mission pillars
        </h2>
        {[
          {
            bg: c.roseLight,
            title: "Safe homes",
            text: "Trauma-informed residential care across safehouses in Luzon, Visayas, and Mindanao.",
          },
          {
            bg: c.sageLight,
            title: "Healing & counseling",
            text: "Structured psychosocial support, individual and group sessions, and intervention planning.",
          },
          {
            bg: c.goldLight,
            title: "Reintegration",
            text: "Education, vocational training, and family reunification pathways toward lasting independence.",
          },
        ].map(({ bg, title, text }) => (
          <article key={title}>
            <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, background: bg, marginBottom: 14 }} />
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: 17, color: c.forest, marginBottom: 8, fontWeight: 400 }}>{title}</h3>
            <p style={{ fontSize: 14, color: c.muted, lineHeight: 1.7 }}>{text}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="cta-heading" className="cta-section" style={{ background: c.forest, padding: "3rem 2.5rem" }}>
        <div className="cta-band">
          <div>
            <h2 id="cta-heading" style={{ fontFamily: "Georgia, serif", fontSize: 24, color: c.ivory, marginBottom: 8, fontWeight: 400 }}>
              Ready to make a difference?
            </h2>
            <p style={{ fontSize: 14, color: "rgba(251,248,242,0.75)" }}>Every peso goes directly toward safety, healing, and futures.</p>
          </div>
          <button
            onClick={() => setPage("donor")}
            style={{
              background: c.gold,
              color: c.forest,
              fontSize: 14,
              fontWeight: 600,
              padding: "14px 32px",
              borderRadius: 28,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Donate Now
          </button>
        </div>
      </section>

      <footer style={{ background: c.ivory, borderTop: "0.5px solid rgba(44,43,40,0.1)", padding: "1.5rem 2.5rem" }}>
        <div className="footer-inner">
          <Logo />
          <nav aria-label="Footer links">
            <ul className="footer-links">
              {["Privacy Policy", "Cookie Policy", "Contact"].map((l) => (
                <li key={l}>
                  <a href="#" style={{ fontSize: 13, color: c.muted, textDecoration: "none" }}>
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <p style={{ fontSize: 12, color: c.muted }}>© 2025 Hiraya Haven. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

const donorNavItems = ["My Impact", "Donation History", "Active Campaigns", "My Profile"];
const donations = [
  { campaign: "Year-End Hope", date: "Dec 2024", amount: "₱5,000" },
  { campaign: "Back to School", date: "Aug 2024", amount: "₱2,500" },
  { campaign: "GivingTuesday", date: "Nov 2023", amount: "₱3,000" },
];
const barData = [
  [65, 30, 32],
  [55, 50, 55],
  [75, 28, 25],
  [60, 58, 62],
  [50, 25, 65],
  [70, 60, 55],
];
const quarters = ["Q1 2024", "Q2 2024", "Q3 2024", "Q4 2024", "Q1 2025", "Q2 2025"];

function DonorDashboard() {
  const [activeNav, setActiveNav] = useState("My Impact");
  return (
    <main id="main-content" className="dash-layout">
      <Sidebar id="donor-sidebar" items={donorNavItems} active={activeNav} setActive={setActiveNav} user="Rose · Donor" />
      <div className="dash-main">
        <section aria-label="Welcome" style={{ background: DASH_BANNER_BG, borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
          <div className="welcome-banner">
            <div>
              <p style={{ fontSize: 12, color: "rgba(251,248,242,0.65)", marginBottom: 3 }}>Welcome back</p>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: c.ivory, fontWeight: 400 }}>Rose</h1>
              <p style={{ fontSize: 12, color: c.gold, marginTop: 4 }}>Donor since March 2023 · ₱10,500 total given</p>
            </div>
            <button
              style={{
                background: c.gold,
                color: c.forest,
                fontSize: 13,
                fontWeight: 600,
                padding: "10px 22px",
                borderRadius: 24,
                border: "none",
                cursor: "pointer",
              }}
            >
              Donate Again
            </button>
          </div>
        </section>

        <section aria-labelledby="impact-heading" style={{ marginBottom: "1.25rem" }}>
          <h2 id="impact-heading" style={{ fontSize: 14, fontWeight: 600, color: c.forest, marginBottom: 10 }}>
            Your impact
          </h2>
          <div className="grid-4">
            {[
              { label: "Meals provided", value: "1,240", bg: c.roseLight },
              { label: "School days funded", value: "84", bg: c.sageLight },
              { label: "Counseling sessions", value: "32", bg: c.goldLight },
              { label: "Months of shelter", value: "6", bg: "#D4EAD9" },
            ].map(({ label, value, bg }) => (
              <div key={label} style={{ background: c.white, border: "0.5px solid rgba(44,43,40,0.1)", borderRadius: 10, padding: "12px 14px" }}>
                <div aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 7, background: bg, marginBottom: 8 }} />
                <div style={{ fontSize: 22, fontWeight: 600, color: c.forest }} aria-label={`${value} ${label}`}>
                  {value}
                </div>
                <div aria-hidden="true" style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid-chart">
          <section aria-labelledby="chart-heading" style={{ background: c.white, border: "0.5px solid rgba(44,43,40,0.1)", borderRadius: 10, padding: 16 }}>
            <h2 id="chart-heading" style={{ fontSize: 14, fontWeight: 600, color: c.forest, marginBottom: 3 }}>
              Collective outcomes
            </h2>
            <p style={{ fontSize: 12, color: c.muted, marginBottom: 14 }}>How your giving translates to long-term change</p>
            <table className="sr-only">
              <caption>Quarterly outcomes: admissions, graduations, reintegrations</caption>
              <thead>
                <tr>
                  <th>Quarter</th>
                  <th>Admissions</th>
                  <th>Graduations</th>
                  <th>Reintegrations</th>
                </tr>
              </thead>
              <tbody>
                {barData.map((g, i) => (
                  <tr key={i}>
                    <td>{quarters[i]}</td>
                    <td>{g[0]}</td>
                    <td>{g[1]}</td>
                    <td>{g[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div aria-hidden="true" style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 100 }}>
              {barData.map((group, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                  <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 90 }}>
                    {group.map((h, j) => (
                      <div key={j} style={{ width: 8, height: h, borderRadius: "2px 2px 0 0", background: [c.forest, c.sage, c.gold][j] }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 9, color: c.muted, marginTop: 5, textAlign: "center" }}>{quarters[i]}</div>
                </div>
              ))}
            </div>
          </section>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <section aria-labelledby="giving-heading" style={{ background: c.white, border: "0.5px solid rgba(44,43,40,0.1)", borderRadius: 10, padding: 14 }}>
              <h2 id="giving-heading" style={{ fontSize: 14, fontWeight: 600, color: c.forest, marginBottom: 10 }}>
                Your giving
              </h2>
              <ul style={{ listStyle: "none" }}>
                {donations.map(({ campaign, date, amount }) => (
                  <li
                    key={campaign}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "7px 0",
                      borderBottom: "0.5px solid rgba(44,43,40,0.08)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, color: c.text }}>{campaign}</div>
                      <div style={{ fontSize: 11, color: c.muted }}>{date}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.sage }} aria-label={`${amount} donated`}>
                      {amount}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

const staffNavItems = ["Dashboard", "Caseload", "Donors", "Session Notes", "Visits & Conferences", "Reports"];
const activityFeed = [
  { color: c.sage, typeLabel: "Progress", text: "Session note logged — Resident C0041, SH-03", time: "2 hrs ago" },
  { color: c.rose, typeLabel: "Alert", text: "Incident reported — Behavioral, SH-06", time: "5 hrs ago" },
  { color: c.gold, typeLabel: "Donation", text: "Donation recorded — ₱5,000 via campaign", time: "Yesterday" },
  { color: c.sage, typeLabel: "Progress", text: "Home visitation completed — C0028", time: "Yesterday" },
  { color: c.rose, typeLabel: "Scheduled", text: "Case conference scheduled — C0017", time: "2 days ago" },
];
function StaffDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");
  return (
    <main id="main-content" className="dash-layout">
      <Sidebar id="staff-sidebar" items={staffNavItems} active={activeNav} setActive={setActiveNav} user="Staff Portal" />
      <div className="dash-main">
        <section
          aria-label="Command center"
          style={{
            background: STAFF_BANNER_BG,
            borderRadius: 12,
            padding: "1.25rem 1.5rem",
            marginBottom: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <p style={{ fontSize: 12, color: "rgba(251,248,242,0.65)", marginBottom: 3 }}>Command center</p>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: c.ivory, fontWeight: 400 }}>Good morning, Lourdes</h1>
          </div>
          <div
            role="status"
            aria-live="polite"
            aria-label="System status: active"
            style={{
              background: "rgba(212,164,76,0.2)",
              border: `0.5px solid ${c.gold}`,
              borderRadius: 12,
              padding: "5px 14px",
              fontSize: 13,
              color: c.gold,
            }}
          >
            System active
          </div>
        </section>

        <section aria-labelledby="metrics-heading" style={{ marginBottom: 10 }}>
          <h2 id="metrics-heading" className="sr-only">
            Key metrics
          </h2>
          <div className="grid-4" style={{ marginBottom: 10 }}>
            <MetricCard label="Active residents" value="23" sub="Across 8 safehouses" />
            <MetricCard label="Upcoming conferences" value="4" sub="This week" accent={c.gold} />
            <MetricCard label="Open incidents" value="2" sub="Needs review" accent={c.rose} />
            <MetricCard label="Donations (30d)" value="₱18K" sub="12 contributions" />
          </div>
        </section>

        <div className="grid-bottom" style={{ marginTop: "1.25rem" }}>
          <section aria-labelledby="activity-heading" style={{ background: c.white, border: "0.5px solid rgba(44,43,40,0.1)", borderRadius: 10, padding: 16 }}>
            <h2 id="activity-heading" style={{ fontSize: 14, fontWeight: 600, color: c.forest, marginBottom: 12 }}>
              Recent activity
            </h2>
            <ul style={{ listStyle: "none" }}>
              {activityFeed.map(({ color, text, time }, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "8px 0",
                    borderBottom: i < activityFeed.length - 1 ? "0.5px solid rgba(44,43,40,0.08)" : "none",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, color: c.text, lineHeight: 1.5 }}>{text}</p>
                    <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>
                      <time>{time}</time>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("landing");
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      <div style={{ minHeight: "100vh", background: c.ivory }}>
        <NavBar setPage={setPage} />
        {page === "landing" && <LandingPage setPage={setPage} />}
        {page === "donor" && <DonorDashboard />}
        {page === "staff" && <StaffDashboard />}
      </div>
    </>
  );
}
