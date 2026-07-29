-- OpportunityOS Supabase schema foundation
-- This migration creates the core catalog and personalization tables without demo data.

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  locale text not null default 'tr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  website_url text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  brand text,
  description text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'TRY',
  availability text not null default 'in_stock',
  url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, store_id)
);

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'TRY',
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  target_price numeric(12,2) not null check (target_price >= 0),
  comparison_operator text not null default '<=',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, is_active)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_slug on public.products(slug);
create index if not exists idx_products_active on public.products(is_active);
create index if not exists idx_product_prices_product_id on public.product_prices(product_id);
create index if not exists idx_product_prices_store_id on public.product_prices(store_id);
create index if not exists idx_product_prices_active on public.product_prices(is_active);
create index if not exists idx_price_history_product_id on public.price_history(product_id);
create index if not exists idx_price_history_captured_at on public.price_history(captured_at);
create index if not exists idx_favorites_user_id on public.favorites(user_id);
create index if not exists idx_price_alerts_user_id on public.price_alerts(user_id);
create index if not exists idx_price_alerts_active on public.price_alerts(is_active);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_unread on public.notifications(is_read);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create or replace trigger set_stores_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

create or replace trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create or replace trigger set_product_prices_updated_at
before update on public.product_prices
for each row execute function public.set_updated_at();

create or replace trigger set_price_history_updated_at
before update on public.price_history
for each row execute function public.set_updated_at();

create or replace trigger set_favorites_updated_at
before update on public.favorites
for each row execute function public.set_updated_at();

create or replace trigger set_price_alerts_updated_at
before update on public.price_alerts
for each row execute function public.set_updated_at();

create or replace trigger set_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.product_prices enable row level security;
alter table public.price_history enable row level security;
alter table public.favorites enable row level security;
alter table public.price_alerts enable row level security;
alter table public.notifications enable row level security;

create policy if not exists "Public read access categories" on public.categories
  for select using (true);

create policy if not exists "Public read access stores" on public.stores
  for select using (true);

create policy if not exists "Public read access products" on public.products
  for select using (true);

create policy if not exists "Public read access product prices" on public.product_prices
  for select using (true);

create policy if not exists "Public read access price history" on public.price_history
  for select using (true);

create policy if not exists "Users can manage their own profile" on public.profiles
  for all using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

create policy if not exists "Users can manage their own favorites" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "Users can manage their own price alerts" on public.price_alerts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "Users can read their own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy if not exists "Users can update their own notifications" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
