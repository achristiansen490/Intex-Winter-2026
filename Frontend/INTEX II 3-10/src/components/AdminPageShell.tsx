import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from './DashboardLayout';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { ADMIN_NAV_ITEMS } from '../admin/constants';
import { adminNavItemToSlug } from '../lib/portalTabs';

const c = {
  ivory: '#FBF8F2',
  forest: '#2A4A35',
  gold: '#D4A44C',
  rose: '#C4867A',
  sageLight: '#D4EAD9',
};

const ADMIN_BANNER_BG = `linear-gradient(120deg,rgba(42,74,53,0.82) 0%,rgba(196,134,122,0.38) 100%), url("/Smiles under the sun.png") center/cover no-repeat`;

export function AdminPageShell({
  activeNav,
  title = 'Admin Console',
  children,
}: {
  activeNav: string;
  /** Banner subtitle (default: Admin Console). */
  title?: string;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onSelectNavItem = (item: string) => {
    if (item === 'Pipelines') navigate('/admin/pipelines');
    else navigate(`/admin?tab=${adminNavItemToSlug(item)}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <DashboardLayout
      sidebar={
        <Sidebar
          id="admin-sidebar"
          items={[...ADMIN_NAV_ITEMS]}
          active={activeNav}
          onSelectNavItem={onSelectNavItem}
          user={`${user?.userName ?? 'Admin'} · Admin`}
          onLogout={handleLogout}
        />
      }
    >
      <section
        aria-label="Admin dashboard"
        style={{
          background: ADMIN_BANNER_BG,
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <p style={{ fontSize: 12, color: 'rgba(251,248,242,0.65)', marginBottom: 3 }}>{title}</p>
          <h1
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 20,
              color: c.ivory,
              fontWeight: 400,
              margin: 0,
            }}
          >
            {user?.userName ?? 'Admin'}
          </h1>
        </div>
      </section>
      {children}
    </DashboardLayout>
  );
}
