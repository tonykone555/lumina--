create extension if not exists pgcrypto;

create table if not exists public.instagram_profiles (
  username text primary key,
  instagram_id text not null,
  full_name text,
  profile_url text,
  profile_picture_url text,
  followers bigint,
  following bigint,
  posts_count bigint,
  biography text,
  website text,
  category text,
  is_private boolean,
  is_verified boolean,
  is_business boolean,
  public_email text,
  public_phone text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index if not exists instagram_profiles_instagram_id_idx on public.instagram_profiles(instagram_id);

create table if not exists public.instagram_searches (
  id uuid primary key default gen_random_uuid(),
  normalized_query text not null unique,
  original_query text not null,
  target_count integer not null default 1000,
  learned_keywords jsonb not null default '[]'::jsonb,
  searched_keywords jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.instagram_searches add column if not exists searched_keywords jsonb not null default '[]'::jsonb;

create table if not exists public.instagram_search_profiles (
  search_id uuid not null references public.instagram_searches(id) on delete cascade,
  username text not null references public.instagram_profiles(username) on delete cascade,
  relevance_score numeric not null default 0,
  discovery_depth integer not null default 0,
  parent_count integer not null default 0,
  expanded boolean not null default false,
  expanded_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (search_id, username)
);

create index if not exists instagram_search_profiles_rank_idx on public.instagram_search_profiles(search_id, relevance_score desc);
create index if not exists instagram_search_profiles_expand_idx on public.instagram_search_profiles(search_id, expanded, relevance_score desc);

create table if not exists public.instagram_discovery_edges (
  search_id uuid not null references public.instagram_searches(id) on delete cascade,
  parent_username text not null references public.instagram_profiles(username) on delete cascade,
  child_username text not null references public.instagram_profiles(username) on delete cascade,
  edge_type text not null default 'instagram_suggested',
  rank integer,
  discovered_at timestamptz not null default now(),
  primary key (search_id, parent_username, child_username)
);

create index if not exists instagram_edges_child_idx on public.instagram_discovery_edges(search_id, child_username);
create index if not exists instagram_edges_parent_idx on public.instagram_discovery_edges(search_id, parent_username);

alter table public.instagram_profiles enable row level security;
alter table public.instagram_searches enable row level security;
alter table public.instagram_search_profiles enable row level security;
alter table public.instagram_discovery_edges enable row level security;

-- No public policies are created intentionally. The Next.js server uses the service-role key.
