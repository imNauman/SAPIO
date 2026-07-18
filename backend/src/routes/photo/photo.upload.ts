import multer from 'multer';
import { Request } from 'express';
import { badRequest } from '../../utils/errors';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_BYTES,
} from '../../utils/upload';

/**
 * Multer middleware for photo uploads.
 *
 * Why: We validate the uploaded file (type + size) at the boundary before it
 * reaches the controller. Files are held in memory (not disk) because we stream
 * them straight to Supabase Storage. Rejecting here returns a clean 400.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter: (_req: Request, file, cb) => {
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      cb(
        badRequest(
          'Unsupported file type. Allowed: jpg, jpeg, png, webp',
        ),
      );
      return;
    }
    cb(null, true);
  },
});

/** Single-file field named `photo`. */
export const uploadPhotoMiddleware = upload.single('photo');
