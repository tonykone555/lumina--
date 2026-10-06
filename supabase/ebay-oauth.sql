-- Server-side storage for YNOT's single eBay seller OAuth connection.
-- Access only with the Supabase service role / secret key.
create table if not exists public.ebay_oauth_connections (
  id text primary key,
  access_token text not null,
  refresh_token text not null,
  scope text,
  expires_at timestamptz not null,
  refresh_token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ebay_oauth_connections enable row level security;
-- Intentionally no RLS policies: browser clients cannot read seller tokens.
