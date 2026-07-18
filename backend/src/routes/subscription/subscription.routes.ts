import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { subscriptionController } from './subscription.controller';

/**
 * Subscription routes — mounted at /api/subscription.
 *
 * Why: All Premium platform read endpoints live here. Every route is
 * authenticated; the controller resolves the caller's subscription dynamically.
 */
export const subscriptionRoutes: Router = Router();

subscriptionRoutes.use(authenticate);

subscriptionRoutes.get('/plans', subscriptionController.listPlans);
subscriptionRoutes.get('/plans/compare', subscriptionController.listPlansWithFeatures);
subscriptionRoutes.get('/current', subscriptionController.getCurrent);
subscriptionRoutes.get('/features', subscriptionController.getFeatures);
