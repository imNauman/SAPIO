-- SAPIO — User Profile table
-- Each authenticated user (auth.users) has exactly ONE profile (1:1).
-- Run in the Supabase SQL editor or via the Supabase CLI migration runner.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  bio text,
  birth_date date,
  gender text,
  interested_in text[] not null default '{}',
  relationship_goal text,
  height_cm integer check (height_cm is null or (height_cm between 120 and 250)),
  occupation text,
  education text,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  profile_completed boolean not null default false,
  is_verified boolean not null default false,
  is_premium boolean not null default false,
  last_active timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles (user_id);
create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_country_city_idx on public.profiles (country, city);

-- Keep updated_at fresh on every row update.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Touch last_active whenever the row is updated.
create or replace function public.touch_last_active()
returns trigger as $$
begin
  new.last_active = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_touch_last_active on public.profiles;
create trigger profiles_touch_last_active
  before update on public.profiles
  for each row execute function public.touch_last_active();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Public read: anyone authenticated can view a profile (needed for discovery
-- later). Sensitive fields are still governed by the app; tighten as needed.
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Insert: a user can only create their own profile.
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- Update: a user can only update their own profile.
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Delete: a user can only delete their own profile.
create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = user_id);
