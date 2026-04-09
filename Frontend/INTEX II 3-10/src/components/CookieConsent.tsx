import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const COOKIE_KEY = 'hh_cookie_consent';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days

type ConsentValue = 'accepted' | 'declined';

function readCookie(name: string): string | null {
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (const cookie of cookies) {
    const [k, ...rest] = cookie.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function writeCookie(name: string, value: string, maxAgeSeconds?: number): void {
  const maxAge = typeof maxAgeSeconds === 'number' ? `; max-age=${maxAgeSeconds}` : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/${maxAge}; samesite=lax`;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; samesite=lax`;
}

export function getConsentStatus(): ConsentValue | null {
  const value = readCookie(COOKIE_KEY);
  return value === 'accepted' || value === 'declined' ? value : null;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [hasChoice, setHasChoice] = useState(false);

  useEffect(() => {
    // Only show if no decision has been made yet
    const status = getConsentStatus();
    if (!status) {
      setVisible(true);
      setHasChoice(false);
    } else {
      setHasChoice(true);
    }
  }, []);

  function accept() {
    writeCookie(COOKIE_KEY, 'accepted', COOKIE_MAX_AGE_SECONDS);
    setHasChoice(true);
    setVisible(false);
  }

  function decline() {
    writeCookie(COOKIE_KEY, 'declined', COOKIE_MAX_AGE_SECONDS);
    // Clear any non-essential cookies
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      // Keep essential auth token (stored in localStorage, not cookies)
      // Clear any preference cookies if set
      if (name === 'hh_theme') {
        deleteCookie(name);
      }
    });
    setHasChoice(true);
    setVisible(false);
  }

  if (!visible) {
    if (!hasChoice) return null;
    return (
      <button
        onClick={() => setVisible(true)}
        aria-label="Open cookie settings"
        style={{
          position: 'fixed',
          right: '1rem',
          bottom: '1rem',
          zIndex: 8500,
          background: '#2A4A35',
          color: '#FBF8F2',
          border: '1px solid rgba(251,248,242,0.25)',
          borderRadius: 20,
          padding: '8px 14px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Cookie settings
      </button>
    );
  }

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
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'transparent', color: 'rgba(251,248,242,0.75)',
            fontSize: 13,
            padding: '8px 20px', borderRadius: 20,
            border: '1px solid rgba(251,248,242,0.25)', cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
