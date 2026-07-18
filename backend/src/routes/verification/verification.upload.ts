import multer from 'multer';
import { MAX_FILE_BYTES, ALLOWED_MIME_TYPES } from '../../utils/upload';

/**
 * Multer config for verification selfie uploads.
 *
 * Why: Selfies are uploaded as multipart form-data (field name `selfies`,
 * 1–5 files). We keep them in memory and validate type/size here so the service
 * only deals with buffers. This mirrors the photo module's upload pattern.
 * No face recognition happens at upload time — files are just stored for later
 * (manual or future AI) review.
 */
const MAX_SELFIES = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_SELFIES },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
      return;
    }
    cb(null, true);
  },
});

/** Middleware: parse up to 5 selfies from the `selfies` field. */
export const uploadSelfiesMiddleware = upload.array('selfies', MAX_SELFIES);
