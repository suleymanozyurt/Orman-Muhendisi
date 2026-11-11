# Orman Mühendisi

Orman Mühendisi web sitesinin geliştirme deposu. Taksonomi / Yaşam Ağacı,
birleşik arama, tür künyeleri, harita, gözlemler ve Sor asistanının kaynaklarını içerir.

## GitHub üzerinden geliştirme

GitHub'da **Code → Codespaces → Create codespace on main** seçin.
Geliştirme ortamı Node.js 22 ile açılır ve `npm ci` çalıştırır. Terminalde:

```bash
npm run dev -- --port 3000
```

Ports bölümünde 3000 numaralı önizlemeyi açın. Port görünürlüğünü Private tutun.
Değişiklikleri Source Control bölümünden commit edip Sync Changes ile gönderin.
Kodda `main` dalını geliştirme kaynağı olarak kullanıyoruz; ayrı çalışmalar için
dal açıp pull request ile birleştirebilirsiniz.

## Tasarım katmanı ve önizlemeler

- Güncel görünüm `app/orman-atlas.css` içindedir ve en son yüklenir. Açık temada zemin saf beyazdır; renkler ortak değişkenlerden gelir, koyu tema aynı kurallarla çalışır.
- `node scripts/build-pages.mjs` sitenin salt okunur önizlemesini `_pages/` klasörüne üretir. Üyelik, kayıt ve yapay zekâ bu önizlemede kapalıdır.
- Aynı derleme `_pages/lens-onizleme/` altına Orman Lens önizlemesini koyar: canlı kamera, “Neden bu tür?” kartı ve ikinci kare, açıkça işaretli örnek verilerle denenir.
- Önizleme adresi `https://suleymanozyurt.github.io/Orman-Muhendisi-Site/` olur. Yayın için depo ayarlarında Pages kaynağı “GitHub Actions” seçilmeli ve depo herkese açık olmalıdır (ya da hesap özel depoda Pages’e izin vermelidir); iş akışı `main` dalına gönderimde çalışır.

## Bilgisayarda geliştirme

Node.js 22.13 veya üzeri ve Linux / Windows WSL2 gerekir. `.nvmrc` Node.js 22'yi seçer.

```bash
git clone https://github.com/suleymanozyurt/Orman-Muhendisi-Site.git
cd Orman-Muhendisi-Site
npm ci
npm run dev -- --port 3000
```

Uygulama Vinext, React ve Cloudflare Worker çalışma ortamını kullanır. Yerel
Vite yapılandırması DB ve BUCKET bağlarını taklit eder; canlı veritabanını kopyalamaz.

## Kontroller

```bash
npm run build
node --test tests/*.test.mjs
node --test assistant-automation/monitor.test.mjs
```

`npm test` ilk iki komutu birlikte çalıştırır. GitHub Actions, push ve pull request
üzerinde TypeScript, derleme, uygulama testleri ve mevcut asistan testlerini çalıştırır.
Bu kontroller siteyi yayımlamaz. Asistanın mevcut ayrı zamanlı denetimi korunur.

## Dosya düzeni

| Konum | İçerik |
| --- | --- |
| `app/` | Sayfalar, bileşenler, API uçları ve uygulama verileri |
| `public/` | Görseller, fontlar ve PWA varlıkları |
| `db/`, `drizzle/` | Şema ve veritabanı geçiş geçmişi |
| `data/taxonomy-import/` | ICTV kaynak paketleri ve doğrulama manifestleri |
| `scripts/` | Derleme, veri aktarımı ve kalite yardımcıları |
| `tests/` | Uygulama ve veri bütünlüğü testleri |
| `assistant-automation/` | Önceden bulunan asistan denetimi |
| `.openai/hosting.json` | Mevcut Sites projesinin kimliği ve bağ tanımları |

## Hosting ve alan adı

### GitHub Pages geliştirme önizlemesi

