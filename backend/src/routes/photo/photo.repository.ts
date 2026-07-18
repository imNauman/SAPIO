import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';
import { ProfilePhoto } from './photo.types';

/**
 * Photo repository.
 *
 * Why: Isolates all raw Supabase queries and Storage operations behind a typed
 * interface so the service layer never writes query/storage code. Uses the
 * admin client so server-side operations are not blocked by RLS, while RLS
 * still protects direct client access. DB uses snake_case; the app uses
 * camelCase — we map at the boundary in `mapRow`.
 */
const TABLE = 'profile_photos';
export const BUCKET = 'profile-photos';
export const FOLDER_PREFIX = 'profiles'; // profiles/{userId}/...

interface PhotoRow {
  id: string;
  user_id: string;
  photo_url: string;
  storage_path: string;
  display_order: number;
  is_primary: boolean;
  uploaded_at: string | null;
  updated_at: string | null;
}

function mapRow(row: PhotoRow): ProfilePhoto {
  return {
    id: row.id,
    userId: row.user_id,
    photoUrl: row.photo_url,
    storagePath: row.storage_path,
    displayOrder: row.display_order,
    isPrimary: row.is_primary,
    uploadedAt: row.uploaded_at,
    updatedAt: row.updated_at,
  };
}

export const photoRepository = {
  /** List a user's photos ordered by display_order. */
  async listByUser(
    client: SupabaseClient,
    userId: string,
  ): Promise<ProfilePhoto[]> {
    const { data, error } = await client
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true });
    if (error) throw new AppError(500, error.message);
    return (data as PhotoRow[]).map(mapRow);
  },

  /** Count a user's photos (used for the 9-photo limit check). */
  async countByUser(
    client: SupabaseClient,
    userId: string,
  ): Promise<number> {
    const { count, error } = await client
      .from(TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) throw new AppError(500, error.message);
    return count ?? 0;
  },

  /** Insert a new photo row. */
  async create(
    client: SupabaseClient,
    input: {
      userId: string;
      photoUrl: string;
      storagePath: string;
      displayOrder: number;
      isPrimary: boolean;
    },
  ): Promise<ProfilePhoto> {
    const { data, error } = await client
      .from(TABLE)
      .insert({
        user_id: input.userId,
        photo_url: input.photoUrl,
        storage_path: input.storagePath,
        display_order: input.displayOrder,
        is_primary: input.isPrimary,
      })
      .select('*')
      .single();
    if (error) {
      // 23505 = unique violation (e.g. two primaries) or limit trigger.
      if (error.code === '23505') {
        throw new AppError(409, 'Photo limit or primary constraint violated');
      }
      throw new AppError(500, error.message);
    }
    return mapRow(data as PhotoRow);
  },

  /** Fetch a single photo by id. */
  async findById(
    client: SupabaseClient,
    id: string,
  ): Promise<ProfilePhoto | null> {
    const { data, error } = await client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    return data ? mapRow(data as PhotoRow) : null;
  },

  /** Delete a photo row by id. */
  async remove(
    client: SupabaseClient,
    id: string,
  ): Promise<ProfilePhoto | null> {
    const existing = await this.findById(client, id);
    if (!existing) return null;
    const { error } = await client.from(TABLE).delete().eq('id', id);
    if (error) throw new AppError(500, error.message);
    return existing;
  },

  /** Bulk update display_order for many photos in one call. */
  async updateOrders(
    client: SupabaseClient,
    updates: { id: string; displayOrder: number }[],
  ): Promise<void> {
    // Supabase doesn't support multi-row update natively; do it in a transaction.
    const { error } = await client.rpc('reorder_photos', {
      updates: updates.map((u) => ({ id: u.id, display_order: u.displayOrder })),
    });
    if (error) throw new AppError(500, error.message);
  },

  /** Set is_primary=false for all of a user's photos (before promoting one). */
  async clearPrimary(
    client: SupabaseClient,
    userId: string,
  ): Promise<void> {
    const { error } = await client
      .from(TABLE)
      .update({ is_primary: false })
      .eq('user_id', userId);
    if (error) throw new AppError(500, error.message);
  },

  /** Set a single photo as primary. */
  async setPrimary(
    client: SupabaseClient,
    id: string,
  ): Promise<ProfilePhoto> {
    const { data, error } = await client
      .from(TABLE)
      .update({ is_primary: true })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new AppError(500, error.message);
    return mapRow(data as PhotoRow);
  },

  /** Remove a storage object (best-effort; ignore not-found). */
  async deleteStorageObject(
    storagePath: string,
  ): Promise<void> {
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove([storagePath]);
    if (error) {
      // Don't fail the whole delete if the object is already gone.
      // eslint-disable-next-line no-console
      console.warn('[photo] storage remove failed:', error.message);
    }
  },

  /** Generate a public URL for a stored object. */
  publicUrl(storagePath: string): string {
    const { data } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);
    return data.publicUrl;
  },
};
