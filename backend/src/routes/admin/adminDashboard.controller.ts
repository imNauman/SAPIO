import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { sendSuccess } from '../../utils/response';
import { adminSystemHealthService } from './adminSystemHealth.service';
import { adminRepository } from './admin.repository';
import { supabaseAdmin } from '../../config/supabase';

/**
 * Admin dashboard & system-health controller.
 *
 * Why: Aggregates the home-page stats and reports DB connectivity/latency.
 * This is operational visibility only — NOT product analytics (analytics is
 * explicitly out of scope). Guarded by `view_analytics` at the route layer.
 */
export const adminDashboardController = {
  /** GET /api/admin/dashboard */
  stats: asyncHandler(async (_req: Request, res: Response) => {
    const stats = await adminSystemHealthService.dashboardStats();
    sendSuccess(res, { stats });
  }),

  /** GET /api/admin/system-health */
  health: asyncHandler(async (_req: Request, res: Response) => {
    const health = await adminSystemHealthService.systemHealth();
    sendSuccess(res, { health });
  }),

  /** GET /api/admin/activity-logs */
  activityLogs: asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit ?? 100);
    const logs = await adminRepository.listActivityLogs(supabaseAdmin, limit);
    sendSuccess(res, { logs });
  }),
};
