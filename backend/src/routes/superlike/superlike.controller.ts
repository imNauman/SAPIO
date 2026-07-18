import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { sendSuccess } from '../../utils/response';
import { validateBody } from '../../utils/validate';
import { superLikeService } from './superlike.service';
import { createSuperLikeSchema } from './superlike.types';

/**
 * Super Like controller.
 *
 * Why: Thin HTTP ↔ service mapping. `sendSuperLike` validates the body and
 * delegates to the service (which enforces the feature gate + daily limit via
 * the route guard + feature-usage module). `getHistory` returns the caller's
 * sent super likes; `getReceived` returns incoming ones. Handlers are wrapped in
 * `asyncHandler` so domain `AppError`s (403/409/429) reach the error handler.
 */
export const superLikeController = {
  sendSuperLike: [
    validateBody(createSuperLikeSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { superLike, matched, matchId } = await superLikeService.sendSuperLike(
        req.user!.id,
        req.body.toUserId,
      );
      sendSuccess(
        res,
        { superLike, matched, matchId },
        201,
      );
    }),
  ],

  getHistory: asyncHandler(async (req: Request, res: Response) => {
    const history = await superLikeService.getHistory(req.user!.id);
    sendSuccess(res, { history });
  }),

  getReceived: asyncHandler(async (req: Request, res: Response) => {
    const received = await superLikeService.getReceived(req.user!.id);
    sendSuccess(res, { received });
  }),
};
