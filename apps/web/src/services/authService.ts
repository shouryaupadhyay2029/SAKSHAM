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

// ─── Storage key (single place) ──────────────────────────────────────────────
const SESSION_KEY = 'saksham_auth_session';

// ─── Demo user seed store ─────────────────────────────────────────────────────
// ⚠  DO NOT place real credentials here. This is for development/demo use only.
// In production builds, the backend replaces this entirely.
interface DemoCredential {
  password: string;
  user: AuthUser;
}

const DEMO_USERS: Record<string, DemoCredential> = {
  'operator@saksham.demo': {
    password: 'demo-op-2026',
    user: {
      id: 'USR-001',
      name: 'Priya Sharma',
      email: 'operator@saksham.demo',
      role: 'OPERATOR' as Role,
      organization: 'SAKSHAM Response Network',
      region: 'East Delhi',
      permissions: ROLE_PERMISSIONS['OPERATOR'],
    },
  },
  'authority@saksham.demo': {
    password: 'demo-auth-2026',
    user: {
      id: 'USR-002',
      name: 'Col. Rakesh Verma',
      email: 'authority@saksham.demo',
      role: 'REGIONAL_AUTHORITY' as Role,
      organization: 'Delhi Disaster Management Authority',
      region: 'Delhi NCR',
      permissions: ROLE_PERMISSIONS['REGIONAL_AUTHORITY'],
    },
  },
  'admin@saksham.demo': {
    password: 'demo-admin-2026',
    user: {
      id: 'USR-003',
      name: 'System Administrator',
      email: 'admin@saksham.demo',
      role: 'ADMIN' as Role,
      organization: 'SAKSHAM Core System',
      region: 'All Regions',
      permissions: ROLE_PERMISSIONS['ADMIN'],
    },
  },
};

// ─── Public authService API ───────────────────────────────────────────────────
// These are the ONLY methods AuthContext and the rest of the app should call.
// Swap the internals here when integrating a real auth backend.

export const authService = {
  /**
   * Attempt to authenticate with credentials.
   * Returns a LoginResult — never throws.
   */
  async login(email: string, password: string): Promise<LoginResult> {
    // Simulate network latency for realism
    await new Promise((r) => setTimeout(r, 800));

    const normalised = email.toLowerCase().trim();
    const record = DEMO_USERS[normalised];

    if (!record) {
      // Do not reveal whether the email exists
      return { success: false, error: 'INVALID_CREDENTIALS' };
    }

    if (record.password !== password) {
      return { success: false, error: 'INVALID_CREDENTIALS' };
    }

    // Persist session
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(record.user));
    } catch {
      // sessionStorage unavailable (private browsing extreme mode, etc.)
    }

    return { success: true, user: record.user };
  },

  /**
   * Clear session and auth state.
   */
  logout(): void {
    try {
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
      // Minimal shape validation
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
   * Returns null in production builds.
   */
  getDemoHints(): { email: string; role: string }[] | null {
    // Only expose in non-production environments
    if (import.meta.env.PROD) return null;
    return Object.entries(DEMO_USERS).map(([email, record]) => ({
      email,
      role: record.user.role,
    }));
  },
};
