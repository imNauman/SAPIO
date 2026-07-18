import { Router } from 'express';
import { recommendationController } from './recommendation.controller';
import { authenticate } from '../../middleware/authenticate';

/**
 * Recommendation routes — mounted at `/api/recommendations`.
 *
 * Why: Every endpoint requires a valid JWT (`authenticate`). The Discovery Feed
 * consumes `GET /recommendations` (and `/refresh`); preferences are read/written
 * via the two `/preferences` endpoints. All ranking lives in the service; the
 * routes only expose the surface. Push notifications, typing indicators, and
 * realtime are explicitly out of scope here.
 */
export const recommendationRoutes: Router = Router();

recommendationRoutes.use(authenticate);

recommendationRoutes.get('/', recommendationController.list);
recommendationRoutes.get('/refresh', recommendationController.refresh);
recommendationRoutes.get('/preferences', recommendationController.getPreferences);
recommendationRoutes.put(
  '/preferences',
  recommendationController.updatePreferences,
);
