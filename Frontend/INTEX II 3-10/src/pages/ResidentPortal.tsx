import { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const c = { ivory: '#FBF8F2', forest: '#2A4A35', gold: '#D4A44C', sageLight: '#D4EAD9', text: '#2C2B28', muted: '#7A786F', white: '#FFFFFF' };
const RESIDENT_BANNER_BG = `linear-gradient(120deg,rgba(42,74,53,0.72) 0%,rgba(107,158,126,0.42) 100%), url("/Smiles under the sun.png") center/cover no-repeat`;

const navItems = ['My Profile', 'My Progress', 'Health & Wellbeing', 'Education', 'Visit Schedule', 'My Goals'];

export default function ResidentPortal() {
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState('My Profile');

  return (
    <main id="main-content" style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
      <Sidebar id="resident-sidebar" items={navItems} active={activeNav} setActive={setActiveNav} user={user?.userName ?? 'Resident'} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        <section aria-label="Welcome" style={{ background: RESIDENT_BANNER_BG, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <p style={{ fontSize: 12, color: 'rgba(251,248,242,0.65)', marginBottom: 3 }}>Your safe space</p>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: c.ivory, fontWeight: 400 }}>
              Welcome, {user?.userName ?? 'Resident'}
            </h1>
          </div>
        </section>

        <p style={{ fontSize: 14, color: c.muted, textAlign: 'center', marginTop: '3rem' }}>
          {activeNav} — coming soon
        </p>
      </div>
    </main>
  );
}
