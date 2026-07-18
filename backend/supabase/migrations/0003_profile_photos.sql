-- SAPIO — Profile photos table + storage bucket
-- Each user may have up to 9 photos. Exactly one may be primary. Order is
-- controlled by `display_order`. Photos are stored in Supabase Storage under
-- `profiles/{userId}/`. Run in the Supabase SQL editor or via the CLI.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  photo_url text not null,
  storage_path text not null,
  display_order integer not null default 0,
  is_primary boolean not null default false,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_photos_user_id_idx
  on public.profile_photos (user_id);
create index if not exists profile_photos_user_order_idx
  on public.profile_photos (user_id, display_order);

-- Enforce exactly one primary photo per user (partial unique index).
drop index if exists profile_photos_single_primary_idx;
create unique index profile_photos_single_primary_idx
  on public.profile_photos (user_id)
  where is_primary = true;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
-- Keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profile_photos_set_updated_at on public.profile_photos;
create trigger profile_photos_set_updated_at
  before update on public.profile_photos
  for each row execute function public.set_updated_at();

-- Enforce the 9-photo limit per user.
create or replace function public.enforce_photo_limit()
returns trigger as $$
declare
  photo_count integer;
begin
  select count(*) into photo_count
  from public.profile_photos
  where user_id = new.user_id;

  if photo_count >= 9 then
    raise exception 'A user may have at most 9 photos'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists profile_photos_limit on public.profile_photos;
create trigger profile_photos_limit
  before insert on public.profile_photos
  for each row execute function public.enforce_photo_limit();

-- ---------------------------------------------------------------------------
-- Row Level Security (table)
-- ---------------------------------------------------------------------------
alter table public.profile_photos enable row level security;

-- Public read: photos are meant to be discoverable by other users later.
create policy "Profile photos are viewable by everyone"
  on public.profile_photos for select
  using (true);

-- Insert: a user can only add photos to their own profile.
create policy "Users can insert their own photos"
  on public.profile_photos for insert
  with check (auth.uid() = user_id);

-- Update: a user can only edit their own photos.
create policy "Users can update their own photos"
  on public.profile_photos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Delete: a user can only delete their own photos.
create policy "Users can delete their own photos"
  on public.profile_photos for delete
  using (auth.uid() = user_id);

-- Bulk reorder: apply an array of {id, display_order} in one transaction.
create or replace function public.reorder_photos(
  updates jsonb
)
returns void
language plpgsql
as $$
declare
  item jsonb;
begin
  foreach item in array updates
  loop
    update public.profile_photos
    set display_order = (item->>'display_order')::int
    where id = (item->>'id')::uuid;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage bucket + policies
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

-- Public read of stored objects (bucket is public).
create policy "Profile photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

-- Upload: only into the caller's own folder `profiles/{uid}/`.
create policy "Users can upload their own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Update/delete: only the owner of the folder.
create policy "Users can update their own photos"
  on storage.objects for update
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can delete their own photos"
  on storage.objects for delete
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
