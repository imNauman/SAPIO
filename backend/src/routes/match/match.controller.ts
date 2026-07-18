import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { matchService } from './match.service';
import { sendSuccess } from '../../utils/response';
import { validateBody } from '../../utils/validate';
import { archiveMatchesSchema } from './match.types';

/**
 * Match controller.
 *
 * Why: Thin HTTP ↔ service mapping. Every handler reads the authenticated user
 * from `req.user` and delegates to `matchService`. Match creation itself is
 * triggered by the swipe flow (see swipe controller), so there is no
 * POST /matches here — matches are a side effect of a mutual LIKE. Handlers are
 * wrapped in `asyncHandler` so domain `AppError`s reach the central handler.
 */
export const matchController = {
  /** GET /matches — list the caller's matches (counterpart profiles). */
  list: asyncHandler(async (req: Request, res: Response) => {
    const matches = await matchService.listMatches(req.user!.id);
    sendSuccess(res, { matches });
  }),

  /** GET /matches/:id — a single match owned by the caller. */
  getOne: asyncHandler(async (req: Request, res: Response) => {
    const match = await matchService.getMatch(req.user!.id, req.params.id);
    sendSuccess(res, { match });
  }),

  /** DELETE /matches/:id — remove a match owned by the caller. */
  remove: asyncHandler(async (req: Request, res: Response) => {
    await matchService.deleteMatch(req.user!.id, req.params.id);
    sendSuccess(res, { deleted: true });
  }),

  /** PATCH /matches/archive — bulk-archive matches owned by the caller. */
  archive: [
    validateBody(archiveMatchesSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const count = await matchService.archiveMatches(
        req.user!.id,
        req.body.ids,
      );
      sendSuccess(res, { archived: count });
    }),
  ],
};
