import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const COOKIE_KEY = 'hh_cookie_consent';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days

type ConsentValue = 'accepted' | 'declined';

function secureSuffix(): string {
  return typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; secure' : '';
}

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
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/${maxAge}; samesite=lax${secureSuffix()}`;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; samesite=lax${secureSuffix()}`;
}

export function getConsentStatus(): ConsentValue | null {
  const value = readCookie(COOKIE_KEY);
  return value === 'accepted' || value === 'declined' ? value : null;
}

/** Footer (or elsewhere) dispatches this to open the cookie dialog */
export const COOKIE_SETTINGS_OPEN_EVENT = 'hh-open-cookie-settings';

function notifyConsentChanged(): void {
  window.dispatchEvent(new CustomEvent('hh-cookie-consent-changed'));
}

const btnBase: React.CSSProperties = {
  fontSize: 13,
  padding: '8px 20px',
  borderRadius: 20,
  cursor: 'pointer',
};

export function CookieConsent() {
  const [consent, setConsent] = useState<ConsentValue | null>(() => getConsentStatus());
  const [settingsOpen, setSettingsOpen] = useState(() => getConsentStatus() === null);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closePanel = useCallback(() => setSettingsOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    if (settingsOpen) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [settingsOpen, closePanel]);

  useEffect(() => {
    const onOpen = () => setSettingsOpen(true);
    window.addEventListener(COOKIE_SETTINGS_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(COOKIE_SETTINGS_OPEN_EVENT, onOpen);
  }, []);

  function accept() {
    writeCookie(COOKIE_KEY, 'accepted', COOKIE_MAX_AGE_SECONDS);
    setConsent('accepted');
    setSettingsOpen(false);
    notifyConsentChanged();
  }

  function decline() {
    writeCookie(COOKIE_KEY, 'declined', COOKIE_MAX_AGE_SECONDS);
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      if (name === 'hh_theme') {
        deleteCookie(name);
      }
    });
    setConsent('declined');
    setSettingsOpen(false);
    notifyConsentChanged();
  }

  const chipLabel = 'Cookie Policy';

  const selectedBtn = (active: boolean): React.CSSProperties => ({
    ...btnBase,
    fontWeight: 600,
    border: active ? '2px solid #D4A44C' : '1px solid rgba(251,248,242,0.25)',
    background: active ? 'rgba(212,164,76,0.2)' : 'transparent',
    color: active ? '#FBF8F2' : 'rgba(251,248,242,0.75)',
  });

  // After a choice is saved, reopen only from the footer (no floating chip)
  if (!settingsOpen) {
    if (consent !== null) return null;
    return (
      <button
        type="button"
        onClick={openSettings}
        aria-label="Open cookie policy"
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
          maxWidth: 'min(320px, calc(100vw - 2rem))',
          textAlign: 'left',
        }}
      >
        {chipLabel}
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
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
      <p id="cookie-status" style={{ fontSize: 12, margin: 0, color: 'rgba(251,248,242,0.85)' }}>
        {consent === null && 'No choice saved yet — choose below or decide later.'}
        {consent === 'accepted' && 'Your current choice: accept all cookies (including preferences).'}
        {consent === 'declined' && 'Your current choice: essential cookies only.'}
      </p>
      <p id="cookie-desc" style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
        We use essential cookies to keep you logged in, and optional preference cookies to remember your display settings.{' '}
        <Link to="/privacy" style={{ color: '#D4A44C', textDecoration: 'underline' }}>
          Learn more in our Privacy Policy
        </Link>
        .
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={accept} style={selectedBtn(consent === 'accepted')}>
          Accept all
        </button>
        <button type="button" onClick={decline} style={selectedBtn(consent === 'declined')}>
          Essential only
        </button>
        <button
          type="button"
          onClick={closePanel}
          style={{
            ...btnBase,
            fontWeight: 600,
            background: 'transparent',
            color: 'rgba(251,248,242,0.9)',
            border: '1px solid rgba(251,248,242,0.35)',
          }}
        >
          {consent === null ? 'Decide later' : 'Done'}
        </button>
      </div>
    </div>
  );
}
