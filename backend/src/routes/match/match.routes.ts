import { Router } from 'express';
import { matchController } from './match.controller';
import { authenticate } from '../../middleware/authenticate';

/**
 * Match routes — mounted at `/api/matches`.
 *
 * Why: Every endpoint requires a valid JWT (`authenticate`). There is no
 * POST /matches because matches are created as a side effect of a mutual LIKE
 * inside the swipe flow (`POST /swipe`). These endpoints only read / manage the
 * resulting matches. Chat and notifications are separate future milestones.
 */
export const matchRoutes: Router = Router();

matchRoutes.use(authenticate);

matchRoutes.get('/', matchController.list);
matchRoutes.get('/:id', matchController.getOne);
matchRoutes.delete('/:id', matchController.remove);
matchRoutes.patch('/archive', matchController.archive);
