import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { verificationService } from './verification.service';
import { sendSuccess, sendMessage } from '../../utils/response';
import { uploadSelfiesMiddleware } from './verification.upload';

/**
 * Verification controller.
 *
 * Why: Thin HTTP ↔ service mapping. `submit` accepts multipart selfies via the
 * multer middleware (`uploadSelfiesMiddleware`), then calls the service with the
 * authenticated user id (`req.user`). Handlers are wrapped in `asyncHandler` so
 * domain `AppError`s (400 bad file, 409 duplicate active, 404 not-found) reach
 * the central error handler. The moderation/AI review surface is a separate,
 * future concern and is NOT handled here — only the user's own submit / status /
 * cancel flow is exposed. Face recognition, government-ID, premium, and push
 * notifications are explicitly out of scope.
 */
export const verificationController = {
  /** POST /verification/submit — upload selfies and create a request. */
  submit: [
    uploadSelfiesMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const files = (req.files as Express.Multer.File[]) ?? [];
      const request = await verificationService.submit(req.user!.id, files);
      sendSuccess(res, { request }, 201);
    }),
  ],

  /** GET /verification/status — the caller's current active request (or null). */
  status: asyncHandler(async (req: Request, res: Response) => {
    const request = await verificationService.getStatus(req.user!.id);
    sendSuccess(res, { request });
  }),

  /** DELETE /verification/request — cancel the caller's own active request. */
  cancel: asyncHandler(async (req: Request, res: Response) => {
    await verificationService.cancel(req.user!.id);
    sendMessage(res, 'Verification request cancelled');
  }),
};
