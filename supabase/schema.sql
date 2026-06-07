-- Enable UUID generation extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Authenticated Users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  username text unique,
  full_name text,
  avatar_url text,
  constraint username_length check (char_length(username) >= 3)
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

create policy "Allow public read access to profiles" on public.profiles
  for select using (true);

create policy "Allow users to update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- 2. Roadmaps Table (Stores generated skill trees)
create table public.roadmaps (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade, -- Nullable for guests
  guest_session_id text, -- Nullable for authenticated users
  user_ip text, -- For IP-based rate limiting
  topic text not null,
  nodes jsonb not null, -- Stores the JSON array of nodes and relations
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint has_owner check (user_id is not null or guest_session_id is not null)
);

-- Enable RLS for roadmaps
alter table public.roadmaps enable row level security;

create policy "Allow read access to roadmaps" on public.roadmaps
  for select using (true);

create policy "Allow authenticated users to create roadmaps" on public.roadmaps
  for insert with check (auth.uid() = user_id or (user_id is null and guest_session_id is not null));

create policy "Allow owners to delete their roadmaps" on public.roadmaps
  for delete using (auth.uid() = user_id);

-- 3. User Progress Table (Tracks locking/completions)
create table public.user_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  guest_session_id text,
  roadmap_id uuid references public.roadmaps on delete cascade not null,
  node_id text not null, -- Matches the node ID inside the roadmap nodes JSON
  status text not null check (status in ('locked', 'unlocked', 'completed')) default 'locked',
  quiz_score integer,
  completed_at timestamp with time zone,
  constraint has_progress_owner check (user_id is not null or guest_session_id is not null)
);

-- Indexes for quick lookup and unique constraints depending on auth/guest status
create unique index user_progress_auth_unique_idx 
  on public.user_progress(roadmap_id, node_id, user_id) 
  where user_id is not null;

create unique index user_progress_guest_unique_idx 
  on public.user_progress(roadmap_id, node_id, guest_session_id) 
  where guest_session_id is not null;

-- Enable RLS for progress
alter table public.user_progress enable row level security;

create policy "Allow read access to progress states" on public.user_progress
  for select using (true);

create policy "Allow progress updates" on public.user_progress
  for insert with check (auth.uid() = user_id or (user_id is null and guest_session_id is not null));

create policy "Allow progress mutations" on public.user_progress
  for update using (auth.uid() = user_id or (user_id is null and guest_session_id is not null));

-- 4. Cached Papers Table (Semantic Scholar Metadata cache)
create table public.cached_papers (
  id text primary key, -- Semantic Scholar Paper ID
  title text not null,
  authors jsonb, -- Array of authors: [{name: "...", authorId: "..."}]
  abstract text,
  year integer,
  citation_count integer,
  external_pdf_url text,
  doi text,
  fetched_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for cached papers
alter table public.cached_papers enable row level security;

create policy "Allow anyone to read cached papers" on public.cached_papers
  for select using (true);

create policy "Allow backend insertion to cached papers" on public.cached_papers
  for insert with check (true);
