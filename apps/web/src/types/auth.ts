// ─── SAKSHAM Auth Types ──────────────────────────────────────────────────────
// Clean frontend model. Replace with backend-validated types when API is ready.

export type Role = 'CIVILIAN' | 'OPERATOR' | 'REGIONAL_AUTHORITY' | 'ADMIN';

export type Permission =
  | 'VIEW_INCIDENTS'
  | 'CREATE_DEMAND'
  | 'MATCH_RESOURCES'
  | 'DISPATCH_RESOURCE'
  | 'VERIFY_DELIVERY'
  | 'RESOLVE_INCIDENT'
  | 'VIEW_ANALYTICS'
  | 'APPROVE_ESCALATION'
  | 'ADD_TIMELINE_LOG'
  | 'MANAGE_USERS'
  | 'SYSTEM_CONFIG';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  organization: string;
  region: string;
  permissions: Permission[];
}

// ─── Role → Permission map ────────────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  CIVILIAN: [],
  OPERATOR: [
    'VIEW_INCIDENTS',
    'CREATE_DEMAND',
    'MATCH_RESOURCES',
    'DISPATCH_RESOURCE',
    'VERIFY_DELIVERY',
    'VIEW_ANALYTICS',
    'ADD_TIMELINE_LOG',
  ],
  REGIONAL_AUTHORITY: [
    'VIEW_INCIDENTS',
    'CREATE_DEMAND',
    'MATCH_RESOURCES',
    'DISPATCH_RESOURCE',
    'VERIFY_DELIVERY',
    'RESOLVE_INCIDENT',
    'VIEW_ANALYTICS',
    'APPROVE_ESCALATION',
    'ADD_TIMELINE_LOG',
  ],
  ADMIN: [
    'VIEW_INCIDENTS',
    'CREATE_DEMAND',
    'MATCH_RESOURCES',
    'DISPATCH_RESOURCE',
    'VERIFY_DELIVERY',
    'RESOLVE_INCIDENT',
    'VIEW_ANALYTICS',
    'APPROVE_ESCALATION',
    'ADD_TIMELINE_LOG',
    'MANAGE_USERS',
    'SYSTEM_CONFIG',
  ],
};

// ─── Auth state shape ─────────────────────────────────────────────────────────
export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ─── Login result ─────────────────────────────────────────────────────────────
export type LoginResult =
  | { success: true; user: AuthUser }
  | { success: false; error: 'INVALID_CREDENTIALS' | 'ACCOUNT_UNAVAILABLE' | 'CONNECTION_ERROR' };
