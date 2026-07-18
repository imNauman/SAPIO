import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { sendSuccess } from '../../utils/response';
import { adminSubscriptionService } from './adminSubscription.service';

/**
 * Admin subscription controller.
 *
 * Why: Read-only visibility into subscriptions and boost sessions for the
 * Premium management pages. Payments are explicitly OUT OF SCOPE, so there are
 * no mutate endpoints here. Guarded by `manage_premium` at the route layer.
 */
export const adminSubscriptionController = {
  /** GET /api/admin/subscriptions */
  list: asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit ?? 50);
    const subscriptions = await adminSubscriptionService.listSubscriptions(limit);
    sendSuccess(res, { subscriptions });
  }),

  /** GET /api/admin/boost-sessions */
  listBoosts: asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit ?? 50);
    const boosts = await adminSubscriptionService.listBoostSessions(limit);
    sendSuccess(res, { boosts });
  }),
};
