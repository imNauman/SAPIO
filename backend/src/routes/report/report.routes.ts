import { Router } from 'express';
import { reportController } from './report.controller';
import { authenticate } from '../../middleware/authenticate';

/**
 * Report routes — mounted at `/api/reports`.
 *
 * Why: Every endpoint requires a valid JWT (`authenticate`). The surface is
 * intentionally minimal and production-grade:
 *  - GET    /reports/categories  → categories for the picker
 *  - POST   /reports/profile     → report a user profile
 *  - POST   /reports/message     → report a chat message
 *  - POST   /reports/photo       → report a profile photo
 *  - GET    /reports/my          → list the caller's own reports
 *  - DELETE /reports/:id         → soft-delete one of the caller's reports
 * AI moderation, automatic bans, push notifications, and the admin dashboard
 * are explicitly out of scope.
 */
export const reportRoutes: Router = Router();

reportRoutes.use(authenticate);

reportRoutes.get('/categories', reportController.listCategories);
reportRoutes.post('/profile', ...reportController.reportProfile);
reportRoutes.post('/message', ...reportController.reportMessage);
reportRoutes.post('/photo', ...reportController.reportPhoto);
reportRoutes.get('/my', reportController.listMy);
reportRoutes.delete('/:id', reportController.deleteReport);
