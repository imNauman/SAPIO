-- SAPIO — Match engine table
-- A match is created ONLY when two users have mutually liked each other
-- (A likes B AND B likes A). To guarantee a pair exists exactly once regardless
-- of who liked whom first, we store the two user ids in a deterministic order:
--   user_one_id = the smaller UUID (lexicographically)
--   user_two_id = the larger UUID
-- A unique index on (user_one_id, user_two_id) makes duplicates impossible, so
-- (A,B) and (B,A) collapse to the same row. Run in the Supabase SQL editor or
-- via the CLI.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid not null references auth.users (id) on delete cascade,
  user_two_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  matched_at timestamptz not null default now(),
  is_active boolean not null default true,
  constraint matches_two_distinct_users
    check (user_one_id <> user_two_id),
  constraint matches_ordered_pair
    check (user_one_id < user_two_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Unique pair: a match between two users can exist only once. The ordered-pair
-- check above guarantees (A,B) and (B,A) map to the same row, so this index
-- also enforces the "no duplicate match" rule at the DB level.
create unique index if not exists matches_unique_pair_idx
  on public.matches (user_one_id, user_two_id);

-- Fast lookup of all matches for a given user (either side of the pair).
create index if not exists matches_user_one_idx
  on public.matches (user_one_id);
create index if not exists matches_user_two_idx
  on public.matches (user_two_id);

-- Active matches first, newest first.
create index if not exists matches_active_created_idx
  on public.matches (is_active, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.matches enable row level security;

-- A user can see a match only if they are one of the two participants.
create policy "Users can view their own matches"
  on public.matches for select
  using (auth.uid() = user_one_id or auth.uid() = user_two_id);

-- A user can create a match only when they are one of the two participants.
create policy "Users can insert their own matches"
  on public.matches for insert
  with check (auth.uid() = user_one_id or auth.uid() = user_two_id);

-- A user can update (e.g. archive) only their own matches.
create policy "Users can update their own matches"
  on public.matches for update
  using (auth.uid() = user_one_id or auth.uid() = user_two_id);

-- A user can delete only their own matches.
create policy "Users can delete their own matches"
  on public.matches for delete
  using (auth.uid() = user_one_id or auth.uid() = user_two_id);
