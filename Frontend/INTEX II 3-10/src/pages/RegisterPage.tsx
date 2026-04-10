import { useState, type FormEvent } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { apiUrl, jsonBody } from '../lib/api';
import { isSafeReturnPath } from '../lib/postLoginRouting';

const c = {
  ivory: '#FBF8F2',
  forest: '#2A4A35',
  gold: '#D4A44C',
  text: '#2C2B28',
  muted: '#7A786F',
  white: '#FFFFFF',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrlRaw = searchParams.get('returnUrl');
  const returnUrl = returnUrlRaw && isSafeReturnPath(returnUrlRaw) ? returnUrlRaw : null;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<'Donor' | 'FieldWorker'>('Donor');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setErrors([]);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role }),
      });

      type RegBody = { errors?: unknown; message?: string };
      const data = await jsonBody<RegBody>(res, {});

      if (!res.ok) {
        if (data.errors) {
          setErrors(Array.isArray(data.errors) ? data.errors : Object.values(data.errors).flat() as string[]);
        } else {
          setError(data.message ?? 'Registration failed.');
        }
        return;
      }

      if (role === 'FieldWorker') {
        navigate('/register/success?type=staff');
      } else {
        const sp = new URLSearchParams({ type: 'donor' });
        if (returnUrl) sp.set('returnUrl', returnUrl);
        navigate(`/register/success?${sp.toString()}`);
      }
    } catch {
      setError('Network error. Please try again.');
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
          padding: '2.5rem', width: '100%', maxWidth: 440,
          boxShadow: '0 4px 32px rgba(44,43,40,0.08)',
          border: '0.5px solid rgba(44,43,40,0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Logo />
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: c.forest, fontWeight: 400, margin: 0 }}>
            Create an account
          </h1>
          <p style={{ fontSize: 13, color: c.muted, marginTop: 6 }}>Join and make a difference</p>
        </div>

        {error && (
          <div role="alert" style={{ background: '#FDECEA', border: '1px solid #F5C6CB', color: '#721C24', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}
        {errors.length > 0 && (
          <div role="alert" style={{ background: '#FDECEA', border: '1px solid #F5C6CB', color: '#721C24', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: '1.25rem' }}>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Role selector */}
          <div style={{ marginBottom: '1rem' }}>
            <fieldset style={{ border: '1px solid rgba(44,43,40,0.2)', borderRadius: 8, padding: '10px 14px' }}>
              <legend style={{ fontSize: 13, fontWeight: 500, color: c.text, padding: '0 4px' }}>Account type</legend>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: 4 }}>
                {(['Donor', 'FieldWorker'] as const).map((r) => (
                  <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: c.text, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={role === r}
                      onChange={() => setRole(r)}
                    />
                    {r === 'Donor' ? 'Donor' : 'Field Worker (staff)'}
                  </label>
                ))}
              </div>
            </fieldset>
            {role === 'FieldWorker' && (
              <p style={{ fontSize: 12, color: c.muted, marginTop: 6 }}>
                Field Worker accounts require admin approval before you can log in.
              </p>
            )}
          </div>

          {[
            { id: 'username', label: 'Username', value: username, set: setUsername, type: 'text', auto: 'username' },
            { id: 'email', label: 'Email address', value: email, set: setEmail, type: 'email', auto: 'email' },
            { id: 'password', label: 'Password', value: password, set: setPassword, type: 'password', auto: 'new-password' },
            { id: 'confirm', label: 'Confirm password', value: confirm, set: setConfirm, type: 'password', auto: 'new-password' },
          ].map(({ id, label, value, set, type, auto }) => (
            <div key={id} style={{ marginBottom: '1rem' }}>
              <label htmlFor={id} style={{ display: 'block', fontSize: 13, fontWeight: 500, color: c.text, marginBottom: 6 }}>
                {label}
              </label>
              <input
                id={id}
                type={type}
                autoComplete={auto}
                required
                value={value}
                onChange={(e) => set(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', fontSize: 14,
                  border: '1px solid rgba(44,43,40,0.2)', borderRadius: 8,
                  background: c.ivory, color: c.text, boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', fontSize: 14, fontWeight: 600,
              background: loading ? c.muted : c.forest,
              color: c.ivory, border: 'none', borderRadius: 28,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '0.5rem',
            }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: c.muted, marginTop: '1.5rem' }}>
          Already have an account?{' '}
          <Link
            to={returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login'}
            style={{ color: c.forest, fontWeight: 500 }}
          >
            Sign in
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
