import { apiClient } from '../apiClient';

/**
 * Report API module.
 *
 * Why: Wraps calls to the SAPIO backend `/api/reports` endpoints. The mobile app
 * sends the Supabase JWT via the `apiClient` interceptor. These functions are
 * the only place that knows about report HTTP details — the report store calls
 * these, keeping the UI decoupled from transport. Reporting targets a profile,
 * a message, or a photo; each carries a category id, optional description, and
 * optional evidence image URLs. The backend enforces: no self-reports, no
 * duplicate active reports (409), immutability, and soft-delete only. AI
 * moderation, automatic bans, push notifications, and the admin dashboard are
 * explicitly out of scope.
 */

/** Allowed report statuses (server-managed). */
export type ReportStatus =
  | 'open'
  | 'under_review'
  | 'resolved'
  | 'dismissed';

/** Allowed report priorities (server-managed). */
export type ReportPriority = 'low' | 'normal' | 'high' | 'urgent';

/** A report category (seeded on the backend). */
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

/** A persisted report (mirrors the backend `Report`). */
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

/** Shared report submission payload (minus the target id). */
export interface ReportPayload {
  categoryId: string;
  description?: string;
  evidence?: string[];
}

export const reportApi = {
  /** GET /reports/categories — categories for the picker. */
  async listCategories(): Promise<ReportCategory[]> {
    const { data } = await apiClient.get<{ data: { categories: ReportCategory[] } }>(
      '/reports/categories',
    );
    return data.data.categories;
  },

  /** POST /reports/profile */
  async reportProfile(
    userId: string,
    payload: ReportPayload,
  ): Promise<Report> {
    const { data } = await apiClient.post<{ data: { report: Report } }>(
      '/reports/profile',
      { userId, ...payload },
    );
    return data.data.report;
  },

  /** POST /reports/message */
  async reportMessage(
    messageId: string,
    payload: ReportPayload,
  ): Promise<Report> {
    const { data } = await apiClient.post<{ data: { report: Report } }>(
      '/reports/message',
      { messageId, ...payload },
    );
    return data.data.report;
  },

  /** POST /reports/photo */
  async reportPhoto(
    photoId: string,
    payload: ReportPayload,
  ): Promise<Report> {
    const { data } = await apiClient.post<{ data: { report: Report } }>(
      '/reports/photo',
      { photoId, ...payload },
    );
    return data.data.report;
  },

  /** GET /reports/my — the caller's own reports. */
  async listMine(): Promise<Report[]> {
    const { data } = await apiClient.get<{ data: { reports: Report[] } }>(
      '/reports/my',
    );
    return data.data.reports;
  },

  /** DELETE /reports/:id — soft-delete one of the caller's reports. */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/reports/${id}`);
  },
};
