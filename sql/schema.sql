-- Run this once in the Supabase SQL Editor.

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  segment text not null check (segment in ('wedding', 'corporate')),
  category text not null,             -- e.g. 'holiday_party', 'luxury_wedding'
  price numeric,
  profit numeric,
  event_length_hours numeric,
  decision_maker text,                -- e.g. 'bride', 'hr_person'
  lead_source text,                   -- e.g. 'instagram', 'referral'
  would_do_again boolean,
  never_again boolean,
  event_date date,
  notes text,
  created_at timestamptz default now()
);

alter table events enable row level security;

create policy "Users can manage their own events"
  on events
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists target_market_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  segment text not null check (segment in ('wedding', 'corporate')),
  top_categories text,
  client_type text,
  lead_sources text,
  vendor_search_habit text,
  is_finalized boolean default false,
  updated_at timestamptz default now(),
  unique (user_id, segment)
);

alter table target_market_profiles enable row level security;

create policy "Users can manage their own profiles"
  on target_market_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Mirrors the `memberships` table pattern used by the Pricing Blueprint App.
-- Populated by a scheduled sync job (see api/cron/sync-memberships), not by
-- the app itself. Keyed on email since that's what we have at login time,
-- before we know if this is a returning user.
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null check (status in ('active', 'inactive')),
  offer_id text,
  synced_at timestamptz default now()
);

-- No RLS policy here on purpose: this table is only ever read/written by
-- the service role (server-side), never directly by a logged-in user's
-- browser session.
alter table memberships enable row level security;


-- Data API access. Supabase stopped auto-granting this for new tables in
-- "public" on Oct 30, 2026, so a fresh setup needs these explicitly.
-- No anon (logged-out) access anywhere. Row-level security above still
-- limits each student to their own rows.
grant select, insert, update, delete on public.events to authenticated, service_role;
grant select, insert, update, delete on public.target_market_profiles to authenticated, service_role;
-- Server-only table: never read by a student's browser.
grant select, insert, update, delete on public.memberships to service_role;
