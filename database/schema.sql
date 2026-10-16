-- ==============================================================================
-- Play Together - Database Schema
-- ==============================================================================
-- This schema provides PostgreSQL / Supabase persistence for rooms.
-- Note: The application runs with an ultra-low-latency in-memory store by default,
-- but this schema can be used with Supabase for persistent room records.
-- ==============================================================================

create table if not exists public.rooms (
  id text primary key,
  host_id text not null default 'host',
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  participant_count integer not null default 1
);

-- Enable Row Level Security (RLS)
alter table public.rooms enable row level security;

-- Policies for public room creation and access
drop policy if exists "Public can create rooms" on public.rooms;
drop policy if exists "Public can read active rooms" on public.rooms;
drop policy if exists "Public can update active rooms" on public.rooms;

create policy "Public can create rooms"
  on public.rooms
  for insert
  with check (true);

create policy "Public can read active rooms"
  on public.rooms
  for select
  using (is_active = true);

create policy "Public can update active rooms"
  on public.rooms
  for update
  using (is_active = true);

-- Indexes for performance
create index if not exists rooms_created_at_idx on public.rooms (created_at desc);
create index if not exists rooms_is_active_idx on public.rooms (is_active);
