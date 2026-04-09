import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, type Role } from '../context/AuthContext';
import { getHomePathForRole } from '../lib/postLoginRouting';

interface ProtectedRouteProps {
  allowedRoles: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FBF8F2',
          color: '#7A786F',
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTarget = `${location.pathname}${location.search}${location.hash}`;
    const params = new URLSearchParams();
    params.set('returnUrl', returnTarget);
    return <Navigate to={{ pathname: '/login', search: `?${params.toString()}` }} replace />;
  }

  if (!role) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={getHomePathForRole(role)} replace />;
  }

  return <Outlet />;
}
