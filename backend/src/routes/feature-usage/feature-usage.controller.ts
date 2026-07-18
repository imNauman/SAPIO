import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { sendSuccess } from '../../utils/response';
import { featureUsageService } from './feature-usage.service';
import { LIMITED_FEATURE_KEYS, LimitedFeatureKey } from './feature-usage.types';

/**
 * Feature-usage controller.
 *
 * Why: Thin HTTP layer. Reads the authenticated user, delegates to the service,
 * and returns the usage state. The `featureKey` is taken from the URL param
 * (validated against the known limited keys) rather than the body for GET.
 */
export const featureUsageController = {
  /** GET /feature-usage/:featureKey — current usage + remaining count. */
  getUsage: asyncHandler(async (req: Request, res: Response) => {
    const featureKey = req.params.featureKey as LimitedFeatureKey;
    if (!LIMITED_FEATURE_KEYS.includes(featureKey)) {
      return sendSuccess(res, {
        usage: {
          id: '',
          userId: req.user!.id,
          featureKey,
          dailyLimit: 0,
          usedToday: 0,
          lastReset: new Date().toISOString(),
          remaining: 0,
        },
      });
    }
    const usage = await featureUsageService.getUsage(req.user!.id, featureKey);
    sendSuccess(res, { usage });
  }),
};
