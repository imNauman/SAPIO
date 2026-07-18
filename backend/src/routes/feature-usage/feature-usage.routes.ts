import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { featureUsageController } from './feature-usage.controller';

/**
 * Feature-usage routes.
 *
 * Why: Mounted at `/api/feature-usage`. All routes require authentication. The
 * Super Like flow consumes usage internally (via the service), so there is no
 * public "consume" endpoint — the limit is enforced as a side effect of the
 * Super Like action. This surface only exposes read access for the UI.
 */
const featureUsageRoutes = Router();

featureUsageRoutes.use(authenticate);

featureUsageRoutes.get('/:featureKey', featureUsageController.getUsage);

export { featureUsageRoutes };
