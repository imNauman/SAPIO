import { Router } from 'express';
import { profileController } from './profile.controller';
import { authenticate } from '../../middleware/authenticate';
import {
  profileCreateSchema,
  profileUpdateSchema,
  locationSchema,
} from './profile.validation';
import { validateBody } from '../../utils/validate';

/**
 * Profile routes — mounted at `/api/profile`.
 *
 * Why: Every endpoint requires a valid JWT (`authenticate`). Users may only
 * read/write their own profile; `GET /:id` is a public read used later for
 * viewing other users. Validation runs before the controller.
 */
export const profileRoutes: Router = Router();

profileRoutes.use(authenticate);

profileRoutes.get('/me', profileController.getMe);
profileRoutes.put(
  '/me',
  validateBody(profileCreateSchema),
  profileController.create,
);
profileRoutes.patch(
  '/me',
  validateBody(profileUpdateSchema),
  profileController.update,
);
profileRoutes.get('/:id', profileController.getById);
profileRoutes.patch(
  '/location',
  validateBody(locationSchema),
  profileController.updateLocation,
);
profileRoutes.patch('/activity', profileController.recordActivity);
