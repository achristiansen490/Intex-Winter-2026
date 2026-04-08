import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const COOKIE_KEY = 'hh_cookie_consent';

type ConsentValue = 'accepted' | 'declined';

export function getConsentStatus(): ConsentValue | null {
  return (localStorage.getItem(COOKIE_KEY) as ConsentValue) ?? null;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if no decision has been made yet
    if (!getConsentStatus()) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_KEY, 'accepted');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(COOKIE_KEY, 'declined');
    // Clear any non-essential cookies
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      // Keep essential auth token (stored in localStorage, not cookies)
      // Clear any preference cookies if set
      if (name === 'hh_theme') {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-describedby="cookie-desc"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9000,
        background: '#2A4A35',
        color: '#FBF8F2',
        borderRadius: 14,
        padding: '1rem 1.5rem',
        maxWidth: 560,
        width: 'calc(100% - 3rem)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <p id="cookie-desc" style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
        We use essential cookies to keep you logged in, and optional preference cookies to remember your display settings.{' '}
        <Link to="/privacy" style={{ color: '#D4A44C', textDecoration: 'underline' }}>
          Learn more in our Privacy Policy
        </Link>
        .
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={accept}
          style={{
            background: '#D4A44C', color: '#2A4A35',
            fontSize: 13, fontWeight: 600,
            padding: '8px 20px', borderRadius: 20,
            border: 'none', cursor: 'pointer',
          }}
        >
          Accept all
        </button>
        <button
          onClick={decline}
          style={{
            background: 'transparent', color: 'rgba(251,248,242,0.75)',
            fontSize: 13,
            padding: '8px 20px', borderRadius: 20,
            border: '1px solid rgba(251,248,242,0.25)', cursor: 'pointer',
          }}
        >
          Essential only
        </button>
      </div>
    </div>
  );
}
