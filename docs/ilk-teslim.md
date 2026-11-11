# İlk teslim — Orman Lens kamera önizlemesi

Tarih: 10 Kasım 2026 · Taban: v67 kaynak paketi (SHA-256 `a4c3df2f…f9c3`, doğrulandı) · Dal: `claude/v67-tasarim`

Bu belge talimatın “ilk teslimde beklediğim” dört maddesine göre düzenlendi. Canlı siteye, üretim verisine ve alan adına dokunulmadı.

## 1. GitHub ana dalı ile v67 farkı

Ana dal (`4e5e610`) 20 Ekim 2026’da Sites sürüm 57’den aktarılmış ve GitHub için uyarlanmış. v67 ile karşılaştırma:

| Durum | Sayı | İçerik |
|---|---|---|
| Yalnız ana dalda | 10 | `.github` iş akışları, `.devcontainer`, `.nvmrc`, `assistant-automation`, Pages önizlemesi (`preview/`, `scripts/build-pages.mjs`, testi), `scripts/verify-worker-runtime.mjs`, iki belge |
| Yalnız v67’de | 20 | Lens’in yeni modları (`lens-advanced`, `lens-live`, `lens-hold`, `lens-modes` ve API uçları), `atlas-workbench.css`, `observation-page-query`, dört test, eski taksonomi arşivi |
| İkisinde farklı | 34 | Lens, ana sayfa, besleme, kabuk ve servis çalışanı dosyaları; taksonomi belgesi ve bir migration |

Bu dalda yapılan: v67 ana dalın üzerine tek commit olarak alındı. Ana dalda olup pakette bulunmayan hiçbir dosya silinmedi. GitHub için uyarlanmış `.gitignore`, `README.md` ve `vite.config.ts` ana daldaki haliyle bırakıldı; üretilmiş `.vinext/` klasörü eklenmedi. `main` dalına dokunulmadı.

## 2. Kamera: referans, v67 ve bu dal

Ölçüm yöntemi: 402 × 874 CSS piksel (iki referansın en-boy oranı), Chromium, sahte kamera akışı. **Gerçek cihaz testi değildir**; iPhone Safari’nin araç çubukları ve güvenli alanları bu ölçümde yoktur.

| Öğe | Referans (707 × 1536 üzerinden ölçüm) | v67 | Bu dal |
|---|---|---|---|
| Kadraj genişliği / üst kenarı | %69,7 / %24,0 | %70,0 / %24,0 | aynı |
| Galeri merkezi | %22,6 / %80,9 | %23,2 / %81,5 | aynı |
| Deklanşör merkezi | %50 / %80,9 | %50 / %81,5 | aynı |
| Deklanşör + halka genişliği | %21,6 | %21,4 | aynı |
| Kamera çevirme merkezi (Hazırla) | %77,2 / %80,9 | %77,3 / %81,5 | aynı |
| Mod şeridi genişliği / merkezi | %81,0 / %91,6 | %82,0 / %91,7 | aynı |
| Hazırla fikirleri, ilk düğme merkezi | %61,2 | %62,4 | aynı |
| Tür Bul deklanşör halkası | koyu gri | açık, yarı saydam | koyu gri |
| Flaş simgesi (flaş yokken) | görünür, üstü çizili | çok soluk | daha görünür |
| Kamera çevirme simgesi | küçük | iri | küçültüldü |

Sonuç: v67’nin yerleşimi referansa ölçüyle yakın; ölçülebilen her nokta en çok 1,2 puan sapıyor. Bu dalda yalnız üç görünüm ayrıntısı değişti. Başlık yüksekliği (referansta %8,8) bu ölçümde karşılaştırılamadı, çünkü değer iPhone’un üst güvenli alanına bağlı.

[ÇIKARIM] “Tasarım hâlâ istediğim gibi değil” geri bildirimi büyük olasılıkla ölçülerden değil, gerçek iPhone’daki davranıştan kaynaklanıyor (Safari çubukları, güvenli alanlar, gömülü görünüm). Bunu ancak telefondaki ekran görüntüsüyle doğrulayabilirim.

Görseller: `ilk-teslim/kamera-karsilastirma-tur-bul.jpg`, `ilk-teslim/kamera-karsilastirma-hazirla.jpg` (soldan sağa: referans, v67, bu dal).

## 3. Yeni akış: gerekçe ve ikinci kare