`node scripts/build-pages.mjs` aynı uygulama bileşenlerini ve tasarım dosyalarını
`_pages/` dizininde tarayıcıda çalışan bir önizleme olarak derler. Pages açıldıktan
sonra `.github/workflows/pages.yml`, `main` dalına gönderilen her değişikliği
`https://suleymanozyurt.github.io/Orman-Muhendisi-Site/` adresine otomatik yayımlar.
GitHub'a kaydedilmeyen yerel değişiklikler bu adreste görünmez; yayın tamamlanınca
sayfayı yenileyin. Sonuç Actions bölümünde **Canlı geliştirme önizlemesi** altında izlenir.

Önizleme flora sorgularında üretimdeki kaynak kayıtlarını ve filtreleme kodunu
kullanır. ICTV ağacı bütün kaynak paketleri ve ebeveyn ilişkileri doğrulanarak
oluşturulur; büyük listelerin tümüne sayfalama ile erişilir. Uygun bilimsel
servislere doğrudan tarayıcıdan erişilir; bu servislerin CORS/erişim kısıtları
nedeniyle bazı sorgular kullanılamayabilir. Kaynak hataları başarılı cevap gibi
gösterilmez. Üyelik, ortak veritabanına yazma, sunucuya yükleme ve yapay zekâ
önizlemede etkin değildir. Bu sınır sayfanın üstünde belirtilir.

Mevcut GitHub planı, gizli depoda Pages kullanımına izin vermiyor. Pages'in açılması
için deponun herkese açık olması veya GitHub planının yükseltilmesi gerekir.
Görünürlük değişikliği kullanıcı onayı olmadan yapılmaz.

Tam uygulamanın hosting yayını ve alan adı bağlantısı ayrı bir aşamadır.
Sites ile GitHub arasında otomatik çift yönlü
senkronizasyon kurulmuş değildir; bundan sonraki kod çalışmalarını bu depoda yapın.

Uygulama yalnız statik dosyalardan oluşmadığı için GitHub Pages tek başına bütün
işlevleri çalıştırmaz. Hosting seçerken Worker/Vinext sunucusu, D1/SQLite veri
tabanı, R2/nesne depolama ve kimlik doğrulama ihtiyaçları birlikte ele alınmalıdır.
Başka sunucu mimarisi seçilirse ilgili adaptörler ayrıca hazırlanır.

Üretim kayıtları ve yüklenen kullanıcı görselleri Git deposuyla taşınmaz. Hosting
geçişinde bunlar ayrıca dışa aktarılmalı, sayıları ve ilişkileri doğrulanmalıdır.
Mevcut ChatGPT oturumu, Sites tarafından sağlanan güvenilir kimlik başlıklarını
kullanır. Haricî hostingde doğrulanmış kimlik doğrulama ve başlıkların dışarıdan
taklit edilmesini engelleyen sunucu yapılandırması tamamlanmadan yazma uçları
internete açılmamalıdır. Kanonik site adresi şu anda `app/seo.ts` içindedir;
alan adı bağlanırken paylaşım/PWA/SEO adresleri birlikte kontrol edilmelidir.

## Anahtarlar ve veriler

API anahtarlarını, oturum jetonlarını ve kişisel veri dışa aktarımlarını commit
etmeyin. `.env*`, `.dev.vars*`, `node_modules`, derleme çıktıları ve yerel çalışma
verileri Git dışında tutulur. Üretim anahtarları hostingin secret yönetimine
tanımlanır. Kaynak verilerinin lisans ve atıf kayıtlarını koruyun.

## Aktarım kaynağı

Site sürümü **57**, kaynak commit'i
`0603b3bd23065e548ce1c9c418a5a9a2e781eab4` temel alınmıştır. Mevcut
veritabanı geçiş dosyaları korunmuştur; canlı ortama uygulanmış oldukları bu
aktarımın kapsamındaki bir doğrulama değildir. Ayrıntı: [aktarım kaydı](docs/github-transfer.json).
