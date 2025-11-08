import { Navigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { FullScreenLoader } from './ui/FullScreenLoader';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader message="Vérification de l'authentification..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/portfolio" replace />;
  }

  return <>{children}</>;
}
