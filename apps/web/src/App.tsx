import { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import Dashboard from './pages/DashboardNew';
import { Header } from './components/layout/Header';
import Portfolio from './pages/Portfolio';
import { SetDetail } from './pages/SetDetail';
import Discover from './pages/Discover';
import { Profile } from './pages/Profile';
import { ScrollToTop } from './components/ui/ScrollToTop';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminUserDetail from './pages/Admin/AdminUserDetail';
import AdminLogs from './pages/Admin/AdminLogs';

// Redirection racine vers Portfolio si connecté, sinon Login
function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/portfolio' : '/login'} replace />;
}

// Route "publique" : si connecté, on redirige vers /portfolio (bloque /login & /register)
function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/portfolio" replace />;
  }
  return <>{children}</>;
}

// Rend le Header sauf sur /login et /register
function AppInner() {
  const location = useLocation();
  const hideHeader = location.pathname === '/login' || location.pathname === '/register';

  return (
    <>
      {!hideHeader && <Header />}

      <Routes>
        {/* Racine */}
        <Route path="/" element={<RootRedirect />} />

        {/* Auth (publiques, mais redirigées si déjà connecté) */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Dashboard (protégé) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Page principale : Portfolio (protégée) */}
        <Route
          path="/portfolio"
          element={
            <ProtectedRoute>
              <Portfolio />
            </ProtectedRoute>
          }
        />

        {/* Set Detail (protégée) */}
        <Route
          path="/portfolio/set/:setId"
          element={
            <ProtectedRoute>
              <SetDetail />
            </ProtectedRoute>
          }
        />

        {/* Découvrir (protégée) */}
        <Route
          path="/decouvrir"
          element={
            <ProtectedRoute>
              <Discover />
            </ProtectedRoute>
          }
        />

        {/* Profile (protégée) */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Admin (protégé avec rôle admin) */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users/:userId"
          element={
            <AdminRoute>
              <AdminUserDetail />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <AdminRoute>
              <AdminLogs />
            </AdminRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Bouton Scroll to Top disponible sur toutes les pages */}
      <ScrollToTop />
    </>
  );
}

// Configuration React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (remplace cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
