import { supabaseAdmin } from '../../config/supabase';
import { adminRepository } from './admin.repository';
import { DashboardStats } from './admin.types';

/**
 * Admin system-health & dashboard service.
 *
 * Why: Aggregates counts for the dashboard and reports DB connectivity/latency.
 * This is operational visibility only — NOT product analytics (analytics is
 * explicitly out of scope). Counts come straight from the admin repository.
 */
export const adminSystemHealthService = {
  systemHealth() {
    return adminRepository.systemHealth(supabaseAdmin);
  },

  async dashboardStats(): Promise<DashboardStats> {
    const health = await adminRepository.systemHealth(supabaseAdmin);
    const c = health.counts;
    return {
      totalUsers: c.users,
      activeReports: c.reports,
      pendingVerifications: c.verifications,
      activeBoosts: c.boosts,
      premiumUsers: c.subscriptions,
      totalAdmins: c.admins,
    };
  },
};
