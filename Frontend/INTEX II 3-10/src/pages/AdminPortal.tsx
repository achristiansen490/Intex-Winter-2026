import { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const c = { ivory: '#FBF8F2', forest: '#2A4A35', gold: '#D4A44C', rose: '#C4867A', text: '#2C2B28', muted: '#7A786F', white: '#FFFFFF' };
const ADMIN_BANNER_BG = `linear-gradient(120deg,rgba(42,74,53,0.82) 0%,rgba(196,134,122,0.38) 100%), url("/Smiles under the sun.png") center/cover no-repeat`;

const navItems = ['Dashboard', 'Users', 'Pending Approvals', 'Residents', 'Staff', 'Safehouses', 'Donations', 'Audit Log', 'Reports', 'Settings'];

export default function AdminPortal() {
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState('Dashboard');

  return (
    <main id="main-content" style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
      <Sidebar id="admin-sidebar" items={navItems} active={activeNav} setActive={setActiveNav} user={`${user?.userName ?? 'Admin'} · Admin`} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        <section
          aria-label="Admin dashboard"
          style={{ background: ADMIN_BANNER_BG, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
        >
          <div>
            <p style={{ fontSize: 12, color: 'rgba(251,248,242,0.65)', marginBottom: 3 }}>Admin Console</p>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: c.ivory, fontWeight: 400 }}>
              {user?.userName ?? 'Admin'}
            </h1>
          </div>
          <div style={{ background: 'rgba(212,164,76,0.2)', border: `0.5px solid ${c.gold}`, borderRadius: 12, padding: '5px 14px', fontSize: 13, color: c.gold }}>
            Full access
          </div>
        </section>

        <p style={{ fontSize: 14, color: c.muted, textAlign: 'center', marginTop: '3rem' }}>
          {activeNav} — coming soon
        </p>
      </div>
    </main>
  );
}
