import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CookieConsent } from './components/CookieConsent';

// Pages
import LandingPage from './pages/LandingPage';
import ImpactPage from './pages/ImpactPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import DonorPortal from './pages/DonorPortal';
import StaffPortal from './pages/StaffPortal';
import ResidentPortal from './pages/ResidentPortal';
import AdminPortal from './pages/AdminPortal';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';

/** Redirects already-logged-in users away from /login and /register */
function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated) {
    switch (role) {
      case 'Admin': return <Navigate to="/admin" replace />;
      case 'Supervisor':
      case 'CaseManager':
      case 'SocialWorker':
      case 'FieldWorker': return <Navigate to="/staff" replace />;
      case 'Resident': return <Navigate to="/resident" replace />;
      case 'Donor': return <Navigate to="/donor" replace />;
    }
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/impact" element={<ImpactPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/pending-approval" element={<PendingApprovalPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        {/* Auth routes — redirect if already logged in */}
        <Route path="/login" element={<AuthRedirect><LoginPage /></AuthRedirect>} />
        <Route path="/register" element={<AuthRedirect><RegisterPage /></AuthRedirect>} />

        {/* Protected: Donor */}
        <Route element={<ProtectedRoute allowedRoles={['Donor']} />}>
          <Route path="/donor" element={<DonorPortal />} />
        </Route>

        {/* Protected: Staff (all staff roles) */}
        <Route element={<ProtectedRoute allowedRoles={['Supervisor', 'CaseManager', 'SocialWorker', 'FieldWorker']} />}>
          <Route path="/staff" element={<StaffPortal />} />
        </Route>

        {/* Protected: Resident */}
        <Route element={<ProtectedRoute allowedRoles={['Resident']} />}>
          <Route path="/resident" element={<ResidentPortal />} />
        </Route>

        {/* Protected: Admin */}
        <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
          <Route path="/admin" element={<AdminPortal />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <CookieConsent />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
