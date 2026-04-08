import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const c = { ivory: '#FBF8F2', forest: '#2A4A35', muted: '#7A786F' };

function getDashboardPath(role: string | null) {
  switch (role) {
    case 'Admin': return '/admin';
    case 'Supervisor': case 'CaseManager': case 'SocialWorker': case 'FieldWorker': return '/staff';
    case 'Resident': return '/resident';
    case 'Donor': return '/donor';
    default: return '/';
  }
}

export default function ForbiddenPage() {
  const { role } = useAuth();
  return (
    <main id="main-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.ivory, padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}><Logo /></div>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 72, color: c.forest, margin: '0 0 0.5rem', lineHeight: 1 }}>403</p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: c.forest, fontWeight: 400, margin: '0 0 0.75rem' }}>Access denied</h1>
        <p style={{ fontSize: 14, color: c.muted, marginBottom: '1.5rem' }}>You don't have permission to view this page.</p>
        <Link to={getDashboardPath(role)} style={{ display: 'inline-block', background: c.forest, color: '#FBF8F2', fontSize: 14, fontWeight: 600, padding: '10px 24px', borderRadius: 24, textDecoration: 'none' }}>
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
