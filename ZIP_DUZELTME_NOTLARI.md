# OpportunityOS ZIP Düzeltme Notları

Bu paket güncel kullanıcı ZIP'i üzerinden hazırlanmıştır.

## Yapılan düzeltmeler

1. Akıllı sepet arama sonuçları artık bütün sepet ürünleri arasında karıştırılmıyor.
   Her ürün yalnızca kendi `/api/search` sonucundan eşleştiriliyor. Bu, örneğin `su` aramasının `süt` sonuçlarıyla karışmasını önler.

2. `/api/catalog/[market]` GET route'u try/catch ile güvenli JSON hata cevabı döndürecek hale getirildi.
   Collector tarafındaki beklenmeyen hata artık HTML/boş cevap yerine JSON olarak raporlanır.

3. `/api/catalog/all` geçersiz JSON hataları ayrıntılandırıldı.
   HTTP durum kodu, content-type ve kısa cevap önizlemesi hata metnine eklenir. Böylece Vercel'deki gerçek hata kaynağı görülebilir.

4. `.DS_Store` dosyaları paketten temizlendi.

## Yerelde çalıştırılması gereken kontroller

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

Bu çalışma ortamında npm registry ağı kapalı olduğu için bağımlılıklar indirilemedi; bu nedenle `pnpm lint` ve `pnpm build` burada çalıştırılamadı. Paket üzerinde yapılmadığı halde yapılmış gibi doğrulama verilmemiştir.

## Canlı test

Deploy sonrasında kontrol edilecek adresler:

- `/api/catalog/all?maximumProductCount=5`
- `/api/catalog/a101?maximumProductCount=5`
- `/api/catalog/happy?maximumProductCount=5`
- `/shopping`

`/api/catalog/all` hâlâ hata verirse yeni ayrıntılı hata mesajı hangi route'un neden HTML veya 500 döndürdüğünü gösterecektir.
