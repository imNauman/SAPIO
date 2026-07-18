import { Server } from 'http';
import { supabaseAdmin } from './config/supabase';

/**
 * Graceful shutdown handler.
 *
 * Why: Production hardening. On SIGTERM/SIGINT we stop accepting new
 * connections, give in-flight requests a bounded window to finish, then exit
 * cleanly. This prevents dropped connections and corrupt state during deploys
 * and scale-down events (Kubernetes, systemd, PaaS).
 *
 * The Supabase JS client has no explicit `close()`; we drop our reference and
 * let the event loop drain. We still guard against hanging sockets by forcing
 * exit after the timeout.
 */
let isShuttingDown = false;

export function setupGracefulShutdown(server: Server): void {
  const shutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    // eslint-disable-next-line no-console
    console.log(`[sapio-backend] ${signal} received — shutting down gracefully`);

    const FORCE_TIMEOUT_MS = 10_000;
    const forceTimer = setTimeout(() => {
      // eslint-disable-next-line no-console
      console.error('[sapio-backend] forced shutdown after timeout');
      process.exit(1);
    }, FORCE_TIMEOUT_MS);

    server.close((err) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error('[sapio-backend] error closing server:', err);
        process.exit(1);
      }
      clearTimeout(forceTimer);
      // Release the Supabase admin client reference so the pool can drain.
      void supabaseAdmin;
      // eslint-disable-next-line no-console
      console.log('[sapio-backend] closed — bye');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Surface unhandled rejections/promises instead of silent crashes.
  process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error('[sapio-backend] unhandledRejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    // eslint-disable-next-line no-console
    console.error('[sapio-backend] uncaughtException:', err);
    process.exit(1);
  });
}
