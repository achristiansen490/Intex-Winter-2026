import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';

const c = {
  ivory: '#FBF8F2',
  forest: '#2A4A35',
  gold: '#D4A44C',
  muted: '#7A786F',
  text: '#2C2B28',
};

function getDashboardPath(role: string | null): string {
  switch (role) {
    case 'Admin': return '/admin';
    case 'Supervisor':
    case 'CaseManager':
    case 'SocialWorker':
    case 'FieldWorker': return '/staff';
    case 'Resident': return '/resident';
    case 'Donor': return '/donor';
    default: return '/login';
  }
}

export function NavBar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <a
        href="#main-content"
        style={{
          position: 'absolute', top: '-100%', left: '1rem',
          background: c.forest, color: c.ivory,
          padding: '0.5rem 1rem', borderRadius: '0 0 6px 6px',
          fontSize: 14, fontWeight: 600, zIndex: 9999,
          textDecoration: 'none',
        }}
        onFocus={(e) => { e.currentTarget.style.top = '0'; }}
        onBlur={(e) => { e.currentTarget.style.top = '-100%'; }}
      >
        Skip to main content
      </a>

      <header>
        <nav
          aria-label="Main navigation"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'rgba(251,248,242,0.96)',
            backdropFilter: 'blur(8px)',
            borderBottom: '0.5px solid rgba(44,43,40,0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 2rem',
              height: 56,
            }}
          >
            <Link to="/" aria-label="Hiraya Haven — return to home page" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, textDecoration: 'none' }}>
              <Logo />
            </Link>

            {/* Desktop nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {!isAuthenticated ? (
                <>
                  <a href="/#about" style={{ fontSize: 13, color: c.muted, textDecoration: 'none' }}>About</a>
                  <Link to="/impact" style={{ fontSize: 13, color: c.muted, textDecoration: 'none' }}>Impact</Link>
                  <Link to="/login" style={{ fontSize: 13, color: c.muted, textDecoration: 'none' }}>Log In</Link>
                  <Link
                    to="/register"
                    style={{
                      background: c.gold, color: c.forest,
                      fontSize: 13, fontWeight: 600,
                      padding: '8px 18px', borderRadius: 24,
                      border: 'none', cursor: 'pointer', textDecoration: 'none',
                    }}
                  >
                    Create an account
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to={getDashboardPath(role)}
                    style={{ fontSize: 13, color: c.muted, textDecoration: 'none' }}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{
                      background: 'transparent', color: c.muted,
                      fontSize: 13, border: '1px solid rgba(44,43,40,0.2)',
                      padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                    }}
                  >
                    Log Out
                  </button>
                </>
              )}
            </div>

            {/* Hamburger */}
            <button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-nav-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              style={{
                display: 'none',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 8, flexDirection: 'column', gap: 5,
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  style={{
                    display: 'block', width: 22, height: 2,
                    background: c.forest, borderRadius: 2,
                    transform: open
                      ? i === 0 ? 'rotate(45deg) translate(5px,5px)'
                        : i === 2 ? 'rotate(-45deg) translate(5px,-5px)'
                          : 'scaleX(0)'
                      : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              ))}
            </button>
          </div>

          {/* Mobile menu */}
          <div
            id="mobile-nav-menu"
            role="menu"
            style={{
              display: open ? 'flex' : 'none',
              flexDirection: 'column',
              background: 'rgba(251,248,242,0.98)',
              borderTop: '0.5px solid rgba(44,43,40,0.1)',
              padding: '1rem 1.5rem',
              gap: '0.75rem',
            }}
          >
            {!isAuthenticated ? (
              <>
                <Link role="menuitem" to="/" onClick={() => setOpen(false)} style={{ fontSize: 15, color: c.text, textDecoration: 'none', padding: '8px 0', borderBottom: '0.5px solid rgba(44,43,40,0.08)' }}>Home</Link>
                <a role="menuitem" href="/#about" onClick={() => setOpen(false)} style={{ fontSize: 15, color: c.text, textDecoration: 'none', padding: '8px 0', borderBottom: '0.5px solid rgba(44,43,40,0.08)' }}>About</a>
                <Link role="menuitem" to="/impact" onClick={() => setOpen(false)} style={{ fontSize: 15, color: c.text, textDecoration: 'none', padding: '8px 0', borderBottom: '0.5px solid rgba(44,43,40,0.08)' }}>Impact</Link>
                <Link role="menuitem" to="/login" onClick={() => setOpen(false)} style={{ fontSize: 15, color: c.text, textDecoration: 'none', padding: '8px 0', borderBottom: '0.5px solid rgba(44,43,40,0.08)' }}>Log In</Link>
                <Link
                  role="menuitem"
                  to="/register"
                  onClick={() => setOpen(false)}
                  style={{
                    background: c.gold, color: c.forest,
                    fontSize: 14, fontWeight: 600,
                    padding: '10px 20px', borderRadius: 24,
                    textDecoration: 'none', marginTop: 4, alignSelf: 'flex-start',
                  }}
                >
                  Create an account
                </Link>
              </>
            ) : (
              <>
                <Link role="menuitem" to={getDashboardPath(role)} onClick={() => setOpen(false)} style={{ fontSize: 15, color: c.text, textDecoration: 'none', padding: '8px 0', borderBottom: '0.5px solid rgba(44,43,40,0.08)' }}>Dashboard</Link>
                <button
                  role="menuitem"
                  onClick={() => { setOpen(false); handleLogout(); }}
                  style={{ fontSize: 14, color: c.muted, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '8px 0' }}
                >
                  Log Out
                </button>
              </>
            )}
          </div>
        </nav>
      </header>
    </>
  );
}
