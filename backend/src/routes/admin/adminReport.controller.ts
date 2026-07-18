import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { sendSuccess } from '../../utils/response';
import { validateBody } from '../../utils/validate';
import { clientIp } from '../../utils/request';
import { adminReportService } from './adminReport.service';
import { updateReportStatusSchema } from './admin.types';

/**
 * Admin report controller.
 *
 * Why: Manual triage surface for user-submitted reports. No AI moderation,
 * no analytics — just listing and status changes, each audit-logged. Guarded
 * by `manage_reports` at the route layer.
 */
export const adminReportController = {
  /** GET /api/admin/reports?status=&limit=&offset= */
  list: asyncHandler(async (req: Request, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const limit = Number(req.query.limit ?? 25);
    const offset = Number(req.query.offset ?? 0);
    const reports = await adminReportService.listReports({ status, limit, offset });
    sendSuccess(res, { reports });
  }),

  /** GET /api/admin/reports/:id */
  details: asyncHandler(async (req: Request, res: Response) => {
    const report = await adminReportService.getReport(req.params.id);
    sendSuccess(res, { report });
  }),

  /** PATCH /api/admin/reports/:id */
  updateStatus: [
    validateBody(updateReportStatusSchema),
    asyncHandler(async (req: Request, res: Response) => {
      await adminReportService.updateStatus(
        req.admin!.id,
        req.params.id,
        req.body.status,
        req.body.note,
        clientIp(req),
      );
      sendSuccess(res, { updated: true });
    }),
  ],
};
