import { useState, type FormEvent } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { isSafeReturnPath, resolvePostLoginTarget } from '../lib/postLoginRouting';

const c = {
  ivory: '#FBF8F2',
  forest: '#2A4A35',
  gold: '#D4A44C',
  text: '#2C2B28',
  muted: '#7A786F',
  white: '#FFFFFF',
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrlRaw = searchParams.get('returnUrl');
  const returnUrl = returnUrlRaw && isSafeReturnPath(returnUrlRaw) ? returnUrlRaw : null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // login() now resolves after /me completes and returns the role directly
      const resolvedRole = await login(email, password);
      navigate(resolvePostLoginTarget(resolvedRole, returnUrl), { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      id="main-content"
      style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: c.ivory, padding: '2rem',
      }}
    >
      <div
        style={{
          background: c.white, borderRadius: 16,
          padding: '2.5rem', width: '100%', maxWidth: 420,
          boxShadow: '0 4px 32px rgba(44,43,40,0.08)',
          border: '0.5px solid rgba(44,43,40,0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Logo />
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: c.forest, fontWeight: 400, margin: 0 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: c.muted, marginTop: 6 }}>
            Sign in to your account
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              background: '#FDECEA', border: '1px solid #F5C6CB',
              color: '#721C24', borderRadius: 8, padding: '10px 14px',
              fontSize: 13, marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: c.text, marginBottom: 6 }}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', fontSize: 14,
                border: '1px solid rgba(44,43,40,0.2)', borderRadius: 8,
                background: c.ivory, color: c.text, boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: c.text, marginBottom: 6 }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', fontSize: 14,
                border: '1px solid rgba(44,43,40,0.2)', borderRadius: 8,
                background: c.ivory, color: c.text, boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', fontSize: 14, fontWeight: 600,
              background: loading ? c.muted : c.forest,
              color: c.ivory, border: 'none', borderRadius: 28,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: c.muted, marginTop: '1.5rem' }}>
          New donor?{' '}
          <Link
            to={returnUrl ? `/register?returnUrl=${encodeURIComponent(returnUrl)}` : '/register'}
            style={{ color: c.forest, fontWeight: 500 }}
          >
            Create an account
          </Link>
        </p>
        <p style={{ textAlign: 'center', fontSize: 13, color: c.muted, marginTop: '0.5rem' }}>
          <Link to="/" style={{ color: c.forest, fontWeight: 500 }}>
            Return to homepage
          </Link>
        </p>
      </div>
    </main>
  );
}
