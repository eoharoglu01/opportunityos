# Operasyon Rehberi

- Uygulama sağlığı: `/api/health`
- Veritabanı hazırlığı: `/api/readiness`
- Sürüm: `/api/version`
- Senkronizasyon geçmişi: `/api/catalog/sync/status` (Bearer CRON_SECRET)
- Manuel sync: POST `/api/catalog/sync?markets=sok&maximumProductCount=5`
- Hata halinde önce Vercel Function logu, sonra `catalog_sync_runs` kaydı incelenir.
- Rollback: `bash scripts/rollback-production.sh <yedek-klasörü>`
