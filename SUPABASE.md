# SAPIO — Supabase Production Setup

Supabase is the database, auth, storage, and RLS provider for SAPIO. This guide
covers standing up the **production** project and the launch checks.

---

## 1. Create a production project

1. Go to https://supabase.com/dashboard and click **New project**.
2. Choose a region close to your users (latency matters for the feed).
3. Set a strong database password and **save it in a password manager**.
4. Wait for provisioning (~2 min).

> Keep the **development** project separate from **production**. Never point the
> production backend at a dev database.

## 2. Storage buckets

The backend migrations create these buckets automatically (see
`backend/supabase/migrations/0003_profile_photos.sql` and
`0017_chat_upgrade.sql`). Verify they exist in **Storage**:

| Bucket         | Public? | Purpose                              |
| -------------- | ------- | ------------------------------------ |
| `avatars`      | yes     | Profile primary photos               |
| `photos`       | yes     | Additional profile photos            |
| `verification` | no      | Selfie uploads for verification      |
| `chat-images`  | yes     | In-chat images                       |

If a bucket is missing, re-run migrations (Section 4) or create it manually
with the same public/private setting and the RLS policies from the migrations.

## 3. RLS verification

Row Level Security is enabled per table in the migrations. Before launch,
confirm in **Database → Tables** that every table shows **RLS: Enabled**, and
that the policies match the migration files. Pay special attention to:

- `profiles` — users see/edit only their own row.
- `matches` — participants see their match; the ordered-pair unique index
  prevents duplicates.
- `messages` / `conversations` — only match participants.
- `storage.objects` — upload only into a folder named after the user's own id.

Test as an authenticated user (not the service role) using the Supabase
**API docs** playground or the mobile app: a user must NEVER read another
user's private rows.

## 4. Running migrations

Use the Supabase CLI so applied state is tracked:

```bash
npm install -g supabase
supabase login
supabase link --project-ref <PROD_PROJECT_REF>
supabase db push
```

`supabase db push` applies `backend/supabase/migrations/*.sql` in order and
records them in the `_supabase_migrations` table. Idempotent and safe to re-run.

> Alternative: open each migration file in the Supabase **SQL Editor** and run
> them in filename order. Only do this if the CLI is unavailable.

## 5. Backup strategy

- **Automated**: Supabase takes daily backups on paid plans (Point-in-Time
  Recovery on Pro+). Confirm the plan covers PITR for production.
- **Manual snapshot before risky changes**:
  - Dashboard → **Database → Backups → Create a backup** (or use `pg_dump`).
- **Restore**: Dashboard → Backups → restore a snapshot, OR
  `pg_restore` from a `pg_dump` taken with the service-role connection string.
- **Secrets**: the database password and the service-role key are the two
  highest-value secrets — store both in your password manager / a secrets
  manager (e.g. Vault, AWS Secrets Manager), never in git.

## 6. Connection & keys

- `SUPABASE_URL` — Project Settings → API → Project URL.
- `SUPABASE_ANON_KEY` — "anon public" key. Safe in the mobile/app bundle; RLS
  enforces access.
- `SUPABASE_SERVICE_ROLE_KEY` — "service_role" key. **Server only**, bypasses
  RLS. Lives in `backend/.env`, never in the mobile app or git.

## 7. Pre-launch Supabase checklist

- [ ] Production project created in the right region.
- [ ] All 16 migrations applied (`supabase db push` clean).
- [ ] All four storage buckets exist with correct public/private flags.
- [ ] RLS enabled on every table; policies reviewed.
- [ ] Daily backups / PITR confirmed on the plan.
- [ ] Anon + service-role keys copied into backend `.env` (prod values).
- [ ] Auth providers configured (Email enabled; add Google/Apple if required).
