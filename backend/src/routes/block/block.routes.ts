import { Router } from 'express';
import { blockController } from './block.controller';
import { authenticate } from '../../middleware/authenticate';

/**
 * Block routes — mounted at `/api/block`.
 *
 * Why: Every endpoint requires a valid JWT (`authenticate`). The surface is
 * intentionally minimal and production-grade:
 *  - POST   /block            → block a user (idempotent, immediate)
 *  - DELETE /block/:userId    → unblock a user
 *  - GET    /block/list       → list blocked users
 * Reporting, AI moderation, and push notifications are explicitly out of scope.
 */
export const blockRoutes: Router = Router();

blockRoutes.use(authenticate);

blockRoutes.post('/', ...blockController.blockUser);
blockRoutes.delete('/:userId', blockController.unblockUser);
blockRoutes.get('/list', blockController.listBlockedUsers);
