import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { blockService } from './block.service';
import { sendSuccess } from '../../utils/response';
import { validateBody } from '../../utils/validate';
import { createBlockSchema } from './block.types';

/**
 * Block controller.
 *
 * Why: Thin HTTP ↔ service mapping. `blockUser` validates the body with the
 * Zod `createBlockSchema` middleware, then calls the service with the
 * authenticated user id (`req.user`). Handlers are wrapped in `asyncHandler` so
 * domain `AppError`s (400 self-block, 404 not-found) reach the central error
 * handler. Reporting is NOT handled here.
 */
export const blockController = {
  blockUser: [
    validateBody(createBlockSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const record = await blockService.blockUser(req.user!.id, req.body);
      sendSuccess(res, { block: record }, 201);
    }),
  ],

  unblockUser: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    await blockService.unblockUser(req.user!.id, userId);
    sendSuccess(res, { unblocked: true });
  }),

  listBlockedUsers: asyncHandler(async (req: Request, res: Response) => {
    const blocked = await blockService.listBlockedUsers(req.user!.id);
    sendSuccess(res, { blockedUsers: blocked });
  }),
};
