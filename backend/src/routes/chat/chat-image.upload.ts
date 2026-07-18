import multer from 'multer';
import { Request } from 'express';
import { badRequest } from '../../utils/errors';
import { MAX_FILE_BYTES, ALLOWED_MIME_TYPES } from '../../utils/upload';

/**
 * Multer middleware for chat image uploads.
 *
 * Why: Reuses the same boundary-validation pattern as the photo module. Files
 * are held in memory and streamed to Supabase Storage (`chat-images` bucket).
 * We accept JPEG / PNG / WEBP up to 10 MB (per spec). Rejecting here returns a
 * clean 400 before the controller runs.
 */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter: (_req: Request, file, cb) => {
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      cb(badRequest('Unsupported image type. Allowed: jpg, png, webp'));
      return;
    }
    cb(null, true);
  },
});

/** Single-file field named `image`. */
export const uploadChatImageMiddleware = upload.single('image');

/** Re-export so the controller/service can reference the same constants. */
export { ALLOWED_MIME_TYPES, MAX_FILE_BYTES };
