import { Link, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';

const c = {
  ivory: '#FBF8F2',
  forest: '#2A4A35',
  gold: '#D4A44C',
  text: '#2C2B28',
  muted: '#7A786F',
  white: '#FFFFFF',
};

export default function RegisterSuccessPage() {
  const [searchParams] = useSearchParams();
  const type = (searchParams.get('type') ?? '').toLowerCase();
  const isStaff = type === 'staff';

  return (
    <main
      id="main-content"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: c.ivory,
        padding: '2rem',
      }}
    >
      <section
        style={{
          background: c.white,
          borderRadius: 16,
          padding: '2.5rem',
          width: '100%',
          maxWidth: 560,
          boxShadow: '0 4px 32px rgba(44,43,40,0.08)',
          border: '0.5px solid rgba(44,43,40,0.1)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <Logo />
        </div>

        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 34, color: c.forest, margin: '6px 0 10px' }}>
          {isStaff ? 'Account Request Received' : 'Congratulations!'}
        </h1>

        <p style={{ fontSize: 16, color: c.text, margin: '0 auto', maxWidth: 480, lineHeight: 1.6 }}>
          {isStaff
            ? 'Your staff account request has been submitted and will be reviewed by an administrator. We will notify you once it is approved.'
            : 'Your donor account is ready. Thank you for joining the Hiraya Haven community.'}
        </p>

        <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {!isStaff && (
            <Link
              to="/login?returnUrl=%2Fdonor"
              style={{
                background: c.forest,
                color: c.ivory,
                textDecoration: 'none',
                borderRadius: 999,
                padding: '12px 22px',
                fontWeight: 600,
              }}
            >
              Go to donor dashboard
            </Link>
          )}
          <Link
            to="/"
            style={{
              background: isStaff ? c.forest : c.gold,
              color: isStaff ? c.ivory : c.forest,
              textDecoration: 'none',
              borderRadius: 999,
              padding: '12px 22px',
              fontWeight: 600,
            }}
          >
            Return home
          </Link>
        </div>

        {!isStaff && (
          <p style={{ fontSize: 13, color: c.muted, marginTop: 14 }}>
            You will sign in first, then be redirected to your donor dashboard.
          </p>
        )}
      </section>
    </main>
  );
}
