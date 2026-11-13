alter table public.purchases add column environment text not null default 'sandbox';
alter table public.purchases add column stripe_session_id text;