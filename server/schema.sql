create table if not exists public.rooms (
  id text primary key,
  host_id text not null default 'host',
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  participant_count integer not null default 1
);

alter table public.rooms enable row level security;

drop policy if exists "Public can create rooms" on public.rooms;
drop policy if exists "Public can read active rooms" on public.rooms;
drop policy if exists "Public can update active rooms" on public.rooms;

create index if not exists rooms_created_at_idx on public.rooms (created_at desc);
