import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { apiUrl } from '../lib/api';

const c = {
  ivory: '#FBF8F2',
  forest: '#2A4A35',
  gold: '#D4A44C',
  text: '#2C2B28',
  muted: '#7A786F',
  white: '#FFFFFF',
};

const tok = () => localStorage.getItem('hh_token') ?? '';

async function readApiErrorMessage(res: Response): Promise<string> {
  const raw = await res.json().catch(() => null);
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const msg = o.message ?? o.detail ?? o.title;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
    const errs = o.errors;
    if (errs && typeof errs === 'object') {
      const parts = Object.values(errs as Record<string, unknown>).flatMap((v) =>
        Array.isArray(v) ? v.map(String) : v != null ? [String(v)] : [],
      );
      if (parts.length) return parts.join(' ');
    }
  }
  return res.statusText || `Request failed (${res.status}).`;
}

export default function DonatePage() {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }

    setLoading(true);
    try {
      const donationDate = new Date().toISOString().slice(0, 10);
      const res = await fetch(apiUrl('/api/donations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tok()}`,
        },
        body: JSON.stringify({
          donationType: 'Monetary',
          donationDate,
          amount: n,
          currencyCode: 'PHP',
          channelSource: 'Website - Donate',
          notes: message.trim() ? `${message.trim()}\nDonor donate page` : 'Donor donate page',
        }),
      });
      if (!res.ok) {
        setError(await readApiErrorMessage(res));
        return;
      }
      setDone(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <NavBar />
      <main
        id="main-content"
        style={{
          minHeight: '100vh',
          background: c.ivory,
          padding: '2rem 1.5rem 3rem',
        }}
      >
        <div
          style={{
            maxWidth: 520,
            margin: '0 auto',
            background: c.white,
            borderRadius: 16,
            padding: '2.25rem',
            boxShadow: '0 4px 32px rgba(44,43,40,0.08)',
            border: '0.5px solid rgba(44,43,40,0.1)',
          }}
        >
          <h1
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 26,
              color: c.forest,
              fontWeight: 400,
              margin: '0 0 0.5rem',
            }}
          >
            Donate
          </h1>
          <p style={{ fontSize: 14, color: c.muted, margin: '0 0 1.25rem', lineHeight: 1.5 }}>
            Your gift supports safe housing, counseling, and reintegration for girls in Metro Manila. This donation will
            appear in your donor portal.
          </p>

          <p style={{ fontSize: 13, color: c.forest, background: c.ivory, padding: '10px 14px', borderRadius: 8, marginBottom: '1.5rem' }}>
            Thank you for giving while signed in —{' '}
            <Link to="/donor" style={{ color: c.forest, fontWeight: 600 }}>
              open your donor dashboard
            </Link>{' '}
            anytime to review your history.
          </p>

          {done ? (
            <div>
              <p
                role="status"
                style={{
                  fontSize: 16,
                  color: c.forest,
                  fontFamily: 'Georgia, serif',
                  marginBottom: '1.25rem',
                }}
              >
                Thank you. Your donation has been recorded.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Link
                  to="/donor"
                  style={{
                    background: c.gold,
                    color: c.forest,
                    fontSize: 14,
                    fontWeight: 600,
                    padding: '12px 22px',
                    borderRadius: 24,
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  View donor portal
                </Link>
                <Link to="/" style={{ fontSize: 14, color: c.muted, alignSelf: 'center', padding: '8px 12px' }}>
                  Back to home
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <div
                  role="alert"
                  style={{
                    background: '#FDECEA',
                    border: '1px solid #F5C6CB',
                    color: '#721C24',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    marginBottom: '1.25rem',
                  }}
                >
                  {error}
                </div>
              )}

              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 6 }}>
                Amount (PHP) <span style={{ color: '#B00020' }} aria-hidden="true">*</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 1000"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 16,
                  border: '1px solid rgba(44,43,40,0.2)',
                  borderRadius: 8,
                  marginBottom: '1.1rem',
                  boxSizing: 'border-box',
                }}
              />

              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 6 }}>
                Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 14,
                  border: '1px solid rgba(44,43,40,0.2)',
                  borderRadius: 8,
                  marginBottom: '1.35rem',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: c.gold,
                  color: c.forest,
                  fontSize: 15,
                  fontWeight: 600,
                  padding: '14px 20px',
                  borderRadius: 24,
                  border: 'none',
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.75 : 1,
                }}
              >
                {loading ? 'Processing…' : 'Donate now'}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
