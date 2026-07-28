# OpportunityOS Production Release Kontrolü

## Zorunlu
- [ ] Supabase migration 001–006 uygulandı
- [ ] Vercel Production değişkenleri eklendi
- [ ] CRON_SECRET en az 32 rastgele byte
- [ ] `pnpm production:check` başarılı
- [ ] `/api/health` 200
- [ ] `/api/readiness` 200
- [ ] Cron Bearer header ile test edildi
- [ ] Preview deployment gerçek cron/veri yazmıyor
- [ ] Alan adı ve HTTPS doğrulandı
- [ ] Gizlilik ve kullanım metinlerindeki şirket bilgileri tamamlandı

## İlk 24 saat
- Sync süresi, hata oranı, Supabase sorguları ve Vercel Function logları izlenir.
- Beklenmeyen maliyet veya tekrar eden collector hatasında cron geçici olarak kapatılır.
