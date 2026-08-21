/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SAKSHAM authService — DEMO AUTHENTICATION LAYER
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠  DEMO ONLY: This module uses sessionStorage to persist auth state.
 *    It is NOT a real authentication system.
 *    Replace the internals of each method with real API calls when the
 *    backend is available. The AuthContext and all consumers remain unchanged.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { AuthUser, LoginResult, Permission, Role } from '../types/auth';
import { ROLE_PERMISSIONS } from '../types/auth';

// ─── Storage keys ──────────────────────────────────────────────────────────────
const SESSION_KEY = 'saksham_auth_session';
export const TOKEN_KEY = 'saksham_auth_token';

const FASTAPI_BASE_URL = import.meta.env.VITE_FASTAPI_URL || import.meta.env.VITE_API_URL || '/api/v1';

// ─── Demo user seed store fallback ───────────────────────────────────────────
interface DemoCredential {
  password: string;
  user: AuthUser;
}

const DEMO_USERS: Record<string, DemoCredential> = {
  'operator@saksham.demo': {
    password: 'demo-op-2026',
    user: {
      id: 'USR-001',
      name: 'Harshit Sharma',
      email: 'operator@saksham.demo',
      role: 'OPERATOR' as Role,
      organization: 'SAKSHAM Response Network',
      region: 'Delhi NCR',
      permissions: ROLE_PERMISSIONS['OPERATOR'],
    },
  },
  'authority@saksham.demo': {
    password: 'demo-auth-2026',
    user: {
      id: 'USR-002',
      name: 'Pradeep Kumar',
      email: 'authority@saksham.demo',
      role: 'REGIONAL_AUTHORITY' as Role,
      organization: 'Delhi Disaster Management Authority',
      region: 'East Delhi',
      permissions: ROLE_PERMISSIONS['REGIONAL_AUTHORITY'],
    },
  },
  'admin@saksham.demo': {
    password: 'demo-admin-2026',
    user: {
      id: 'USR-003',
      name: 'Rajesh Nair',
      email: 'admin@saksham.demo',
      role: 'ADMIN' as Role,
      organization: 'SAKSHAM Core System',
      region: 'National',
      permissions: ROLE_PERMISSIONS['ADMIN'],
    },
  },
};

export const authService = {
  /**
   * Attempt to authenticate officer credentials via FastAPI backend.
   * On success, stores the JWT accessToken into sessionStorage under 'saksham_auth_token'.
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const normalised = email.toLowerCase().trim();

    try {
      // 1. Try real FastAPI JWT login endpoint
      const response = await fetch(`${FASTAPI_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalised, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken && data.officer) {
          // Persist token for WebSocket and API calls
          sessionStorage.setItem(TOKEN_KEY, data.accessToken);

          const role = data.officer.role as Role;
          const authUser: AuthUser = {
            id: String(data.officer.id),
            name: data.officer.name,
            email: data.officer.email,
            role,
            organization: data.officer.region ? `${data.officer.region} Command Unit` : 'SAKSHAM Response Network',
            region: data.officer.region || 'Delhi NCR',
            permissions: ROLE_PERMISSIONS[role] || [],
          };

          // Persist user session
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
          return { success: true, user: authUser };
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        if (errJson.error?.code === 'INVALID_CREDENTIALS' || response.status === 401) {
          return { success: false, error: 'INVALID_CREDENTIALS' };
        }
      }
    } catch (networkError) {
      console.warn('FastAPI auth connection failed, attempting local fallback check...', networkError);
    }

    // 2. Local Demo fallback (if server is unreachable or offline mode)
    const record = DEMO_USERS[normalised];
    if (record && record.password === password) {
      try {
        sessionStorage.setItem(TOKEN_KEY, `demo-token-${record.user.role}`);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(record.user));
      } catch {
        // sessionStorage unavailable
      }
      return { success: true, user: record.user };
    }

    return { success: false, error: 'INVALID_CREDENTIALS' };
  },

  /**
   * Clear session and token state.
   */
  logout(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  },

  /**
   * Return the currently persisted user, or null.
   */
  getCurrentUser(): AuthUser | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthUser;
      if (!parsed.id || !parsed.role) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  /**
   * Quick synchronous authenticated check.
   */
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },

  /**
   * Check if the current user has a specific permission.
   */
  hasPermission(user: AuthUser | null, permission: Permission): boolean {
    if (!user) return false;
    return user.permissions.includes(permission);
  },

  /**
   * Check if the current user has a specific role.
   */
  hasRole(user: AuthUser | null, role: Role): boolean {
    if (!user) return false;
    return user.role === role;
  },

  /**
   * Expose demo credentials hint for development UI.
   */
  getDemoHints(): { email: string; role: string }[] | null {
    if (import.meta.env.PROD) return null;
    return Object.entries(DEMO_USERS).map(([email, record]) => ({
      email,
      role: record.user.role,
    }));
  },
};
