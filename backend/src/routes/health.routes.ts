import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

/**
 * Health-check routes.
 *
 * Why: Kubernetes / load balancers / monitoring need cheap, distinct endpoints:
 *  - GET /health  → liveness probe (is the process up?)
 *  - GET /ready   → readiness probe (can we reach dependencies like the DB?)
 *  - GET /live    → alias of liveness for tooling that expects /live.
 *
 * Readiness does a lightweight DB round-trip so a pod is only routed traffic
 * once Supabase is reachable. Failures return 503 so orchestrators keep the
 * pod out of rotation.
 */
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive', uptime: process.uptime() });
});

router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1);
    if (error) throw error;
    res.status(200).json({ status: 'ready', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({
      status: 'unavailable',
      message: 'Database not reachable',
    });
  }
});

export const healthRoutes = router;
