import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter } from '../../middleware/rateLimit';
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
} from './auth.validation';
import { validateBody } from '../../utils/validate';

/**
 * Auth routes.
 *
 * Why: Mounted at `/api/auth`. Public endpoints (signup, login, forgot password,
 * refresh) are unauthenticated; `me` and `logout` require a valid JWT via the
 * `authenticate` middleware. Login/signup/forgot-password are rate-limited to
 * blunt credential stuffing.
 */
export const authRoutes: Router = Router();

authRoutes.post(
  '/signup',
  authLimiter,
  validateBody(signupSchema),
  authController.signup,
);
authRoutes.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  authController.login,
);
authRoutes.post(
  '/forgot-password',
  authLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword,
);
authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/logout', authenticate, authController.logout);
authRoutes.get('/me', authenticate, authController.me);
