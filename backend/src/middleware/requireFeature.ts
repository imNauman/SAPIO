import { Request, Response, NextFunction } from 'express';
import { forbidden } from '../utils/errors';
import { subscriptionService } from '../routes/subscription/subscription.service';

/**
 * Feature-gating middleware factory.
 *
 * Why: Centralizes premium access control so feature checks are NEVER hardcoded
 * in individual routes. Call `requireFeature('see_who_liked_you')` to guard a
 * route; the middleware resolves the caller's features dynamically from
 * `subscription_features` and rejects with 403 when the feature is absent.
 *
 * Usage:
 *   router.get('/who-liked-me', requireFeature('see_who_liked_you'), handler);
 *
 * The `authenticate` middleware MUST run before this one (it sets `req.user`).
 */
export function requireFeature(featureKey: string) {
  return async function requireFeatureMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(forbidden('Authentication required to check feature access'));
    }

    try {
      const has = await subscriptionService.hasFeature(userId, featureKey);
      if (!has) {
        return next(
          forbidden(`This feature requires a premium plan: ${featureKey}`),
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
