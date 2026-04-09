import { Link } from 'react-router-dom';
import { Logo } from './Logo';

const c = {
  ivory: '#FBF8F2',
  muted: '#7A786F',
};

export function Footer() {
  return (
    <footer style={{ background: c.ivory, borderTop: '0.5px solid rgba(44,43,40,0.1)', padding: '1.5rem 2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <Logo />
        <nav aria-label="Footer links">
          <ul style={{ display: 'flex', gap: 20, flexWrap: 'wrap', listStyle: 'none', margin: 0, padding: 0 }}>
            <li>
              <Link to="/privacy" style={{ fontSize: 13, color: c.muted, textDecoration: 'none' }}>
                Privacy Policy
              </Link>
            </li>
            <li>
              <a href="/#contact" style={{ fontSize: 13, color: c.muted, textDecoration: 'none' }}>
                Contact
              </a>
            </li>
          </ul>
        </nav>
        <p style={{ fontSize: 12, color: c.muted }}>© 2025 Hiraya Haven. All rights reserved.</p>
      </div>
    </footer>
  );
}
