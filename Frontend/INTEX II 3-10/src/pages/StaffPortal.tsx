import { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const c = { ivory: '#FBF8F2', forest: '#2A4A35', gold: '#D4A44C', sage: '#6B9E7E', rose: '#C4867A', text: '#2C2B28', muted: '#7A786F', white: '#FFFFFF' };
const STAFF_BANNER_BG = `linear-gradient(120deg,rgba(42,74,53,0.76) 0%,rgba(107,158,126,0.5) 100%), url("/Smiles under the sun.png") center/cover no-repeat`;

function getNavItems(role: string | null): string[] {
  switch (role) {
    case 'Supervisor':
      return ['Dashboard', 'Caseload', 'Donors', 'Session Notes', 'Visits & Conferences', 'Reports', 'Pending Approvals'];
    case 'CaseManager':
      return ['Dashboard', 'Caseload', 'Session Notes', 'Visits & Conferences', 'Intervention Plans', 'Reports'];
    case 'SocialWorker':
      return ['Dashboard', 'My Residents', 'Session Notes', 'Home Visits', 'Incident Reports'];
    case 'FieldWorker':
      return ['Dashboard', 'Residents', 'Health Records', 'Education Records', 'Home Visits', 'Incident Reports'];
    default:
      return ['Dashboard'];
  }
}

export default function StaffPortal() {
  const { user, role } = useAuth();
  const navItems = getNavItems(role);
  const [activeNav, setActiveNav] = useState('Dashboard');

  const displayRole = role ?? 'Staff';

  return (
    <main id="main-content" style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
      <Sidebar id="staff-sidebar" items={navItems} active={activeNav} setActive={setActiveNav} user={`${user?.userName ?? 'Staff'} · ${displayRole}`} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        <section
          aria-label="Command center"
          style={{ background: STAFF_BANNER_BG, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
        >
          <div>
            <p style={{ fontSize: 12, color: 'rgba(251,248,242,0.65)', marginBottom: 3 }}>{displayRole} Portal</p>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: c.ivory, fontWeight: 400 }}>
              Good morning, {user?.userName ?? 'Staff'}
            </h1>
          </div>
          <div style={{ background: 'rgba(212,164,76,0.2)', border: `0.5px solid ${c.gold}`, borderRadius: 12, padding: '5px 14px', fontSize: 13, color: c.gold }}>
            System active
          </div>
        </section>

        <p style={{ fontSize: 14, color: c.muted, textAlign: 'center', marginTop: '3rem' }}>
          {activeNav} — coming soon
        </p>
      </div>
    </main>
  );
}
