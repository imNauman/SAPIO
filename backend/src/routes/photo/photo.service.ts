import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';
import { photoRepository, BUCKET, FOLDER_PREFIX } from './photo.repository';
import { ProfilePhoto } from './photo.types';
import { MAX_PHOTOS } from './photo.validation';

/**
 * Photo service.
 *
 * Why: Encapsulates business rules (9-photo limit, single primary, ownership,
 * storage upload/delete) on top of the repository. Controllers call this and
 * never touch Supabase directly. The admin client is used for storage so the
 * server can write to the user's folder regardless of RLS.
 */
export const photoService = {
  /** List the authenticated user's own photos. */
  async listMine(userId: string): Promise<ProfilePhoto[]> {
    return photoRepository.listByUser(supabaseAdmin, userId);
  },

  /** List any user's public photos (read-only, for discovery later). */
  async listByUser(userId: string): Promise<ProfilePhoto[]> {
    return photoRepository.listByUser(supabaseAdmin, userId);
  },

  /** Upload a new photo: enforce limit, store object, insert row. */
  async upload(
    userId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<ProfilePhoto> {
    const count = await photoRepository.countByUser(supabaseAdmin, userId);
    if (count >= MAX_PHOTOS) {
      throw new AppError(409, `You can upload at most ${MAX_PHOTOS} photos`);
    }

    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const storagePath = `${FOLDER_PREFIX}/${userId}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
        cacheControl: '3600',
      });
    if (upErr) {
      throw new AppError(500, `Storage upload failed: ${upErr.message}`);
    }

    const photoUrl = photoRepository.publicUrl(storagePath);
    const isPrimary = count === 0; // first photo becomes primary
    const photo = await photoRepository.create(supabaseAdmin, {
      userId,
      photoUrl,
      storagePath,
      displayOrder: count,
      isPrimary,
    });
    return photo;
  },

  /** Reorder photos: validate ownership of every id, then persist order. */
  async reorder(
    userId: string,
    orderedIds: string[],
  ): Promise<ProfilePhoto[]> {
    const photos = await photoRepository.listByUser(supabaseAdmin, userId);
    const ownedIds = new Set(photos.map((p) => p.id));
    if (!orderedIds.every((id) => ownedIds.has(id))) {
      throw new AppError(403, 'You can only reorder your own photos');
    }
    if (orderedIds.length !== photos.length) {
      throw new AppError(400, 'orderedIds must include all of your photos');
    }
    const updates = orderedIds.map((id, index) => ({
      id,
      displayOrder: index,
    }));
    await photoRepository.updateOrders(supabaseAdmin, updates);
    return photoRepository.listByUser(supabaseAdmin, userId);
  },

  /** Promote a photo to primary (clears the previous primary first). */
  async setPrimary(userId: string, photoId: string): Promise<ProfilePhoto[]> {
    const photo = await photoRepository.findById(supabaseAdmin, photoId);
    if (!photo) throw new AppError(404, 'Photo not found');
    if (photo.userId !== userId) {
      throw new AppError(403, 'You can only manage your own photos');
    }
    await photoRepository.clearPrimary(supabaseAdmin, userId);
    await photoRepository.setPrimary(supabaseAdmin, photoId);
    return photoRepository.listByUser(supabaseAdmin, userId);
  },

  /** Delete a photo: remove DB row + storage object. */
  async remove(userId: string, id: string): Promise<void> {
    const photo = await photoRepository.findById(supabaseAdmin, id);
    if (!photo) throw new AppError(404, 'Photo not found');
    if (photo.userId !== userId) {
      throw new AppError(403, 'You can only delete your own photos');
    }
    await photoRepository.remove(supabaseAdmin, id);
    await photoRepository.deleteStorageObject(photo.storagePath);

    // If we deleted the primary, promote the first remaining photo.
    if (photo.isPrimary) {
      const remaining = await photoRepository.listByUser(supabaseAdmin, userId);
      if (remaining.length > 0) {
        await photoRepository.clearPrimary(supabaseAdmin, userId);
        await photoRepository.setPrimary(supabaseAdmin, remaining[0].id);
      }
    }
  },
};
