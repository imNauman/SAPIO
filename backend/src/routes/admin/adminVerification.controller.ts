import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { sendSuccess } from '../../utils/response';
import { validateBody } from '../../utils/validate';
import { clientIp } from '../../utils/request';
import { adminVerificationService } from './adminVerification.service';
import { verificationDecisionSchema } from './admin.types';

/**
 * Admin verification controller.
 *
 * Why: Manual human decision on verification requests. Reuses the existing
 * `verificationRepository.transition` (which flips `profile.is_verified` and
 * emits notifications) so the admin path is identical to the future AI path.
 * Guarded by `manage_verification` at the route layer.
 */
export const adminVerificationController = {
  /** GET /api/admin/verification-queue */
  list: asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit ?? 50);
    const queue = await adminVerificationService.listQueue(limit);
    sendSuccess(res, { queue });
  }),

  /** PATCH /api/admin/verification-queue/:id */
  decide: [
    validateBody(verificationDecisionSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const updated = await adminVerificationService.decide(
        req.admin!.id,
        req.params.id,
        req.body.status,
        { rejectionReason: req.body.rejectionReason, ip: clientIp(req) },
      );
      sendSuccess(res, { request: updated });
    }),
  ],
};
