import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { locationService } from './location.service';
import { sendSuccess } from '../../utils/response';
import { validateBody } from '../../utils/validate';
import { updateLocationSchema } from './location.types';

/**
 * Location controller.
 *
 * Why: Thin HTTP ↔ service mapping. The single endpoint (`PATCH /location`)
 * validates the body, then persists coordinates via `locationService`. The
 * authenticated user id comes from `req.user` (set by `authenticate`).
 */
export const locationController = {
  /** PATCH /location — update the caller's current coordinates. */
  update: [
    validateBody(updateLocationSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await locationService.updateLocation(
        req.user!.id,
        req.body,
      );
      sendSuccess(res, { location: result });
    }),
  ],
};
