import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireFeature } from '../../middleware/requireFeature';
import { superLikeController } from './superlike.controller';

/**
 * Super Like routes.
 *
 * Why: Mounted at `/api/super-like`. All routes require authentication.
 * `POST /` additionally requires the `super_like` feature (eligible tiers only)
 * via `requireFeature` — the single, dynamic permission gate. The daily limit is
 * enforced inside the service via the feature-usage module. The swipe itself is
 * written by the swipe engine, so there is no separate persistence here.
 */
const superLikeRoutes = Router();

superLikeRoutes.use(authenticate);

superLikeRoutes.post('/', requireFeature('super_like'), ...superLikeController.sendSuperLike);
superLikeRoutes.get('/history', superLikeController.getHistory);
superLikeRoutes.get('/received', superLikeController.getReceived);

export { superLikeRoutes };
