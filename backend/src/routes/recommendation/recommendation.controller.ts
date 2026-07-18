import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { recommendationService } from './recommendation.service';
import { sendSuccess } from '../../utils/response';
import { validateBody } from '../../utils/validate';
import { updatePreferencesSchemaRefined } from './recommendation.types';

/**
 * Recommendation controller.
 *
 * Why: Thin HTTP ↔ service mapping. Handlers are wrapped in `asyncHandler` so
 * domain `AppError`s reach the central error handler. The caller id comes from
 * `req.user` (set by `authenticate`). The frontend never decides ordering —
 * it only consumes what this controller returns. The strategy is injected by
 * the service, so swapping to an AI model needs no controller change.
 */
export const recommendationController = {
  /** GET /recommendations — ranked, paginated feed. */
  list: asyncHandler(async (req: Request, res: Response) => {
    const cursor =
      typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limit =
      typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const page = await recommendationService.getRecommendations(req.user!.id, {
      cursor,
      limit,
    });
    sendSuccess(res, page);
  }),

  /** GET /recommendations/refresh — fresh first page. */
  refresh: asyncHandler(async (req: Request, res: Response) => {
    const page = await recommendationService.refreshRecommendations(req.user!.id);
    sendSuccess(res, page);
  }),

  /** GET /recommendations/preferences — current preferences. */
  getPreferences: asyncHandler(async (req: Request, res: Response) => {
    const prefs = await recommendationService.getPreferences(req.user!.id);
    sendSuccess(res, { preferences: prefs });
  }),

  /** PUT /recommendations/preferences — upsert preferences. */
  updatePreferences: [
    validateBody(updatePreferencesSchemaRefined),
    asyncHandler(async (req: Request, res: Response) => {
      const prefs = await recommendationService.updatePreferences(
        req.user!.id,
        req.body,
      );
      sendSuccess(res, { preferences: prefs });
    }),
  ],
};
