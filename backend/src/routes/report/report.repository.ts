import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';
import {
  Report,
  ReportCategory,
  ReportEvidence,
  ReportStatus,
  ReportPriority,
} from './report.types';

/**
 * Report repository — the query layer.
 *
 * Why: All raw Supabase access for reporting lives here so the service stays
 * declarative. The tables are `reports`, `report_categories`, `report_evidence`
 * (migration 0009). The unique active-report index makes duplicate active
 * reports fail with a unique-violation error, which we translate to a 409. We
 * expose helpers for insert (with evidence), soft-delete, list-by-reporter, and
 * category lookup. No visibility logic lives here — reporting never hides the
 * reported user (that is the moderation dashboard's job later).
 */
const TABLE = 'reports';
const CATEGORIES = 'report_categories';
const EVIDENCE = 'report_evidence';

/** Detect a unique-violation (duplicate active report) error from Postgres. */
function isDuplicateKey(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /duplicate key value violates unique constraint/i.test(msg);
}

/** True when the error indicates the queried relation (table) is missing. */
function isMissingTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /relation .* does not exist/i.test(msg);
}

interface ReportRow {
  id: string;
  reporter_user_id: string;
  reported_user_id: string;
  message_id: string | null;
  photo_id: string | null;
  category_id: string;
  description: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  category_name?: string | null;
}

interface EvidenceRow {
  id: string;
  report_id: string;
  image_url: string;
  created_at: string;
}

function mapEvidence(row: EvidenceRow): ReportEvidence {
  return {
    id: row.id,
    reportId: row.report_id,
    imageUrl: row.image_url,
    createdAt: row.created_at,
  };
}

function mapReport(row: ReportRow, evidence: ReportEvidence[] = []): Report {
  return {
    id: row.id,
    reporterUserId: row.reporter_user_id,
    reportedUserId: row.reported_user_id,
    messageId: row.message_id,
    photoId: row.photo_id,
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    evidence,
  };
}

export const reportRepository = {
  /** List all categories (for the report picker). */
  async listCategories(client: SupabaseClient): Promise<ReportCategory[]> {
    const { data, error } = await client
      .from(CATEGORIES)
      .select('id, name, description, severity')
      .order('severity', { ascending: false });
    if (error) throw new AppError(500, error.message);
    return (data as ReportCategory[]).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      severity: c.severity,
    }));
  },

  /** Resolve a category id to its severity (drives default priority). */
  async getCategory(
    client: SupabaseClient,
    categoryId: string,
  ): Promise<ReportCategory | null> {
    const { data, error } = await client
      .from(CATEGORIES)
      .select('id, name, description, severity')
      .eq('id', categoryId)
      .maybeSingle();
    if (error) {
      if (isMissingTable(error)) return null;
      throw new AppError(500, error.message);
    }
    return (data as ReportCategory) ?? null;
  },

  /**
   * Create a report. `target` selects which column to populate. Evidence URLs
   * are inserted in the same transaction. On a duplicate active report we throw
   * 409 (the unique index enforces it). Returns the created report with evidence.
   */
  async createReport(
    client: SupabaseClient,
    input: {
      reporterUserId: string;
      reportedUserId: string;
      categoryId: string;
      description?: string;
      messageId?: string;
      photoId?: string;
      priority?: ReportPriority;
      evidence?: string[];
    },
  ): Promise<Report> {
    const { data, error } = await client
      .from(TABLE)
      .insert({
        reporter_user_id: input.reporterUserId,
        reported_user_id: input.reportedUserId,
        category_id: input.categoryId,
        description: input.description ?? null,
        message_id: input.messageId ?? null,
        photo_id: input.photoId ?? null,
        priority: input.priority ?? 'normal',
      })
      .select(
        'id, reporter_user_id, reported_user_id, message_id, photo_id, ' +
          'category_id, description, status, priority, created_at, updated_at, deleted_at',
      )
      .single();

    if (error) {
      if (isDuplicateKey(error)) {
        throw new AppError(
          409,
          'You have already submitted an active report for this. It is being reviewed.',
        );
      }
      throw new AppError(500, error.message);
    }

    const row = data as unknown as ReportRow;

    // Insert evidence (if any) and fetch it back.
    let evidence: ReportEvidence[] = [];
    if (input.evidence && input.evidence.length > 0) {
      const inserts = input.evidence.map((imageUrl) => ({
        report_id: row.id,
        image_url: imageUrl,
      }));
      const { data: evData, error: evErr } = await client
        .from(EVIDENCE)
        .insert(inserts)
        .select('id, report_id, image_url, created_at');
      if (evErr) throw new AppError(500, evErr.message);
      evidence = (evData as EvidenceRow[]).map(mapEvidence);
    }

    // Enrich with the category name for the response.
    const category = await this.getCategory(client, row.category_id);
    return mapReport({ ...row, category_name: category?.name ?? null }, evidence);
  },

  /** Soft-delete a report owned by the reporter (sets deleted_at). */
  async softDelete(
    client: SupabaseClient,
    reportId: string,
    reporterUserId: string,
  ): Promise<void> {
    const { error, count } = await client
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', reportId)
      .eq('reporter_user_id', reporterUserId)
      .is('deleted_at', null);
    if (error) throw new AppError(500, error.message);
    if (count === 0) {
      throw new AppError(404, 'Report not found or already removed');
    }
  },

  /** List the reporter's own (non-deleted) reports, newest first. */
  async listByReporter(
    client: SupabaseClient,
    reporterUserId: string,
  ): Promise<Report[]> {
    const { data, error } = await client
      .from(TABLE)
      .select(
        'id, reporter_user_id, reported_user_id, message_id, photo_id, ' +
          'category_id, description, status, priority, created_at, updated_at, deleted_at, ' +
          'report_categories ( name ), ' +
          'report_evidence ( id, report_id, image_url, created_at )',
      )
      .eq('reporter_user_id', reporterUserId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) {
      if (isMissingTable(error)) return [];
      throw new AppError(500, error.message);
    }
    return (data as unknown as Array<ReportRow & {
      report_categories: { name: string } | null;
      report_evidence: EvidenceRow[] | null;
    }>).map((row) =>
      mapReport(
        { ...row, category_name: row.report_categories?.name ?? null },
        (row.report_evidence ?? []).map(mapEvidence),
      ),
    );
  },

  /**
   * Resolve a report (set status='resolved'). Used by moderation (manual or a
   * future automated job). Returns the updated report so the caller can read
   * `reporter_user_id` to notify the reporter.
   */
  async resolve(
    client: SupabaseClient,
    reportId: string,
  ): Promise<Report> {
    const { data, error } = await client
      .from(TABLE)
      .update({ status: 'resolved' as ReportStatus })
      .eq('id', reportId)
      .select(
        'id, reporter_user_id, reported_user_id, message_id, photo_id, ' +
          'category_id, description, status, priority, created_at, updated_at, deleted_at',
      )
      .single();
    if (error) throw new AppError(500, error.message);
    if (!data) throw new AppError(404, 'Report not found');
    const row = data as unknown as ReportRow;
    const category = await this.getCategory(client, row.category_id);
    return mapReport({ ...row, category_name: category?.name ?? null });
  },
};

// Re-export so callers can reach the admin client if needed.
export { supabaseAdmin };
