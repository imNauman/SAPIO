-- 0011_notifications.sql
-- Push notification platform schema.
--
-- Why: Decouples notification delivery from business logic. Every business
-- module publishes a domain EVENT (see backend/src/events); the notification
-- module subscribes and persists + dispatches. This migration stores (1) device
-- push tokens, (2) the notification inbox, and (3) per-user preferences. The
-- architecture is channel-agnostic: future Email/SMS channels reuse the same
-- event bus + NotificationService without touching business modules.

-- ---------------------------------------------------------------------------
-- device_tokens: one row per registered push token per user/device.
-- ---------------------------------------------------------------------------
create table if not exists device_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  device_token text not null,
  platform     text not null check (platform in ('ios', 'android', 'web')),
  device_name  text,
  last_seen    timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- A user should not have the same token registered twice.
create unique index if not exists device_tokens_user_token_idx
  on device_tokens (user_id, device_token);

create index if not exists device_tokens_user_idx on device_tokens (user_id);

-- ---------------------------------------------------------------------------
-- notifications: the in-app notification inbox for each user.
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null check (
    type in (
      'new_match',
      'new_message',
      'verification_approved',
      'verification_rejected',
      'report_resolved'
    )
  ),
  title      text not null,
  body       text not null,
  payload    jsonb,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- notification_preferences: per-user toggles (one row per user, PK = user_id).
-- ---------------------------------------------------------------------------
create table if not exists notification_preferences (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  new_match            boolean not null default true,
  new_message          boolean not null default true,
  profile_like         boolean not null default true,
  verification_updates boolean not null default true,
  marketing            boolean not null default false,
  email_notifications  boolean not null default false,
  push_notifications   boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Row Level Security: a user may only touch their own rows.
-- ---------------------------------------------------------------------------
alter table device_tokens enable row level security;
alter table notifications enable row level security;
alter table notification_preferences enable row level security;

-- device_tokens: owner-only CRUD.
drop policy if exists device_tokens_owner_select on device_tokens;
create policy device_tokens_owner_select on device_tokens
  for select using (auth.uid() = user_id);

drop policy if exists device_tokens_owner_insert on device_tokens;
create policy device_tokens_owner_insert on device_tokens
  for insert with check (auth.uid() = user_id);

drop policy if exists device_tokens_owner_update on device_tokens;
create policy device_tokens_owner_update on device_tokens
  for update using (auth.uid() = user_id);

drop policy if exists device_tokens_owner_delete on device_tokens;
create policy device_tokens_owner_delete on device_tokens
  for delete using (auth.uid() = user_id);

-- notifications: owner-only select/update (no client insert/delete — server only).
drop policy if exists notifications_owner_select on notifications;
create policy notifications_owner_select on notifications
  for select using (auth.uid() = user_id);

drop policy if exists notifications_owner_update on notifications;
create policy notifications_owner_update on notifications
  for update using (auth.uid() = user_id);

-- notification_preferences: owner-only select/insert/update.
drop policy if exists notification_preferences_owner_select on notification_preferences;
create policy notification_preferences_owner_select on notification_preferences
  for select using (auth.uid() = user_id);

drop policy if exists notification_preferences_owner_insert on notification_preferences;
create policy notification_preferences_owner_insert on notification_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists notification_preferences_owner_update on notification_preferences;
create policy notification_preferences_owner_update on notification_preferences
  for update using (auth.uid() = user_id);
