/**
 * Auth-specific domain types shared between the service, controller, and
 * middleware layers.
 */
export interface AuthUser {
  id: string;
  email: string | null;
  /** Epoch seconds when the user was created (Supabase convention). */
  createdAt?: string;
  /** Arbitrary user metadata returned by Supabase. */
  userMetadata?: Record<string, unknown>;
  appMetadata?: Record<string, unknown>;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  expiresAt?: number;
  tokenType?: string;
}

export interface AuthResult {
  user: AuthUser | null;
  session: AuthSession | null;
}
