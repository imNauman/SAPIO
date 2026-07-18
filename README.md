# SAPIO

A production-ready **dating application** foundation.

> Status: **Project scaffold only.** No features are implemented yet — this milestone establishes a scalable, modular monorepo with all tooling, configuration, and infrastructure wiring in place.

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
| Env          | dotenv                                       |
| Lint/Format  | ESLint + Prettier                            |
| Tests        | Jest                                         |

## Monorepo Layout

```
SAPIO/
├── backend/      # Express + TypeScript API server
├── mobile/       # Expo + React Native app
├── tsconfig.base.json
├── .prettierrc
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites
- Node.js >= 18
- npm >= 9
- A Supabase project (URL + anon key + service role key)

### Install
```bash
npm install
```

### Configure environment
Copy the example env files and fill in your Supabase credentials:
```bash
cp backend/.env.example backend/.env
cp mobile/.env.example mobile/.env
```

### Run backend
```bash
npm run dev:backend
```

### Run mobile (Expo)
```bash
npm run dev:mobile
```

## Scripts
- `npm run dev:backend` — start API in watch mode
- `npm run dev:mobile` — start Expo dev server
- `npm run lint` — lint all workspaces
- `npm run format` — format with Prettier
- `npm run test` — run all tests

## Planned Features (not yet implemented)
Authentication, user profiles, swipe cards, matching, chat, push notifications, premium subscriptions, location, recommendation engine, admin dashboard, reporting, blocking users, image uploads.

## Next Milestone
Implement **Authentication** (Supabase Auth) end-to-end: backend auth module + mobile auth screens, auth store, and protected navigation.
