import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { sendSuccess } from '../../utils/response';
import { validateBody } from '../../utils/validate';
import { boostService } from './boost.service';
import { startBoostSchema } from './boost.types';

/**
 * Boost controller.
 *
 * Why: Thin HTTP ↔ service mapping. `startBoost` validates the (empty) body and
 * delegates to the service; `getStatus` returns the caller's active boost. Both
 * require authentication and (for start) the `boost` feature, enforced by the
 * route guard. Handlers are wrapped in `asyncHandler`.
 */
export const boostController = {
  startBoost: [
    validateBody(startBoostSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { boost } = await boostService.startBoost(req.user!.id);
      sendSuccess(res, { boost }, 201);
    }),
  ],

  getStatus: asyncHandler(async (req: Request, res: Response) => {
    const { boost } = await boostService.getStatus(req.user!.id);
    sendSuccess(res, { boost });
  }),
};
