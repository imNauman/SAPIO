import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import {
  LoginCredentials,
  SignupCredentials,
} from '../lib/api/auth.api';
import { useProfileStore } from './profileStore';
import { usePhotoStore } from './photoStore';

/**
 * Authentication store (Zustand).
 *
 * Why: Centralizes the auth lifecycle so screens and the API client can read the
 * current session without prop-drilling. The store is the single source of
 * truth for `isAuthenticated`, and it seeds itself from Supabase's persisted
 * session on app start (via `bootstrap()`).
 */
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;

  /** Restore any persisted session and subscribe to auth changes. */
  bootstrap: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-read the current session (e.g. after a token refresh). */
  refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,

  bootstrap: async () => {
    // Get the persisted session (Supabase restores from local storage).
    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      isAuthenticated: !!data.session,
      loading: false,
    });

    // Keep the store in sync with future auth events (login, logout, refresh).
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        loading: false,
      });
      // Drop any cached profile when the session ends.
      if (!session) {
        useProfileStore.getState().clear();
      }
    });
  },

  login: async ({ email, password }) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      set({ loading: false });
      throw new Error(error.message);
    }
    set({
      session: data.session,
      user: data.user,
      isAuthenticated: true,
      loading: false,
    });
  },

  signup: async ({ email, password, fullName }) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    });
    if (error) {
      set({ loading: false });
      throw new Error(error.message);
    }
    // If email confirmation is on, there may be no session yet.
    set({
      session: data.session,
      user: data.user,
      isAuthenticated: !!data.session,
      loading: false,
    });
  },

  logout: async () => {
    set({ loading: true });
    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ loading: false });
      throw new Error(error.message);
    }
    set({
      session: null,
      user: null,
      isAuthenticated: false,
      loading: false,
    });
    useProfileStore.getState().clear();
    usePhotoStore.getState().clear();
  },

  refreshSession: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      set({
        session: null,
        user: null,
        isAuthenticated: false,
        loading: false,
      });
      return;
    }
    set({
      session: data.session,
      user: data.user,
      isAuthenticated: true,
      loading: false,
    });
  },
}));
