import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { reportService } from './report.service';
import { sendSuccess } from '../../utils/response';
import { validateBody } from '../../utils/validate';
import {
  createProfileReportSchema,
  createMessageReportSchema,
  createPhotoReportSchema,
} from './report.types';

/**
 * Report controller.
 *
 * Why: Thin HTTP ↔ service mapping. Each POST validates its body with the
 * corresponding Zod schema middleware, then calls the service with the
 * authenticated user id (`req.user`). Handlers are wrapped in `asyncHandler` so
 * domain `AppError`s (400 self-report, 404 not-found, 409 duplicate) reach the
 * central error handler. The moderation dashboard is a separate, future surface
 * and is intentionally NOT handled here.
 */
export const reportController = {
  /** GET /reports/categories — categories for the picker. */
  listCategories: asyncHandler(async (_req: Request, res: Response) => {
    const categories = await reportService.listCategories();
    sendSuccess(res, { categories });
  }),

  /** POST /reports/profile */
  reportProfile: [
    validateBody(createProfileReportSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const report = await reportService.reportProfile(req.user!.id, req.body);
      sendSuccess(res, { report }, 201);
    }),
  ],

  /** POST /reports/message */
  reportMessage: [
    validateBody(createMessageReportSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const report = await reportService.reportMessage(req.user!.id, req.body);
      sendSuccess(res, { report }, 201);
    }),
  ],

  /** POST /reports/photo */
  reportPhoto: [
    validateBody(createPhotoReportSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const report = await reportService.reportPhoto(req.user!.id, req.body);
      sendSuccess(res, { report }, 201);
    }),
  ],

  /** GET /reports/my — the caller's own reports. */
  listMy: asyncHandler(async (req: Request, res: Response) => {
    const reports = await reportService.listMyReports(req.user!.id);
    sendSuccess(res, { reports });
  }),

  /** DELETE /reports/:id — soft-delete one of the caller's reports. */
  deleteReport: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await reportService.deleteReport(req.user!.id, id);
    sendSuccess(res, { deleted: true });
  }),
};
