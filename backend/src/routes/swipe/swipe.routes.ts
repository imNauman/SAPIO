import { Router } from 'express';
import { swipeController } from './swipe.controller';
import { authenticate } from '../../middleware/authenticate';

/**
 * Swipe routes — mounted at `/api/swipe`.
 *
 * Why: Every endpoint requires a valid JWT (`authenticate`). `POST /swipe`
 * records a LIKE/PASS, `GET /swipe/history` lists the caller's swipes, and
 * `DELETE /swipe/:id` undoes one. Matching endpoints are intentionally absent.
 */
export const swipeRoutes: Router = Router();

swipeRoutes.use(authenticate);

swipeRoutes.post('/', ...swipeController.recordSwipe);
swipeRoutes.get('/history', swipeController.getHistory);
swipeRoutes.delete('/:id', swipeController.deleteSwipe);
