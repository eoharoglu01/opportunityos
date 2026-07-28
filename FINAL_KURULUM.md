# OpportunityOS Production Release Kurulumu

## 1. Kurulum
ZIP'i açtıktan sonra klasörün içinde:

```bash
bash scripts/install-production-complete.sh
```

Bu işlem ana projeyi tarih damgalı klasöre yedekler, yeni kodu aktarır, `.env.local` ve `.env.production` dosyalarını korur ve Mac üzerinde şu kontrolleri çalıştırır:

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- `pnpm production:verify`

## 2. Supabase
SQL Editor'da sırayla mevcut migration'ların ardından şunu çalıştır:

```text
supabase/migrations/006_production_hardening.sql
```

## 3. Secret üretimi

```bash
pnpm secrets:generate
```

Çıktıdaki değerleri Vercel Production Environment Variables'a ekle. Service-role anahtarını hiçbir zaman `NEXT_PUBLIC_` ile tanımlama.

## 4. Vercel değişkenleri
`.env.production.example` içindeki değişkenleri Vercel'e ekle.

## 5. Test

```bash
pnpm production:check
APP_URL=https://alanadiniz.com pnpm production:smoke
```

Cron testi:

```bash
curl -i -X POST -H "Authorization: Bearer $CRON_SECRET" "https://alanadiniz.com/api/catalog/sync?markets=sok&maximumProductCount=5"
```

## 6. Git ve main
Ana projede temiz build sonrasında:

```bash
git add .
git commit -m "OpportunityOS production release 1.0.0"
git push
git checkout main
git pull
git merge --no-ff feat/user-alert-system
git push origin main
git tag -a v1.0.0 -m "OpportunityOS v1.0.0"
git push origin v1.0.0
```
