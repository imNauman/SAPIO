import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { swipeService } from './swipe.service';
import { sendSuccess } from '../../utils/response';
import { validateBody } from '../../utils/validate';
import { createSwipeSchema } from './swipe.types';

/**
 * Swipe controller.
 *
 * Why: Thin HTTP ↔ service mapping. `recordSwipe` validates the body with the
 * Zod `createSwipeSchema` middleware, then calls the service with the
 * authenticated user id (`req.user`). Handlers are wrapped in `asyncHandler` so
 * domain `AppError`s (404 target, 409 duplicate, 400 self-swipe) reach the
 * central error handler. Matching is NOT triggered here.
 */
export const swipeController = {
  recordSwipe: [
    validateBody(createSwipeSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await swipeService.recordSwipe(req.user!.id, req.body);
      sendSuccess(
        res,
        {
          swipe: result.swipe,
          matched: result.matched,
          matchId: result.matchId,
          matchedUser: result.matchedUser,
        },
        201,
      );
    }),
  ],

  getHistory: asyncHandler(async (req: Request, res: Response) => {
    const history = await swipeService.getHistory(req.user!.id);
    sendSuccess(res, { history });
  }),

  deleteSwipe: asyncHandler(async (req: Request, res: Response) => {
    await swipeService.deleteSwipe(req.user!.id, req.params.id);
    sendSuccess(res, { deleted: true });
  }),
};
