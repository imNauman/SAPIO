import { supabaseAdmin } from '../../config/supabase';
import { badRequest, notFound } from '../../utils/errors';
import { messageRepository } from '../chat/message.repository';
import { photoRepository } from '../photo/photo.repository';
import { reportRepository } from './report.repository';
import { emit } from '../../events/eventBus';
import { NOTIFICATION_EVENTS } from '../../events/notificationEvents';
import {
  CreateProfileReportInput,
  CreateMessageReportInput,
  CreatePhotoReportInput,
  Report,
  ReportCategory,
  ReportPriority,
} from './report.types';

/**
 * Report service.
 *
 * Why: Encapsulates the reporting business rules. A report targets exactly one
 * of {profile, message, photo}; for message/photo targets we resolve the
 * owning user so `reported_user_id` is always populated (the moderation queue
 * groups by user). Rules enforced here (single source of truth):
 *  - cannot report yourself (profile target only; message/photo targets are
 *    validated against the reporter too),
 *  - cannot duplicate an ACTIVE report (repository throws 409 on the unique
 *    index),
 *  - reports are immutable after submission (we never update content),
 *  - soft-delete only (repository sets deleted_at),
 *  - a BLOCKED user may still be reported (we deliberately do NOT call
 *    blockService.requireNotBlocked).
 * Priority is derived from the category severity (critical→urgent, high→high,
 * medium→normal, low→low) so the future moderation dashboard can triage.
 */
export const reportService = {
  /** Categories for the report picker. */
  async listCategories(): Promise<ReportCategory[]> {
    return reportRepository.listCategories(supabaseAdmin);
  },

  /** Report a profile directly. */
  async reportProfile(
    reporterUserId: string,
    input: CreateProfileReportInput,
  ): Promise<Report> {
    if (input.userId === reporterUserId) {
      throw badRequest('You cannot report yourself');
    }
    const category = await this.resolveCategory(input.categoryId);
    return reportRepository.createReport(supabaseAdmin, {
      reporterUserId,
      reportedUserId: input.userId,
      categoryId: input.categoryId,
      description: input.description,
      priority: this.priorityFromSeverity(category.severity),
      evidence: input.evidence,
    });
  },

  /** Report a message: resolve the message's sender as the reported user. */
  async reportMessage(
    reporterUserId: string,
    input: CreateMessageReportInput,
  ): Promise<Report> {
    const message = await messageRepository.findById(supabaseAdmin, input.messageId);
    if (!message) throw notFound('Message not found');
    // The reporter must not be the message's own sender (can't report yourself).
    if (message.senderId === reporterUserId) {
      throw badRequest('You cannot report your own message');
    }
    const category = await this.resolveCategory(input.categoryId);
    return reportRepository.createReport(supabaseAdmin, {
      reporterUserId,
      reportedUserId: message.senderId,
      categoryId: input.categoryId,
      description: input.description,
      messageId: input.messageId,
      priority: this.priorityFromSeverity(category.severity),
      evidence: input.evidence,
    });
  },

  /** Report a photo: resolve the photo's owner as the reported user. */
  async reportPhoto(
    reporterUserId: string,
    input: CreatePhotoReportInput,
  ): Promise<Report> {
    const photo = await photoRepository.findById(supabaseAdmin, input.photoId);
    if (!photo) throw notFound('Photo not found');
    if (photo.userId === reporterUserId) {
      throw badRequest('You cannot report your own photo');
    }
    const category = await this.resolveCategory(input.categoryId);
    return reportRepository.createReport(supabaseAdmin, {
      reporterUserId,
      reportedUserId: photo.userId,
      categoryId: input.categoryId,
      description: input.description,
      photoId: input.photoId,
      priority: this.priorityFromSeverity(category.severity),
      evidence: input.evidence,
    });
  },

  /** List the caller's own reports. */
  async listMyReports(reporterUserId: string): Promise<Report[]> {
    return reportRepository.listByReporter(supabaseAdmin, reporterUserId);
  },

  /** Soft-delete one of the caller's own reports. */
  async deleteReport(
    reporterUserId: string,
    reportId: string,
  ): Promise<void> {
    await reportRepository.softDelete(supabaseAdmin, reportId, reporterUserId);
  },

  /**
   * Resolve a report (moderation action). Emits REPORT_RESOLVED so the reporter
   * is notified. No admin UI is built in this milestone — this is the service
   * seam a future moderation dashboard calls.
   */
  async resolveReport(reportId: string): Promise<Report> {
    const report = await reportRepository.resolve(supabaseAdmin, reportId);
    emit(NOTIFICATION_EVENTS.REPORT_RESOLVED, {
      userId: report.reporterUserId,
      reportId: report.id,
    });
    return report;
  },

  /** Resolve a category id and derive the default priority from severity. */
  async resolveCategory(categoryId: string): Promise<ReportCategory> {
    const category = await reportRepository.getCategory(supabaseAdmin, categoryId);
    if (!category) throw notFound('Report category not found');
    return category;
  },

  /** Map a category severity to a report priority for triage. */
  priorityFromSeverity(
    severity: ReportCategory['severity'],
  ): ReportPriority {
    switch (severity) {
      case 'critical':
        return 'urgent';
      case 'high':
        return 'high';
      case 'medium':
        return 'normal';
      case 'low':
      default:
        return 'low';
    }
  },
};

// Re-export so callers can reach the repository if needed.
export { reportRepository };
