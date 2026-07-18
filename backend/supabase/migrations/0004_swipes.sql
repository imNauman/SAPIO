-- SAPIO — Swipe engine table
-- Records every LIKE / PASS a user makes on another user. One swipe per
-- (from_user, to_user) pair — enforced by a unique index. This milestone does
-- NOT create matches; a future match engine will read these rows to detect
-- mutual likes. Run in the Supabase SQL editor or via the CLI.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.swipes (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users (id) on delete cascade,
  to_user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (action in ('LIKE', 'PASS')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Unique pair: a user may swipe another user only once.
create unique index if not exists swipes_unique_pair_idx
  on public.swipes (from_user_id, to_user_id);

-- Fast lookup of everything a user has swiped (feed exclusion + history).
create index if not exists swipes_from_user_idx
  on public.swipes (from_user_id);

-- Fast lookup of who swiped a given user (used later by the match engine to
-- find reciprocal likes).
create index if not exists swipes_to_user_idx
  on public.swipes (to_user_id);

-- History ordering by recency.
create index if not exists swipes_created_at_idx
  on public.swipes (from_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.swipes enable row level security;

-- A user can see only their own swipes.
create policy "Users can view their own swipes"
  on public.swipes for select
  using (auth.uid() = from_user_id);

-- A user can create swipes as themselves only.
create policy "Users can insert their own swipes"
  on public.swipes for insert
  with check (auth.uid() = from_user_id);

-- A user can delete (undo) only their own swipes.
create policy "Users can delete their own swipes"
  on public.swipes for delete
  using (auth.uid() = from_user_id);
