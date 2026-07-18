import { Router } from 'express';
import { photoController } from './photo.controller';
import { authenticate } from '../../middleware/authenticate';
import { uploadLimiter } from '../../middleware/rateLimit';
import { uploadPhotoMiddleware } from './photo.upload';
import { validateBody } from '../../utils/validate';
import { reorderSchema, primarySchema } from './photo.validation';

/**
 * Photo routes — mounted at `/api/photos`.
 *
 * Why: Every endpoint requires a valid JWT (`authenticate`). Upload uses a
 * multipart middleware that validates file type/size before the controller.
 * Reorder/primary payloads are validated with Zod. `GET /user/:userId` is a
 * public read used later for viewing other users' galleries.
 */
export const photoRoutes: Router = Router();

photoRoutes.use(authenticate);

photoRoutes.get('/me', photoController.listMine);
photoRoutes.post(
  '/upload',
  uploadLimiter,
  uploadPhotoMiddleware,
  photoController.upload,
);
photoRoutes.patch(
  '/reorder',
  validateBody(reorderSchema),
  photoController.reorder,
);
photoRoutes.patch(
  '/primary',
  validateBody(primarySchema),
  photoController.setPrimary,
);
photoRoutes.delete('/:id', photoController.remove);
photoRoutes.get('/user/:userId', photoController.listByUser);
