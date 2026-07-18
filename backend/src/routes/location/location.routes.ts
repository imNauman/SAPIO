import { Router } from 'express';
import { locationController } from './location.controller';
import { authenticate } from '../../middleware/authenticate';

/**
 * Location routes — mounted at `/api/location`.
 *
 * Why: Every endpoint requires a valid JWT (`authenticate`). The Location API
 * is the single write path for a user's coordinates; the Recommendation Engine
 * reads them later. No ranking/filtering happens here.
 */
export const locationRoutes: Router = Router();

locationRoutes.use(authenticate);

locationRoutes.patch('/', locationController.update);
