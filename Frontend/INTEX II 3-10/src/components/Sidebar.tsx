import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';

/** Must match `index.css` — drawer + hamburger only below this width. */
const MOBILE_NAV_QUERY = '(max-width: 768px)';

const c = {
  forest: '#2A4A35',
  gold: '#D4A44C',
  ivory: '#FBF8F2',
};

interface SidebarProps {
  id: string;
  items: string[];
  active: string;
  /** Used when <code>onSelectNavItem</code> is not provided. */
  setActive?: (item: string) => void;
  /** When set, called instead of <code>setActive</code> (for cross-route admin navigation). */
  onSelectNavItem?: (item: string) => void;
  /** Optional per-item counts (e.g. pending approvals). Shown only when &gt; 0. */
  badgeCounts?: Partial<Record<string, number>>;
  user: string;
  onLogout?: () => void;
}

export function Sidebar({ id, items, active, setActive, onSelectNavItem, badgeCounts, user, onLogout }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isMobileNav, setIsMobileNav] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(MOBILE_NAV_QUERY).matches,
  );

  // Keep desktop and mobile nav in sync: CSS only styles the drawer below 768px.
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_NAV_QUERY);
    const sync = () => setIsMobileNav(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // If the user resizes from mobile to desktop while the drawer is open, clear it.
  useEffect(() => {
    if (!isMobileNav) setOpen(false);
  }, [isMobileNav]);

  const drawerOpen = isMobileNav && open;

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open sidebar navigation"
        aria-expanded={drawerOpen}
        aria-controls={id}
        hidden={!isMobileNav}
        style={{
          position: 'fixed', bottom: 20, left: 20, zIndex: 150,
          background: c.forest, color: c.ivory,
          border: 'none', borderRadius: '50%',
          width: 48, height: 48, fontSize: 20, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          display: 'none', alignItems: 'center', justifyContent: 'center',
        }}
        className="sidebar-toggle"
      >
        ☰
      </button>

      {/* Mobile overlay (desktop never uses drawer; see MOBILE_NAV_QUERY) */}
      {drawerOpen && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)', zIndex: 200,
          }}
        />
      )}

      <nav
        id={id}
        className={`dashboard-sidebar ${drawerOpen ? 'is-open' : ''}`}
        aria-label="Dashboard navigation"
        style={{
          background: c.forest,
          width: 200,
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem 0',
          flexShrink: 0,
          alignSelf: 'flex-start',
          position: 'sticky',
          top: 0,
          height: '100vh',
          maxHeight: '100vh',
          overflow: 'hidden',
        }}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
          style={{
            display: 'none', alignSelf: 'flex-end',
            marginRight: '0.75rem',
            background: 'none', border: 'none',
            color: c.ivory, fontSize: 20, cursor: 'pointer', marginBottom: 8,
          }}
          className="sidebar-close"
        >
          ✕
        </button>

        <div
          style={{
            flexShrink: 0,
            padding: '0 1rem 1.25rem',
            borderBottom: '0.5px solid rgba(255,255,255,0.1)',
            marginBottom: '0.75rem',
          }}
        >
          <Link
            to="/"
            onClick={() => setOpen(false)}
            aria-label="Hiraya Haven - return to home page"
            style={{ textDecoration: 'none', display: 'inline-flex' }}
          >
            <Logo light />
          </Link>
        </div>

        <ul
          style={{
            listStyle: 'none',
            flex: 1,
            minHeight: 0,
            margin: 0,
            padding: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {items.map((item) => {
            const badge = badgeCounts?.[item];
            const showBadge = typeof badge === 'number' && badge > 0;
            const badgeText = badge! > 99 ? '99+' : String(badge);
            return (
            <li key={item}>
              <button
                onClick={() => {
                  if (onSelectNavItem) onSelectNavItem(item);
                  else setActive?.(item);
                  setOpen(false);
                }}
                onMouseEnter={() => setHoveredItem(item)}
                onMouseLeave={() => setHoveredItem(null)}
                aria-current={active === item ? 'page' : undefined}
                aria-label={
                  showBadge
                    ? `${item}, ${badge! > 99 ? 'over 99' : badge} pending change approvals`
                    : undefined
                }
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  width: '100%', textAlign: 'left',
                  padding: '10px 1rem', fontSize: hoveredItem === item ? 14 : 13,
                  background: active === item ? 'rgba(212,164,76,0.18)' : 'none',
                  color: active === item ? c.gold : hoveredItem === item ? c.ivory : 'rgba(251,248,242,0.65)',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  borderLeft: `3px solid ${active === item ? c.gold : 'transparent'}`,
                  cursor: 'pointer',
                  transform: hoveredItem === item ? 'scale(1.03)' : 'scale(1)',
                  transformOrigin: 'left center',
                  transition: 'transform 0.15s ease, color 0.15s ease, font-size 0.15s ease',
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>{item}</span>
                {showBadge && (
                  <span
                    aria-hidden={true}
                    style={{
                      flexShrink: 0,
                      minWidth: 20,
                      height: 20,
                      padding: '0 6px',
                      borderRadius: 999,
                      background: c.gold,
                      color: c.forest,
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: '20px',
                      textAlign: 'center',
                    }}
                  >
                    {badgeText}
                  </span>
                )}
              </button>
            </li>
            );
          })}
        </ul>

        <div
          style={{
            flexShrink: 0,
            padding: '0.75rem 1rem',
            borderTop: '0.5px solid rgba(255,255,255,0.1)',
            fontSize: 12,
            color: 'rgba(251,248,242,0.5)',
            textAlign: 'left',
          }}
        >
          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                width: '100%',
                marginBottom: 8,
                textAlign: 'center',
                background: 'rgba(251,248,242,0.08)',
                color: c.ivory,
                border: '1px solid rgba(251,248,242,0.28)',
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Log Out
            </button>
          )}
          {user}
        </div>
      </nav>
    </>
  );
}
