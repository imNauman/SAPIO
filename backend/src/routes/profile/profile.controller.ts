import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { profileService } from './profile.service';
import { blockService } from '../block/block.service';
import { sendSuccess, sendMessage } from '../../utils/response';

/**
 * Profile controller.
 *
 * Why: Thin layer mapping HTTP ↔ service. All handlers are wrapped in
 * `asyncHandler` so domain `AppError`s reach the central error handler. The
 * authenticated user id comes from `req.user` (set by `authenticate`).
 */
export const profileController = {
  getMe: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const profile = await profileService.getOwn(userId);
    sendSuccess(res, { profile });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const profile = await profileService.getById(id);
    // A blocked user (in either direction) cannot be viewed.
    await blockService.requireNotBlocked(req.user!.id, profile.userId);
    sendSuccess(res, { profile });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const profile = await profileService.create(userId, req.body);
    sendSuccess(res, { profile }, 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const profile = await profileService.update(userId, req.body);
    sendSuccess(res, { profile });
  }),

  updateLocation: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const profile = await profileService.updateLocation(userId, req.body);
    sendSuccess(res, { profile });
  }),

  recordActivity: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    await profileService.recordActivity(userId);
    sendMessage(res, 'Activity recorded');
  }),
};
