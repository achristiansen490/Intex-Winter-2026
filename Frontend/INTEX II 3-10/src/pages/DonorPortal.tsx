import { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const c = { ivory: '#FBF8F2', forest: '#2A4A35', gold: '#D4A44C', sage: '#6B9E7E', rose: '#C4867A', roseLight: '#F0D8D4', sageLight: '#D4EAD9', goldLight: '#F5E6C8', text: '#2C2B28', muted: '#7A786F', white: '#FFFFFF' };
const DASH_BANNER_BG = `linear-gradient(120deg,rgba(42,74,53,0.74) 0%,rgba(196,134,122,0.44) 100%), url("/Smiles under the sun.png") center/cover no-repeat`;

const navItems = ['My Impact', 'Donation History', 'Active Campaigns', 'My Profile'];

export default function DonorPortal() {
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState('My Impact');

  return (
    <main id="main-content" style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
      <Sidebar id="donor-sidebar" items={navItems} active={activeNav} setActive={setActiveNav} user={`${user?.userName ?? 'Donor'} · Donor`} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        <section aria-label="Welcome" style={{ background: DASH_BANNER_BG, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: 12, color: 'rgba(251,248,242,0.65)', marginBottom: 3 }}>Welcome back</p>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: c.ivory, fontWeight: 400 }}>{user?.userName ?? 'Donor'}</h1>
            </div>
            <button style={{ background: c.gold, color: c.forest, fontSize: 13, fontWeight: 600, padding: '10px 22px', borderRadius: 24, border: 'none', cursor: 'pointer' }}>
              Donate Again
            </button>
          </div>
        </section>

        <p style={{ fontSize: 14, color: c.muted, textAlign: 'center', marginTop: '3rem' }}>
          {activeNav} — coming soon
        </p>
      </div>
    </main>
  );
}
