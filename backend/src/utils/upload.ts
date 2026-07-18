/**
 * Shared upload constants for multipart file validation.
 *
 * Why: The photo, chat-image, and verification upload middlewares all enforce
 * the same file-type and size limits. Centralizing them here means a policy
 * change (e.g. raising the max size) happens in exactly one place instead of
 * drifting across three files.
 */
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
