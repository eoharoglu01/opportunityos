# OpportunityOS Final Web Paketi

Bu paket, mevcut ana projeye güvenli aktarım için hazırlanmıştır.

## Tek komutla kurulum

ZIP'i açtıktan sonra Terminal'de paket klasörüne girin ve çalıştırın:

```bash
bash scripts/install-final.sh
```

Betik varsayılan olarak `~/OpportunityOS/opportunityos` projesini yedekler, yeni sürümü aktarır, `.env.local` dosyasını korur ve şu kontrolleri çalıştırır:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm build
```

## Zorunlu veritabanı adımı

Supabase SQL Editor'da şu dosyayı bir kez çalıştırın:

```text
supabase/migrations/004_catalog_sync_runs.sql
```

Mevcut `003_automatic_price_history.sql` tetikleyicisi, fiyat değiştiğinde fiyat geçmişini otomatik kaydeder.

## Gerekli ortam değişkenleri

`.env.example` içindeki değişkenleri `.env.local` ve üretim ortamında tanımlayın. Özellikle:

- `SUPABASE_SERVICE_ROLE_KEY` yalnızca sunucu ortamında tutulmalıdır.
- `CRON_SECRET` uzun ve rastgele olmalıdır.
- Service role anahtarı tarayıcıya veya Git'e gönderilmemelidir.

## Otomatik fiyat güncelleme

Vercel Cron her gün UTC 03:00'te aşağıdaki rotayı çağırır:

```text
/api/catalog/sync?maximumProductCount=20
```

Elle geliştirme testi:

```text
http://localhost:3000/api/catalog/sync?maximumProductCount=5
```

Üretimde `Authorization: Bearer <CRON_SECRET>` gereklidir.

Son çalışmaları görmek için:

```text
GET /api/catalog/sync/status
```

Bu rota da üretimde Bearer secret ister.

## Yayın öncesi dış işlemler

Kod dışında kullanıcı hesaplarında tamamlanması gerekenler:

1. Supabase migration'larını production veritabanında çalıştırmak.
2. Vercel environment variables eklemek.
3. Alan adı ve production deployment yapmak.
4. Gerçek market collector'larını production IP ve çalışma süresi koşullarında test etmek.
5. Apple/Google mağazaları hedefleniyorsa web uygulamasını ayrıca mobil kabuğa paketlemek ve geliştirici hesaplarından yayınlamak.
