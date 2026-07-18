import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';

/**
 * Chat image storage repository.
 *
 * Why: Isolates all Supabase Storage operations for chat media behind a typed
 * interface, mirroring `photo.repository`. Uses the `chat-images` bucket
 * (created in migration 0017). Thumbnails are stored under a `thumbnails/`
 * subfolder; without a server-side image library we currently upload the same
 * bytes as a placeholder thumbnail — the transform step is the single seam
 * where a real resize (sharp/jimp) would slot in later without changing
 * callers. The admin client writes to the user's folder regardless of RLS.
 */
const BUCKET = 'chat-images';
const FOLDER_PREFIX = 'chat-images'; // chat-images/{userId}/...

interface UploadResult {
  imageUrl: string;
  thumbnailUrl: string;
  storagePath: string;
}

export const chatImageRepository = {
  /** Upload an image (and a placeholder thumbnail) to the user's folder. */
  async upload(
    client: SupabaseClient,
    userId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<UploadResult> {
    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const base = `${Date.now()}`;
    const storagePath = `${FOLDER_PREFIX}/${userId}/${base}.${ext}`;
    const thumbPath = `${FOLDER_PREFIX}/${userId}/thumbnails/${base}.${ext}`;

    const { error: upErr } = await client.storage
      .from(BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
        cacheControl: '3600',
      });
    if (upErr) {
      throw new AppError(500, `Storage upload failed: ${upErr.message}`);
    }

    // Placeholder thumbnail: same bytes, separate object. A real resize would
    // replace this upload with a downscaled buffer.
    const { error: thumbErr } = await client.storage
      .from(BUCKET)
      .upload(thumbPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
        cacheControl: '3600',
      });
    if (thumbErr) {
      // Thumbnail is best-effort; the full image is what matters.
      // eslint-disable-next-line no-console
      console.warn('[chat-image] thumbnail upload failed:', thumbErr.message);
    }

    return {
      imageUrl: this.publicUrl(storagePath),
      thumbnailUrl: this.publicUrl(thumbPath),
      storagePath,
    };
  },

  /** Generate a public URL for a stored object. */
  publicUrl(storagePath: string): string {
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
    return data.publicUrl;
  },

  /** Remove a stored image (best-effort). */
  async remove(storagePath: string): Promise<void> {
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove([storagePath]);
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[chat-image] storage remove failed:', error.message);
    }
  },
};

export { BUCKET, FOLDER_PREFIX };
