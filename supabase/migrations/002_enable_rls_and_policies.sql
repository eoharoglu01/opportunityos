alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.product_prices enable row level security;
alter table public.price_history enable row level security;
alter table public.favorites enable row level security;
alter table public.alerts enable row level security;
alter table public.notifications enable row level security;

create policy if not exists "Allow public read access to catalog data" on public.categories
  for select using (true);

create policy if not exists "Allow public read access to stores" on public.stores
  for select using (true);

create policy if not exists "Allow public read access to products" on public.products
  for select using (true);

create policy if not exists "Allow public read access to product prices" on public.product_prices
  for select using (true);

create policy if not exists "Allow public read access to price history" on public.price_history
  for select using (true);

create policy if not exists "Users can manage their own favorites" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "Users can manage their own alerts" on public.alerts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "Users can manage their own notifications" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "Users can manage their own profile" on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);