Talimatın 12. bölümündeki ilk iki fikir tek akışta kodlandı: fotoğraf çek → önerinin gerekçesini gör → gerekiyorsa ikinci kareyi aynı gözleme ekle → gözleme aktar.

- **“Neden bu tür?” kartı.** Her aday için fotoğrafta görülen özellikler, görülmeyenler ve en çok karışan türle belirleyici fark ayrı alanlarda gelir. “Yapay zekâ önerisi” etiketi ile “GBIF kaynak kaydı” bağlantısı farklı biçimdedir. Öneri kendiliğinden doğrulanmış kayda dönüşmez.
- **Rehberli ikinci kare.** Servis, fotoğraf adayları ayırmaya yetmiyorsa hangi organın neden çekileceğini bildirir. İkinci kare ilk kareyle birlikte servise gider ve aynı gözleme eklenir; en çok dört kare tutulur.
- **Servis.** `app/api/photo-identify/handler.ts` şeması `seen`, `notSeen`, `lookalike`, `difference` ve `nextShot` alanlarını ister; biçimi bozuk kanıt yanıtın tamamını düşürmez, yalnız o parça atılır. Eski biçimdeki yanıtlar geçerli kalır.
- **Sınır.** İstek gövdesi üst sınırı iki kare için 1,7 MB’tan 3,3 MB’a çıktı.

Doğrulama: tip denetimi temiz, 268 testin 268’i geçti (ana daldaki Pages testleri dahil; 2’si yeni), üretim derlemesi geçti, başlangıç JavaScript’i 178,6 KiB gzip (bütçe 200). Gemini, OpenAI ve Pl@ntNet ile **gerçek servis çağrısı yapılmadı**; yeni alanlar yalnız sahte yanıtlarla sınandı.

Görsel: `ilk-teslim/neden-bu-tur-akisi.jpg`.

## 4. iPhone önizlemesi

`node scripts/build-lens-preview.mjs` tek dosyalık bir sayfa üretir (`preview/dist/orman-lens-onizleme.html`). Sayfa dalın kendi `AddMenu` ve `LensCapture` bileşenlerini çalıştırır; sunucu, anahtar ve gerçek veri içermez.

| Durum | Kapsam |
|---|---|
| Çalışıyor | Fotoğraf çekme ve seçme, kadraj, gerekçe kartı, ikinci kare, tür seçimi, cihazda taslak kaydı |
| Önizlemeye özgü | Tanıma Claude ile ya da örnek veriden; GBIF eşleşmesi, tür künyesi ve giriş yok |
| Bağlı değil | Canlı Sor’un sesli akışı, Hazırla’nın serbest istekleri |
| Kısıt | Claude içinde açılan sayfa canlı kamera görüntüsü alamaz; deklanşör telefonun kamerasını açar |

Örnek senaryolar: karaçam (ikinci kare önerilir), Lübnan sediri (kanıt yeterli), türü belirsiz gözlem, sonuç yok, bağlantı kesildi, giriş gerekli, servis bağlı değil. Örnek metinlerdeki botanik ifadeler yayın öncesinde kaynakla doğrulanmalıdır [TEYİT GEREKLİ].

Canlı vizörün iPhone’da denenmesi için sitenin kendi HTTPS adresinde çalışan bir deneme ortamı gerekir; bu oturumda kurulmadı.

## 5. Kademeli geliştirme planı

Her adım tek kullanıcı akışıdır; tasarım ve kod birlikte ilerler, geri bildirimden sonra sıradakine geçilir.

| Sıra | Akış | Teslim | Bağımlılık |
|---|---|---|---|
| 1 | Kamera (bu teslim) | Gerekçe kartı, ikinci kare, önizleme | iPhone geri bildirimi |
| 2 | Kamera, gerçek cihaz | Safari ve ana ekran kipinde ölçüm, güvenli alan düzeltmeleri | HTTPS deneme adresi |
| 3 | Ana ekran ve arama | Arama, harita ve gözlem ekleme ilk bakışta; boş ve hata durumları | — |
| 4 | Tür künyesi | Sekmeler, kaynak ve lisans görünürlüğü, benzer tür karşılaştırması | — |
| 5 | Harita | Filtrelerin listeye dönüşte korunması, GBIF ve topluluk kayıtlarının ayrımı | — |
| 6 | Gözlem | Çok kareli taslak, hassas konum, çift gönderim koruması | 1. adım |
| 7 | Taşınabilirlik | Adreslerin ortam ayarına alınması, ortam değişkeni örneği, CI | Barındırma kararı |
| 8 | Veri aktarımı | Aşağıdaki plan, önce deneme ortamında | Onay ve lisans kapıları |

