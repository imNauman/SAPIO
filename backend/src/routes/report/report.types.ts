import { z } from 'zod';

/**
 * Report domain types + validation.
 *
 * Why: A report targets exactly one of {profile, message, photo} and carries a
 * category + optional description + optional evidence image URLs. The unique
 * active-report index (migration 0009) guarantees "cannot duplicate active
 * reports" — a second open/under_review report for the same target+category
 * returns a 409. Reports are immutable after submission (the service never
 * updates content) and only soft-deleted. Blocking is independent: a blocked
 * user MAY still be reported (per spec), so the report service does NOT call
 * `blockService.requireNotBlocked`.
 */

/** Allowed report statuses (server-managed; not settable by the reporter). */
export const REPORT_STATUSES = [
  'open',
  'under_review',
  'resolved',
  'dismissed',
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** Allowed report priorities (server-managed). */
export const REPORT_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type ReportPriority = (typeof REPORT_PRIORITIES)[number];

/** A report category (seeded in migration 0009). */
export interface ReportCategory {
  id: string;
  name: string;
  description: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/** A single evidence image attached to a report. */
export interface ReportEvidence {
  id: string;
  reportId: string;
  imageUrl: string;
  createdAt: string;
}

/** A persisted report (server shape). */
export interface Report {
  id: string;
  reporterUserId: string;
  reportedUserId: string;
  messageId: string | null;
  photoId: string | null;
  categoryId: string;
  categoryName: string | null;
  description: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  evidence: ReportEvidence[];
}

/** Body for POST /reports/profile. */
export const createProfileReportSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
  categoryId: z.string().uuid('categoryId must be a valid UUID'),
  description: z.string().max(2000).optional(),
  evidence: z.array(z.string().url()).max(5).optional(),
});
export type CreateProfileReportInput = z.infer<typeof createProfileReportSchema>;

/** Body for POST /reports/message. */
export const createMessageReportSchema = z.object({
  messageId: z.string().uuid('messageId must be a valid UUID'),
  categoryId: z.string().uuid('categoryId must be a valid UUID'),
  description: z.string().max(2000).optional(),
  evidence: z.array(z.string().url()).max(5).optional(),
});
export type CreateMessageReportInput = z.infer<typeof createMessageReportSchema>;

/** Body for POST /reports/photo. */
export const createPhotoReportSchema = z.object({
  photoId: z.string().uuid('photoId must be a valid UUID'),
  categoryId: z.string().uuid('categoryId must be a valid UUID'),
  description: z.string().max(2000).optional(),
  evidence: z.array(z.string().url()).max(5).optional(),
});
export type CreatePhotoReportInput = z.infer<typeof createPhotoReportSchema>;
