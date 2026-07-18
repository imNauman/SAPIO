-- SAPIO — Chat engine tables
-- One-to-one messaging is allowed ONLY between two users who share an ACTIVE
-- match. A conversation is created lazily on the first message and is 1:1 with
-- its match (one active conversation per match). Messages are soft-deleted
-- (deleted_at) so history can be retained for the counterpart. Run in the
-- Supabase SQL editor or via the CLI.

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_preview text,
  is_active boolean not null default true,
  -- One active conversation per match.
  constraint conversations_one_active_per_match
    unique (match_id, is_active)
);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id)
    on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  message_type text not null default 'text'
    check (message_type in ('text', 'image')),
  text text,
  image_url text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  -- A message must carry either text or an image (or both).
  constraint messages_has_content
    check (text is not null or image_url is not null)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Look up the conversation for a match quickly.
create index if not exists conversations_match_idx
  on public.conversations (match_id);

-- Active conversations for a user (joined via matches) — newest activity first.
create index if not exists conversations_last_message_at_idx
  on public.conversations (last_message_at desc nulls last);

-- Messages of a conversation, newest first.
create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at desc);

-- Messages sent by a user (for moderation / audit).
create index if not exists messages_sender_idx
  on public.messages (sender_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Conversations: a participant of the underlying match may access it.
-- We rely on the match's participants; the backend enforces this in the
-- service layer, but we also allow the two match participants at the row level.
create policy "Participants can view their conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = conversations.match_id
        and (m.user_one_id = auth.uid() or m.user_two_id = auth.uid())
    )
  );

create policy "Participants can insert their conversations"
  on public.conversations for insert
  with check (
    exists (
      select 1 from public.matches m
      where m.id = conversations.match_id
        and (m.user_one_id = auth.uid() or m.user_two_id = auth.uid())
    )
  );

create policy "Participants can update their conversations"
  on public.conversations for update
  using (
    exists (
      select 1 from public.matches m
      where m.id = conversations.match_id
        and (m.user_one_id = auth.uid() or m.user_two_id = auth.uid())
    )
  );

-- Messages: a participant of the parent conversation's match may access them.
create policy "Participants can view their messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      join public.matches m on m.id = c.match_id
      where c.id = messages.conversation_id
        and (m.user_one_id = auth.uid() or m.user_two_id = auth.uid())
    )
  );

create policy "Participants can insert their messages"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      join public.matches m on m.id = c.match_id
      where c.id = messages.conversation_id
        and (m.user_one_id = auth.uid() or m.user_two_id = auth.uid())
    )
  );

create policy "Senders can update their own messages"
  on public.messages for update
  using (sender_id = auth.uid());

create policy "Senders can delete (soft) their own messages"
  on public.messages for delete
  using (sender_id = auth.uid());
