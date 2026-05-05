-- & you — Supabase schema
-- Run this in your Supabase SQL editor

-- Walls table
create table if not exists walls (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_at timestamptz default now()
);

-- Users table (no auth, identity in localStorage)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  wall_id uuid references walls(id) on delete cascade,
  name text not null,
  avatar_color text not null default '#c97b5a',
  device_token text,
  created_at timestamptz default now()
);

-- Regions table
create table if not exists regions (
  id uuid primary key default gen_random_uuid(),
  wall_id uuid references walls(id) on delete cascade,
  name text not null,
  "order" int not null default 0,
  unlock_date date,
  created_at timestamptz default now()
);

-- Items table
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  wall_id uuid references walls(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  title text not null,
  description text,
  image_url text,
  real_image_url text,
  location text,
  mood text not null default 'physical' check (mood in ('online', 'physical')),
  region_id uuid references regions(id) on delete set null,
  status text not null default 'committed' check (status in ('proposed', 'committed', 'done')),
  position int not null default 0,
  rotation_seed int not null default 0,
  created_at timestamptz default now()
);

-- Reactions table
create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  heart boolean not null default false,
  rating int check (rating >= 1 and rating <= 10),
  created_at timestamptz default now(),
  unique(item_id, user_id)
);

-- Enable real-time for all tables
alter publication supabase_realtime add table walls;
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table regions;
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table reactions;

-- Row Level Security: permissive (no auth, open by wall_id)
alter table walls enable row level security;
alter table users enable row level security;
alter table regions enable row level security;
alter table items enable row level security;
alter table reactions enable row level security;

-- Open policies (anyone with the wall code can read/write)
create policy "open walls" on walls for all using (true) with check (true);
create policy "open users" on users for all using (true) with check (true);
create policy "open regions" on regions for all using (true) with check (true);
create policy "open items" on items for all using (true) with check (true);
create policy "open reactions" on reactions for all using (true) with check (true);

-- Storage bucket for item images
insert into storage.buckets (id, name, public) values ('item-images', 'item-images', true)
on conflict do nothing;

create policy "public item images" on storage.objects
  for all using (bucket_id = 'item-images') with check (bucket_id = 'item-images');
