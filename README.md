# SAPIO

A production-ready **Tinder-style dating application** built as a scalable monorepo.

> Status: **Release-ready foundation.** All three packages (mobile, backend, admin) are wired with production tooling, environment validation, health checks, build configs, and deployment documentation. Feature work builds on top of this hardened base.

## Tech Stack

| Layer        | Technology                                   |
| ------------ | -------------------------------------------- |
| Mobile       | React Native + Expo + TypeScript             |
| Backend      | Node.js + Express + TypeScript               |
| Database     | PostgreSQL (via Supabase)                    |
| Auth         | Supabase Auth                                |
| Storage      | Supabase Storage                             |
| State        | Zustand                                      |
| Networking   | Axios                                        |
| Navigation   | React Navigation                             |
| Forms        | React Hook Form                              |
| Validation   | Zod                                          |
| Env          | dotenv + boot-time validation                |
| Lint/Format  | ESLint + Prettier                            |
| Tests        | Jest                                         |
| Admin        | Next.js 14 (standalone build)                |
| Process Mgr  | PM2 (backend)                                |
| CI/Build     | EAS Build (mobile)                           |

## Monorepo Layout

```
SAPIO/
├── backend/            # Express + TypeScript API server
│   ├── src/config/     # env validation (validateConfig), Supabase clients
│   └── .env.example
├── mobile/             # Expo + React Native app
│   ├── app.json        # package com.sapio.app, scheme sapio, v1.0.0
│   ├── eas.json        # EAS build/submit profiles
│   └── .env.example
├── admin/              # Next.js 14 admin portal (standalone)
│   ├── next.config.js  # output: 'standalone'
│   └── .env.example
├── ecosystem.config.js # PM2 process config for backend
├── DEPLOYMENT.md       # VPS / Ubuntu 24.04 deploy guide
├── ANDROID_RELEASE.md  # First-time Play Store publisher guide
├── SUPABASE.md         # Supabase project, RLS, migrations, backups
├── PRODUCTION_CHECKLIST.md # 50+ launch gates
├── FIRST_RELEASE.md    # First release runbook
├── PRODUCTION_READINESS.md # Engineering audit / readiness report
├── tsconfig.base.json
├── .prettierrc
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites
- Node.js >= 18 (Node 20 recommended for production)
- npm >= 9
- A Supabase project (URL + anon key + service role key)
- Expo EAS account (for mobile builds) — `npm i -g eas-cli`

### Install
```bash
npm install
```

### Configure environment
Copy the example env files and fill in your credentials:
```bash
cp backend/.env.example backend/.env
cp mobile/.env.example  mobile/.env
cp admin/.env.example   admin/.env
```

### Run backend
```bash
npm run dev:backend      # watch mode
npm run build:backend    # compile to dist/
npm run start:backend    # run compiled server
```

### Run mobile (Expo)
```bash
npm run dev:mobile       # start Expo dev server
```

### Run admin (Next.js)
```bash
npm run build:admin
npm run start:admin
```

## Scripts (root)
- `npm run dev:backend` — start API in watch mode
- `npm run dev:mobile` — start Expo dev server
- `npm run build:backend` — compile backend to `dist/`
- `npm run start:backend` — run compiled backend
- `npm run build:admin` — build admin (standalone)
- `npm run start:admin` — run admin
- `npm run lint` — lint all workspaces
- `npm run format` — format with Prettier
- `npm run test` — run all tests
- `npm run typecheck` — typecheck admin

## Production Hardening (included)
- **Backend**: boot-time env validation (`validateConfig`), Zod request validation, health endpoints `/health`, `/health/live`, `/health/ready` (ready does a Supabase round-trip), PM2 `ecosystem.config.js`.
- **Mobile**: `app.json` with `com.sapio.app`, scheme `sapio`, v1.0.0 / versionCode 1; `eas.json` profiles for development, preview (APK), preview-aab, and production (AAB) with `submit` to Play Store internal track.
- **Admin**: `next.config.js` `output: 'standalone'` for containerized deploys.

## Deployment
See the dedicated guides in the repo root:
- `DEPLOYMENT.md` — full Ubuntu 24.04 VPS deploy (Node 20, build, env, Supabase migrations, PM2, Nginx, Certbot HTTPS, rollback).
- `ANDROID_RELEASE.md` — first-time Google Play publisher walkthrough.
- `SUPABASE.md` — production project, storage buckets, RLS policies, migrations, backups.
- `PRODUCTION_CHECKLIST.md` — 50+ launch gates to verify before going live.
- `FIRST_RELEASE.md` — step-by-step first release runbook.
- `PRODUCTION_READINESS.md` — engineering audit and readiness score.

## Environment Variables
| Package  | File                 | Key variables |
| -------- | -------------------- | ------------- |
| Backend  | `backend/.env.example` | `PORT`, `NODE_ENV`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN`, `FIREBASE_*` (optional) |
| Mobile   | `mobile/.env.example`  | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_BASE_URL` |
| Admin    | `admin/.env.example`   | `NEXT_PUBLIC_API_URL` |

## Planned Features
Authentication, user profiles, swipe cards, matching, chat, push notifications, premium subscriptions, location, recommendation engine, admin dashboard, reporting, blocking users, image uploads.

## Next Milestone
Implement **Authentication** (Supabase Auth) end-to-end: backend auth module + mobile auth screens, auth store, and protected navigation.
