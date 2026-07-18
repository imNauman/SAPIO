-- ============================================================================
-- 0010_verification.sql — User Verification System
-- ============================================================================
-- A selfie-based verification workflow. A user submits one or more selfie
-- photos; a request moves through Pending → Under Review → Approved/Rejected
-- (or Expired). Only ONE active request per user is allowed at a time. On
-- approval the user's profile.is_verified is set to true (handled by the
-- backend service, not a trigger, so we can also write status history).
-- The schema is AI-ready: a future face-matching job can read verification_photos
-- and update status without any structural change. No face recognition or
-- government-ID logic is implemented here.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- verification_requests: one row per verification attempt.
-- ---------------------------------------------------------------------------
create table if not exists public.verification_requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  status           text not null default 'pending'
                  check (status in ('pending', 'under_review', 'approved', 'rejected', 'expired')),
  submitted_at     timestamptz not null default now(),
  reviewed_at      timestamptz,
  reviewed_by      uuid references auth.users (id) on delete set null,
  rejection_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- At most one ACTIVE (non-terminal) request per user. Terminal states are
  -- approved / rejected / expired; pending and under_review are "active".
  constraint verification_one_active
    check (
      (status in ('pending', 'under_review')) = false
      or true -- uniqueness enforced by partial unique index below
    )
);

-- One active request per user: a partial unique index over non-terminal states.
create unique index if not exists verification_active_unique_idx
  on public.verification_requests (user_id)
  where status in ('pending', 'under_review');

create index if not exists verification_user_idx
  on public.verification_requests (user_id);
create index if not exists verification_status_idx
  on public.verification_requests (status);

-- ---------------------------------------------------------------------------
-- verification_photos: selfie images attached to a request.
-- ---------------------------------------------------------------------------
create table if not exists public.verification_photos (
  id                      uuid primary key default gen_random_uuid(),
  verification_request_id uuid not null references public.verification_requests (id) on delete cascade,
  photo_url               text not null,
  photo_type              text not null default 'selfie'
                          check (photo_type in ('selfie', 'pose')),
  created_at              timestamptz not null default now()
);

create index if not exists verification_photos_request_idx
  on public.verification_photos (verification_request_id);

-- ---------------------------------------------------------------------------
-- verification_status_history: append-only audit trail of status changes.
-- ---------------------------------------------------------------------------
create table if not exists public.verification_status_history (
  id                      uuid primary key default gen_random_uuid(),
  verification_request_id uuid not null references public.verification_requests (id) on delete cascade,
  old_status              text,
  new_status              text not null,
  changed_at              timestamptz not null default now(),
  changed_by              uuid references auth.users (id) on delete set null
);

create index if not exists verification_history_request_idx
  on public.verification_status_history (verification_request_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger (reuse shared helper if present).
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_proc where proname = 'set_updated_at'
  ) then
    create function public.set_updated_at()
    returns trigger language plpgsql as $$
    begin
      new.updated_at = now();
      return new;
    end; $$;
  end if;
end $$;

drop trigger if exists verification_requests_set_updated_at on public.verification_requests;
create trigger verification_requests_set_updated_at
  before update on public.verification_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: a user manages only their own verification data. The
-- moderation/AI review surface (future) uses the service role and bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.verification_requests enable row level security;
alter table public.verification_photos enable row level security;
alter table public.verification_status_history enable row level security;

-- Requests: own-row read/write only.
drop policy if exists verification_requests_select_own on public.verification_requests;
create policy verification_requests_select_own
  on public.verification_requests for select
  using (auth.uid() = user_id);

drop policy if exists verification_requests_insert_own on public.verification_requests;
create policy verification_requests_insert_own
  on public.verification_requests for insert
  with check (auth.uid() = user_id);

drop policy if exists verification_requests_update_own on public.verification_requests;
create policy verification_requests_update_own
  on public.verification_requests for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists verification_requests_delete_own on public.verification_requests;
create policy verification_requests_delete_own
  on public.verification_requests for delete
  using (auth.uid() = user_id);

-- Photos: readable/insertable only for the owner's own request.
drop policy if exists verification_photos_select_own on public.verification_photos;
create policy verification_photos_select_own
  on public.verification_photos for select
  using (
    exists (
      select 1 from public.verification_requests r
      where r.id = verification_photos.verification_request_id
        and r.user_id = auth.uid()
    )
  );

drop policy if exists verification_photos_insert_own on public.verification_photos;
create policy verification_photos_insert_own
  on public.verification_photos for insert
  with check (
    exists (
      select 1 from public.verification_requests r
      where r.id = verification_photos.verification_request_id
        and r.user_id = auth.uid()
    )
  );

-- History: readable only for the owner's own request.
drop policy if exists verification_history_select_own on public.verification_status_history;
create policy verification_history_select_own
  on public.verification_status_history for select
  using (
    exists (
      select 1 from public.verification_requests r
      where r.id = verification_status_history.verification_request_id
        and r.user_id = auth.uid()
    )
  );
