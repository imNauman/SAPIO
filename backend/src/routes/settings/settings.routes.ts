import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { settingsController } from './settings.controller';

/**
 * Settings & Account routes.
 *
 * Why: A single router is mounted at BOTH `/api/settings` and `/api/account`
 * (see app.ts). Account-lifecycle endpoints live under `/account/*` while the
 * general settings surface lives under `/settings`. All routes require the
 * `authenticate` middleware so `req.user` is populated.
 *
 *   GET    /settings            -> settings bundle
 *   PATCH  /settings            -> update privacy toggles
 *   PATCH  /account/password    -> change password
 *   PATCH  /account/email       -> change email
 *   DELETE /account             -> soft-delete account
 */
export const settingsRoutes: Router = Router();

settingsRoutes.use(authenticate);

settingsRoutes.get('/', settingsController.get);
settingsRoutes.patch('/', ...settingsController.update);
settingsRoutes.patch('/password', ...settingsController.changePassword);
settingsRoutes.patch('/email', ...settingsController.changeEmail);
settingsRoutes.delete('/', ...settingsController.delete);
