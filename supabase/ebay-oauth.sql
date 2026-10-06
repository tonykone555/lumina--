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
revoke all on table public.ebay_oauth_connections from anon, authenticated;
grant select, insert, update, delete on table public.ebay_oauth_connections to service_role;
-- No browser policies: only privileged server-side code can access seller tokens.
