-- Server-side storage for the single YNOT Etsy OAuth connection (row id = 'primary').
-- Accessed only with the Supabase service-role/secret key from server routes.
create table if not exists public.etsy_oauth_connections (
  id text primary key,
  etsy_user_id text,
  access_token text not null,
  refresh_token text not null,
  scope text,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.etsy_oauth_connections enable row level security;
-- No RLS policies: only the service role (which bypasses RLS) may read/write tokens.
