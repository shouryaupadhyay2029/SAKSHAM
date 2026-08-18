import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Wraps any route that requires authentication.
 * Unauthenticated users are redirected to /officer/login
 * with the current path preserved as ?redirect=<url> for deep-link return.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const location = useLocation();

  // While session is being rehydrated, render nothing to avoid flash
  if (isAuthLoading) {
    return null;
  }

  if (!isAuthenticated) {
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/officer/login?redirect=${redirectTo}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
