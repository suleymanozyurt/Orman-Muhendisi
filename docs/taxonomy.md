# Yaşam Ağacı

## Kaynak ve kapsam

Ana giriş ITIS'in doğrulanmış yedi geçerli âlem kimliğini kullanır. `Monera` gibi geçersiz tarihsel âlemler girişe eklenmez. Dallar resmî Solr servisinin `parentTSN` ilişkileriyle, `cursorMark` üzerinden yüklenir. Arama sözdizimine kullanıcı metni doğrudan eklenmez.

Catalogue of Life 2026-09-25 XR (`316441`) bağımsız bir grafiktir. Domain, ara basamaklar, rütbesiz ve belirsiz yerleşimler kaynakta nasılsa öyle korunur. Kaynak kimlikleri sürümle birlikte adreslenir. `3LXR` yalnız yeni sürüm kontrolünde kullanılır; normal kayıt gezintisi sabit sürümde yapılır. Veri setinin 8.479.599 sayısı bütün ad kullanımlarını kapsar; kabul edilmiş tür sayısı değildir. Bu veri setinin tamamı yerel veri tabanına aktarılmış değildir.

ICTV MSL41.v1'in resmî tam çalışma kitabı alınmıştır. Bütün 22.670 takson / 17.554 tür, 176 dolu tarihsel değişiklik kaydı ve sürüm doğrulaması kalıcı D1 tablolarına doğrulanmış 40 kayıtlık işlemlerle aktarılır. Kesilirse kaydedilmiş paketlerden devam edilir. Her paketin SHA-256 özeti sunucudaki resmî sürüm manifestiyle eşleşmek zorundadır. Her basamağın toplamı çalışma kitabının `Taxon Counts` sayfasıyla doğrulanır. Boş taksonomik basamaklar ve biçimlendirme satırları eklenmez. Âlemi/realm'i henüz atanmamış taksonlar kendi gerçek kök seviyelerinde kalır. Türlerin resmî ICTV kimlikleri korunur; üst basamaklarda MSL yolundan üretilen `path-*` kimliklerinin yerel olduğu açıkça belirtilir.

Kew POWO alt dalları `childNameUsages` üzerinden gösterilir; ad araması resmî cursor API'sini kullanır. Veri kullanımı IPNI/WCVP taksonomi metadatasıyla sınırlıdır. Kew'in fotoğrafları ve açıklamaları, bireysel hakları doğrulanmadan kopyalanmaz. GBIF alternatif kayıtları ve mevcut yayılış/fotoğraf arşivi korunur.

## Kalıcı model

- `taxonomy_nodes`: kaynak + sürüm + kaynak kimliği benzersizdir. Aynı bilimsel ad taşıyan iki kayıt birleştirilmez. Ebeveyn kimliği aynı kaynak/sürüm grafiğine aittir. Tüm bilinen ve bilinmeyen rank metinleri desteklenir.
- `taxonomy_pages`: her kaynak sorgusu / ebeveyn / cursor için kaydedilmiş sayfa ve sonraki cursor. Hiçbir uygulama içi ilk-100 kesmesi yoktur. Kaynağın kendi erişim sınırları veya hataları açık hata olarak sunulur.
- `taxonomy_releases`: sürüm, lisans, resmî dosya, beklenen ve doğrulanmış kapsam. Yalnız tüm paketleri, rank toplamları, 22.670 kayıt, 17.554 tür, 176 tarihsel değişiklik ve eksiksiz ebeveyn ilişkileri doğrulanan ICTV sürümü `complete=1` işaretlidir. Doğrulama tamamlanmadan bu sürümün ağacı açılmaz.
- `taxonomy_changes`: kaynakların resmî değişiklikleri ve canlı servislerde ad/ebeveyn/durum değişikliklerinin önceki ve sonraki kayıtları. Eski sürüm verileri silinmez.

ITIS/COL/GBIF/POWO kayıtları sorgulandıkça kalıcı olarak saklanır. Kayıt ve sayfa önbellekleri canlı kaynak kesilirse son bilinen veri olarak gösterilir. Kapsam ekranı gerçek veri tabanı sayısını döndürür. Kısmi önbellekte kaydedilmemiş bir ebeveyn, kaynakta bozuk ebeveyn bulunduğu anlamına gelmez.

