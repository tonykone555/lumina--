-- Growth intent context for tailored outreach
alter table public.ynot_growth_opportunities
  add column if not exists source_quote text,
  add column if not exists budget_min numeric,
  add column if not exists budget_max numeric,
  add column if not exists budget_currency text,
  add column if not exists intent_tags text[] not null default '{}',
  add column if not exists constraints jsonb not null default '{}'::jsonb,
  add column if not exists personalization_context text;
