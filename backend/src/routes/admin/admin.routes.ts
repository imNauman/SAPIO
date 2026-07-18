import { Router } from 'express';
import { adminAuth } from '../../middleware/adminAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { adminAuthController } from './adminAuth.controller';
import { adminUserController } from './adminUser.controller';
import { adminReportController } from './adminReport.controller';
import { adminVerificationController } from './adminVerification.controller';
import { adminSubscriptionController } from './adminSubscription.controller';
import { adminNotificationController } from './adminNotification.controller';
import { adminDashboardController } from './adminDashboard.controller';
import { adminRoleController } from './adminRole.controller';

/**
 * Admin Dashboard Platform routes — mounted at `/api/admin`.
 *
 * Why: Every endpoint is wrapped in `adminAuth` (JWT verify + active-admin
 * check) and, where it mutates or reads privileged data, `requirePermission`.
 * The permission gate reads `req.admin.permissions` (expanded from the role by
 * `requireAdmin`). This is the single RBAC enforcement point for the whole
 * admin surface.
 *
 * Exclusions (per spec): NO AI moderation, NO analytics, NO payments. The
 * endpoints below are management/visibility only.
 */
export const adminRoutes: Router = Router();

// --- Auth (no specific permission beyond being an active admin) -------------
adminRoutes.post('/auth/login', ...adminAuthController.login);
adminRoutes.get('/profile', ...adminAuth, adminAuthController.profile);

// --- Dashboard & system health (view_analytics) -----------------------------
adminRoutes.get(
  '/dashboard',
  ...adminAuth,
  requirePermission('view_analytics'),
  adminDashboardController.stats,
);
adminRoutes.get(
  '/system-health',
  ...adminAuth,
  requirePermission('view_analytics'),
  adminDashboardController.health,
);
adminRoutes.get(
  '/activity-logs',
  ...adminAuth,
  requirePermission('view_analytics'),
  adminDashboardController.activityLogs,
);

// --- Users (manage_users) ---------------------------------------------------
adminRoutes.get(
  '/users',
  ...adminAuth,
  requirePermission('manage_users'),
  adminUserController.search,
);
adminRoutes.get(
  '/users/:id',
  ...adminAuth,
  requirePermission('manage_users'),
  adminUserController.details,
);
adminRoutes.patch(
  '/users/:id/suspend',
  ...adminAuth,
  requirePermission('manage_users'),
  ...adminUserController.suspend,
);
adminRoutes.patch(
  '/users/:id/ban',
  ...adminAuth,
  requirePermission('manage_users'),
  ...adminUserController.ban,
);
adminRoutes.patch(
  '/users/:id/reactivate',
  ...adminAuth,
  requirePermission('manage_users'),
  ...adminUserController.reactivate,
);
adminRoutes.delete(
  '/users/:id',
  ...adminAuth,
  requirePermission('manage_users'),
  adminUserController.remove,
);
adminRoutes.post(
  '/users/:id/reset-verification',
  ...adminAuth,
  requirePermission('manage_users'),
  adminUserController.resetVerification,
);
adminRoutes.post(
  '/users/:id/reset-password',
  ...adminAuth,
  requirePermission('manage_users'),
  adminUserController.resetPassword,
);

// --- Reports (manage_reports) ----------------------------------------------
adminRoutes.get(
  '/reports',
  ...adminAuth,
  requirePermission('manage_reports'),
  adminReportController.list,
);
adminRoutes.get(
  '/reports/:id',
  ...adminAuth,
  requirePermission('manage_reports'),
  adminReportController.details,
);
adminRoutes.patch(
  '/reports/:id',
  ...adminAuth,
  requirePermission('manage_reports'),
  ...adminReportController.updateStatus,
);

// --- Verification queue (manage_verification) ------------------------------
adminRoutes.get(
  '/verification-queue',
  ...adminAuth,
  requirePermission('manage_verification'),
  adminVerificationController.list,
);
adminRoutes.patch(
  '/verification-queue/:id',
  ...adminAuth,
  requirePermission('manage_verification'),
  ...adminVerificationController.decide,
);

// --- Subscriptions & boosts (manage_premium) ------------------------------
adminRoutes.get(
  '/subscriptions',
  ...adminAuth,
  requirePermission('manage_premium'),
  adminSubscriptionController.list,
);
adminRoutes.get(
  '/boost-sessions',
  ...adminAuth,
  requirePermission('manage_premium'),
  adminSubscriptionController.listBoosts,
);

// --- Notifications (manage_notifications) ----------------------------------
adminRoutes.get(
  '/notifications',
  ...adminAuth,
  requirePermission('manage_notifications'),
  adminNotificationController.list,
);

// --- Roles & admins (view_analytics for reads, manage_admins for writes) ---
adminRoutes.get(
  '/roles',
  ...adminAuth,
  requirePermission('view_analytics'),
  adminRoleController.listRoles,
);
adminRoutes.get(
  '/permissions',
  ...adminAuth,
  requirePermission('view_analytics'),
  adminRoleController.listPermissions,
);
adminRoutes.get(
  '/admins',
  ...adminAuth,
  requirePermission('view_analytics'),
  adminRoleController.listAdmins,
);
adminRoutes.post(
  '/admins/:id/role',
  ...adminAuth,
  requirePermission('manage_admins'),
  ...adminRoleController.assignRole,
);
