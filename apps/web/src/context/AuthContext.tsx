import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser, Permission, Role, LoginResult } from '../types/auth';
import { authService } from '../services/authService';

// ─── Context shape ────────────────────────────────────────────────────────────
interface AuthContextValue {
  authUser: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Rehydrate session on mount (handles page refresh)
  useEffect(() => {
    const stored = authService.getCurrentUser();
    setAuthUser(stored);
    setIsAuthLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const result = await authService.login(email, password);
    if (result.success) {
      setAuthUser(result.user);
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setAuthUser(null);
  }, []);

  const hasPermission = useCallback(
    (permission: Permission): boolean => authService.hasPermission(authUser, permission),
    [authUser]
  );

  const hasRole = useCallback(
    (role: Role): boolean => authService.hasRole(authUser, role),
    [authUser]
  );

  return (
    <AuthContext.Provider
      value={{
        authUser,
        isAuthenticated: authUser !== null,
        isAuthLoading,
        login,
        logout,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