## 6. Altı dış kaynak: envanter ve aktarım planı

Erişim tarihi 10 Kasım 2026. “Doğrulandı” yalnız bu oturumda resmî sayfa ya da API’den okunan bilgiyi gösterir. Hiçbir veri indirilmedi ve aktarılmadı.

| Kaynak | Resmî yol | Sürüm / boyut | Lisans | Durum |
|---|---|---|---|---|
| ITIS | `itis.gov/ftp_download.html` | Dosyalar ay sonuna doğru yenilenir | CC0, atıf istenir (DOI 10.5066/F7KH0KBK) | Lisans doğrulandı; kayıt sayısı [TEYİT GEREKLİ] |
| IPNI | `ipni.org` resmî indirme | [TEYİT GEREKLİ] | CC BY (kullanım koşulları sayfası) | Lisans doğrulandı; toplu indirme yolu [TEYİT GEREKLİ] |
| Kew WCVP | `sftp.kew.org/pub/data-repositories/WCVP/` (`wcvp.zip`, `wcvp_dwca.zip`, 84 MB) | 16.0, 4 Haziran 2026; ChecklistBank’te 1.449.468 ad kullanımı | ChecklistBank kaydında CC BY | Sürüm doğrulandı; Kew’in kendi koşul sayfası açılamadı (403) [TEYİT GEREKLİ] |
| iNaturalist | Önerilen API yolu ya da resmî veri dağıtımı | API’de 1.135.899 etkin tür rütbesi | Gözlem, fotoğraf ve ses ayrı lisanslı | Sayı doğrulandı; takson listesinin toplu kullanım koşulu [TEYİT GEREKLİ] |
| Pl@ntNet | Resmî API | — | API koşulları ve görsel lisansları | Koşullar bu oturumda ayrıştırılamadı [TEYİT GEREKLİ]; kota ve ücret başlamadan önce bildirilecek |
| Bizim Bitkiler | — | — | Toplu çıkarma izni doğrulanmadı | Yalnız bağlantı; adlar bağımsız izinli kaynaklardan tamamlanacak |

İlgili mevcut kaynaklar: Catalogue of Life 26.8 (20 Ağustos 2026, 5.425.409 ad kullanımı) ve 26.10 XR (16 Ekim 2026, 8.504.545), ikisi de CC BY; GBIF Backbone CC BY 4.0, DOI 10.15468/39omei. XR toplamı kabul edilmiş tür sayısı değildir.

Aktarım sırası (talimatın 13. bölümüyle aynı kapılar):

1. **Envanteri kapat.** Yukarıdaki [TEYİT GEREKLİ] satırlarını resmî sayfadan doğrula; doğrulanamayan kaynak “yalnız bağlantı”da kalır.
2. **Önce adlar, deneme ortamında.** ITIS → WCVP → IPNI sırasıyla; her kayıt kaynak kimliği, sürüm, lisans ve erişim tarihiyle. Aynı yazılış tek başına birleştirme nedeni değildir.
3. **Küçük örnek.** Pinaceae gibi tek familyayla kuru prova; sayım, çelişki ve mükerrer raporu.
4. **Paketli tam aktarım.** Kesintide devam eden, yeniden çalıştırıldığında kopya üretmeyen işlem.
5. **İzinli diğer alanlar.** Her alan kendi lisans kaydıyla; fotoğraf ve ses tek tek.
6. **Sayım ve teslim.** Kaynak başına erişilen, eklenen, eşleşen, çelişkili, izinsiz ve yalnız bağlantı sayıları. Üretime yazma ayrı onay ister.

## 7. Açık kalanlar

- Gerçek iPhone/Safari testi yapılmadı; canlı vizör için HTTPS deneme adresi gerekiyor.
- Yeni kanıt alanları gerçek sağlayıcılarla denenmedi.
- Çok kareli gözlem, gözlem düzenleyicide yalnız dosya listesi olarak aktarılıyor; kare sırası ve kare notu için ayrı tasarım gerekir.
- Sonuç paneli tam açıldığında fotoğraf şeridi çok daralıyor; v67’den gelen bu davranış sıradaki kamera turunda ele alınmalı.
