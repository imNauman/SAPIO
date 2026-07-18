import { createApp } from './app';
import { config, validateConfig } from './config';
import { setupGracefulShutdown } from './shutdown';

/**
 * Server entry point.
 *
 * Why: Boots the HTTP server on the configured port. Kept minimal — all wiring
 * lives in `createApp` so the server can be imported and tested without listening.
 */
// Fail fast with a clear message if the environment is misconfigured. This runs
// before we bind a port so a broken deploy never appears "healthy".
validateConfig();

const app = createApp();

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[sapio-backend] listening on http://localhost:${config.port} (env=${config.env})`,
  );
});

// Bound the time a single request may take so a stuck upstream can't pin a
// connection forever. The client receives a 503 and the socket is freed.
server.timeout = 30_000;
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

// Graceful shutdown on SIGTERM/SIGINT (deployments, scale-down, Ctrl-C).
setupGracefulShutdown(server);
