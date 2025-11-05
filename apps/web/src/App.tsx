import { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import Dashboard from './pages/Dashboard';
import { Header } from './components/layout/Header';
import Portfolio from './pages/Portfolio';
import Discover from './pages/Discover';

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

        {/* Découvrir (protégée) */}
        <Route
          path="/decouvrir"
          element={
            <ProtectedRoute>
              <Discover />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </BrowserRouter>
  );
}
