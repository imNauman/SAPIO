import { supabaseAdmin, supabaseAnon } from '../../config/supabase';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { AppError } from '../../utils/errors';
import {
  AuthResult,
  AuthSession,
  AuthUser,
} from './auth.types';

/**
 * Auth service.
 *
 * Why: Isolates all Supabase auth SDK calls behind a small, typed interface so
 * controllers never touch the SDK directly. The admin client (service role) is
 * used for privileged operations (e.g. verifying a user by id server-side),
 * while the anon client is used for end-user flows (signUp, signInWithPassword).
 */
function mapUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    createdAt: user.created_at,
    userMetadata: user.user_metadata,
    appMetadata: user.app_metadata,
  };
}

function mapSession(session: {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
} | null): AuthSession | null {
  if (!session) return null;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
    expiresAt: session.expires_at,
    tokenType: session.token_type,
  };
}

export const authService = {
  /** Register a new user with email + password. */
  async signUp(
    email: string,
    password: string,
    options?: { fullName?: string },
  ): Promise<AuthResult> {
    const { data, error } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: options?.fullName
        ? { data: { full_name: options.fullName } }
        : undefined,
    });
    if (error) {
      throw new AppError(error.status ?? 400, error.message);
    }
    return {
      user: mapUser(data.user),
      session: mapSession(data.session),
    };
  },

  /** Authenticate an existing user. */
  async signIn(
    email: string,
    password: string,
  ): Promise<AuthResult> {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new AppError(error.status ?? 401, error.message);
    }
    return {
      user: mapUser(data.user),
      session: mapSession(data.session),
    };
  },

  /** Sign out a user by invalidating their refresh token server-side. */
  async signOut(refreshToken?: string): Promise<void> {
    // Prefer the admin client to globally revoke the session token.
    if (refreshToken) {
      const { error } = await supabaseAdmin.auth.admin.signOut(
        refreshToken,
        'global',
      );
      if (error) {
        throw new AppError(error.status ?? 400, error.message);
      }
      return;
    }
    // Fallback: sign out the anon client's current session.
    const { error } = await supabaseAnon.auth.signOut();
    if (error) {
      throw new AppError(error.status ?? 400, error.message);
    }
  },

  /** Send a password reset email. */
  async forgotPassword(email: string): Promise<void> {
    const { error } = await supabaseAnon.auth.resetPasswordForEmail(email);
    if (error) {
      throw new AppError(error.status ?? 400, error.message);
    }
  },

  /** Exchange a refresh token for a new session. */
  async refreshSession(refreshToken: string): Promise<AuthResult> {
    const { data, error } = await supabaseAnon.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error) {
      throw new AppError(error.status ?? 401, error.message);
    }
    return {
      user: mapUser(data.user),
      session: mapSession(data.session),
    };
  },

  /**
   * Verify a JWT access token and return the associated user.
   *
   * Why: This is the core of the `authenticate` middleware. We use the admin
   * client so we can validate tokens without relying on a locally stored
   * session (the server is stateless).
   */
  async getUserFromToken(token: string): Promise<AuthUser | null> {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return mapUser(data.user);
  },

  /**
   * Re-authenticate a user with email + password (used to confirm the current
   * password before a sensitive account change like password/email update).
   */
  async reauthenticate(
    email: string,
    password: string,
  ): Promise<boolean> {
    const { error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });
    return !error;
  },

  /**
   * Change a user's password via the admin API. Supabase revokes all existing
   * refresh tokens on password change, so other sessions are invalidated while
   * the caller's current access token keeps working until natural expiry.
   */
  async changePassword(
    userId: string,
    newPassword: string,
  ): Promise<void> {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) {
      throw new AppError(error.status ?? 400, error.message);
    }
  },

  /**
   * Change a user's email via the admin API. Updates the auth provider; if
   * email confirmation is enabled, Supabase sends a confirmation link. The
   * caller's current session is unaffected.
   */
  async changeEmail(userId: string, newEmail: string): Promise<void> {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail,
    });
    if (error) {
      throw new AppError(error.status ?? 400, error.message);
    }
  },

  /** Check whether an email is already taken by another auth user. */
  async isEmailTaken(
    client: SupabaseClient,
    email: string,
    exceptUserId: string,
  ): Promise<boolean> {
    const { data, error } = await client
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .neq('id', exceptUserId)
      .maybeSingle();
    if (error) {
      // If we can't read auth.users directly, fall back to listUsers.
      const list = await supabaseAdmin.auth.admin.listUsers();
      return (list.data.users ?? []).some(
        (u) => u.email === email && u.id !== exceptUserId,
      );
    }
    return Boolean(data);
  },
};