Kaynaklar arası benzer adlar yalnız karşılaştırma sonuçlarıdır. COL'un açık IPNI kimlikleri Kew'e bağlantı verir. ITIS Solr'daki ayrı sinonim adı / kimlik dizileri, eşleştirme güvencesi olmadan birbirine bağlanmaz. Türkçe adlar yalnız ilgili kaydın Türkçe dil alanından gelir. Kültivarlar ayrı rank etiketine sahiptir.

## API ve etkileşim

`/api/taxonomy`: `roots`, `children`, `node`, `search`, `coverage`, `changes`, `sync-plan`. Kaynak kimlikleri ve sürümler doğrulanır. Sorgulanan kaynaktan alınan kayıtlar yazılır; istemci keyfi takson kaydı gönderemez. Virüs araması gerçek ebeveyn ilişkilerini izleyen recursive SQL ile grup içine daraltılabilir.

Liste/ağaç görünümü aynı seçim ve önbelleği kullanır. Çoklu dallar bağımsız açılır, sayfalama tüm kalan kayıtlara götürür. Breadcrumb kaynağın gerçek yoludur. Paylaşılan bağlantı sürümü korur; tarayıcı geri dönüşü ayrı taksonları ayrı geçmiş girişleri olarak tutar. Mobilde tek sütun, 44+ px etkileşim hedefleri, dokunma davranışı ve hareket azaltma tercihi uygulanır.

`Sor`, istemciden yalnız kaynak/kimlik/sürüm alır. Sunucu bu kimliğin güvenilir kaynak kaydını yeniden okur, doğrulanmış yol ve alanları asistanın kaynak bağlamına ekler. İstemcinin bilimsel iddiaları kaynak olarak kabul edilmez. Model bağlantısı yoksa doğrulanmış katalog bilgisi döner.

## Kontrollü güncelleme

1. Taze Sites source checkout içinde `node scripts/refresh-taxonomy.mjs --check` resmî COL `3LXR` metadatasını ve ICTV'nin güncel MSL dosya bağlantısını kontrol eder.
2. `--update`: yeni COL sürümünü sabitler. Yeni ICTV sürümü varsa tam dosyayı indirir, `scripts/import-ictv.py` ile tüm rank/ebeveyn/kimlik kontrollerini yapıp `data/taxonomy-import/` içine küçük JSON paketleri ve manifest üretir. Veri, şema migration dosyalarına eklenmez. Eski migration geçmişi değiştirilmez. `openpyxl` gerekir.
3. `tsc --noEmit`, `npm test`, resmi Sites kaynak/paket/yayın akışı. Başarısız kaynak doğrulaması veya testte yeni sürüm yayımlanmaz.
4. `--import`: stdin üzerinden seçili özel Site URL’si ve Sites hizmet erişimi alır. Sunucudan eksik paketlerin listesini okur, yalnız eksik paketleri aktarır ve son doğrulamayı yapar. Paket ve kaydedildi bilgisi tek atomik işlemde yazılır. Yanlış checksum, bilinmeyen sürüm ve tamamlanmamış paketler reddedilir. Kimlik bilgileri kaydedilmez.
5. `--verify`: canlı takson sayıları, yedi ITIS âlemi, doğrudan ebeveynler, COL Türkçe ad ve üst sınıflandırma, ICTV tam yolunu okur.
6. `--refresh`: stdin üzerinden seçili özel Site URL'si ve Sites hizmet erişimi alır; tüm kayıtlı sayfaları `sync-plan` sayfalamasından okuyup yeniler. Kimlik bilgisi diske veya loga yazılmaz. Kaynak başarısızsa önceki veriler korunur ve hata sayısı rapor edilir. Görüşme/kişisel veriler değiştirilmez.

Bu bakım tüm keşfedilmemiş canlıları ya da dünyanın bütün veri tabanlarını içerme iddiası taşımaz. Tamlık belirtilen kaynak sürümünün doğrulanmış kapsamıdır. Henüz bütün ITIS/COL/GBIF/Kew arşivleri için toplu indirme yapılmamıştır.

## Doğrulama

