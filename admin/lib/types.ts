/**
 * Admin frontend types — mirror the backend `admin.types.ts` contracts.
 * Kept in sync manually (no codegen) to avoid coupling the Next.js app to the
 * backend build.
 */

export type AdminRoleName =
  | 'super_admin'
  | 'admin'
  | 'moderator'
  | 'support'
  | 'read_only';

export type AdminPermission =
  | 'manage_users'
  | 'manage_reports'
  | 'manage_verification'
  | 'manage_premium'
  | 'manage_notifications'
  | 'manage_content'
  | 'view_analytics'
  | 'manage_admins';

export interface AdminUser {
  id: string;
  userId: string;
  roleId: string;
  roleName: AdminRoleName;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  permissions: AdminPermission[];
}

export interface AdminRole {
  id: string;
  name: AdminRoleName;
  description: string | null;
  permissions: AdminPermission[];
}

export interface AdminPermissionDef {
  key: AdminPermission;
  description: string | null;
}

export interface AdminActivityLog {
  id: string;
  adminId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  adminEmail: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeReports: number;
  pendingVerifications: number;
  activeBoosts: number;
  premiumUsers: number;
  totalAdmins: number;
}

export interface SystemHealth {
  database: 'ok' | 'error';
  latencyMs: number;
  counts: {
    users: number;
    reports: number;
    verifications: number;
    boosts: number;
    subscriptions: number;
    admins: number;
  };
}

export interface SearchedUser {
  userId: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  isVerified: boolean;
  isPremium: boolean;
  status: string;
  createdAt: string | null;
  lastActive: string | null;
}

export interface ReportListItem {
  id: string;
  reporterUserId: string;
  reportedUserId: string;
  categoryName: string | null;
  description: string | null;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationQueueItem {
  id: string;
  userId: string;
  status: string;
  submittedAt: string;
  photos: Array<{ id: string; photoUrl: string; photoType: string }>;
}

export interface SubscriptionListItem {
  id: string;
  userId: string;
  planName: string;
  tier: string;
  status: string;
  platform: string;
  expiresAt: string | null;
  startedAt: string;
}

export interface BoostSessionItem {
  id: string;
  userId: string;
  multiplier: number;
  status: string;
  startedAt: string;
  expiresAt: string;
}

export interface NotificationListItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface LoginResponse {
  admin: AdminUser;
  accessToken: string;
  refreshToken: string;
}
