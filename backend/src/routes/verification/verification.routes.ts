import { Router } from 'express';
import { verificationController } from './verification.controller';
import { authenticate } from '../../middleware/authenticate';

/**
 * Verification routes — mounted at `/api/verification`.
 *
 * Why: Every endpoint requires a valid JWT (`authenticate`). The surface is the
 * user-facing selfie workflow only:
 *  - POST   /verification/submit   → submit selfie photos for review
 *  - GET    /verification/status   → current active request (or null)
 *  - DELETE /verification/request  → cancel the caller's own active request
 * Manual moderation and future AI verification update status via the service
 * layer (using the service-role client) and are intentionally NOT exposed as
 * user endpoints. Face recognition, government-ID, premium, and push
 * notifications are explicitly out of scope.
 */
export const verificationRoutes: Router = Router();

verificationRoutes.use(authenticate);

verificationRoutes.post('/submit', ...verificationController.submit);
verificationRoutes.get('/status', verificationController.status);
verificationRoutes.delete('/request', verificationController.cancel);
