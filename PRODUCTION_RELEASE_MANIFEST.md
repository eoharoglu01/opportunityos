# OpportunityOS Production Release Manifest

Bu paket, 17 başlığın uygulanabilir kod ve operasyon parçalarını tek release içinde toplar.

## Tam çalışan kod olarak eklenenler
- Vercel cron gruplama ve production yapılandırması
- Security headers, CSP, clickjacking ve referrer koruması
- Health, readiness ve version API'leri
- Cron Bearer secret doğrulaması, timing-safe karşılaştırma
- Sync rate limit, parametre doğrulama, market allow-list ve eşzamanlı çalışma kilidi
- Güvenli hata kimliği ve production hata mesajları
- Sync status limit doğrulaması
- Global error/loading/404 ekranları
- SEO metadata, robots, sitemap ve PWA manifest
- Gizlilik, kullanım koşulları, iletişim ve hesap sayfaları
- Bearer oturumuyla kullanıcı verisi dışa aktarma ve hesap silme API'leri
- Veri raporlama, fiyat karantinası ve job-lock tabloları için migration
- Ek indexler ve pozitif fiyat constraint hazırlığı
- CI workflow ve Dependabot
- Production env örneği ve secret üretme script'i
- Production verify, smoke test, otomatik yedekli kurulum ve rollback
- Changelog, security policy, release ve operasyon dokümanları

## Dış hesap bağlanınca etkinleşecek parçalar
- Vercel deployment, cron ve özel alan adı
- Supabase production migration ve backup ayarları
- E-posta/push sağlayıcısı
- Harici error tracking ve uptime monitoring
- Apple App Store / Google Play paketleme ve mağaza onayları

## Bilinçli olarak sahte entegrasyon yapılmayanlar
- Sentry/Resend/OneSignal gibi seçilmemiş sağlayıcılara uydurma anahtar veya çalışanmış gibi görünen kod eklenmedi.
- Şirket unvanı, adresi ve KVKK sorumlusu bilinmediği için yasal metinlerde tamamlanması gereken alanlar açıkça belirtilmiştir.
- Dağıtık rate limit ve lock için harici KV/Redis hesabı olmadan sahte kalıcılık iddia edilmemiştir; mevcut koruma tek runtime örneği içindir.
