import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';
import {
  VerificationPhoto,
  VerificationPhotoType,
  VerificationRequest,
  VerificationStatus,
  VerificationStatusHistoryEntry,
} from './verification.types';

/**
 * Verification repository — the query layer.
 *
 * Why: All raw Supabase access for verification lives here so the service stays
 * declarative. Tables: `verification_requests`, `verification_photos`,
 * `verification_status_history` (migration 0010). The partial unique index
 * (`verification_active_unique_idx`) makes a second active request fail with a
 * unique-violation error, which we translate to a 409. We expose helpers for
 * insert (with photos + initial history), fetch-by-user, soft cancel
 * (delete own active request), and status transition (which also appends a
 * history row). Profile updates happen in the service via `profileRepo`.
 */
const TABLE = 'verification_requests';
const PHOTOS = 'verification_photos';
const HISTORY = 'verification_status_history';

/** Detect a unique-violation (duplicate active request) error from Postgres. */
function isDuplicateKey(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /duplicate key value violates unique constraint/i.test(msg);
}

/** True when the error indicates the queried relation (table) is missing. */
function isMissingTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /relation .* does not exist/i.test(msg);
}

interface RequestRow {
  id: string;
  user_id: string;
  status: VerificationStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface PhotoRow {
  id: string;
  verification_request_id: string;
  photo_url: string;
  photo_type: VerificationPhotoType;
  created_at: string;
}

interface HistoryRow {
  id: string;
  verification_request_id: string;
  old_status: VerificationStatus | null;
  new_status: VerificationStatus;
  changed_at: string;
  changed_by: string | null;
}

function mapPhoto(row: PhotoRow): VerificationPhoto {
  return {
    id: row.id,
    verificationRequestId: row.verification_request_id,
    photoUrl: row.photo_url,
    photoType: row.photo_type,
    createdAt: row.created_at,
  };
}

function mapHistory(row: HistoryRow): VerificationStatusHistoryEntry {
  return {
    id: row.id,
    verificationRequestId: row.verification_request_id,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    changedAt: row.changed_at,
    changedBy: row.changed_by,
  };
}

function mapRequest(
  row: RequestRow,
  photos: VerificationPhoto[] = [],
  history: VerificationStatusHistoryEntry[] = [],
): VerificationRequest {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photos,
    history,
  };
}

export const verificationRepository = {
  /** Find the user's single ACTIVE (pending/under_review) request, if any. */
  async findActive(
    client: SupabaseClient,
    userId: string,
  ): Promise<VerificationRequest | null> {
    const { data, error } = await client
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'under_review'])
      .maybeSingle();
    if (error) {
      if (isMissingTable(error)) return null;
      throw new AppError(500, error.message);
    }
    if (!data) return null;
    return this.hydrate(client, data as RequestRow);
  },

  /** Find any request by id (for the owner). */
  async findById(
    client: SupabaseClient,
    id: string,
  ): Promise<VerificationRequest | null> {
    const { data, error } = await client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      if (isMissingTable(error)) return null;
      throw new AppError(500, error.message);
    }
    if (!data) return null;
    return this.hydrate(client, data as RequestRow);
  },

  /** Load photos + history for a request (used to build the full object). */
  async hydrate(
    client: SupabaseClient,
    row: RequestRow,
  ): Promise<VerificationRequest> {
    const [{ data: photos, error: pErr }, { data: history, error: hErr }] =
      await Promise.all([
        client
          .from(PHOTOS)
          .select('*')
          .eq('verification_request_id', row.id)
          .order('created_at', { ascending: true }),
        client
          .from(HISTORY)
          .select('*')
          .eq('verification_request_id', row.id)
          .order('changed_at', { ascending: true }),
      ]);
    if (pErr) throw new AppError(500, pErr.message);
    if (hErr) throw new AppError(500, hErr.message);
    return mapRequest(
      row,
      (photos as PhotoRow[]).map(mapPhoto),
      (history as HistoryRow[]).map(mapHistory),
    );
  },

  /** Create a request with its photos and an initial history row. */
  async create(
    client: SupabaseClient,
    userId: string,
    photos: Array<{ photoUrl: string; photoType: VerificationPhotoType }>,
  ): Promise<VerificationRequest> {
    const { data, error } = await client
      .from(TABLE)
      .insert({ user_id: userId, status: 'pending' })
      .select('*')
      .single();
    if (error) {
      if (isDuplicateKey(error)) {
        throw new AppError(
          409,
          'You already have an active verification request. Please wait for it to be reviewed.',
        );
      }
      throw new AppError(500, error.message);
    }
    const row = data as RequestRow;

    const { error: phErr } = await client.from(PHOTOS).insert(
      photos.map((p) => ({
        verification_request_id: row.id,
        photo_url: p.photoUrl,
        photo_type: p.photoType,
      })),
    );
    if (phErr) throw new AppError(500, phErr.message);

    const { error: hErr } = await client.from(HISTORY).insert({
      verification_request_id: row.id,
      old_status: null,
      new_status: 'pending',
      changed_by: userId,
    });
    if (hErr) throw new AppError(500, hErr.message);

    return this.hydrate(client, row);
  },

  /** Cancel (delete) the user's own active request. */
  async cancel(
    client: SupabaseClient,
    userId: string,
    id: string,
  ): Promise<void> {
    const { error, count } = await client
      .from(TABLE)
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .in('status', ['pending', 'under_review']);
    if (error) throw new AppError(500, error.message);
    if (count === 0) {
      throw new AppError(404, 'No active verification request to cancel');
    }
  },

  /**
   * Transition a request's status, recording reviewed_at/reviewed_by and
   * appending a history row. `reviewedBy` is the moderator/AI actor id (the
   * service passes it; for self-service transitions it is the user).
   */
  async transition(
    client: SupabaseClient,
    id: string,
    oldStatus: VerificationStatus,
    newStatus: VerificationStatus,
    opts: {
      reviewedBy?: string | null;
      rejectionReason?: string | null;
    } = {},
  ): Promise<VerificationRequest> {
    const patch: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'approved' || newStatus === 'rejected') {
      patch.reviewed_at = new Date().toISOString();
      patch.reviewed_by = opts.reviewedBy ?? null;
      if (newStatus === 'rejected') {
        patch.rejection_reason = opts.rejectionReason ?? null;
      }
    }
    const { data, error } = await client
      .from(TABLE)
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new AppError(500, error.message);
    if (!data) throw new AppError(404, 'Verification request not found');

    const { error: hErr } = await client.from(HISTORY).insert({
      verification_request_id: id,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: opts.reviewedBy ?? null,
    });
    if (hErr) throw new AppError(500, hErr.message);

    return this.hydrate(client, data as RequestRow);
  },
};

// Re-export so callers can reach the admin client if needed.
export { supabaseAdmin };
