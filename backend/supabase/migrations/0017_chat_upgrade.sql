-- SAPIO — Chat Experience Upgrade
-- Extends the existing chat engine (0006_chat.sql) with production messaging
-- features: message delivery status (sent/delivered/read), per-conversation
-- unread counts, lightweight typing events (NOT persisted), and a dedicated
-- image storage bucket. No new message/conversation tables are introduced —
-- we extend `messages` and `conversations` in place. Typing state is ephemeral
-- (in-memory on the server) and is intentionally NOT stored in the DB.
-- Run in the Supabase SQL editor or via the Supabase CLI migration runner.

-- ---------------------------------------------------------------------------
-- 1. messages: delivery status
-- ---------------------------------------------------------------------------
-- status: 'sent' (created) -> 'delivered' (reached backend/recipient session)
--         -> 'read' (recipient opened the conversation).
-- read_at: timestamp the recipient marked the message read.
alter table public.messages
  add column if not exists status text not null default 'sent'
    check (status in ('sent', 'delivered', 'read'));

alter table public.messages
  add column if not exists read_at timestamptz;

-- Index to find unread messages for a recipient quickly (per conversation).
create index if not exists messages_status_idx
  on public.messages (conversation_id, status);

-- ---------------------------------------------------------------------------
-- 2. conversations: unread count (recipient-relative)
-- ---------------------------------------------------------------------------
-- unread_count: number of messages in this conversation the *viewer* has not
-- read. We store it denormalized on the conversation and decrement it when the
-- viewer opens the thread (PATCH /messages/read). This avoids a per-message
-- unread scan on every list render.
alter table public.conversations
  add column if not exists unread_count integer not null default 0;

create index if not exists conversations_unread_idx
  on public.conversations (unread_count) where unread_count > 0;

-- ---------------------------------------------------------------------------
-- 3. Typing events — ephemeral, NOT persisted.
-- ---------------------------------------------------------------------------
-- Typing indicators are handled in-memory by the chat service (a TTL map) and
-- broadcast via the existing notification/event infrastructure. No table is
-- created. The 5-second auto-stop is enforced server-side by the service.

-- ---------------------------------------------------------------------------
-- 4. Image messages storage bucket
-- ---------------------------------------------------------------------------
-- Reuse Supabase Storage. Create a dedicated public bucket `chat-images` so
-- chat media is isolated from profile photos (different lifecycle/ACL).
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

-- Public read of chat images (bucket is public).
drop policy if exists "Chat images are publicly readable" on storage.objects;
create policy "Chat images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'chat-images');

-- Only authenticated users may upload chat images, and only into a folder
-- named after their own user id (chat-images/{userId}/...).
drop policy if exists "Users upload their own chat images" on storage.objects;
create policy "Users upload their own chat images"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[1] = 'chat-images'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Uploaders may delete their own chat images.
drop policy if exists "Users delete their own chat images" on storage.objects;
create policy "Users delete their own chat images"
  on storage.objects for delete
  using (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[1] = 'chat-images'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 5. Online status — derived, not stored.
-- ---------------------------------------------------------------------------
-- Online state is computed from profiles.last_active (already exists): a user
-- is "online" if last_active is within 5 minutes. No new column or table is
-- required. The frontend computes this from the profile it already loads.

-- ---------------------------------------------------------------------------
-- 6. Helper RPC: atomic unread increment
-- ---------------------------------------------------------------------------
-- A small SQL function so the unread bump is atomic (avoids lost updates under
-- concurrent message delivery). Safe to call repeatedly.
create or replace function public.increment_unread(conv_id uuid)
returns void
language sql
as $$
  update public.conversations
    set unread_count = unread_count + 1
  where id = conv_id;
$$;
