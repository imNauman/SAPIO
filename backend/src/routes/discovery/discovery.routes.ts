import { Router } from 'express';
import { discoveryController } from './discovery.controller';
import { authenticate } from '../../middleware/authenticate';

/**
 * Discovery routes — mounted at `/api/discovery`.
 *
 * Why: Every endpoint requires a valid JWT (`authenticate`). The feed is
 * paginated via an optional `?cursor=` query param; `refresh` returns a fresh
 * first page; `profile/:id` returns a single candidate. Swipe/match actions are
 * intentionally absent — this milestone only produces the scrollable stack.
 */
export const discoveryRoutes: Router = Router();

discoveryRoutes.use(authenticate);

discoveryRoutes.get('/feed', discoveryController.feed);
discoveryRoutes.get('/refresh', discoveryController.refresh);
discoveryRoutes.get('/profile/:id', discoveryController.profile);

// Discovery preferences are owned by the Recommendation Engine; we expose them
// here under /api/discovery/preferences so the mobile Discovery screens have a
// single, intuitive base path. No filtering logic is duplicated — both delegate
// to recommendationService.
discoveryRoutes.get('/preferences', discoveryController.getPreferences);
discoveryRoutes.patch('/preferences', discoveryController.updatePreferences);
