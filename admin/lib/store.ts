import { create } from 'zustand';
import { AdminPermission, AdminUser } from './types';
import { getToken, setToken } from './api';

/**
 * AdminStore (Zustand).
 *
 * Why: Holds the authenticated admin principal (`currentAdmin`) and their
 * expanded `permissions` so any component can gate UI by capability without
 * re-fetching. `login`/`logout` persist the JWT to localStorage (via the api
 * helper) so a refresh keeps the session. This is the single source of truth
 * for "who is the current admin" and "what can they do".
 */
interface AdminState {
  currentAdmin: AdminUser | null;
  permissions: AdminPermission[];
  isAuthenticated: boolean;
  setAdmin: (admin: AdminUser, token: string) => void;
  logout: () => void;
  hasPermission: (permission: AdminPermission) => boolean;
  hydrate: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  currentAdmin: null,
  permissions: [],
  isAuthenticated: false,

  setAdmin: (admin, token) => {
    setToken(token);
    set({
      currentAdmin: admin,
      permissions: admin.permissions,
      isAuthenticated: true,
    });
  },

  logout: () => {
    setToken(null);
    set({ currentAdmin: null, permissions: [], isAuthenticated: false });
  },

  hasPermission: (permission) => get().permissions.includes(permission),

  hydrate: () => {
    const token = getToken();
    if (!token) return;
    // The full admin object is re-fetched by the profile query on mount;
    // here we only mark the session as present so guarded routes render.
    set({ isAuthenticated: true });
  },
}));
