# SAPIO — Production Readiness Checklist

This document summarizes the production-hardening work completed for the SAPIO
backend, mobile app, and admin portal. No user-facing features were added —
only infrastructure, safety, and observability.

## Backend

- [x] **Compression** — `compression` middleware added to `app.ts` (gzip
      responses, smaller payloads).
- [x] **Rate limiting** — `express-rate-limit` added with three presets:
  - `apiLimiter` (global, 600 req / 15 min) on all `/api` routes.
  - `authLimiter` (30 / 15 min) on signup / login / forgot-password.
  - `chatLimiter` (60 / min) on chat send / read / history / typing.
  - `uploadLimiter` (20 / min) on photo + chat image uploads.
- [x] **Graceful shutdown** — `server.ts` now handles `SIGTERM` / `SIGINT`,
      stops accepting connections, drains in-flight requests, and exits
      cleanly. Unhandled rejections / uncaught exceptions are logged.
- [x] **Request timeout** — `server.timeout = 30s`, `keepAliveTimeout = 65s`,
      `headersTimeout = 66s` so a stuck upstream can't pin a socket forever.
- [x] **Health / readiness / liveness** — `/health` (liveness), `/health/live`
      (alias), `/health/ready` (DB round-trip; 503 if Supabase unreachable).
- [x] **Security headers** — `helmet` already present (CSP, HSTS, etc.).
- [x] **CORS** — restricted to configured `CORS_ORIGIN`, credentials enabled.
- [x] **Request logging** — `morgan` (dev / combined) already present.
- [x] **Centralized error handling** — `errorHandler` returns a consistent
      envelope; 404 fallback present; Zod errors → 422.
- [x] **Config validation** — `config/index.ts` fails fast on missing required
      env vars at boot.
- [x] **Auth** — JWT verified via Supabase; `authenticate` rejects missing /
      malformed / invalid tokens with 401.
- [x] **RBAC (admin)** — `requireAdmin` + `requirePermission` enforce roles and
      eight capability keys; every privileged action is audit-logged to
      `admin_activity_logs`.
- [x] **File uploads** — multer validates type (JPEG / PNG / WEBP) and size
      (10 MB) at the boundary for both profile photos and chat images.
- [x] **Database** — RLS enabled on all tables; FKs with `on delete cascade`;
      CHECK constraints on status enums; indexes on FK / lookup columns;
      atomic `increment_unread` RPC for unread counts.

## Mobile

- [x] **Global error boundary** — `ErrorBoundary` catches render-time crashes
      and shows a recoverable "Retry" fallback instead of a white screen.
- [x] **Offline detection** — `lib/network.ts` + `useConnectivity` hook +
      `OfflineBanner` surface connectivity state; the API client fails fast
      when offline.
- [x] **Network retry** — `withRetry` helper retries transient failures
      (timeouts, 5xx, connection resets) with exponential backoff.
- [x] **Loading / empty states** — `LoadingChatScreen`, `ConversationSkeleton`,
      `EmptyChatScreen` already present across chat flows.

## Admin Portal

- [x] **Global error boundary** — `app/error.tsx` catches route-tree errors
      with a "Try again" reset.
- [x] **404 page** — `app/not-found.tsx` friendly not-found surface.
- [x] **Auth guard** — `AuthGuard` redirects unauthenticated users to `/login`;
      server-side `requirePermission` remains the real enforcement boundary.
- [x] **Audit logging** — every mutating admin action writes to
      `admin_activity_logs` (user suspend / ban, report status, verification
      decision, role assignment).

## Deployment

- [x] Backend dependencies updated (`compression`, `express-rate-limit`).
- [ ] Run `npm install` in `backend/` and `mobile/` (node_modules currently
      absent in this workspace).
- [ ] Set production env vars: `NODE_ENV=production`, `PORT`, `CORS_ORIGIN`
      (comma-separated mobile + admin origins), `SUPABASE_URL`,
      `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, optional FCM keys.
- [ ] Configure reverse proxy / load balancer to call `/health/live` (liveness)
      and `/health/ready` (readiness).
- [ ] Run Supabase migrations `0001`–`0017` (including `0014_admin` RBAC +
      audit log and `0017_chat_upgrade`).
- [ ] Build backend: `npm run build --workspace backend`; start with
      `npm run start --workspace backend`.
- [ ] Build admin: `npm run build` then `npm run start` (Next.js).
- [ ] Mobile: `expo prebuild` / `eas build` for app-store submission.
- [ ] Set up log aggregation (morgan `combined` → stdout) and error monitoring.
- [ ] Enable Supabase Storage lifecycle rules to expire orphaned chat images.
