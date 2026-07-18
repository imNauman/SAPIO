import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { config } from './config';
import { healthRoutes } from './routes/health.routes';
import { apiLimiter } from './middleware/rateLimit';
import { authRoutes } from './routes/auth/auth.routes';
import { profileRoutes } from './routes/profile/profile.routes';
import { photoRoutes } from './routes/photo/photo.routes';
import { discoveryRoutes } from './routes/discovery/discovery.routes';
import { swipeRoutes } from './routes/swipe/swipe.routes';
import { matchRoutes } from './routes/match/match.routes';
import { chatRoutes } from './routes/chat/chat.routes';
import { recommendationRoutes } from './routes/recommendation/recommendation.routes';
import { locationRoutes } from './routes/location/location.routes';
import { blockRoutes } from './routes/block/block.routes';
import { reportRoutes } from './routes/report/report.routes';
import { verificationRoutes } from './routes/verification/verification.routes';
import { notificationRoutes } from './routes/notification/notification.routes';
import { registerNotificationSubscribers } from './routes/notification/notification.subscriber';
import { subscriptionRoutes } from './routes/subscription/subscription.routes';
import { boostRoutes } from './routes/boost/boost.routes';
import { superLikeRoutes } from './routes/superlike/superlike.routes';
import { featureUsageRoutes } from './routes/feature-usage/feature-usage.routes';
import { adminRoutes } from './routes/admin/admin.routes';
import { settingsRoutes } from './routes/settings/settings.routes';
import { errorHandler } from './utils/errors';

/**
 * Express application factory.
 *
 * Why: Encapsulating app construction in `createApp` keeps `server.ts` thin and
 * makes the app unit-testable without binding to a port. Middleware is mounted
 * in a deliberate order: security → logging → body parsing → routes → errors.
 */
export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));
  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Global rate limit — protects every API route from abuse/flooding.
  app.use('/api', apiLimiter);

  app.use('/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/photos', photoRoutes);
  app.use('/api/discovery', discoveryRoutes);
  app.use('/api/swipe', swipeRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/recommendations', recommendationRoutes);
  app.use('/api/location', locationRoutes);
  app.use('/api/block', blockRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/verification', verificationRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/subscription', subscriptionRoutes);
  app.use('/api/boost', boostRoutes);
  app.use('/api/super-like', superLikeRoutes);
  app.use('/api/feature-usage', featureUsageRoutes);
  app.use('/api/admin', adminRoutes);
  // Settings & Account: mounted at both paths so account-lifecycle endpoints
  // resolve as /api/account/* and the settings surface as /api/settings.
  app.use('/api/settings', settingsRoutes);
  app.use('/api/account', settingsRoutes);

  // Subscribe the notification module to domain events (idempotent).
  registerNotificationSubscribers();

  // 404 fallback
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ status: 'error', message: 'Not found' });
  });

  // Centralized error handler (must have 4 args for Express to treat it as error MW)
  app.use(errorHandler);

  return app;
}
