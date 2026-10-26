-- Run once in the Supabase SQL Editor, AFTER schema.sql.
-- Adds: login log, a block list, and database-level enforcement so a
-- blocked or non-member account can't read or write data even if they
-- bypass the app's screens.

-- 1. People you've removed from this app. (Does NOT touch their Kajabi
--    offer, and the Kajabi sync won't undo it.)
create table if not exists access_blocks (
  email text primary key,
  reason text,
  blocked_by text,
  blocked_at timestamptz default now()
);
alter table access_blocks enable row level security;  -- no policies: server-only

-- 2. Login log: one row per browser session that opens the app,
--    including people who were turned away.
create table if not exists login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text not null,
  allowed boolean not null,
  reason text not null,  -- 'active' | 'blocked' | 'no_membership' | 'inactive'
  user_agent text,
  created_at timestamptz default now()
);
create index if not exists login_events_created_idx on login_events (created_at desc);
create index if not exists login_events_email_idx on login_events (email);
alter table login_events enable row level security;  -- no policies: server-only

-- 3. One function answers "is the signed-in user allowed in right now?"
create or replace function is_active_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (
      select 1 from memberships m
      where m.email = lower(auth.jwt() ->> 'email') and m.status = 'active'
    )
    and not exists (
      select 1 from access_blocks b
      where b.email = lower(auth.jwt() ->> 'email')
    );
$$;

-- 4. Replace the earlier policies so they also require active membership.
drop policy if exists "Users can manage their own events" on events;
create policy "Active members manage their own events"
  on events for all
  using (auth.uid() = user_id and is_active_member())
  with check (auth.uid() = user_id and is_active_member());

drop policy if exists "Users can manage their own profiles" on target_market_profiles;
create policy "Active members manage their own profiles"
  on target_market_profiles for all
  using (auth.uid() = user_id and is_active_member())
  with check (auth.uid() = user_id and is_active_member());

-- Data API access for the new tables (server-only; see schema.sql note).
grant select, insert, update, delete on public.access_blocks to service_role;
grant select, insert, update, delete on public.login_events to service_role;
