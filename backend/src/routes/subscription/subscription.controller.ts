import { asyncHandler } from '../../types';
import { sendSuccess } from '../../utils/response';
import { subscriptionService } from './subscription.service';

/**
 * Subscription controller — HTTP handlers for the Premium platform.
 *
 * Why: Thin handlers that delegate to `subscriptionService` and return the
 * standard success envelope. All three endpoints are read-only in this
 * milestone (purchases/webhooks are a future step).
 */
export const subscriptionController = {
  /** GET /subscription/plans — the catalog of active plans. */
  listPlans: asyncHandler(async (_req, res) => {
    const plans = await subscriptionService.listPlans();
    sendSuccess(res, { plans });
  }),

  /** GET /subscription/plans/compare — plans enriched with their features. */
  listPlansWithFeatures: asyncHandler(async (_req, res) => {
    const plans = await subscriptionService.listPlansWithFeatures();
    sendSuccess(res, { plans });
  }),

  /** GET /subscription/current — the caller's active subscription + features. */
  getCurrent: asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const subscription = await subscriptionService.getCurrentSubscription(userId);
    sendSuccess(res, { subscription });
  }),

  /** GET /subscription/features — the caller's dynamically resolved features. */
  getFeatures: asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const features = await subscriptionService.getFeatures(userId);
    sendSuccess(res, { features });
  }),
};
