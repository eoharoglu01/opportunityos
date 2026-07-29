# OpportunityOS Hızlandırılmış Düzeltme Paketi

Bu sürüm, önceki çalışan ZIP'in üzerine hazırlanmıştır.

## Ek düzeltmeler

- Akıllı sepette her alışveriş kalemi yalnızca kendi arama sonuçlarıyla eşleştirilir.
- Collector route'ları beklenmeyen hatalarda JSON hata cevabı döndürür.
- Onur Market collector içindeki kullanılmayan eski fonksiyon kaldırıldı.
- Alışveriş sayfasındaki gereksiz ESLint susturma satırı kaldırıldı.
- Arama sonuçlarında bütün ürünlerin `id: 0` dönmesi düzeltildi; gerçek fiyat kaydı kimliği kullanılıyor.
- `Opportunity.id` tipi Supabase UUID kayıtlarıyla uyumlu olacak şekilde `number | string` yapıldı.
- Veritabanında bozuk kodlanmış `GÃ¼ngÃ¶r`, `SÃ¼t` benzeri metinler API çıktısında otomatik onarılır.

## Mac'te doğrulama

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Canlı test

- `/api/search?query=su` çıktısında Türkçe karakterleri kontrol et.
- `/shopping` içinde süt, su ve katalogda bulunan diğer ürünleri hesapla.
- `/api/catalog/all?maximumProductCount=5` hata verirse ayrıntılı JSON mesajını kontrol et.
