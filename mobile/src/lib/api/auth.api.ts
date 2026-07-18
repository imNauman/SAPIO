import { apiClient } from '../apiClient';

/**
 * Auth API module.
 *
 * Why: Wraps calls to the SAPIO backend `/api/auth` endpoints. The mobile app
 * primarily uses Supabase client-side auth, but these endpoints demonstrate the
 * server-side auth surface (e.g. server-validated `me`, `logout`, `refresh`)
 * and are ready for features that need backend-issued tokens/sessions.
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  fullName?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  expiresAt?: number;
}

export interface AuthResult {
  user: AuthUser | null;
  session: AuthSession | null;
}

export const authApi = {
  async signup(payload: SignupCredentials): Promise<AuthResult> {
    const { data } = await apiClient.post<{ data: AuthResult }>(
      '/auth/signup',
      payload,
    );
    return data.data;
  },

  async login(payload: LoginCredentials): Promise<AuthResult> {
    const { data } = await apiClient.post<{ data: AuthResult }>(
      '/auth/login',
      payload,
    );
    return data.data;
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    await apiClient.post('/auth/forgot-password', payload);
  },

  async refresh(refreshToken: string): Promise<AuthResult> {
    const { data } = await apiClient.post<{ data: AuthResult }>('/auth/refresh', {
      refreshToken,
    });
    return data.data;
  },

  async logout(refreshToken?: string): Promise<void> {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  async me(): Promise<AuthUser> {
    const { data } = await apiClient.get<{ data: { user: AuthUser } }>(
      '/auth/me',
    );
    return data.data.user;
  },
};
