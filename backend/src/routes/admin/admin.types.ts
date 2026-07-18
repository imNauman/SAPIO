import { z } from 'zod';
import { ReportStatus } from '../report/report.types';
import { VerificationStatus } from '../verification/verification.types';

/**
 * Admin Dashboard Platform — shared types & validation schemas.
 *
 * Why: Centralizes the RBAC vocabulary (roles, permissions) and the request
 * contracts for the admin API. Reuses the existing `ReportStatus` /
 * `VerificationStatus` enums so admin decisions stay consistent with the
 * report/verification modules (no duplicated status strings).
 */

/** The five fixed admin roles. */
export const ADMIN_ROLES = [
  'super_admin',
  'admin',
  'moderator',
  'support',
  'read_only',
] as const;
export type AdminRoleName = (typeof ADMIN_ROLES)[number];

/** The eight fixed capability keys. */
export const ADMIN_PERMISSIONS = [
  'manage_users',
  'manage_reports',
  'manage_verification',
  'manage_premium',
  'manage_notifications',
  'manage_content',
  'view_analytics',
  'manage_admins',
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

/** A resolved admin user (with permissions expanded from their role). */
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
}

/** Dashboard aggregate stats shown on the home page. */
export interface DashboardStats {
  totalUsers: number;
  activeReports: number;
  pendingVerifications: number;
  activeBoosts: number;
  premiumUsers: number;
  totalAdmins: number;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

/** POST /api/admin/auth/login */
export const adminLoginSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/** POST /api/admin/admins/:id/role — reassign an admin's role. */
export const assignRoleSchema = z.object({
  roleId: z.string().uuid('A valid role id is required'),
});
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;

/** PATCH /api/admin/reports/:id — change a report's status. */
export const updateReportStatusSchema = z.object({
  status: z.enum([
    'open',
    'under_review',
    'resolved',
    'dismissed',
  ] as [ReportStatus, ...ReportStatus[]]),
  note: z.string().optional(),
});
export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>;

/** PATCH /api/admin/verification-queue/:id — approve/reject a request. */
export const verificationDecisionSchema = z.object({
  status: z.enum(['approved', 'rejected'] as [
    VerificationStatus,
    ...VerificationStatus[],
  ]),
  rejectionReason: z.string().optional(),
});
export type VerificationDecisionInput = z.infer<
  typeof verificationDecisionSchema
>;

/** Body for user lifecycle actions (suspend/ban/delete/reset). */
export const userActionSchema = z.object({
  reason: z.string().optional(),
});
export type UserActionInput = z.infer<typeof userActionSchema>;
