import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { authService } from './auth.service';
import { sendSuccess, sendMessage } from '../../utils/response';
import { AuthUser } from './auth.types';
import { profileRepo } from '../profile/profile.repository';

/**
 * Auth controller.
 *
 * Why: Thin layer that maps HTTP requests to the auth service and shapes
 * responses. All handlers are wrapped in `asyncHandler` so thrown errors
 * (including domain `AppError`s) reach the central error handler.
 */
export const authController = {
  signup: asyncHandler(async (req: Request, res: Response) => {
    const { email, password, fullName } = req.body;
    const result = await authService.signUp(email, password, { fullName });
    // If email confirmation is enabled, `session` may be null.
    sendSuccess(res, result, 201);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await authService.signIn(email, password);
    // Mark the user active on login (drives the "hide inactive" filter).
    if (result.user?.id) {
      await profileRepo.touchActivity(result.user.id).catch(() => {});
    }
    sendSuccess(res, result, 200);
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.body?.refreshToken as string | undefined;
    await authService.signOut(refreshToken);
    sendMessage(res, 'Logged out successfully');
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    await authService.forgotPassword(email);
    // Always return the same message to avoid account enumeration.
    sendMessage(
      res,
      'If an account exists for that email, a reset link has been sent.',
    );
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.body?.refreshToken as string | undefined;
    if (!refreshToken) {
      sendMessage(res, 'Refresh token required', 400);
      return;
    }
    const result = await authService.refreshSession(refreshToken);
    sendSuccess(res, result, 200);
  }),

  /** Returns the currently authenticated user (requires `authenticate`). */
  me: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as Request & { user?: AuthUser }).user;
    sendSuccess(res, { user });
  }),
};
