'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import {
  AdminActivityLog,
  AdminPermissionDef,
  AdminRole,
  AdminUser,
  BoostSessionItem,
  DashboardStats,
  LoginResponse,
  NotificationListItem,
  ReportListItem,
  SearchedUser,
  SubscriptionListItem,
  SystemHealth,
  VerificationQueueItem,
} from './types';

/**
 * Data hooks for the admin dashboard.
 *
 * Why: Each hook wraps a backend `/api/admin` endpoint with TanStack Query so
 * pages stay declarative. Mutations invalidate the relevant queries after a
 * successful action so lists refresh. Permission gating is enforced server-side
 * (requirePermission); these hooks simply surface the result/error.
 */

// --- Auth -------------------------------------------------------------------
export function useLogin() {
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const { data } = await api.post<{ data: LoginResponse }>(
        '/admin/auth/login',
        input,
      );
      return data.data;
    },
  });
}

export function useAdminProfile() {
  return useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: async () => {
      const { data } = await api.get<{ data: { admin: AdminUser } }>(
        '/admin/profile',
      );
      return data.data.admin;
    },
  });
}

// --- Dashboard --------------------------------------------------------------
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<{ data: { stats: DashboardStats } }>(
        '/admin/dashboard',
      );
      return data.data.stats;
    },
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: async () => {
      const { data } = await api.get<{ data: { health: SystemHealth } }>(
        '/admin/system-health',
      );
      return data.data.health;
    },
  });
}

export function useActivityLogs(limit = 100) {
  return useQuery({
    queryKey: ['activity', 'logs', limit],
    queryFn: async () => {
      const { data } = await api.get<{ data: { logs: AdminActivityLog[] } }>(
        '/admin/activity-logs',
        { params: { limit } },
      );
      return data.data.logs;
    },
  });
}

// --- Users ------------------------------------------------------------------
export function useSearchUsers(q: string) {
  return useQuery({
    queryKey: ['users', 'search', q],
    queryFn: async () => {
      const { data } = await api.get<{ data: { users: SearchedUser[] } }>(
        '/admin/users',
        { params: { q } },
      );
      return data.data.users;
    },
    enabled: q.trim().length > 0,
  });
}

export function useUserDetails(userId: string) {
  return useQuery({
    queryKey: ['users', 'detail', userId],
    queryFn: async () => {
      const { data } = await api.get<{ data: { user: unknown } }>(
        `/admin/users/${userId}`,
      );
      return data.data.user;
    },
    enabled: Boolean(userId),
  });
}

export function useUserAction() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });
  return {
    suspend: useMutation({
      mutationFn: (userId: string) =>
        api.patch(`/admin/users/${userId}/suspend`),
      onSuccess: invalidate,
    }),
    ban: useMutation({
      mutationFn: (userId: string) => api.patch(`/admin/users/${userId}/ban`),
      onSuccess: invalidate,
    }),
    reactivate: useMutation({
      mutationFn: (userId: string) =>
        api.patch(`/admin/users/${userId}/reactivate`),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
      onSuccess: invalidate,
    }),
    resetVerification: useMutation({
      mutationFn: (userId: string) =>
        api.post(`/admin/users/${userId}/reset-verification`),
      onSuccess: invalidate,
    }),
    resetPassword: useMutation({
      mutationFn: (userId: string) =>
        api.post(`/admin/users/${userId}/reset-password`),
      onSuccess: invalidate,
    }),
  };
}

// --- Reports ----------------------------------------------------------------
export function useReports(status?: string) {
  return useQuery({
    queryKey: ['reports', status ?? 'all'],
    queryFn: async () => {
      const { data } = await api.get<{ data: { reports: ReportListItem[] } }>(
        '/admin/reports',
        { params: { status } },
      );
      return data.data.reports;
    },
  });
}

export function useUpdateReportStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/reports/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });
}

// --- Verification queue -----------------------------------------------------
export function useVerificationQueue() {
  return useQuery({
    queryKey: ['verification', 'queue'],
    queryFn: async () => {
      const { data } = await api.get<{
        data: { queue: VerificationQueueItem[] };
      }>('/admin/verification-queue');
      return data.data.queue;
    },
  });
}

export function useVerificationDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      rejectionReason,
    }: {
      id: string;
      status: 'approved' | 'rejected';
      rejectionReason?: string;
    }) =>
      api.patch(`/admin/verification-queue/${id}`, {
        status,
        rejectionReason,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verification'] }),
  });
}

// --- Subscriptions & boosts -------------------------------------------------
export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const { data } = await api.get<{
        data: { subscriptions: SubscriptionListItem[] };
      }>('/admin/subscriptions');
      return data.data.subscriptions;
    },
  });
}

export function useBoostSessions() {
  return useQuery({
    queryKey: ['boosts'],
    queryFn: async () => {
      const { data } = await api.get<{
        data: { boosts: BoostSessionItem[] };
      }>('/admin/boost-sessions');
      return data.data.boosts;
    },
  });
}

// --- Notifications ----------------------------------------------------------
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get<{
        data: { notifications: NotificationListItem[] };
      }>('/admin/notifications');
      return data.data.notifications;
    },
  });
}

// --- Roles & admins ---------------------------------------------------------
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get<{ data: { roles: AdminRole[] } }>(
        '/admin/roles',
      );
      return data.data.roles;
    },
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await api.get<{
        data: { permissions: AdminPermissionDef[] };
      }>('/admin/permissions');
      return data.data.permissions;
    },
  });
}

export function useAdmins() {
  return useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const { data } = await api.get<{ data: { admins: AdminUser[] } }>(
        '/admin/admins',
      );
      return data.data.admins;
    },
  });
}

export function useAssignRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roleId }: { id: string; roleId: string }) =>
      api.post(`/admin/admins/${id}/role`, { roleId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admins'] }),
  });
}
