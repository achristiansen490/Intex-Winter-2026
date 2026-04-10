import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { COOKIE_SETTINGS_OPEN_EVENT, getConsentStatus, getThemePreference, setThemePreference, THEME_CHANGED_EVENT } from './CookieConsent';

const c = {
  ivory: '#FBF8F2',
  muted: '#7A786F',
};

export function Footer() {
  const [savedConsent, setSavedConsent] = useState(() => getConsentStatus());
  const [theme, setTheme] = useState(() => getThemePreference());

  useEffect(() => {
    const sync = () => setSavedConsent(getConsentStatus());
    window.addEventListener('hh-cookie-consent-changed', sync);
    return () => window.removeEventListener('hh-cookie-consent-changed', sync);
  }, []);

  useEffect(() => {
    const onTheme = () => setTheme(getThemePreference());
    window.addEventListener(THEME_CHANGED_EVENT, onTheme);
    return () => window.removeEventListener(THEME_CHANGED_EVENT, onTheme);
  }, []);

  function openCookieSettings() {
    window.dispatchEvent(new CustomEvent(COOKIE_SETTINGS_OPEN_EVENT));
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    const saved = setThemePreference(next);
    if (!saved) {
      openCookieSettings();
      return;
    }
    setTheme(next);
  }

  return (
    <footer style={{ background: c.ivory, borderTop: '0.5px solid rgba(44,43,40,0.1)', padding: '1.5rem 2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <Logo />
        <nav aria-label="Footer links">
          <ul style={{ display: 'flex', gap: 20, flexWrap: 'wrap', listStyle: 'none', margin: 0, padding: 0, alignItems: 'center' }}>
            <li>
              <Link to="/privacy" style={{ fontSize: 13, color: c.muted, textDecoration: 'none' }}>
                Privacy Policy
              </Link>
            </li>
            {savedConsent !== null && (
              <li>
                <button
                  type="button"
                  onClick={openCookieSettings}
                  style={{
                    fontSize: 13,
                    color: c.muted,
                    textDecoration: 'none',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Cookie Policy
                </button>
              </li>
            )}
            <li>
              <a href="/#contact" style={{ fontSize: 13, color: c.muted, textDecoration: 'none' }}>
                Contact
              </a>
            </li>
            {savedConsent === 'accepted' && (
              <li>
                <button
                  type="button"
                  onClick={toggleTheme}
                  style={{
                    fontSize: 13,
                    color: c.muted,
                    textDecoration: 'none',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Theme: {theme === 'dark' ? 'Dark' : 'Light'}
                </button>
              </li>
            )}
          </ul>
        </nav>
        <p style={{ fontSize: 12, color: c.muted }}>
          © {new Date().getFullYear()} Hiraya Haven. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
