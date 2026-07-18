import { z } from 'zod';

/**
 * Validation schemas for the photo module.
 *
 * Why: Zod is the single source of truth for request shape. The reorder and
 * primary payloads are validated here; file validation (type/size) happens in
 * the upload middleware because it inspects the multipart file, not JSON.
 */
export const MAX_PHOTOS = 9;

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1, 'Provide at least one id'),
});

export const primarySchema = z.object({
  photoId: z.string().uuid('Invalid photo id'),
});

export type ReorderInput = z.infer<typeof reorderSchema>;
export type PrimaryInput = z.infer<typeof primarySchema>;
