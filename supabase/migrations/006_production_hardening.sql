-- OpportunityOS production hardening. Idempotent and safe to rerun.
create extension if not exists pgcrypto;

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  report_type text not null check (report_type in ('wrong_price','product_missing','other')),
  message text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.price_quarantine (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  proposed_price numeric(12,2) not null check (proposed_price > 0),
  previous_price numeric(12,2),
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_job_locks (
  lock_name text primary key,
  locked_until timestamptz not null,
  owner text not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_product_prices_updated_at on public.product_prices(updated_at desc);
create index if not exists idx_price_history_product_store_captured on public.price_history(product_id, store_id, captured_at desc);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_user_reports_status_created on public.user_reports(status, created_at desc);
create index if not exists idx_catalog_sync_status_started on public.catalog_sync_runs(status, started_at desc);

alter table public.user_reports enable row level security;
alter table public.price_quarantine enable row level security;
alter table public.catalog_job_locks enable row level security;

create policy if not exists "Users insert own reports" on public.user_reports for insert with check (auth.uid() = user_id or user_id is null);
create policy if not exists "Users read own reports" on public.user_reports for select using (auth.uid() = user_id);
revoke all on public.price_quarantine from anon, authenticated;
revoke all on public.catalog_job_locks from anon, authenticated;

alter table public.product_prices drop constraint if exists product_prices_positive_price;
alter table public.product_prices add constraint product_prices_positive_price check (price > 0) not valid;
alter table public.price_history drop constraint if exists price_history_positive_price;
alter table public.price_history add constraint price_history_positive_price check (price > 0) not valid;
