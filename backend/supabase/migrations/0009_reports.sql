-- ============================================================================
-- 0009_reports.sql — User Reporting System
-- ============================================================================
-- Reports let users flag profiles, messages, and photos for Trust & Safety
-- review. Reports are IMMUTABLE after submission and only SOFT-deleted (a
-- `deleted_at` is set; the row is retained for audit/moderation). A report may
-- target a profile (reported_user_id), a message (message_id), or a photo
-- (photo_id) — exactly one of those three is populated per the check below.
-- Categories are seeded once and referenced by category_id. Evidence images
-- (screenshots the reporter attaches) live in report_evidence.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- report_categories: seeded reference table (severity drives moderation queue
-- priority later; not enforced here).
-- ---------------------------------------------------------------------------
create table if not exists public.report_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  severity    text not null default 'medium'
              check (severity in ('low', 'medium', 'high', 'critical'))
);

-- Seed the default categories required by the spec.
insert into public.report_categories (name, description, severity)
values
  ('Fake Profile',  'Profile uses fake or stolen identity',            'high'),
  ('Spam',          'Repetitive, unsolicited, or promotional content', 'medium'),
  ('Harassment',    'Targeted abuse, bullying, or intimidation',       'high'),
  ('Nudity',        'Unsolicited nudity or sexual content',            'high'),
  ('Violence',      'Threats or glorification of violence',            'critical'),
  ('Underage User', 'User appears to be under the age of consent',     'critical'),
  ('Scam',          'Fraud, catfishing, or financial exploitation',    'critical'),
  ('Hate Speech',   'Discriminatory or hateful content',               'high'),
  ('Other',         'Does not fit another category',                   'low')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- reports: the report itself.
-- ---------------------------------------------------------------------------
-- The reports table may already exist as a minimal stub created by an earlier
-- migration (0007_user_preferences.sql). If so, we promote it to the full
-- schema below instead of re-declaring CREATE TABLE (which would be a no-op
-- and leave the `status` column missing, breaking the partial index at the
-- bottom of this file).
do $do$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'reports'
  ) then
    create table public.reports (
      id               uuid primary key default gen_random_uuid(),
      reporter_user_id uuid not null references auth.users (id) on delete cascade,
      reported_user_id uuid not null references auth.users (id) on delete cascade,
      message_id       uuid references public.messages (id) on delete set null,
      photo_id         uuid references public.profile_photos (id) on delete set null,
      category_id      uuid not null references public.report_categories (id),
      description      text,
      status           text not null default 'open'
                      check (status in ('open', 'under_review', 'resolved', 'dismissed')),
      priority         text not null default 'normal'
                      check (priority in ('low', 'normal', 'high', 'urgent')),
      created_at       timestamptz not null default now(),
      updated_at       timestamptz not null default now(),
      deleted_at       timestamptz
    );
  elsif not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reports' and column_name = 'status'
  ) then
    -- Minimal stub from 0007: promote it to the full schema.
    alter table public.reports
      add column message_id  uuid references public.messages (id) on delete set null,
      add column photo_id    uuid references public.profile_photos (id) on delete set null,
      add column category_id uuid references public.report_categories (id),
      add column description text,
      add column status text not null default 'open'
        check (status in ('open', 'under_review', 'resolved', 'dismissed')),
      add column priority text not null default 'normal'
        check (priority in ('low', 'normal', 'high', 'urgent')),
      add column updated_at timestamptz not null default now(),
      add column deleted_at timestamptz;
    alter table public.reports drop column if exists reason;
    -- Backfill category_id (safe whether or not rows already exist) then enforce NOT NULL.
    update public.reports
      set category_id = (select id from public.report_categories order by severity desc limit 1)
      where category_id is null;
    alter table public.reports alter column category_id set not null;
  end if;
end $do$;

-- Exactly one target: a report is about a profile, a message, OR a photo.
alter table public.reports
  drop constraint if exists reports_one_target;
alter table public.reports
  add constraint reports_one_target
    check (
      (
        (message_id is not null)::int +
        (photo_id is not null)::int
      ) <= 1
    );

-- Cannot report yourself.
alter table public.reports
  drop constraint if exists reports_no_self_report;
alter table public.reports
  add constraint reports_no_self_report
  check (reporter_user_id <> reported_user_id);

-- Cannot duplicate ACTIVE reports: at most one open/under_review report per
-- (reporter, reported_user, category) for the same target. Resolved/dismissed
-- or soft-deleted reports do not count, so a user may re-report later if a
-- prior one was closed.
create unique index if not exists reports_unique_active_idx
  on public.reports (reporter_user_id, reported_user_id, category_id,
                     coalesce(message_id, '00000000-0000-0000-0000-000000000000'),
                     coalesce(photo_id,    '00000000-0000-0000-0000-000000000000'))
  where status in ('open', 'under_review') and deleted_at is null;

create index if not exists reports_reporter_idx
  on public.reports (reporter_user_id) where deleted_at is null;
create index if not exists reports_reported_idx
  on public.reports (reported_user_id) where deleted_at is null;
create index if not exists reports_status_idx
  on public.reports (status, priority) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- report_evidence: screenshots / images the reporter attaches.
-- ---------------------------------------------------------------------------
create table if not exists public.report_evidence (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references public.reports (id) on delete cascade,
  image_url  text not null,
  created_at timestamptz not null default now()
);

create index if not exists report_evidence_report_idx
  on public.report_evidence (report_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger (shared helper if it exists, else inline).
-- ---------------------------------------------------------------------------
do $do$
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
end $do$;

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: a user may only see/manage their OWN reports. The
-- moderation dashboard (a separate, future admin surface) will use the service
-- role and bypass RLS.
-- ---------------------------------------------------------------------------
alter table public.report_categories enable row level security;
alter table public.reports enable row level security;
alter table public.report_evidence enable row level security;

-- Categories are readable by any authenticated user (needed to render the
-- picker in the report form).
drop policy if exists report_categories_select on public.report_categories;
create policy report_categories_select
  on public.report_categories for select
  using (auth.uid() is not null);

-- Reporters see only their own reports.
drop policy if exists reports_select_own on public.reports;
create policy reports_select_own
  on public.reports for select
  using (auth.uid() = reporter_user_id);

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own
  on public.reports for insert
  with check (auth.uid() = reporter_user_id);

-- Soft-delete only: no UPDATE of content, only deleted_at (via the service).
-- We allow updating deleted_at for the reporter's own rows.
drop policy if exists reports_soft_delete_own on public.reports;
create policy reports_soft_delete_own
  on public.reports for update
  using (auth.uid() = reporter_user_id)
  with check (auth.uid() = reporter_user_id);

-- Evidence is readable/insertable only for the reporter's own reports.
drop policy if exists report_evidence_select_own on public.report_evidence;
create policy report_evidence_select_own
  on public.report_evidence for select
  using (
    exists (
      select 1 from public.reports r
      where r.id = report_evidence.report_id
        and r.reporter_user_id = auth.uid()
    )
  );

drop policy if exists report_evidence_insert_own on public.report_evidence;
create policy report_evidence_insert_own
  on public.report_evidence for insert
  with check (
    exists (
      select 1 from public.reports r
      where r.id = report_evidence.report_id
        and r.reporter_user_id = auth.uid()
    )
  );
