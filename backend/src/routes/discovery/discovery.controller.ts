import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { discoveryService } from './discovery.service';
import { recommendationService } from '../recommendation/recommendation.service';
import { sendSuccess } from '../../utils/response';
import { validateBody } from '../../utils/validate';
import { updatePreferencesSchemaRefined } from '../recommendation/recommendation.types';

/**
 * Discovery controller.
 *
 * Why: Thin HTTP ↔ service mapping. Handlers are wrapped in `asyncHandler` so
 * domain `AppError`s reach the central error handler. The caller id comes from
 * `req.user` (set by `authenticate`). Query params are parsed here and passed
 * as a typed `FeedQuery` to the service.
 *
 * The discovery preferences endpoints delegate to the Recommendation Engine
 * (`recommendationService`) — the engine is the single source of truth for
 * discovery filters, so we reuse it rather than duplicate filtering logic.
 */
export const discoveryController = {
  feed: asyncHandler(async (req: Request, res: Response) => {
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const page = await discoveryService.getFeed(req.user!.id, { cursor, limit });
    sendSuccess(res, page);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    // Refresh ignores any cursor and returns a fresh first page.
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const page = await discoveryService.getFeed(req.user!.id, { limit });
    sendSuccess(res, page);
  }),

  profile: asyncHandler(async (req: Request, res: Response) => {
    const profile = await discoveryService.getProfileById(
      req.user!.id,
      req.params.id,
    );
    sendSuccess(res, { profile });
  }),

  /** GET /discovery/preferences — current discovery filters (from the engine). */
  getPreferences: asyncHandler(async (req: Request, res: Response) => {
    const prefs = await recommendationService.getPreferences(req.user!.id);
    sendSuccess(res, { preferences: prefs });
  }),

  /** PATCH /discovery/preferences — update discovery filters (via the engine). */
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
