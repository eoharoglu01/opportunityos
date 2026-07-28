insert into public.stores (name, slug, website_url, is_active)
values
  ('A101', 'a101', 'https://www.a101.com.tr/', true),
  ('BİM', 'bim', 'https://www.bim.com.tr/', true),
  ('ŞOK', 'sok', 'https://www.sokmarket.com.tr/', true),
  ('Migros', 'migros', 'https://www.migros.com.tr/', true),
  ('CarrefourSA', 'carrefoursa', 'https://www.carrefoursa.com/', true),
  ('Tarım Kredi', 'tarim-kredi', 'https://www.tkkoop.com.tr/', true),
  ('Bizim Toptan', 'bizim-toptan', 'https://www.bizimtoptan.com.tr/', true),
  ('Hakmar Express', 'hakmar-express', 'https://www.hakmarexpress.com.tr/', true),
  ('Happy Center', 'happy-center', 'https://www.happycenter.com.tr/', true),
  ('Onur Market', 'onur-market', 'https://www.onurmarket.com/', true),
  ('KİM Market', 'kim-market', 'https://www.kimmarket.com/', true)
on conflict (slug) do update
set
  name = excluded.name,
  website_url = excluded.website_url,
  is_active = true,
  updated_at = now();
