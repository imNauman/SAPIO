# SAPIO — Production Launch Checklist

Work through every item **before** flipping the app to public. Each item should
be checked off by the release engineer. Items marked 🔴 are hard blockers.

---

## Infrastructure & Build

- [ ] 🔴 Backend builds: `npm run build:backend` succeeds, `dist/` emitted.
- [ ] 🔴 Mobile assets present: `mobile/assets/{icon,splash,adaptive-icon,notification-icon}.png`.
- [ ] 🔴 `eas.json` `production` profile env values point at the real prod
      Supabase URL / anon key / API base URL.
- [ ] 🔴 Admin builds: `npm run build:admin` succeeds (standalone output).
- [ ] No `console.log` of secrets; `NODE_ENV=production` on all servers.
- [ ] `package-lock.json` committed (reproducible installs).

## Environment & Config

- [ ] 🔴 `backend/.env` has real prod `SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY`.
- [ ] 🔴 `CORS_ORIGIN` lists the real admin + app origins (no `*`).
- [ ] `admin/.env.local` has `NEXT_PUBLIC_API_URL=https://api.sapio.app/api`.
- [ ] `mobile/.env` (or EAS secrets) has prod `EXPO_PUBLIC_*` values.
- [ ] `validateConfig()` passes on the server (`node -e "require('./backend/dist/config').validateConfig()"`).

## Database (Supabase)

- [ ] 🔴 All migrations applied (`supabase db push` clean, 16 files).
- [ ] 🔴 RLS enabled on every table; policies reviewed.
- [ ] 🔴 Storage buckets exist: `avatars`, `photos`, `verification`, `chat-images`.
- [ ] Backups / PITR enabled on the Supabase plan.
- [ ] Auth providers configured (Email at minimum).

## Backend Runtime

- [ ] 🔴 Server runs under PM2 (`pm2 status` shows `online`).
- [ ] 🔴 `GET /health` returns 200; `GET /health/ready` returns 200.
- [ ] Nginx proxies `/` → `127.0.0.1:4000` with `client_max_body_size 12m`.
- [ ] 🔴 HTTPS active (Let's Encrypt cert valid, auto-renew configured).
- [ ] Rate limiting active (global `/api` limiter + auth/chat/upload limiters).
- [ ] Graceful shutdown verified (deploy does not drop in-flight requests).

## Mobile App

- [ ] 🔴 Production AAB built (`eas build -p android --profile production`).
- [ ] 🔴 App points at `https://api.sapio.app` (not localhost).
- [ ] Deep link scheme `sapio://` registered (used by notification taps).
- [ ] 🔴 Push notifications tested end-to-end (see below).
- [ ] 🔴 Chat tested: match → message → typing → read receipts → unread clear.
- [ ] Offline banner + error boundary verified on a flight-mode device.
- [ ] Location permission flow tested (iOS + Android).

## Push Notifications

- [ ] 🔴 Firebase project created; `FIREBASE_*` set in `backend/.env`.
- [ ] 🔴 Backend logs "push enabled" (not "disabled") on boot.
- [ ] 🔴 New-match push received on a real device.
- [ ] 🔴 New-message push received and deep-links into the conversation.
- [ ] Notification permissions requested with rationale; tap routes correctly.

## Verification & Moderation

- [ ] 🔴 Verification selfie upload + admin approve/reject flow tested.
- [ ] Report submission + admin resolution flow tested.
- [ ] Block flow tested: blocked user cannot message / appear in feed.

## Admin Dashboard

- [ ] 🔴 Admin login works with an `admin` role account.
- [ ] RBAC enforced: non-admin cannot reach `/api/admin/*`.
- [ ] Audit log records admin actions.
- [ ] Admin served over HTTPS on its own subdomain.

## Payments / Subscriptions

- [ ] 🔴 Payments DISABLED or behind a real provider. The `subscription`,
      `boost`, `superlike` modules exist but must NOT charge real money until a
      provider (Stripe/RevenueCat) is wired and tested in sandbox. Confirm no
      live charge path is active at launch.

## Monitoring & Ops

- [ ] PM2 `startup` hook installed (survives reboot).
- [ ] Log rotation / central logging configured.
- [ ] Uptime/health monitoring (e.g. UptimeRobot) pings `/health/ready`.
- [ ] Rollback runbook (DEPLOYMENT.md §10) understood by on-call.

## Legal / Store

- [ ] Privacy Policy + Terms of Service URLs ready for Google Play listing.
- [ ] App store listing (description, screenshots, icon) completed.
- [ ] Age rating / content guidelines reviewed for a dating app.
