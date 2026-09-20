-- DISCOVERX / YNOT Growth Radar CRM
-- Applied to Supabase project i y c x ... via Supabase migration tool.
create table if not exists public.ynot_growth_opportunities (
  id uuid primary key default gen_random_uuid(),
  external_key text not null unique,
  kind text not null check (kind in ('intent','creator','ugc','affiliate')),
  platform text not null default 'web',
  handle text, display_name text, profile_url text, source_post_url text,
  niche text, country text, followers integer, engagement numeric,
  intent_strength integer check (intent_strength is null or intent_strength between 0 and 100),
  creator_fit integer check (creator_fit is null or creator_fit between 0 and 100),
  summary text, reason text,
  matched_product_ids text[] not null default '{}',
  matched_products jsonb not null default '[]'::jsonb,
  draft_message text, channel text,
  status text not null default 'new' check (status in ('new','qualified','ready','contacted','replied','won','lost','dismissed')),
  owner text not null default 'RADAR' check (owner in ('RADAR','STORE','ARROW')),
  outreach_approved boolean not null default false,
  contacted_at timestamptz, next_action text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ynot_growth_opportunities_status_idx on public.ynot_growth_opportunities(status, updated_at desc);
create index if not exists ynot_growth_opportunities_kind_idx on public.ynot_growth_opportunities(kind, created_at desc);
create index if not exists ynot_growth_opportunities_owner_idx on public.ynot_growth_opportunities(owner, status);

create table if not exists public.ynot_growth_trends (
  id uuid primary key default gen_random_uuid(),
  external_key text not null unique, name text not null, platform text, niche text, audience text,
  lifecycle text check (lifecycle is null or lifecycle in ('early','growing','saturated','declining')),
  velocity_score integer check (velocity_score is null or velocity_score between 0 and 100),
  evidence jsonb not null default '[]'::jsonb,
  matched_product_ids text[] not null default '{}',
  matched_products jsonb not null default '[]'::jsonb,
  recommendation text,
  status text not null default 'active' check (status in ('active','watching','acted','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ynot_growth_trends_velocity_idx on public.ynot_growth_trends(velocity_score desc nulls last, updated_at desc);

create table if not exists public.ynot_growth_catalog_gaps (
  id uuid primary key default gen_random_uuid(),
  external_key text not null unique, niche text not null, demand_signal text, reason text,
  priority_score integer check (priority_score is null or priority_score between 0 and 100),
  source_refs jsonb not null default '[]'::jsonb,
  status text not null default 'new' check (status in ('new','researching','sourcing','covered','dismissed')),
  owner text not null default 'STORE' check (owner in ('RADAR','STORE','ARROW')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ynot_growth_catalog_gaps_priority_idx on public.ynot_growth_catalog_gaps(priority_score desc nulls last, updated_at desc);

create table if not exists public.ynot_growth_activity (
  id bigint generated always as identity primary key,
  opportunity_id uuid references public.ynot_growth_opportunities(id) on delete cascade,
  event_type text not null,
  actor text not null default 'system',
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ynot_growth_activity_opportunity_idx on public.ynot_growth_activity(opportunity_id, created_at desc);

alter table public.ynot_growth_opportunities enable row level security;
alter table public.ynot_growth_trends enable row level security;
alter table public.ynot_growth_catalog_gaps enable row level security;
alter table public.ynot_growth_activity enable row level security;