Gerçek ITIS/COL/Kew API yanıtları test fixture'larında yer alır. Testler tam ICTV migration'ını SQLite'a uygulayıp resmî rank toplamlarını, bütün ebeveynleri, tarihsel kayıtları, son sayfayı, kaynak/sürüm ayrımını, Türkçe arama alanlarını ve kaydedilmiş sayfa güncelleme planının tüm sayfalarını doğrular. Mevcut site testleri ve SSR kontrolleri korunur. 572 paketlik tüm aktarım ayrıca boş SQLite veritabanında uçtan uca uygulanır; kesinti, atomik geri alma, tekrar aktarım, yanlış checksum, eksik ebeveyn ve erken tamamlandı işareti kontrol edilir. Gerçek cihaz dokunma/gecikme ölçümü ayrıca fiziksel cihazda yapılmalıdır.

## Yayın kurtarma durumu (27 Ekim 2026)

51. sürümden itibaren yayınlar başarısız oldu. Son başarılı canlı sürüm 50'dir. İlk canlı D1 incelemesinde taksonomi tabloları mevcut, taxonomy_nodes, taxonomy_changes ve taxonomy_releases boştur. Native görünüm migration uygulama günlüğünü sunmadığından, 0017 dosyasının uygulandı işaretinin durumu yalnız bu satır verisinden kesinleştirilmez.

Kaynak içindeki 0000–0018 SQL dosyaları, metadata ve journal değiştirilmeden korunur. İlk paket denemesinde yalnız derlenmiş klasörde büyük veri yüklemesini şema adımından ayıran bir projeksiyon hazırlanıp test edildi. Son arşiv incelemesi, resmi Sites paketleme aracının kaynak `drizzle/` klasörünü tekrar kopyaladığını gösterdi; bu projeksiyon yayımlanan arşivi değiştirmedi. Etkisiz projeksiyon ve ona ait testler kaldırıldı. Paket canonical migration geçmişini aynen taşır.

27 Ekim yayın denemesi de Sites tarafından `internal error; reference = e_PVSMDp_ad110b5e9e164bf8a655cab9104a3bad` ile reddedildi. Worker hata günlüklerinde bu yayın hatasını açıklayan bir kayıt yok. Canlı migration günlüğü mevcut araçlarla okunamadığı için kesin neden doğrulanmış değildir; geçmiş değiştirilmez ve veri aktarımının tamamlandığı iddia edilmez. Site: `appgprj_6a66544702f48191bfdbf9fb0a6c86c5`; başarısız yayın: `appgdep_6ae042f5293c8191811c59f86c607f2f`; sürüm: `appgprj_6a66544702f48191bfdbf9fb0a6c86c5~appgver_19249b79828081919c0a6d5b07f7e16c`.

Yayın engeli giderildiğinde ICTV verisi `scripts/refresh-taxonomy.mjs --import` üzerinden doğrulanmış, kesintiden devam edebilen 572 küçük paketle aktarılmalı; tamlık ayrıca doğrulanmalıdır.

## Kullanıcının onayladığı kurtarma — 27 Ekim 2026

Canlı migration günlüğünün belirsizliği kullanıcıya açıklandı; kullanıcı eski yükleme adımını değiştirme ve yayını deneme önerisine “Durma” diyerek devam edilmesini istedi. Yalnız veri içeren 0017 SQL dosyasının orijinali SHA-256 `97a00beb77848701e6e5e54d426e12524bbcaca2298cce91fb2f501dbf2ac52e` ile `data/taxonomy-import/legacy/0017_ictv_msl41.sql` içinde aynı byte'larla korunur. Yürütülen 0017 adımı artık yalnız `SELECT 1` içerir. Şema, migration journal kimlikleri ve snapshot dosyaları değiştirilmez.

Yeni yayın artık büyük veri yüklemesini şema işlemi içinde çalıştırmaz. Yayın başarılı olduğunda mevcut doğrulanmış, atomik ve kesintiden devam eden 572 paketlik aktarım çalıştırılmalıdır. Aktarım doğrulanmadan canlı veri kapsamı tamamlandı sayılmaz. Kaynak verisini test eden fixture ve dışa aktarma aracı tarihsel arşivi açıkça yükler.
