import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
  permissions?: string[];
  anyPermissions?: string[];
}

export default function ProtectedRoute({ children, roles, permissions, anyPermissions }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole, can, user } = useAuth();
  const fallbackPath = user?.role === 'system_admin' ? '/admin' : '/dashboard';

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !hasRole(roles)) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (permissions && permissions.some((permission) => !can(permission))) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (anyPermissions && !anyPermissions.some((permission) => can(permission))) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
