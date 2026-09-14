create extension if not exists pgcrypto;

create table if not exists public.ynot_users (
  id uuid primary key,
  referral_code text not null unique,
  parent_user_id uuid references public.ynot_users(id),
  display_name text,
  created_at timestamptz not null default now(),
  constraint ynot_no_self_referral check (parent_user_id is null or parent_user_id <> id)
);
create index if not exists ynot_users_parent_idx on public.ynot_users(parent_user_id);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ynot_users(id),
  amount_cents integer not null check (amount_cents <> 0),
  event_type text not null,
  status text not null default 'settled' check (status in ('reserved','settled','released')),
  event_key text not null unique,
  order_id text,
  related_user_id uuid references public.ynot_users(id),
  description text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists credit_transactions_user_idx on public.credit_transactions(user_id,created_at desc);
create index if not exists credit_transactions_order_idx on public.credit_transactions(order_id);

alter table public.ynot_users enable row level security;
alter table public.credit_transactions enable row level security;

create or replace function public.ynot_claim_referrer(p_user_id uuid,p_code text)
returns boolean language plpgsql security definer set search_path=public as $$
declare parent_id uuid;
begin
 select id into parent_id from ynot_users where referral_code=upper(trim(p_code));
 if parent_id is null or parent_id=p_user_id then return false; end if;
 update ynot_users set parent_user_id=parent_id where id=p_user_id and parent_user_id is null;
 return found;
end $$;

create or replace function public.ynot_release_expired_reservations()
returns integer language plpgsql security definer set search_path=public as $$
declare changed integer;
begin
 update credit_transactions set status='released'
 where status='reserved' and expires_at<now();
 get diagnostics changed=row_count;return changed;
end $$;

create or replace function public.ynot_available_credit(p_user_id uuid)
returns integer language sql security definer set search_path=public as $$
 select greatest(0,coalesce(sum(amount_cents) filter(where status in ('settled','reserved')),0)::integer)
 from credit_transactions where user_id=p_user_id
$$;

create or replace function public.ynot_reserve_credit(p_user_id uuid,p_checkout_ref text,p_amount_cents integer)
returns integer language plpgsql security definer set search_path=public as $$
declare available integer; requested integer;
begin
 perform ynot_release_expired_reservations();
 select ynot_available_credit(p_user_id) into available;
 requested:=least(greatest(p_amount_cents,0),available);
 if requested=0 then return 0;end if;
 insert into credit_transactions(user_id,amount_cents,event_type,status,event_key,description,expires_at)
 values(p_user_id,-requested,'checkout_credit','reserved','credit-reserve:'||p_checkout_ref,'Credits reserved for checkout',now()+interval '35 minutes')
 on conflict(event_key) do nothing;
 if not found then return 0;end if;
 return requested;
end $$;

create or replace function public.ynot_release_credit(p_checkout_ref text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 update credit_transactions set status='released' where event_key='credit-reserve:'||p_checkout_ref and status='reserved';
 return found;
end $$;

create or replace function public.ynot_settle_order(p_buyer_id uuid,p_order_id text,p_subtotal_cents integer,p_credit_cents integer,p_checkout_ref text)
returns boolean language plpgsql security definer set search_path=public as $$
declare inviter uuid;
begin
 if p_checkout_ref is not null then
  update credit_transactions set status='settled',order_id=p_order_id,expires_at=null
  where user_id=p_buyer_id and event_key='credit-reserve:'||p_checkout_ref and status='reserved';
 end if;
 if p_subtotal_cents>=10000 then
  select parent_user_id into inviter from ynot_users where id=p_buyer_id;
  if inviter is not null then
   insert into credit_transactions(user_id,amount_cents,event_type,status,event_key,order_id,related_user_id,description)
   values(inviter,500,'referral_order_reward','settled','referral-reward:'||p_order_id,p_order_id,p_buyer_id,'Direct Circle purchase reward')
   on conflict(event_key) do nothing;
  end if;
 end if;
 return true;
end $$;

create or replace function public.ynot_reverse_order(p_order_id text)
returns boolean language plpgsql security definer set search_path=public as $$
declare row record;
begin
 for row in select * from credit_transactions where order_id=p_order_id and status='settled' and event_type in ('referral_order_reward','checkout_credit')
 loop
  insert into credit_transactions(user_id,amount_cents,event_type,status,event_key,order_id,related_user_id,description)
  values(row.user_id,-row.amount_cents,'refund_reversal','settled','refund-reversal:'||row.id,p_order_id,row.related_user_id,
    case when row.event_type='checkout_credit' then 'Credits returned after refund' else 'Referral reward reversed after refund' end)
  on conflict(event_key) do nothing;
 end loop;
 return true;
end $$;

revoke all on public.ynot_users from anon,authenticated;
revoke all on public.credit_transactions from anon,authenticated;
revoke all on function public.ynot_claim_referrer(uuid,text) from public;
revoke all on function public.ynot_available_credit(uuid) from public;
revoke all on function public.ynot_reserve_credit(uuid,text,integer) from public;
revoke all on function public.ynot_release_credit(text) from public;
revoke all on function public.ynot_settle_order(uuid,text,integer,integer,text) from public;
revoke all on function public.ynot_reverse_order(text) from public;
