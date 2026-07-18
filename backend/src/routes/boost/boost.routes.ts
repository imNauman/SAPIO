import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireFeature } from '../../middleware/requireFeature';
import { boostController } from './boost.controller';

/**
 * Boost routes.
 *
 * Why: Mounted at `/api/boost`. All routes require authentication. `POST /`
 * additionally requires the `boost` feature (Premium tiers only) via
 * `requireFeature` — the single, dynamic permission gate. The recommendation
 * engine reads active boosts independently; this surface only manages the
 * caller's own boost.
 */
const boostRoutes = Router();

boostRoutes.use(authenticate);

boostRoutes.post('/start', requireFeature('boost'), ...boostController.startBoost);
boostRoutes.get('/status', boostController.getStatus);

export { boostRoutes };
