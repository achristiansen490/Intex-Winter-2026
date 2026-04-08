import { useState } from 'react';
import { Logo } from './Logo';

const c = {
  forest: '#2A4A35',
  gold: '#D4A44C',
  ivory: '#FBF8F2',
};

interface SidebarProps {
  id: string;
  items: string[];
  active: string;
  setActive: (item: string) => void;
  user: string;
  onLogout?: () => void;
}

export function Sidebar({ id, items, active, setActive, user, onLogout }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open sidebar navigation"
        aria-expanded={open}
        aria-controls={id}
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

      {/* Mobile overlay */}
      {open && (
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
        aria-label="Dashboard navigation"
        style={{
          background: c.forest,
          width: 200,
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem 0',
          flexShrink: 0,
          minHeight: 'calc(100vh - 56px)',
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
            padding: '0 1rem 1.25rem',
            borderBottom: '0.5px solid rgba(255,255,255,0.1)',
            marginBottom: '0.75rem',
          }}
        >
          <Logo light />
        </div>

        <ul style={{ listStyle: 'none', flex: 1, margin: 0, padding: 0 }}>
          {items.map((item) => (
            <li key={item}>
              <button
                onClick={() => { setActive(item); setOpen(false); }}
                onMouseEnter={() => setHoveredItem(item)}
                onMouseLeave={() => setHoveredItem(null)}
                aria-current={active === item ? 'page' : undefined}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
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
                {item}
              </button>
            </li>
          ))}
        </ul>

        <div
          style={{
            padding: '0.75rem 1rem',
            borderTop: '0.5px solid rgba(255,255,255,0.1)',
            fontSize: 12,
            color: 'rgba(251,248,242,0.5)',
            textAlign: 'center',
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
