create extension if not exists pgcrypto;

create table if not exists public.ynot_catalog_products (
  ynot_id text primary key,
  country text not null,
  category text not null,
  title text not null,
  original_title text,
  brand text,
  source_brand text,
  image_url text,
  image_urls jsonb not null default '[]'::jsonb,
  ynot_price numeric(14,2) not null,
  currency text not null,
  ad_eligible boolean not null default false,
  intent_tags text[] not null default '{}',
  price_position text,
  active boolean not null default true,
  source_product_id text,
  source_variant_id text,
  best_source_url text,
  best_supplier_domain text,
  source_price numeric(14,2),
  shipping_reserve numeric(14,2),
  gross_contribution numeric(14,2),
  margin_pct numeric(8,2),
  reliability_score numeric(8,2),
  routing_score numeric(8,2),
  supplier_offer_count integer not null default 1,
  fingerprint text,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ynot_catalog_products_country_category_idx
  on public.ynot_catalog_products(country, category, ad_eligible, active);
create index if not exists ynot_catalog_products_routing_idx
  on public.ynot_catalog_products(routing_score desc);
create index if not exists ynot_catalog_products_fingerprint_idx
  on public.ynot_catalog_products(country, fingerprint);

create table if not exists public.ynot_catalog_supplier_offers (
  id uuid primary key default gen_random_uuid(),
  ynot_id text not null references public.ynot_catalog_products(ynot_id) on delete cascade,
  merchant_domain text,
  merchant_name text,
  source_url text not null,
  source_product_id text not null,
  source_variant_id text not null default '',
  source_price numeric(14,2) not null,
  source_currency text not null,
  shipping_reserve numeric(14,2) not null default 0,
  ynot_price numeric(14,2) not null,
  gross_contribution numeric(14,2),
  margin_pct numeric(8,2),
  reliability_score numeric(8,2),
  routing_score numeric(8,2),
  updated_at timestamptz not null default now(),
  unique(ynot_id, source_product_id, source_variant_id)
);

create index if not exists ynot_catalog_supplier_offers_rank_idx
  on public.ynot_catalog_supplier_offers(ynot_id, routing_score desc);

create table if not exists public.ynot_commerce_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  ynot_id text references public.ynot_catalog_products(ynot_id) on delete set null,
  source text,
  country text,
  value numeric(14,2),
  currency text,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ynot_commerce_events_product_time_idx
  on public.ynot_commerce_events(ynot_id, created_at desc);
create index if not exists ynot_commerce_events_type_time_idx
  on public.ynot_commerce_events(event_type, created_at desc);

alter table public.ynot_catalog_products enable row level security;
alter table public.ynot_catalog_supplier_offers enable row level security;
alter table public.ynot_commerce_events enable row level security;
