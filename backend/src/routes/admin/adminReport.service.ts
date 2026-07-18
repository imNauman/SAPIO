import { supabaseAdmin } from '../../config/supabase';
import { adminRepository } from './admin.repository';

/**
 * Admin report service.
 *
 * Why: Reuses the `reports` table via the admin repository (read-only listing +
 * status update). No AI moderation, no analytics — just manual triage by an
 * authorized admin. Every status change is audit-logged.
 */
export const adminReportService = {
  listReports(opts: { status?: string; limit?: number; offset?: number } = {}) {
    return adminRepository.listReports(supabaseAdmin, opts);
  },

  getReport(reportId: string) {
    return adminRepository.getReport(supabaseAdmin, reportId);
  },

  async updateStatus(
    adminId: string,
    reportId: string,
    status: string,
    note?: string,
    ip?: string | null,
  ) {
    await adminRepository.updateReportStatus(supabaseAdmin, reportId, status);
    await adminRepository.logActivity(supabaseAdmin, {
      adminId,
      action: 'report.update_status',
      targetType: 'report',
      targetId: reportId,
      metadata: { status, note },
      ipAddress: ip,
    });
  },
};
