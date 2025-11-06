import { Navigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { FullScreenLoader } from './ui/FullScreenLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader message="Vérification de l'authentification..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
