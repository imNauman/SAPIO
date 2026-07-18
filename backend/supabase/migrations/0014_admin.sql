-- ============================================================================
-- Migration 0014: Admin Dashboard Platform
-- ----------------------------------------------------------------------------
-- Adds the RBAC + audit-log foundation for the internal Admin web app.
-- Tables: admin_roles, admin_permissions, admin_role_permissions,
--         admin_users, admin_activity_logs.
-- RLS is enabled on every table; the backend uses the service_role client
-- (supabaseAdmin) which bypasses RLS, so policies simply allow service_role.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
create table if not exists admin_roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique
                check (name in ('super_admin','admin','moderator','support','read_only')),
  description text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Permissions (capability keys)
-- ---------------------------------------------------------------------------
create table if not exists admin_permissions (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique
                check (key in (
                  'manage_users','manage_reports','manage_verification',
                  'manage_premium','manage_notifications','manage_content',
                  'view_analytics','manage_admins'
                )),
  description text
);

-- ---------------------------------------------------------------------------
-- Role -> Permission mapping (many-to-many)
-- ---------------------------------------------------------------------------
create table if not exists admin_role_permissions (
  role_id         uuid not null references admin_roles(id) on delete cascade,
  permission_key  text not null references admin_permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

-- ---------------------------------------------------------------------------
-- Admin users (links an auth.users row to a role)
-- ---------------------------------------------------------------------------
create table if not exists admin_users (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  role_id       uuid not null references admin_roles(id),
  email         text not null,
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  created_by    uuid references admin_users(id)
);

create index if not exists admin_users_user_id_idx on admin_users(user_id);
create index if not exists admin_users_email_idx on admin_users(email);

-- ---------------------------------------------------------------------------
-- Audit log (every privileged action is recorded)
-- ---------------------------------------------------------------------------
create table if not exists admin_activity_logs (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references admin_users(id) on delete cascade,
  action      text not null,
  target_type text,
  target_id   text,
  metadata    jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);

create index if not exists admin_activity_logs_admin_id_idx on admin_activity_logs(admin_id);
create index if not exists admin_activity_logs_created_at_idx on admin_activity_logs(created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table admin_roles            enable row level security;
alter table admin_permissions      enable row level security;
alter table admin_role_permissions enable row level security;
alter table admin_users            enable row level security;
alter table admin_activity_logs    enable row level security;

-- The backend always uses the service_role key, which bypasses RLS. These
-- policies allow service_role access so the same client works whether or not
-- RLS is enforced, and document the intent that only the trusted backend may
-- read/write admin data.
do $do$
declare
  t text;
begin
  foreach t in array array[
    'admin_roles','admin_permissions','admin_role_permissions',
    'admin_users','admin_activity_logs'
  ] loop
    execute format(
      'drop policy if exists %I on %I;', t || '_service_role', t
    );
    execute format(
      'create policy %I on %I for all to service_role using (true) with check (true);',
      t || '_service_role', t
    );
  end loop;
end $do$;

-- ---------------------------------------------------------------------------
-- Seed: roles
-- ---------------------------------------------------------------------------
insert into admin_roles (name, description) values
  ('super_admin', 'Full, unrestricted access to every admin capability.'),
  ('admin',       'Operational admin; manages users, content and reviews (except other admins).'),
  ('moderator',   'Reviews reports and verification requests, manages content.'),
  ('support',     'Customer support; handles reports and reads analytics.'),
  ('read_only',   'Read-only access for auditing and analytics viewing.')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: permissions
-- ---------------------------------------------------------------------------
insert into admin_permissions (key, description) values
  ('manage_users',       'Create/suspend/ban/delete users and reset their verification.'),
  ('manage_reports',     'View and resolve user-submitted reports.'),
  ('manage_verification','Approve or reject verification requests.'),
  ('manage_premium',     'View and manage subscriptions and boost sessions.'),
  ('manage_notifications','View and send notifications.'),
  ('manage_content',     'Moderate photos, bios and other user-generated content.'),
  ('view_analytics',     'View dashboards, counts and the activity log.'),
  ('manage_admins',      'Create admins and assign/change roles.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: role -> permission mapping
-- ---------------------------------------------------------------------------
with role_ids as (
  select id, name from admin_roles
),
perm_keys as (
  select key from admin_permissions
)
-- super_admin: every permission
insert into admin_role_permissions (role_id, permission_key)
select r.id, p.key
from role_ids r
cross join perm_keys p
where r.name = 'super_admin'
on conflict (role_id, permission_key) do nothing;

-- admin: all except manage_admins
insert into admin_role_permissions (role_id, permission_key)
select r.id, p.key
from role_ids r
cross join perm_keys p
where r.name = 'admin' and p.key <> 'manage_admins'
on conflict (role_id, permission_key) do nothing;

-- moderator: reports, verification, content, analytics
insert into admin_role_permissions (role_id, permission_key)
select r.id, p.key
from role_ids r
cross join (select key from admin_permissions where key in
  ('manage_reports','manage_verification','manage_content','view_analytics')) p
where r.name = 'moderator'
on conflict (role_id, permission_key) do nothing;

-- support: reports, analytics
insert into admin_role_permissions (role_id, permission_key)
select r.id, p.key
from role_ids r
cross join (select key from admin_permissions where key in
  ('manage_reports','view_analytics')) p
where r.name = 'support'
on conflict (role_id, permission_key) do nothing;

-- read_only: analytics only
insert into admin_role_permissions (role_id, permission_key)
select r.id, p.key
from role_ids r
cross join (select key from admin_permissions where key in
  ('view_analytics')) p
where r.name = 'read_only'
on conflict (role_id, permission_key) do nothing;
