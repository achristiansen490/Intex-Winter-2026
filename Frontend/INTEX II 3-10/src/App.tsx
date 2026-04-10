import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isSafeReturnPath, resolvePostLoginTarget } from './lib/postLoginRouting';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CookieConsent } from './components/CookieConsent';
import { Footer } from './components/Footer';

// Pages
import LandingPage from './pages/LandingPage';
import ImpactPage from './pages/ImpactPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RegisterSuccessPage from './pages/RegisterSuccessPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import DonorPortal from './pages/DonorPortal';
import StaffPortal from './pages/StaffPortal';
import ResidentPortal from './pages/ResidentPortal';
import AdminPortal from './pages/AdminPortal';
import AdminPipelineDashboard from './pages/AdminPipelineDashboard';
import AdminPipelineDetail from './pages/AdminPipelineDetail';
import AdminSocialImpactPage from './pages/AdminSocialImpactPage';

/** Redirects already-logged-in users away from /login and /register */
function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const returnUrlRaw = searchParams.get('returnUrl');
  const returnUrl = returnUrlRaw && isSafeReturnPath(returnUrlRaw) ? returnUrlRaw : null;

  if (isLoading) return null;

  if (isAuthenticated && role) {
    return <Navigate to={resolvePostLoginTarget(role, returnUrl)} replace />;
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
        <Route path="/register/success" element={<RegisterSuccessPage />} />
        <Route path="/forbidden" element={<Navigate to="/" replace />} />

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
          <Route path="/admin/social-impact" element={<AdminSocialImpactPage />} />
          <Route path="/admin/pipelines" element={<AdminPipelineDashboard />} />
          <Route path="/admin/pipelines/:pipelineId" element={<AdminPipelineDetail />} />
        </Route>

        {/* Unknown paths → landing (avoids hard 404 on typos / deep links without a matching route) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />
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
