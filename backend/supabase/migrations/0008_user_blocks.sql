-- 0008_user_blocks.sql
-- Canonical user blocking table. Supersedes the earlier `blocks` table:
-- we drop it (if it exists) so there is a single source of truth.

-- Remove the legacy table from 0007 to avoid two competing block stores.
drop table if exists public.blocks;

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references auth.users (id) on delete cascade,
  blocked_user_id uuid not null references auth.users (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  constraint user_blocks_two_distinct_users
    check (blocker_user_id <> blocked_user_id)
);

-- A user can block another at most once.
create unique index if not exists user_blocks_unique_pair_idx
  on public.user_blocks (least (blocker_user_id, blocked_user_id), greatest (blocker_user_id, blocked_user_id));

create index if not exists user_blocks_blocker_idx
  on public.user_blocks (blocker_user_id);
create index if not exists user_blocks_blocked_idx
  on public.user_blocks (blocked_user_id);

alter table public.user_blocks enable row level security;

-- A blocker can see and manage only their own blocks.
drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own"
  on public.user_blocks for select
  using (auth.uid () = blocker_user_id);

drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own"
  on public.user_blocks for insert
  with check (auth.uid () = blocker_user_id);

drop policy if exists "user_blocks_delete_own" on public.user_blocks;
create policy "user_blocks_delete_own"
  on public.user_blocks for delete
  using (auth.uid () = blocker_user_id);
