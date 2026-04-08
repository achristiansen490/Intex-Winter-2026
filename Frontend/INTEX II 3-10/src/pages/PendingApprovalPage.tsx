import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

const c = { ivory: '#FBF8F2', forest: '#2A4A35', gold: '#D4A44C', muted: '#7A786F', white: '#FFFFFF' };

export default function PendingApprovalPage() {
  return (
    <main id="main-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.ivory, padding: '2rem' }}>
      <div style={{ background: c.white, borderRadius: 16, padding: '2.5rem', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 4px 32px rgba(44,43,40,0.08)', border: '0.5px solid rgba(44,43,40,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Logo /></div>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#D4EAD9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: 24 }}>
          ⏳
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: c.forest, fontWeight: 400, margin: '0 0 0.75rem' }}>
          Account pending approval
        </h1>
        <p style={{ fontSize: 14, color: c.muted, lineHeight: 1.7, marginBottom: '1.5rem' }}>
          Your Field Worker account has been created and is waiting for admin approval. You'll be able to log in once an administrator activates your account.
        </p>
        <Link
          to="/"
          style={{
            display: 'inline-block', background: c.forest, color: c.ivory,
            fontSize: 14, fontWeight: 600, padding: '10px 24px', borderRadius: 24,
            textDecoration: 'none',
          }}
        >
          Return to home
        </Link>
      </div>
    </main>
  );
}
