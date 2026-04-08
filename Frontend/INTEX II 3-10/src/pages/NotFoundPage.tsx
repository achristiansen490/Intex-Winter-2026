import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

const c = { ivory: '#FBF8F2', forest: '#2A4A35', muted: '#7A786F', white: '#FFFFFF' };

export default function NotFoundPage() {
  return (
    <main id="main-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.ivory, padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}><Logo /></div>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 72, color: c.forest, margin: '0 0 0.5rem', lineHeight: 1 }}>404</p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: c.forest, fontWeight: 400, margin: '0 0 0.75rem' }}>Page not found</h1>
        <p style={{ fontSize: 14, color: c.muted, marginBottom: '1.5rem' }}>The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" style={{ display: 'inline-block', background: c.forest, color: c.ivory, fontSize: 14, fontWeight: 600, padding: '10px 24px', borderRadius: 24, textDecoration: 'none' }}>
          Go home
        </Link>
      </div>
    </main>
  );
}
