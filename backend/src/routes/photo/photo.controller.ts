import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { photoService } from './photo.service';
import { sendSuccess, sendMessage } from '../../utils/response';
import { ProfilePhoto, PhotoPublic } from './photo.types';

/**
 * Photo controller.
 *
 * Why: Thin layer mapping HTTP ↔ service. Handlers are wrapped in `asyncHandler`
 * so domain `AppError`s reach the central error handler. The authenticated user
 * id comes from `req.user` (set by `authenticate`). File uploads arrive as
 * `req.file` via the multer middleware.
 */
function toPublic(photo: ProfilePhoto): PhotoPublic {
  return {
    id: photo.id,
    photoUrl: photo.photoUrl,
    displayOrder: photo.displayOrder,
    isPrimary: photo.isPrimary,
    uploadedAt: photo.uploadedAt,
  };
}

export const photoController = {
  listMine: asyncHandler(async (req: Request, res: Response) => {
    const photos = await photoService.listMine(req.user!.id);
    sendSuccess(res, { photos: photos.map(toPublic) });
  }),

  upload: asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      return sendMessage(res, 'No file provided', 400);
    }
    const photo = await photoService.upload(req.user!.id, {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
    });
    sendSuccess(res, { photo: toPublic(photo) }, 201);
  }),

  reorder: asyncHandler(async (req: Request, res: Response) => {
    const { orderedIds } = req.body;
    const photos = await photoService.reorder(req.user!.id, orderedIds);
    sendSuccess(res, { photos: photos.map(toPublic) });
  }),

  setPrimary: asyncHandler(async (req: Request, res: Response) => {
    const { photoId } = req.body;
    const photos = await photoService.setPrimary(req.user!.id, photoId);
    sendSuccess(res, { photos: photos.map(toPublic) });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await photoService.remove(req.user!.id, id);
    sendMessage(res, 'Photo deleted');
  }),

  listByUser: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const photos = await photoService.listByUser(userId);
    sendSuccess(res, { photos: photos.map(toPublic) });
  }),
};
