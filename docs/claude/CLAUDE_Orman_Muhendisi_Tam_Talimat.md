# Claude Code’a tam devir talimatı — Orman Mühendisi

**Talimat tarihi: 10 Kasım 2026.** Bu belgeyi Claude Code’a ver ve önce tüm güncel hükümleri okut. Bu pakette `Orman_Muhendisi_v67_Kaynak.zip` dosyası ve `IMG_6183.jpeg`, `IMG_6184.jpeg` tasarım referansları bulunur. Aşağıdaki “ben” ifadeleri proje sahibi Süleyman Özyurt’a aittir. İlk bölüm bu talimatın kısa uygulama özeti, 8–11. bölümler geçmiş kaynaklardan eklenen ayrıntı ve son kararlar, 12. bölüm yeni geliştirme önerileri, 13. bölüm izinli dış veri aktarımı, Ek A ise 3 Ekim’deki 50 maddelik özgün tasarım metnidir. Bir çelişki varsa en yeni açık kullanıcı kararı geçerlidir. Tarihsel teknik notlar ve önerilen uygulama adımları, canlı doğrulama veya kullanıcı onayı yerine geçmez.

**Son kararım:** Özel GitHub deposunda ve Claude Code ile geliştir; iPhone önizlemesini önce hazırla. Gerçek veriyi en son aktar. Dış kaynaklardan bütün izinli tür adlarını ve diğer izinli alanları Bölüm 13’e göre ekle; hak iddiası veya izin belirsizliği olan içeriği dışarıda tut. Tam uygulamayı ileride istediğimde **https://www.ormanmuhendisi.com/** adresine taşıyabileceğim bir düzen kur. Güncel, bakımı devam eden ve hedef tarayıcılarda doğrulanan teknolojiler kullan. Mevcut canlı yayını onaysız değiştirme.

## 1. Ana hedefim

Mevcut **Orman Mühendisi** sitesini koruyarak geliştir. Site; Türkiye ağırlıklı, dünya kaynaklarına da açılan bir **doğa atlası, bilimsel tür rehberi, saha gözlem defteri ve içerik alanı** olsun. Bir kişi bir türü adıyla, fotoğrafıyla veya haritadan bulabilsin; türü kaynaklarıyla inceleyip gözlemini kaydedebilsin. Yeni ziyaretçinin göreceği ekran sade olsun; derinlik arayanlar ayrıntıya inebilsin.

Bu, **Orman Parkları Yönetim Sistemi** projesi değildir. Orman Parkları’nı yalnız GitHub çalışma düzeni için örnek al. Kira, tebliğ, denetim, muhasebe ve park evrakını bu projeye karıştırma.

**Önceliğim:** Tasarım ve kodlama aynı geliştirme döngüsünde ilerlesin. Her ekranı gerçekçi örnek kayıtlarla tasarla ve çalışan bir önizleme olarak kodla; ben iPhone’da görüp deneyeyim. Gerçek verileri ve canlı yayını en son, ayrı adımlar olarak taşı. Bu sırada mevcut site ve çalışan özellikler korunacak. Yüzeysel renk veya düğme değişikliğiyle işi bitmiş sayma; gerçek kullanım akışını test et. Yaratıcı çözümler önerebilirsin. Ölçülebilir faydası olan, kapsamı bozmayacak iyileştirmeleri ayrı ve geri alınabilir değişiklikler halinde uygula; veri, yetki veya yayın kapsamını büyüten önerileri önce bana göster.

## 2. Kesin proje bağlantıları ve başlangıç noktası

| Öğe | Doğrulanmış bilgi |
|---|---|
| Canlı Orman Mühendisi | https://ormanmuhendisi.suleymanozyurt49.chatgpt.site/ |
| Kameraya doğrudan giriş | https://ormanmuhendisi.suleymanozyurt49.chatgpt.site/?view=home&lens=1 |
| İleride bağlanacak ana alan adı | https://www.ormanmuhendisi.com/ — hedef; şu anda bağlandığı doğrulanmış bir yayın adresi değildir. |
| ChatGPT Sites projesi | `sites-project://appgprj_6a66544702f48191bfdbf9fb0a6c86c5` — bu bağlantı ChatGPT içinde açılır. |
| Benim özel GitHub depom | https://github.com/suleymanozyurt/Orman-Muhendisi-Site |
| GitHub’da görülen eski ana dal | https://github.com/suleymanozyurt/Orman-Muhendisi-Site/commit/4e5e610771bec312495fcc4feab0ec71b044f7ea |
| Doğrulanan canlı sürüm | Sites sürüm **67**; kaynak commit `e0240e5ce3117e22588b79cc9ff8fc61ae2f55cf`. |
| Güncel kaynak paketi | `Orman_Muhendisi_v67_Kaynak.zip`. SHA-256: `a4c3df2f3d91f4a373532c0a0a45c8cee1bf48dd673ad596e1418eb80e86f9c3`. |
| GitHub çalışma düzeni örneği | https://github.com/suleymanozyurt/orman-Parklari |
| Orman Parkları yayın örneği | https://suleymanozyurt.github.io/orman-Parklari/ |

10 Kasım kontrolünde **GitHub `main` ile canlı v67 aynı kaynak değil**. GitHub’daki ana dalı eski haliyle güncel site sanma. Mevcut GitHub deposunu klonla, yeni bir çalışma dalı aç ve v67 kaynak paketini ana dalla karşılaştır. V67’deki dosyaları ayrı bir başlangıç commit’ine al; GitHub’da bulunup pakette olmayan dosyaları incelemeden silme. Var olan Git geçmişini, `main` dalını, açık çalışmaları ve depo görünürlüğünü koru. Zorla gönderme, geçmişi yeniden yazma, yeni depo açma veya canlı siteyi başka adrese yönlendirme. Çalışmayı taslak PR ile göster. Canlı site erişim istiyorsa buna saygı göster; paketten ve sahibinin paylaştığı önizlemeden çalış.

GitHub projenin **kod ve değişiklik geçmişinin** yeri olsun. GitHub Pages’i açmak ayrı bir karardır; kontrol sırasında kapalıydı. Örnek verili bir Pages önizlemesi yapılabilir; canlı yapay zekâ, oturum ve veritabanı olan tam uygulama çalışır bir sunucu gerektirir. İlk aşamada mevcut ChatGPT Sites yayını yerinde kalsın. **Netlify kullanma.** Ana alan adı hedefi `www.ormanmuhendisi.com`; uyumlu barındırma ve geçiş zamanı son aşamada kararlaştırılacak. Bölüm 9’daki taşınabilirlik koşulları tasarım aşamasından itibaren geçerlidir. Proje, yayının nasıl yapılacağından bağımsız olarak GitHub’da geliştirilebilir.

## 3. Görsel tasarım ve kullanım

- İlk ekranın kimliği **Orman Mühendisi · Doğa Atlası**. Kullanıcı daha ilk bakışta tür arayabilmeli, haritayı açabilmeli ve gözlem ekleyebilmeli. Örnek tür kartı ve fotoğraf işe yarasın; aramayı veya temel düğmeleri aşağı iten dev bir tanıtım alanı kurma.
- En az adımla hedefe ulaştır. **Ekle** düğmesi mobilde tek dokunuşla Orman Lens’i açsın. Sık işler görünür olsun. Araştırma, yayın, kişisel ayar ve yönetim gibi derin bölümlere düzenli menüden ulaşılsın. Açılış ekranını her özelliğin aynı anda yarıştığı bir panoya çevirme.
- Türkçe öncelikli, açık ve doğal bir dil kullan; mevcut İngilizce seçeneğini koru. Türün bilimsel adı, yerel adı ve kaynak bağlantısı ayrı ve okunur olsun. Sırf bilimsel görünsün diye yeni terim, kaynak, tür adı veya kesinlik oranı üretme.
- Hafif, olgun ve doğaya uygun bir görsel dil kur: gerçek doğa fotoğrafları, okunabilir tipografi, ölçülü yeşil, tutarlı boşluklar, işlevi anlaşılır simgeler. Hazır şablon görünümü, gereksiz gölgeler, tekrar eden kutular ve her ekranda iri başlıklardan kaçın. Varsayılan açık görünümde sayfa zemini saf beyaz olsun. Koyu tema ve sistem seçeneği çalışsın; kullanıcının kayıtlı tercihi korunsun. Lens kamera ekranı, sitenin diğer panellerinden bağımsız olarak aşağıdaki referansı izlesin.
- Telefonu önce tasarla; **320, 390 ve 430 px** genişlikte, ayrıca yatay telefon, tablet ve masaüstünde dene. iPhone çentiği, alt hareket alanı ve Safari araç çubuklarını hesaba kat. Klavyede odak, ekran okuyucu adları, yeterli dokunma alanı ve hareket azaltma tercihi çalışsın. Düzenlemede 44 px civarı dokunma alanını simgelerin görsel boyutundan ayrı ele al.
- PWA davranışı korunacak: ana ekrana ekleme, uygun çevrimdışı görünüm, cihazdaki saha taslaklarını geri açma. Kullanıcıya hangi verinin cihazda kaldığını ve hangisinin yayımlandığını açıkça göster. Çevrimdışı çalışan işlemlerle sunucu isteyen işlemleri ayırt et. Üretimde yayına geçen tasarımın eski önbellekten dolayı saklanmadığını kontrol et.
- SEO ve sayfa paylaşımı korunacak: anlamlı başlıklar, açıklamalar, site haritası, kalıcı bağlantılar ve tür künyeleri. Özel sayfalar, kullanıcı kayıtları veya taslakları arama motorlarına açma.

## 4. Orman Lens — en önemli tasarım teslimi

**Beklentim:** Gönderdiğim iPhone Google Lens referansındaki **kamera yerleşimi ve kullanım hareketleri mümkün olduğunca aynı** olsun. İşlevlerin adı ve sonuçları ormancılığa göre uyarlansın. V67, çalışır başlangıç noktasıdır; **v67 tasarımını son onayımı almış sayma**. Önce mevcut v67 ile iki referansı aynı telefon ölçüsünde yan yana koy ve farkı gör. Google logosunu veya iOS durum çubuğunu çizme; gerçek telefonun kamera görüntüsü ve sistem alanları kullanılsın.

- Referans 1, **Arama / Tür Bul**: `IMG_6183.jpeg`. https://chatgpt.com/library?file_id=libfile_4cd3618e11788191ad9dd12bee66fee0&account_id=personal
- Referans 2, **Oluştur / Hazırla**: `IMG_6184.jpeg`. https://chatgpt.com/library?file_id=libfile_73cfec991ba08191b64107e89e114fa8&account_id=personal
- Resmî davranış referansları: https://support.google.com/websearch/answer/14516623?co=GENIE.Platform%3DiOS ; https://blog.google/products-and-platforms/products/search/google-lens-voice-search/ ; https://blog.google/products-and-platforms/products/search/nano-banana-search-lens/ . Dosya bağlantıları hesabıma özel olabilir; görselleri Claude Code’a ayrıca eklerim.

### Kamera ekranının ölçüleri

İki referans **707 × 1536**. Aşağıdaki değerler hizalama kılavuzudur; işletim sisteminin boşluklarını ekranda iki kez sayma.

- Canlı kamera, ekranın tamamını doldursun. Üstte ortada **Orman Lens**, solda kapat ve gerekiyorsa flaş, sağda son aramalar ve üç nokta. Başlık ve simgelerin merkezi referansta üstten yaklaşık **%9**. Titreşim veya flaş donanımı desteklenmiyorsa doğru durumu göster.
- Tür Bul’da görüntünün ortasında dört açık renk, yuvarlak kadraj köşesi; çerçevenin genişliği ekran genişliğinin yaklaşık **%70’i**, üst kenarı ekran yüksekliğinin yaklaşık **%24’ü**. Çerçeve gerçek arama bölgesiyle eşleşsin.
- Alt sırada sol tarafta yuvarlak galeri, ortada beyaz yuvarlak deklanşör, Hazırla’da sağda yuvarlak kamera çevirme. Merkezleri yatayda yaklaşık **%23 / %50 / %77**, dikeyde **%81**. Deklanşör ve dış halkası ekran genişliğinin yaklaşık **%22’si**.
- Dört modlu yarı saydam, yuvarlak alt şerit yaklaşık **%81** genişlikte; merkezi yaklaşık **%92** yükseklikte. Seçili mod açık renkte, ikon ve ad birlikte. Sıra **Tür Bul · Metni Oku · Canlı Sor · Hazırla**. Hazırla’da örnek fikirler deklanşörün hemen üzerinde üç yuvarlak düğme halinde; hazır öneri seçilebilir, “Daha fazla fikir” gerçekten çalışır.
- Kamera açılmazsa merkezde taklit bir canlı görüntü gösterme. İzin durumuna göre **Kamerayı aç**, **Fotoğraf seç** ve gömülü görünümde gerekiyorsa **Yeni sekmede aç** yollarını sun. Kamera, mikrofon ve zamanlayıcılar ekrandan çıkınca durmalı. Gerçek cihaz desteği olmayan davranışı çalışıyormuş gibi gösterme.

### Dört modun uçtan uca davranışı

| Mod | Beklediğim sonuç |
|---|---|
| **Tür Bul** | Kısa dokun: fotoğrafı çek ve aramayı başlat. Fotoğrafta algılanan yaprak, kozalak, kabuk gibi bölgeye dokununca arama o alana daralsın; kadraj köşeleri de sürüklenebilsin. Fotoğrafla birlikte yazılı bir ayrıntı eklenebilsin. Sonuçta olası türler, görülen ayırt edici ayrıntılar, kaynaklar ve “gözleme ekle” olsun. Belirsizse bunu açıkça söyle ve daha iyi fotoğraf için yol göster. |
| **Metni Oku** | Saha etiketi, levha, herbaryum kartı gibi metinleri fotoğraftan oku. Orijinali ve çeviriyi ayır, güvenilir biçimde konumlandırılan metni görselin üzerine yerleştir. Satıra dokununca kopyala veya o metinle tür ara. Görüntüde okunmayan metni uydurma. |
| **Canlı Sor** | Açık kullanıcı eylemiyle kamera ve mikrofonu kullan. Çekim yapmadan sesli soru ve cevap akışı çalışsın; ses ve görüntü paylaşımı ayrı kapatılabilsin. Bağlantı yoksa fotoğrafla/yazıyla sor yolunu ver. Tür Bul’da deklanşöre **basılı tut ve bırak** hareketi fotoğraf ile sesli soruyu tek işlemde göndermeli. Bu hareket kısa dokunuşla karışmamalı. |
| **Hazırla** | Yaprak damarını, kabuk dokusunu veya gölgedeki ayrıntıyı belirginleştirme; kozalağı kadraja alma; dikey sunum kopyası gibi saha odaklı fikirler. Hazır öneri tek dokunuşla çekim ve düzenlemeyi başlatabilsin. Özgün fotoğrafla düzenlenen kopyayı karşılaştır ve kopyayı ayrı indir. Düzenlenen görseli bilimsel kanıt veya özgün saha kaydı gibi sunma; yeni damar, yaprak, kozalak veya sahte ayrıntı ekleme. |

Galeri, geçmiş, kapatma, kamera çevirme, yakınlaştırma ve sonuç paneli gerçek işlemlere bağlı olsun. Yukarı kaydırarak galeriye, sağa sola kaydırarak modlara geçme; çekilen kareyi kaybetmeden mod değiştirme; sürüklenebilir sonuç paneli ve geri dönüş mevcut davranışlar arasındadır. İzin isteyen adımlarda gerçek iPhone/Safari testi yap; telefon genişliğinde sahte kamera ile yapılan tarayıcı testini **gerçek cihaz testi** diye raporlama. iOS’un sistem galerisini, tarayıcı izin ekranlarını veya Google’ın kapalı arama motorunu bire bir kopyaladığını iddia etme.

## 5. Sitede korunacak diğer alanlar

1. **Tür künyesi, arama ve karşılaştırma.** Türkçe ve bilimsel ada, eş ada ve familyaya göre keşif; özet, genel bilgi, yaprak, çiçek/meyve, gövde/kabuk, yayılış ve kaynak sekmeleri; benzer türleri yan yana karşılaştırma. Tür kartı görsellerinde lisans ve atıf.
2. **Yaşam ağacı ve bilimsel veri tabanı.** ITIS, Catalogue of Life/ChecklistBank, GBIF, Kew POWO/IPNI ve ICTV’nin farklı kaynak kimliklerini ve sürümlerini koru; aynı bilimsel ada bakıp kayıt birleştirme. TÜBİVES’e dayanan Türkiye florasında il, grid ve familya filtrelerini koru. Büyük taksonomiyi sayfalı ve istek oldukça yükle. Aktarılan kapsam ile kaynağın toplam kapsamını ayır; “bütün türler eklendi” gibi doğrulanmamış beyan verme. Ayrıntı: `docs/taxonomy.md`.
3. **Harita ve gözlem.** Dünya/Türkiye kayıtları, il, tür ve tarih filtreleri; GBIF kayıtları ile topluluğun gözlemlerinin ayrı gösterimi. Gözleme birden çok fotoğraf, saha notu, tarih, tür ve isteğe bağlı konum ekleme. Taslağı kaydet, geri aç; paylaşımda kullanıcının niyeti ve hassas konum ayarı esas olsun. Haritadan listeye dönerken filtreleri ve seçimi kaybetme.
4. **Topluluk ve kişisel alanlar.** “Senin için”, “Takip ettiklerin”, topluluk, tür bekleyen ve kaydedilen gözlemler. Profil, takip, yorum/beğeni, kayıt, koleksiyon ve kişisel notları koru. Giriş, yönetim ve yazma yetkilerini sunucuda doğrula. Giriş seçeneğinin gerçekten bağlı olup olmadığını açık göster.
5. **Araştırma, saha ve yayın arşivi.** Ormancılık kaynakları, yayınlar, botanik sözlük, bakım ve fidanlık gibi mevcut bölümleri koru; keşif menüsünde gruplandır. Kaynaklı makale, video ve fotoğraf arşivi gerçek kayıtlarla çalışsın. İlan/ürün ve bakım gibi ikincil alanları kaldırma; doğrulanmamış ödeme, satış, entegrasyon veya tamamlanmış iş varmış gibi gösterme.
6. **Editör ve görsel dili.** Yayınlarda ağırlık ağaç, bitki, mantar, liken, orman ekosistemi, toprak, su, doğa koruma ve ormancılık olsun. Bilimsel iddiayı resmî veya akademik kaynakla doğrula; kısa doğal açıklama yaz, terimi anlaşılır kıl. Kaynak ve görsel kredisi görünür olsun. Mevcut sitenin kuş/doğa kataloğunu bu editoryal odak nedeniyle silme. Siteye tam sosyal paylaşım metni hazırlama eklenirse benim güncel biçimim 1.200–2.000 karakter ve son satırda tam 5 hashtag; bu kural site etiketleri veya tür künyeleri için geçerli değildir.

## 6. Veri ve teknik devir

**Kaynak paketi canlı veritabanı yedeği değildir.** ZIP’te v67’nin Git tarafından izlenen kaynak dosyaları, testler, şema, migration dosyaları, izlenen katalog dosyaları ve görsel varlıklar var. Git geçmişi, oturum/anahtarlar, üretim veritabanı, medya deposunun canlı içeriği, yerel cihaz taslakları ve derleme çıktısı bu devir dosyasının parçası değildir. Site adresini ve GitHub deposunu birbirine karıştırma.

| Bileşen | Nerede ve nasıl ele alınacak? |
|---|---|
| Kod ve arayüz | React/TypeScript + Vinext; `app/`, `public/`, `tests/`, `package-lock.json`. Lens için `app/lens-capture.tsx`, `app/lens.css`, `app/lens-advanced.tsx`, `app/lens-live.tsx`, `app/add-menu.tsx`. Çalışan yığını sırf tercih nedeniyle değiştirme. |
| Yayın altyapısı | Mevcut paket Cloudflare Worker biçiminde; Sites tanımı `.openai/hosting.json`, bağlar `DB` (D1) ve `BUCKET` (R2). Dış barındırmaya geçerken eşdeğer ortamı kur veya gerekçeli uyarlama öner. |
| Kimlik ve izinler | Sites’ın sağladığı güvenilir ChatGPT oturum bilgileri kullanılıyor. Başka sunucuya geçilirse aynı güven sınırlarını sağlayan gerçek oturum ve rol kontrolü kur; tarayıcıdan gelen sahte başlıkla bu kontrolü atlatma. Eski kullanıcı kimliklerini yeni hesaplarla eşleştirmeden sahipliği değiştirme. |
| Lens ve asistan | `app/api/photo-identify/`, `app/api/lens-mode/`, `app/api/lens-live/`, `app/api/assistant/`. Gemini bağlantısı ve bilimsel eşleşme kaynakları ayrı ele alınır; kodun desteklediği OpenAI/Pl@ntNet seçeneklerini kullanılabilirlik durumuna göre göster. Anahtarları GitHub’a, tarayıcı koduna veya sohbete yazma; barındırmanın gizli ayarlarıyla bağla. |
| Tür ve kataloglar | `app/data/`, `data/taxonomy-import/`, `docs/taxonomy.md`. Kaynak kimliği, veri sürümü, yayıncı, lisans ve erişim tarihi korunacak. GBIF https://www.gbif.org/ ; ITIS https://www.itis.gov/ ; Catalogue of Life https://www.catalogueoflife.org/ ; ChecklistBank https://www.checklistbank.org/ ; POWO https://powo.science.kew.org/ ; ICTV https://ictv.global/msl . TÜBİVES kaynak bilgisi `app/data/tubives-source.json` içindedir. |
| Canlı veritabanı | Şema `db/schema.ts` ve `drizzle/`. Canlıya geçiş için ayrı yetkili dışa aktarma gerekir: profil, gözlem ve fotoğraf ilişkileri, yorum/beğeni/kayıt, koleksiyon, takip, not, tür ve taksonomi, içerik ve diğer gerçekten kullanılan tablolar. Önce satır sayımı ve kimlik/ilişki listesi çıkar; gerçek sayıları doğrulamadan yazma. |
| Medya ve taslak | R2’deki fotoğraf/video nesnelerini, veritabanı bağlantılarını, atıf ve erişim durumlarını ayrı say. Çevrimdışı saha taslakları cihazda olabilir; sunucunun yedeğinde hepsinin bulunduğunu varsayma. |
| Gizli ayarlar | `site_settings` canlı ortamda servis anahtarı içerebilir. Ham ayar tablosunu veya veritabanını GitHub’a koyma. Dışa aktarımda gizli anahtarları, oturum verisini, özel konumları ve kişisel kayıtları ayır; hassas kayıtları demo için kullanma. |

Büyük taksonomi verisini her yayın paketine tekrar gömme. Mevcut ICTV paketlerinin checksum ve sürüm kurallarını koru. Arşivdeki eski, büyük migration kopyası bir üretim yayınına otomatik dahil edilmesin; şema ve doğrulanmış veri paketleri ayrımını sürdür. Ağ veya kaynak hatasında son doğrulanmış veriyi “son kayıt” olarak işaretle; yeni veri uydurma. Fotoğrafı kaynağı ve lisansı belli olduğu sürece kullan.

Altı ilave veri kaynağı, bütün tür adlarının kapsamı ve telif/lisans kuralları için Bölüm 13 zorunludur.

## 7. Uygulama, test ve yayın sırası

**Tasarım ve kodlama birlikte yürür.** Bütün site tasarımlarının bitmesini bekleme. Her seferinde tek bir kullanıcı akışının tasarımını ve çalışan kodunu birlikte geliştir; gerekiyorsa o akışın veri yapısını ve servis bağlantısını da deneme ortamında hazırla. Önizlemede görünümü ve düğmelerin gerçek davranışını göster. Geri bildirimimle aynı akışı düzelt, sonra bir sonrakine geç. Örnek veriyi ve bağlanmamış servisleri açıkça işaretle. Bu yöntem canlı yayına geçme veya gerçek veriyi toplu aktarma onayı değildir.

1. **Güncel tabanı kur.** GitHub ana dalı ile v67’yi karşılaştır; v67’yi ayrı dalda başlangıç olarak kaydet. Repo özel kalsın. Önceki sürümün geri dönüş noktası, fark özeti ve demo planı açık olsun. Paket bağlantıları kullanılamıyorsa benden paketi iste; eski koddan farkı kapatmış gibi davranma.
2. **Ölç, tasarla ve aynı akışı kodla.** Kamera ekranından başla. V67 ve iPhone referansının görsel karşılaştırmasını üret; hangi boşluk, ölçü veya hareket değiştiğini somut göster. Sonra ana sayfa, arama, tür künyesi, harita ve gözlem akışına geç. Örnekler: karaçam, Lübnan sediri, türü belirsiz bir gözlem, boş sonuç, izin reddi, ağ kesilmesi. Bunları açıkça örnek veri olarak ayır.
3. **Tarayıcıda çalıştır ve dene.** Kaynak `package.json` Node.js **22.13+** ister; Linux/WSL ya da uyumlu geliştirme ortamı kullan. Mevcut betikleri ve kilitli bağımlılıkları koru: `npm run install:ci`, `npm run dev`, `npm exec -- tsc --noEmit`, `npm test`, gerektiğinde `npm run validate:artifact`. V67’nin önceki yayın kontrolünde 262 test geçti ve başlangıç JavaScript ölçümü 178,6 KiB gzip’ti; bunlar yeni değişikliğin sonucu değildir. Mevcut 200 KiB başlangıç bütçesini ve gerektiğinde açılan harita/Lens bileşenlerini koru.
4. **Akışları tek tek kanıtla.** iPhone/Safari’de kamera, izin ve ses; örnek fotoğrafla Tür Bul, kadraj, Metni Oku ve Hazırla; gerçek servis erişimi sağlandığında Canlı Sor; geri/ileri, filtrelerin korunması, gözlem taslağı, yükleme, giriş/yetki, PWA ve klavye ile gezinme. Dört Lens modu, hata ve izin durumlarında da çalışır bir sonraki adım göstermeli. Başarılı sayfa yüklemesi tek başına çalışan servis kanıtı değildir.
5. **Bana bir deneme adresi ver.** Gerçek kişisel veri ve anahtar kullanmadan, mümkünse iPhone’da açılabilen özel bir deneme bağlantısı sun. Taslak PR, kısa değişiklik özeti, iki karşılaştırma görseli ve açık kalan noktalar olsun. Mevcut canlı siteye veya veriye bu aşamada dokunma.
6. **Onaydan sonra veriyi taşı.** Yedek al; önce örnek veriyle, sonra izinli ayrı ortamda kuru prova yap. Şema, medya ilişkileri, kimlikler, tarihler, lisans, konum ve izinleri karşılaştır. Eksik, çelişkili veya aktarılmamış satırları ayrı raporla. Aynı aktarım tekrar çalışınca mükerrer oluşmasın. Kesilirse güvenli devam ve geri dönüş yolu bulunsun. Üretimde tasarımı ve veriyi aynı anda doğrulanamaz şekilde değiştirme.
7. **Tam uygulamayı yayımla.** Onayım sonrasında `www.ormanmuhendisi.com` ve uyumlu barındırmaya, Bölüm 9’daki doğrulama sırasıyla geç. Önce deneme ortamını uçtan uca doğrula. Gerçek erişimi, kayıtların okunup yazılmasını, medyanın açılmasını ve Lens’i doğrula; yönlendirme, PWA ve SEO’yu kontrol et. Başarısız olursa önceki çalışan sürüme dönülebilsin. Bana çalışan adresi, hangi özelliklerin gerçek ortamda doğrulandığını ve kaldığı yerde yapılacak işi bildir.

**İlk teslimde beklediğim:** (1) canlı v67 ile GitHub başlangıcı arasındaki farkı gösteren ayrı dal, (2) telefonda açılan karşılaştırılabilir kamera önizlemesi, (3) ana ekran/arama/harita/gözlem için kademeli geliştirme planı, (4) gerçek veri aktarımına dokunmadan kaynak ve kapsam dökümü. Bunları hazırlamadan bitmiş site ilan etme.

## 8. Eski talimatlardan geri kazanılan hükümler

### 8.1. 3 Ekim 2026: Cihaza göre gerçekten uyarlanan uygulama

Kitaplıktaki iki 3 Ekim tasarım belgesi aynı 50 maddelik metni içeriyor. Tam metin **Ek A**’da. Claude bu metni iş listesine dönüştürsün; önce ana akışları ve mevcut eksikleri önceliklendirsin. Sonraki tarihte farklı bir karar varsa aşağıdaki güncel kararlar geçerli.

| Alan | Kabul ölçütü |
|---|---|
| Telefon | Tek sütun ağırlıklı ve başparmakla kullanılabilir; mobil arama, filtre, gerektiğinde alt menü ve sürüklenebilir panel. Ana bilgi önde; derinlik açılabilir. Küçük ve büyük iPhone ile Android’de hem dikey hem yatay. |
| Tablet ve dar pencere | iPad ve Android tablette, ekran elverdiğinde 2–3 sütun veya liste/detay; dokunma, klavye ve trackpad birlikte. Bölünmüş ekranı ve dar masaüstü penceresini de test et. |
| Masaüstü ve geniş ekran | Kullanışlı yan gezinme ve filtre paneli, daha yoğun bilgi, anlamlı klavye kullanımı. 4K/ultra-wide’da satır uzunluğu ve kart genişliği sınırlı. Geniş ekran, büyütülmüş telefon düzeni gibi görünmesin. |
| Tasarım sistemi | Tek kod tabanı, ortak bileşenler ve anlamlı renk/boşluk/tipografi/kenar/gölge/hareket değişkenleri. Bileşen kendi alanına göre yeniden düzenlensin; kararlar dokunma, işaretçi, ekran yönü, kontrast ve alan üzerinden alınsın. |
| Görünüm | Temiz, ferah, okunur, sade ama derin. Cam etkisi yalnız gezinme veya katman ayrımı gibi gerçek işlev için; okunurluğu veya mobil performansı düşürmesin. Akıcı tipografi ve düzen; yapay kamera/telefon çerçevesi, ağır hareket, kaydırmayı ele geçirme yok. |
| Etkileşim | Arama önerileri ve geçmiş, dokunma/klavye seçimi, kısa ve anlamlı geri bildirim; geri/ileri, paylaşılabilir bağlantı ve gerektiğinde okuma konumu korunur. Yükleme, boş, hata, çevrimdışı, kısmi veri ve yavaş ağ durumları tasarlanır. |
| Performans | Kritik kabuk önce gelir. Açılmamış harita/kamera/katalog modülü başlangıç paketine yüklenmez. Uygun SSR/SSG, gerektiğinde streaming; gereksiz hydration, büyük paket ve ağır görsel yok. WebP/AVIF ve uygun geri dönüş, responsive boyutlar ve sabit görsel ölçüleri. LCP, INP ve CLS’yi yavaş ağ ve sınırlı cihaz gücüyle ölç. |
| Erişilebilirlik | WCAG 2.2 AA hedefi; semantik yapı, okunur kontrast, görünür odak, form etiket ve hataları, ekran okuyucu, klavye ile modallar, dokunma alanı ve azaltılmış hareket. Otomatik taramaya ek olarak kritik ekranları elle dene. |
| PWA, SEO ve güvenlik | Kurulum ve güncelleme, çevrimdışı saha defteri, önbellek ayrımı; kanonik URL, Open Graph, yapılandırılmış veri ve site haritası. Yetkili veri ve özel sayfalar indekslenmesin. Giriş, izin, güvenli çerez, XSS/CSRF, doğrulama ve gizli anahtarlar sunucu sınırında korunur. Gereksiz izleme yapılmaz. |

**6 Ekim’deki daha yeni tasarım kararı:** Varsayılan açılış **açık tema ve saf beyaz sayfa zemini**. Ana uygulama, çevrimdışı açılış ve kurulu uygulamanın açık tema zemini uyumlu olsun. Koyu tema ve sistem tercihi seçilebilir; daha önce yapılan seçim korunur. 3 Ekim metnindeki “sistem tercihini okuyabilen koyu tema” maddesini varsayılanı tekrar otomatik yapma talimatı gibi okuma. Bu sonraki karar `ADAPTIVE-QA.md` ve v67’deki tema kodunda kayıtlı.

### 8.2. Canlı site ve düzenleme akışı — bu sohbetten eklenen istekler

- **Çalışan bağlantı ver.** Ana sayfa ve önemli ekranlar doğrudan açılabilsin; sadece bir depo bağlantısını canlı site diye sunma. URL’yi gerçekten açıp doğru projeyi ve doğru sürümü verdiğini kontrol et. “Siteye ulaşılamıyor” veya “canlı yayın hatası” bildirildiğinde hata, erişim ve yayın durumunu ayır; tahminle “düzeldi” deme.
- **Ben tasarımı gördüğüm ekranda inceleyip yönlendirebilmeliyim.** ChatGPT Sites önizlemesi kullanılabiliyorsa proje bağlantısı, telefonda deneme gerekiyorsa yetkili bir tarayıcı bağlantısı ver. “Düzenleme iste” alanı bu ortamda pasifse, sebebini ve rol/yetkiyi doğrula. Düğme platforma aitse kod değişikliğiyle açıldığını iddia etme; kullanılan GitHub/önizleme akışında geri bildirimin nereye yazılacağını açıkça göster. Bu istek, canlı sitede gizli bir düzenleme API’si açma yetkisi vermez.
- **Düğmelerin sonucu belli ve çalışır olsun.** Tasarımı baştan ele alabilirsin; “Ekle”, kapanış, geri dönüş, fotoğraf, mod seçimi, arama, filtre, kaydetme ve önizleme gerçek bir işleme bağlı olmalı. En az tıklama, hızlı tepki ve hatadan sonra devam edebilmek öncelik. Tasarımın estetiği ile çalıştığını gösteren kanıtı ayrı ver.
- **GitHub tercihim aşamalar içinde değişti.** Önce Orman Parkları gibi GitHub uzantılı bir adres istedim; ardından mevcut sorun giderilirken GitHub bağlantısının kesilip tasarımın bu ortamda sürmesini istedim. Son kararım **geliştirmeyi Claude Code ve özel GitHub depom üzerinden sürdürmek**, yeni tasarımı önce görüp denemek, gerçek veriyi en son taşımak ve siteyi istediğimde kendi alan adıma alabilmek. Tarihsel bağlantıyı kesme isteğini, sonraki GitHub kararının önüne koyma. Bu derleme kendiliğinden depo, canlı yayın veya DNS değişikliği başlatmaz.
- **Kamera tasarımı onaylı sayılmaz.** 67. sürüm kamera, arama ve ses akışı için kullanılabilir bir başlangıç; “tasarım hâlâ istediğim gibi değil” geri bildirimi nedeniyle görsel kabul yeniden alınmalı. İki orijinal iPhone ekranını aynı ölçekte kullan; yalnız renk, etiket veya simge değiştirerek işi bitmiş sayma.

### 8.3. Önceki teknik ve veri notları — talimatla durum kaydını ayır

Aşağıdaki maddeler geçmiş proje dokümanlarında ve dosyalarda görülen teknik kapsamdır. Yeni verinin tamamının canlıda bulunduğuna veya eski testlerin bugün yeniden geçtiğine kanıt değildir.

- **Türkiye florası:** 6 Ekim teknik notu TÜBİVES arşivinde 174 familya ve 10.478 takson kaydını bildirir. Bu, güncel Türkiye florasının tamamı veya bütün künyelerin ayrıntılarının tek tek bilimsel olarak doğrulandığı anlamına gelmez. Eksik rütbeyi, organ bilgisini, endemizm veya yayılışı benzer türden doldurma. Kaynaktaki çelişkiyi işaretle; Türkçe adın kaynağı ile bilimsel adın kaynağını karıştırma.
- **GBIF:** Liste, harita, istatistik ve veri seti aynı etkin filtreleri kullanmalı. Koordinat belirsizliği, kalite uyarıları, veri seti, yayıncı, lisans ve DOI alanlarını sakla. Harita katmanı hata verirse kullanıcıya söyle ve mümkünse mevcut kayıt işaretlerini tut. Sayfa CSV’sini tam veri indirmesi sanma; büyük indirme için kaynağın resmî akışını göster. Gerçek servis sınırlarını yayından önce tekrar doğrula.
- **Yaşam ağacı ve ICTV:** ITIS’te doğrulanmış yedi âlemi, farklı kaynak/sürüm kimliklerini, geçerli ebeveyn ilişkilerini ve sayfalı dalları koru. COL XR toplam ad kullanımını “kabul edilmiş tür sayısı” diye verme. ICTV’nin `MSL41.v1` kontrol noktası 22.670 takson, 17.554 tür, 176 tarihsel değişiklik ve 572 aktarım paketi olarak belgelenmiş; üretime aktarımı ayrıca doğrula. 27 Ekim notunda büyük veri adımının şemadan ayrıldığı kayıtlıdır; eski dosya geçmişi saklanır, doğrulanmış veri paketleri atomik ve devam edilebilir çalışır. Bu tarihsel işlem, yeni bir üretim aktarımı için peşin yetki değildir.
- **Gözlem ve topluluk:** Fotoğraflı taslakları cihazda sahiplik bilgisiyle sakla; imzasız taslağı hesaba yalnız açık kullanıcı seçimiyle bağla. Yarım yüklemeyi güvenli biçimde sürdür; çift gönderim aynı gözlem veya yorumun kopyasını oluşturmamalı. Özel taslak, moderasyon notu veya konum kendiliğinden görünür olmamalı. Yayımlanan gözlem düzenlenirse mevcut gözden geçirme akışını koru. Beğeni, takip ve kaydetmede hata olursa yalnız etkilenen işlemi geri al.
- **Sosyal içerik ve Facebook arşivi:** Önceki kaynak dosya `orman-muhendisi-facebook-aktarim.json` (6 Ekim 2022 dışa aktarma) 5.378 arşiv kaydı, 4.649 kaynak dosya, 169 yinelenen yol, 729 eksik medya, özgün tarihli 1.186 ve özgün açıklamalı 775 kayıt bildirir. Bunlar **dosya envanteri**; yayındaki kayıt sayısı değil. Medya dizini ayrıca gerekir. Aynı kayıt tekrar gelince düzenlemeleri ezme; taslakları kendiliğinden yayımlama; eksik tarih, metin ve görseli uydurma. Tam medya ile kaynak ve lisans doğrulanınca yayın kararı ver. Facebook yedeğini canlı eşitleme sayma; Instagram, X, YouTube ve TikTok için ayrıca doğrulanmış izinli kaynak gerekir.
- **Canlı entegrasyon ve tasarım referansı:** Kullanılabilirlik, tarihi rapordan değil ortamın gerçek ayarından okunur. ChatGPT oturumu, doğrudan Google/Apple/Facebook/Microsoft girişleri, harita sağlayıcıları ve yapay zekâ ayrı ayrı doğrulansın. Tarihsel önizleme “Bitkinin sosyal hâli” ve Keşfet düzenini gösterir; güncel ana sayfa veya Google Lens kabul referansı değildir. Önceki notta Figma kaynağı ve PlantPaNet yazı tipinin doğrulanamadığı belirtilmiş; kesin font veya tasarım kaynağı iddiası kurma.

## 9. www.ormanmuhendisi.com adresine taşıma şartı

**Ben istediğim zaman tam çalışan siteyi `https://www.ormanmuhendisi.com/` adresine taşıyabilmeliyim.** Bu gelecek için bir teslim ve taşınabilirlik şartıdır. Alan adının kayıt, sahiplik, DNS ve sertifika durumu bu belgede doğrulanmış sayılmaz; şu anda bağlama, satın alma, ödeme veya mevcut DNS kayıtlarını değiştirme.

1. **Adres ayardan gelsin.** Canlı, önizleme ve yerel adresleri ayrı tanımla. Site içi URL’ler ve API çağrıları uygun olduğunda aynı kökenli/göreli olsun. Kanonik adres, paylaşım önizlemesi, sitemap, robots, PWA `start_url` ve `scope`, medya URL’leri, OAuth dönüşleri ve izinli kökenler ortam ayarından kurulabilsin. Kodun içine `chatgpt.site`, `github.io` veya `www` adresi sabitlenmesin; dokümandaki doğrulanmış tarihsel linkler bu kuralın dışındadır.
2. **Tam uygulamayı taşı.** GitHub, sürüm ve geliştirme merkezi. Yeni alan adının arkasında kamera arayüzüyle beraber Lens/AI uçları, giriş, yetkiler, gözlem kayıtları, veritabanı ve medya çalışmalı. Sadece DNS’i değiştirmek bu işlevleri taşımaz. Mevcut Worker/D1/R2 uyumlu bir çözüm adaydır; yeni barındırmayı test etmeden seçilmiş gibi gösterme. Çalışan özellik, bakım, maliyet ve çıkış kolaylığına göre seçenekleri karşılaştır. Netlify kullanma.
3. **Giriş ve veri bağımsız taşınabilsin.** Sites’a özgü kimlik ve barındırma bağlarını tek yerde tut; yeni ortamda gerçek doğrulama gereksinimini yaz. Veritabanı şeması ve yetkili veri ihracı, medya dosyaları ve her kaydın medya anahtarı, kaynak/lisans ve gerekli rol ilişkileri ayrı teslim edilsin. Giriş belirteçlerini veya şifreleri kopyalamaya çalışma; gerekiyorsa yeniden giriş ve hesap eşleştirme akışını planla. Özel verileri, ayarları ve anahtarları açık depoya veya örnek siteye koyma.
4. **Önce prova, sonra geçiş.** Kendi üretim verisine dokunmadan özel bir deneme ortamı kur. Yetkili yedek alınabiliyorsa boş deneme veritabanına ve medya deposuna geri yükle; tablo satırları, kayıt kimlikleri, ilişkiler, izinler, fotoğraf/video açılışı ve örnek checksum’ları karşılaştır. Bu yedek mevcut Sites ortamından henüz çıkarılmadı. Yetkili dışa aktarma yolu yoksa “aktarılabilir” diye geçişi tamamlanmış gösterme; eksik erişimi açıkla.
5. **Adres değişimini doğrula ve geri dönüşü hazırla.** Onayım geldiğinde `www.ormanmuhendisi.com` ana adres olsun; kök `ormanmuhendisi.com` adresi erişilebilir ve yetkiliyse HTTPS üzerinden `www` adresine kalıcı yönlensin, yol ve sorgu korunabilsin. Mevcut e-posta/DNS kayıtlarını koru. Yeni HTTPS sertifikası, iPhone Safari kamera/mikrofonu, giriş/çıkış, tür ve harita bağlantıları, dosya yükleme, Lens servisleri, PWA ve SEO’yu yeni adreste kontrol et. Tarayıcı eski ve yeni adresi ayrı site olarak görür; çevrimdışı saha taslaklarının ve kurulu PWA’nın kendiliğinden taşınacağını varsayma. Gerekirse kullanıcıya kontrollü dışa/içe aktarım ve yeniden kurulum adımı sun. Eski yayını yeni ortam doğrulanana kadar geri dönüş için hazır tut.

**Claude’un bırakacağı dosyalar:** Gizli değer içermeyen ortam değişkenleri örneği, yetkili veritabanı ve medya taşıma kontrol listesi, önizleme/üretim yayın adımları, geri dönüş adımı, temel GitHub otomasyonları ve kısa bir “kendi alan adımı nasıl bağlarım?” kılavuzu. Bu teslimler hazırlanabilir; gerçek yayın ve DNS geçişi benden onay geldikten sonra yapılır.

## 10. Güncel teknoloji şartı ve karar kuralı

**Güncel ve kullanılan teknolojilerden yararlan.** Uygulamadan önce mevcut kilit dosyasındaki sürümleri, güvenlik/bakım durumunu ve birbiriyle uyumunu resmî belgelerden kontrol et. Uyumlu, güncel ve kararlı sürümleri seç; üretimde deneysel bir özellik kullanılacaksa eşdeğer geri dönüş ve gerçek tarayıcı kanıtı olsun. Paketleri sırf sürüm numarası yükselsin diye topluca değiştirme. Sürüm yükseltmesini tasarım ve veri değişikliklerinden ayrı incele.

- **Öncelik web standartları:** semantik HTML, TypeScript, CSS Grid/Flexbox, container queries, logical properties, tasarım değişkenleri, `clamp()`, uygun dinamik ekran ölçüleri ve güvenli alanlar. Container style queries, View Transitions veya yeni platform API’leri ancak hedef Safari/Chrome/Edge/Firefox sürümleriyle uyumluysa; uyum yoksa temel ekran ve işlev çalışmalı. “En yeni” ile “üretime uygun” ayrımını tarayıcı desteğiyle göster.
- **Çalışan v67’yi başlangıç al:** React/TypeScript, Vinext, mevcut Worker ve şema yapısı. Kalıcı yığın değişikliği ancak gerçek uyumsuzluk, ölçülen performans ya da bakım kazancı, test ve taşınabilirlik gerekçesi varsa önerilsin. Node ve derleme uyumunu CI’da kilitle; güncel bağımlılıkları test edilmiş kilit dosyasıyla kaydet. İlk ekranı gereksiz istemci koduyla ağırlaştırma.
- **GitHub’da tekrarlanabilir iş akışı:** PR için kurulum, tip kontrolü, test, üretim derlemesi ve performans bütçesi; mümkünse temel tarayıcı testleri, görsel fark ve erişilebilirlik. Deneme ile canlı ortam ayarları ve erişimleri ayrı. Anahtarlar CI/hosting gizli ayarlarından gelir; gerçek kullanıcı ve üretim verisi testlere konmaz. Otomasyonun kurulması ile canlı yayını açma birbirinden ayrı adımlardır.
- **Resmî teknik kaynaklar:** [Web Platform Baseline](https://web.dev/baseline), [Next.js destek politikası](https://nextjs.org/support-policy), [Cloudflare Worker alan adı](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [D1 içe/dışa aktarma](https://developers.cloudflare.com/d1/best-practices/import-export-data/), [R2 S3 uyumu](https://developers.cloudflare.com/r2/api/s3/api/), [GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions), [GitHub Pages kapsamı](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). Bunlar güncel seçim ve prova için başlangıç kaynaklarıdır; yeni altyapı kurulmuş sayılmaz.

## 11. Kaynak çizelgesi ve hangi isteklerin nereden geldiği

| Kaynak | Belgeye alınan içerik ve sınırı |
|---|---|
| 3 Ekim 2026 — [Yapıştırılan metin(20261003-102518).txt](https://chatgpt.com/library?file_id=libfile_6c5137736d3c819197a5fdb751e5fb3e&account_id=personal) ve [102648 kopyası](https://chatgpt.com/library?file_id=libfile_613cd25fffa88191af1994a879beae4f&account_id=personal) | 50 maddelik ürün/tasarım şartnamesi. Erişilen içerikler aynı; Ek A’da tek nüsha. |
| 5 Ekim 2026 — [Keşfet önizlemesi](https://chatgpt.com/library?file_id=libfile_13df0463bf848191b46eb0799747382b&account_id=personal) | Eski görsel durum, gezinme ve keşif hiyerarşisi. Kullanıcı talimatı veya güncel tasarım onayı değildir. |
| 6 Ekim 2026 — kaynak kodundaki `ADAPTIVE-QA.md` | Beyaz varsayılan zemin revizyonu, erişilebilirlik ve performans kontrolü, gözlem/arama/PWA/arşiv davranışları ve o tarihin doğrulama sınırları. |
| 27 Ekim 2026 — `docs/taxonomy.md` | Geçmiş taksonomi/yayın kurtarma kararı ve veri bütünlüğü. Güncel üretim aktarımı sonucu değildir. |
| [Facebook aktarım envanteri](https://chatgpt.com/library?file_id=libfile_33d5046644e88191be0ca410ea260017&account_id=personal) ve [site görünüm kaydı](https://chatgpt.com/library?file_id=libfile_84c566b395e48191a2d416044dc31ec6&account_id=personal) | Arşiv dosyasındaki kapsam ile sitede görünen alanları doğrulamak için. Ham envanteri, özel veriyi veya medyayı dışarı gönderme. |
| Bu sohbet ve [Arama](https://chatgpt.com/library?file_id=libfile_4cd3618e11788191ad9dd12bee66fee0&account_id=personal) / [Oluştur](https://chatgpt.com/library?file_id=libfile_73cfec991ba08191b64107e89e114fa8&account_id=personal) iPhone referansları | Gerçek kamera akışı, iki görselle karşılaştırma, çalışan yayın bağlantısı, düzenleme isteği, GitHub/Claude Code ve son veri aktarımı. V67, görsel kabul değildir. |
| 10 Kasım 2026 — bu belgeye eklenen son kullanıcı isteği | Siteyi gerektiğinde **www.ormanmuhendisi.com** adresine tam işleviyle taşıyabilme ve güncel teknoloji kullanma. Bölüm 9–10 bu isteği uygulanabilir teslim koşullarına çevirir. |

Bu derleme erişilebilen mevcut sohbet, Kitaplık kayıtları ve sürüm 67’nin proje belgelerine dayanır. Diğer sohbetlerin tam dökümü bu çalışma sırasında erişilebilir değildi. Bu nedenle burada doğrulanamayan eski bir tercihi uydurma; yeni bir konuşma kaydı paylaşılırsa tarih ve kaynağını ekle. Orman Parkları projesi ile ayrı içerik üretim eklentilerinin kurallarını bu site için otomatik görev sayma.

## 12. Öncelikli ve sonraki aşamaya bırakılacak geliştirmeler

Bu yedi fikir tasarım talimatına eklenmiştir. Aşağıdaki sıralama uygulama önerisidir; v67’de tamamlandıkları veya üretim verisiyle çalıştıkları anlamına gelmez. Mevcut tasarım ve çekirdek işlevlerin doğrulanmasını bekletme.

### İlk iPhone önizlemesi: tek akışta iki fikir

1. **Rehberli tür tanıma.** Fotoğraf yetersizse kullanıcıya hangi ikinci kareyi neden çekmesi gerektiğini söyle: örneğin kabuk, yaprağın alt yüzü veya kozalak. Bu öneriyi eldeki görüntü ve kaynaklı ayırt edici özellik üzerinden ver. Kullanıcı ek kareyi onayladığında aynı gözleme bağla; ilk fotoğraf ve notlar kalsın. Yetersiz fotoğrafta kesin tür adı üretme.
2. **“Neden bu tür?” kartı.** Tür tahmininde fotoğrafta görülen özelliği, eksik kanıtı ve en çok karışan türle belirleyici farkı kısa göster. Görüntüde olmayan özellik açıkça “görülmedi” olarak ayrılsın. Kaynak bağlantısı, yapay zekâ önerisi ve doğrulanmış gözlem farklı biçimde sunulsun; tahmini otomatik olarak doğrulanmış kayda çevirme.

**İlk örnek akış:** Fotoğraf çek → tür önerisinin gerekçesini gör → gerekiyorsa ikinci kareyi aynı gözleme ekle → taslağı kaydet. Bunu iPhone’da ve örnek verilerle dene. Uygun karşılaştırma verisi yoksa belirsizliği görünür bırak.

### Çekirdek akış oturduktan sonra

3. **İndirilebilir saha paketi.** Kullanıcı araziye çıkmadan önce bir il veya çalışma alanının kısa tür rehberini indirsin. Yalnız çevrimdışı dağıtımına izin verilen içerik alınsın. Bağlantısızken rehbere bakabilsin, fotoğraf ve not ekleyebilsin. Bağlantı dönünce hangi taslakların gönderileceğini kullanıcı seçsin; yeniden gönderim kopya üretmesin.
4. **Haritadan açılan il dosyaları.** İl seçilince o ilin öne çıkan habitatları, kaynak ve yılı görünen orman verileri, seçili türler ve görünür gözlemler açılsın. Birkaç pilot ilde doğrula; veri ve tasarım yeterliyse 81 ile genişlet. Eksik değer sıfır kabul edilmesin ve tahmini bir bilgi resmî değer gibi gösterilmesin.
5. **Tür künyesinden Orman Mühendisi içeriklerine geçiş.** Örneğin karaçam künyesinde o türe ait yazı, fotoğraf ve videoları göster. Bağlantı bilimsel tür kimliğine ve editör kontrolüne dayansın; yalnız ad benzerliğiyle otomatik ilişki kurma. Kaynak, tarih ve görsel kredisi korunsun.
6. **Paylaşılabilir gözlem kartı.** Kullanıcı özgün fotoğraf, tür adı, gerekirse “tür önerisi” etiketi ve kaynakla paylaşım kartı oluşturabilsin. Hassas konum varsayılan olarak gizli kalsın; dışa aktarılan görsel ve metaveri bu kararı bozmamalı. Kullanıcı kartı görüp onaylamadan paylaşım yapılmasın.
7. **Yönetici veri kalite ekranı.** Kaynaksız tür bilgisi, lisansı eksik fotoğraf, kırık bağlantı ve aktarımda eşleşmeyen kayıtlar filtrelenebilsin. Her satırdan ilgili kayda gidilsin. Veri değişikliği veya silme işlemi rapordan otomatik başlatılmasın; yönetici önce farkı görsün.

Her yeni özelliği ayrı, geri alınabilir iş olarak geliştir. İlk teslimi 81 il, tam saha arşivi veya yeni yönetici ekranı tamamlanana kadar bekletme.

## 13. Altı dış veri kaynağı: bütün tür adları ve izinli alanların aktarımı

**Son isteğim:** Aşağıdaki kaynakların kapsadığı **bütün tür adlarını, en azından isim düzeyinde, Orman Mühendisi’nin aranabilir veritabanına ekle.** Kabul edilen bilimsel ad, eş ad ve varsa izinli Türkçe adı birbirine bağla. Ad dışındaki alanların da **izin ve kullanım koşulları doğrulanabilen tamamını** aktar. Açıklama, fotoğraf, ses, harita, konum, yayın referansı ve kaynak tarafından sunulan diğer alanları kendi izinlerine göre ayrı değerlendir. Telif/veritabanı hakkı iddiası, izin belirsizliği veya uyumsuz lisans varsa ilgili içeriği alma ve yayımlama. İzinli bir bağımsız kaynaktan doğrulanabilen tür adını ve onun izinli alanlarını eklemeye devam et.

**Bütün adlar** bir lisanslı ve doğrulanabilir kapsam hedefidir. Tek bir iNaturalist gözlemi küresel tür listesi değildir; Pl@ntNet tanıma sonuçları da eksiksiz taksonomi kataloğu sayılmaz. Kaynağın yayımladığı kullanılabilir sürümü, kapsadığı takson gruplarını ve coğrafyayı ayrı kaydet. Tam listeyi toplu olarak almaya izin vermeyen veya izni bilinmeyen bir veri tabanını, “yalnız isim alıyorum” gerekçesiyle kazıma ya da parçalara bölerek kopyalama. O adları ITIS, IPNI, açık Kew/WCVP dağıtımı veya mevcut diğer izinli kaynaklardan doğrula. Hâlâ eksik kalanları kaynağı ve nedeni ile raporla; “bütün adlar aktarıldı” deme.

### Kaynakların görevleri ve izin koşulları

| Kaynak | Veritabanına alınacak alanlar ve sınırlar |
|---|---|
| [iNaturalist — örnek gözlem 406300667](https://www.inaturalist.org/observations/406300667) | Bu bağlantı tek kayıt örneğidir. İzinli resmî veri dağıtımı veya [önerilen API yolu](https://www.inaturalist.org/pages/api%2Brecommended%2Bpractices) üzerinden uygun takson ve gözlem kayıtlarını al; tür kataloğunu bu tek kayıttan türetme. [Gözlem bilgisi, fotoğraf ve ses ayrı lisanslanır](https://help.inaturalist.org/en/support/solutions/articles/151000175695); her birini ayrı doğrula. [Gizlenmiş veya yuvarlanmış konumu](https://help.inaturalist.org/en/support/solutions/articles/151000233080-how-does-inaturalist-protect-the-locations-of-sensitive-species-) açığa çıkarma; koordinat yoksa veya gizliyse boş bırak, yaklaşık konumu kesin konum diye gösterme. Bu örnek gözlemin ve medyasının lisansı devir sırasında doğrulanamadı; doğrulanana kadar yalnız kaynak bağlantısı. |
| [Bizim Bitkiler — Türkiye Bitkileri Listesi](https://bizimbitkiler.org.tr/yeni/demos/technical/?) | Türkiye için bilimsel/Türkçe ad, familya, endemizm ve bölgesel yayılış karşılaştırması yap. Devir sırasında toplu çıkarma ve yeniden yayınlama izni doğrulanamadı. Resmî açık dağıtım veya yazılı izin doğrulanırsa kapsamdaki tüm adları ve izinli alanları al. O zamana kadar sayfayı kazıma, listeyi veya görselleri kopyalama; kamuya açık kaynak bağlantısı ver ve tür adlarını bağımsız, izinli kaynaklardan tamamla. |
| [Pl@ntNet Türkçe](https://identify.plantnet.org/tr) | Bitki fotoğrafından tanıma, izinli flora/tür verisi ve fotoğraf sonuçları. Web arayüzünü kazıma; [resmî API şartlarına](https://my.plantnet.org/terms_of_use) ve [görsel/veri lisanslarına](https://docs.plantnet.org/en/reference/data-and-image-licensing/) göre çalış. Varsa izinli tam flora/tür dağıtımını kullan; tanıma API’sinden tekrarlı sorgularla listeyi çıkarmaya çalışma. Her fotoğrafın sahibini, lisansını ve atfını ayrı kaydet. Sonuç “tür önerisi”dir; doğrulanmış künye/gözlem değildir. Kota, ücret veya yeni hesap gerekir ise başlamadan önce bana bildir. Kullanıcı fotoğrafını dış servise ancak ilgili tanıma işlemini kullanıcı açıkça seçtiğinde gönder. |
| [IPNI — International Plant Names Index](https://www.ipni.org/) | Damarlı bitkilerin bilimsel ad, yazar, ilk yayın ve ilgili adlandırma alanlarını, IPNI/LSID kimliğiyle al. [IPNI veri koşulları](https://www.ipni.org/terms-and-conditions) CC BY atfını belirtir; kaynak ve erişim/sürüm bilgisi görünür olsun. IPNI, kabul edilen tür adı veya yayılış konusunda tek başına hüküm vermez; o alanları Kew/POWO veya diğer uygun kaynakla eşleştir. [Resmî indirme kapsamı ve tam veri yolu](https://www.ipni.org/faq) üzerinden ilerle; site sorgu sınırını aşarak toplu liste oluşturma. |
| [Kew — Royal Botanic Gardens](https://www.kew.org/) | Kabul edilen ad, eş ad, familya ve genel yayılış için [POWO](https://powo.science.kew.org/) ve [WCVP’nin açıklanan kaynağını](https://powo.science.kew.org/about-wcvp) kullan. Tam ad listesi için yalnız izinli sürümü seç. [Kew bilimsel veri koşullarındaki](https://www.kew.org/science/collections-and-resources/data-and-digital/terms-of-use) veri setine ve nesneye özel koşulları, [atıf sayfasıyla](https://powo.science.kew.org/cite-us) birlikte kontrol et. Ana sitenin metinleri, fotoğrafları, çizimleri ve haritaları veri setiyle aynı lisansa sahip varsayılmaz. |
| [ITIS — Integrated Taxonomic Information System](https://www.itis.gov/) | TSN, rütbe, üst takson, bilimsel ad, kabul/eş ad ilişkileri ve izinli kaynak alanları. [Resmî veri indirmesini](https://www.itis.gov/ftp_download.html) veya belgelenmiş API’yi kullan. ITIS’in kendi [atıf sayfası](https://www.itis.gov/citation.html) CC0 belirtir ve atıf ister; [üçüncü taraf materyallerini](https://www.itis.gov/privacy.html) ayrı tut. Tür dışındaki rütbeleri tür tablosuna yanlış etiketle ekleme; ağaçta ayrı kayıt olarak sakla. |

### Uygulama sırası, izin kapısı ve tamamlanma ölçüsü

1. **Envanter:** Her kaynak için sürüm, resmî indirme/API adresi, beklenen tür ve ad sayısı (varsa), lisans bağlantısı ve sürümü, hak sahibi/atıf, izin verilen alanlar ve yayın/önbellek/dışa aktarma kapsamı kaydedilsin. Kamuya açık sayfayı açık lisans sanma. Lisans, kullanım şartları ve izinlerin amaca uygunluğunu toplu indirmeden önce kontrol et.
2. **Önce adlar:** İzinli bütün kayıtların özgün ad, bilimsel ad yazımı ve yazarı, rütbesi, kabul durumu, eş ad ilişkisi, varsa Türkçe ad, kaynak kimliği ve bağlantısı ayrı sütunlarda saklansın. Aynı tür birden fazla kaynaktan geldiğinde kaynak kayıtlarını kaybetmeden tek aranabilir tür künyesine bağla. Aynı yazılış, farklı yazar/takson/rütbe veya çelişen sınıflandırma tek başına otomatik birleştirme sebebi değildir. Eş ad aramasında kabul edilen ada yönlendir; kaynak sürümü ve çelişki görülebilsin.
3. **Ardından izinli diğer alanlar:** Her alanı kendi kaynak ve izin kaydıyla ilişkilendir. Mümkün olan tüm izinli alanları — örneğin betimleme, tarih, gözlem, yayın, habitat, yayılış, fotoğraf/ses ve diğer medya — eksiltmeden uygun biçimde aktar. Başka siteye bağlantı vermekle içeriği kopyalamayı ayrı işlemler yap. İzin yalnız bağlantıya uygunsa kartta bağlantı dışında kopya, küçük önizleme, gömülü medya veya dışa aktarılabilir veri oluşturma. Lisansı bilinmeyen, tüm hakları saklı, kullanım amacıyla uyumsuz veya atıf/diğer yükümlülükleri karşılanamayan içeriği atla. Bireysel lisans değişirse yeniden incele. Kişisel/gizli bilgi ile hassas konumu, açık lisans olsa bile gereksiz yere aktarma.
4. **Telif veya veritabanı hakkı iddiasında dur:** Etkilenen kaydın, alanın veya kaynağın yeni alımını hemen durdur. Sitede varsa inceleme bitene kadar ilgili kopyayı, görseli, dışa aktarımı ve kontrolümüzdeki önbellekleri erişimden çıkar. İddianın kapsamı kaynağın tamamını etkiliyorsa o kaynak beslemesini kapat; yalnız bir fotoğrafa ilişkinse bağımsız, izinli bilimsel ad kaydını silme. Kanıtı ve atıf kaydını erişimi sınırlı denetim için sakla. İzin doğrulanmadan yeniden yayımlama. Gerekirse izin isteme veya ücretli erişim için önce bana danış; benim adıma sağlayıcıyla yazışma ya da sözleşme kabul etme.
5. **Güvenli toplu aktarım:** Önce özel test ortamında küçük örnek, sonra yetkili ve izinli sürümle sayfalı/paketli işlem. Kaynak kota ve hız sınırlarına uy. Kesinti sonrası devam ve tekrar çalıştırıldığında mükerrersiz güncelleme sağla. Mevcut tür kimlikleri, gözlemler, medya bağlantıları ve yerel düzeltmeler bozulmasın. Canlı aktarım ayrıca onaylanana kadar üretim veritabanına yazma.
6. **Sayım ve teslim:** Kaynak başına erişilebilir kayıt, ayrı bilimsel ad, kabul edilen tür, eş ad, yeni eklenen, mevcutla eşleşen, çelişkili, izinsiz, yalnız bağlantı ve aktarılan medya sayılarını ver. Kaynakta bildirilen toplamla aktarımı karşılaştır; sürüm ve erişim tarihi görünsün. İzinli kapsamdaki adları yarım bırakma; tamamlanamayanları ve bunlar için kullanılan bağımsız açık kaynakları ayrı listele. Doğrulanmamış bir kapsama “tam” etiketi koyma.

Bu bölüm daha önceki GBIF, TÜBİVES, Catalogue of Life ve ICTV koşullarını kaldırmaz. Yeni kaynaklar önce mevcut kayıtlarla karşılaştırılır; sonradan ekleme mevcut verinin üzerine kaynaksız veya izinsiz yazma yetkisi değildir.

## Ek A — 3 Ekim 2026 tarihli 50 maddelik tasarım metni

Aşağıda Kitaplıkta iki eş kopya olarak bulunan tasarım metni yer alır. 6 Ekim’deki beyaz varsayılan tema kararı ve daha sonraki GitHub/alan adı tercihleri için yukarıdaki güncel hükümler geçerlidir.

Bu siteyi sıradan bir responsive web sitesi olarak geliştirme. Hedef; Apple, Google ve benzeri üst düzey dijital ürünlerde görülen kalite anlayışına yaklaşan, modern, hızlı, akıcı, sade ama derinlikli, her cihazda o cihaza özel tasarlanmış hissi veren bir web uygulaması oluşturmaktır.

Temel yaklaşım:

Tek kod tabanı + tek tasarım sistemi + cihaz ve ekran koşullarına göre değişen gerçek adaptif arayüz.

Site yalnızca küçülüp büyümemeli. Ekran alanına, giriş yöntemine, kullanılan cihaza ve bileşenin bulunduğu alana göre düzenini, navigasyonunu, bilgi yoğunluğunu ve etkileşim modelini değiştirmelidir.

Ana prensip:

Breakpoint-driven basit responsive site değil; content-driven, container-aware, capability-aware adaptive web application geliştir.

⸻

### 1. MOBILE-FIRST AMA SADECE MOBİLE ODAKLI DEĞİL

Tasarım mobile-first geliştirilsin ancak masaüstü görünümü mobil görünümün büyütülmüş hâli olmasın.

Her cihaz sınıfı kendi kullanım mantığına göre tasarlansın:

Telefon

Telefon görünümü gerçek bir mobil uygulama hissi vermeli.

* Tek sütun ağırlıklı düzen
* Başparmak kullanımına uygun kontroller
* Büyük ve rahat dokunma alanları
* Alt navigasyon gerektiğinde kullanılmalı
* Bottom sheet, drawer ve mobil modal yapıları
* Mobil filtreleme
* Mobil arama deneyimi
* Swipe davranışları gerektiğinde kullanılabilmeli
* iPhone safe-area alanlarına uyum
* Dinamik tarayıcı çubuğu yüksekliği dikkate alınmalı
* Yatay/dikey kullanım bozulmamalı
* Gereksiz hover mantığı kullanılmamalı
* PWA olarak ana ekrandan açıldığında uygulama hissi vermeli

Mobilde masaüstündeki bütün bilgileri sıkıştırıp gösterme.

Bilgi yoğunluğunu azalt, temel bilgiyi öne çıkar, ikincil bilgileri açılabilir alanlara taşı.

⸻

### 2. TABLET GERÇEK TABLET DENEYİMİ OLMALI

Tablet görünümü büyük telefon gibi görünmemeli.

Ekran uygun olduğunda:

* 2 veya 3 sütun kullanılabilmeli
* Sol navigasyon açılabilmeli
* Split-view kullanılabilmeli
* Master-detail yapısı kurulabilmeli
* Liste solda, detay sağda açılabilmeli
* Dokunmatik + klavye + trackpad birlikte desteklenmeli
* iPad dikey ve yatay modları ayrı ayrı optimize edilmeli
* Tablet ekran alanı gerçekten kullanılmalı

Özellikle tabletlerde boş alan bırakıp mobil düzeni ortada büyütme.

⸻

### 3. LAPTOP VE MASAÜSTÜ

Masaüstünde sitenin tüm gücü kullanılmalı.

* Geniş navigasyon
* Çok sütunlu grid
* Side panel
* Filtre paneli
* Gelişmiş arama
* Çoklu içerik görünümü
* Hover durumları
* Tooltip
* Klavye kısayolları gerektiğinde
* Sağ tık veya context menu yalnız gerçekten anlamlıysa
* Daha yoğun bilgi gösterimi

Masaüstü ekran büyüdükçe her şeyi sonsuza kadar genişletme.

İçerik alanlarında mantıklı max-width değerleri kullanılmalı.

Ultra-wide monitörde bile tasarım dengeli görünmeli.

⸻

### 4. CİHAZ ADINA GÖRE DEĞİL, YETENEĞE GÖRE DAVRAN

Mümkün olduğunca:

“Bu iPhone, şunu yap.”

yerine:

“Bu cihaz dokunmatik mı?”
“Hover destekliyor mu?”
“Pointer hassas mı?”
“Container genişliği ne?”
“Ekran yönü ne?”
“Reduced motion açık mı?”

gibi capability-based kararlar kullan.

Desteklenmesi gereken özellikler arasında:

* hover
* pointer
* orientation
* viewport size
* container size
* prefers-reduced-motion
* prefers-color-scheme
* kullanıcı kontrast tercihleri
* touch / mouse / trackpad farklılıkları

yer alsın.

⸻

### 5. MODERN CSS MİMARİSİ

Güncel modern CSS yeteneklerini kontrollü şekilde kullan.

Özellikle:

* CSS Grid
* Flexbox
* Container Queries
* Media Queries
* CSS Subgrid
* clamp()
* min()
* max()
* :has()
* logical properties
* CSS custom properties
* cascade layers
* dvh
* svh
* lvh
* safe-area environment variables

kullanılabilir.

Sadece birkaç breakpoint yazıp her şeyi onlara bağlama.

⸻

### 6. CONTAINER-AWARE BİLEŞENLER

Bileşenler sadece ekran genişliğine göre değişmemeli.

Bulundukları container alanına göre de kendi düzenlerini değiştirebilmeli.

Örneğin aynı kart:

dar alanda:

fotoğraf
başlık
özet

şeklinde olabilir.

Orta alanda:

fotoğraf | bilgi

şeklinde olabilir.

Geniş alanda:

fotoğraf | bilgi | ek özellikler

şeklinde gelişebilir.

Bu mantık bütün site genelinde uygulanmalı.

⸻

### 7. COMPONENT-BASED TASARIM SİSTEMİ

Tüm site merkezi ve tutarlı bir design system kullanmalı.

Temel bileşenler:

* Button
* Icon button
* Card
* Input
* Search
* Select
* Dropdown
* Tabs
* Navigation
* Sidebar
* Bottom navigation
* Modal
* Drawer
* Bottom sheet
* Toast
* Tooltip
* Filter
* Pagination
* Breadcrumb
* Empty state
* Error state
* Skeleton
* Loading state
* Offline state

ortak standartlara sahip olmalı.

Aynı bileşenin mobil/tablet/desktop için ayrı ayrı kopyalarını üretme.

Tek bileşen gerektiğinde farklı davranış kazansın.

⸻

### 8. DESIGN TOKENS

Renk, boşluk, gölge, tipografi ve animasyon değerlerini dağınık yazma.

Merkezi semantic design token sistemi kullan.

Örneğin:

* color.background.primary
* color.background.secondary
* color.text.primary
* color.text.secondary
* color.border
* radius.small
* radius.medium
* radius.large
* spacing.xs
* spacing.sm
* spacing.md
* spacing.lg
* motion.fast
* motion.normal
* elevation.low
* elevation.medium

gibi anlamlı token mantığı oluştur.

Site genelinde görsel tutarlılık buradan yönetilsin.

⸻

### 9. TASARIM DİLİ

Görsel tasarım:

* sade
* modern
* yüksek kaliteli
* temiz
* ferah
* sakin
* premium
* anlaşılır

olmalı.

Kalite göstermek için gereksiz efekt kullanma.

Aşırı gradient, ağır blur, karmaşık gölge, neon efektler veya gereksiz cam efektleri kullanma.

Efektler içerikten daha fazla dikkat çekmemeli.

⸻

### 10. LIQUID GLASS / CAM ETKİSİ

Cam veya Liquid Glass benzeri efektler kullanılacaksa dekorasyon amaçlı değil, arayüz hiyerarşisini destekleyecek şekilde kullanılmalı.

Şunlara dikkat et:

* metin okunabilirliği
* yeterli kontrast
* blur performansı
* arka plan karmaşası
* sınırların anlaşılması
* mobil GPU performansı

Cam efekti bütün ekranı kaplamamalı.

Navigasyon, floating kontrol veya belirli katmanlarda kontrollü kullanılmalı.

⸻

### 11. FLUID TYPOGRAPHY

Tipografi birkaç sabit boyuttan oluşmamalı.

Ekran genişliğiyle kontrollü ölçeklenmeli.

Gerektiğinde:

clamp()

kullan.

Heading sistemi tutarlı olsun.

Örneğin:

* Display
* H1
* H2
* H3
* H4
* Body Large
* Body
* Caption
* Label

tipografi rolleri tanımlansın.

Metin satır uzunlukları okunabilir sınırda tutulmalı.

Çok geniş ekranda paragraf 1500 px boyunca uzamasın.

⸻

### 12. RESPONSIVE GÖRSELLER

Her cihaza aynı dev görseli gönderme.

Kullan:

* <picture>
* srcset
* sizes
* AVIF
* WebP
* responsive cropping
* art direction
* lazy loading

Mobil için uygun çözünürlükte görsel gönder.

Retina/HiDPI ekranlar desteklensin.

Görsellerin boyutları önceden tanımlansın ki yükleme sırasında layout kayması oluşmasın.

⸻

### 13. PWA

Site gerçek Progressive Web App olarak hazırlanmalı.

Bulunması gerekenler:

* Web App Manifest
* app name
* short name
* kaliteli icon set
* Apple touch icon
* maskable icon
* theme color
* background color
* standalone display
* orientation davranışları
* service worker
* kontrollü caching
* offline fallback
* uygulama güncelleme mekanizması

Ana ekrana eklendiğinde tarayıcı sekmesi hissi minimuma inmeli.

⸻

### 14. APP SHELL

PWA uygulama mantığında çalışıyorsa temel uygulama kabuğu hızlı açılmalı.

Navigasyon, temel layout ve kritik UI önce yüklenebilmeli.

İçerik ardından kontrollü biçimde gelsin.

Uygulama açılırken gereksiz beyaz ekran gösterme.

⸻

### 15. PERFORMANS BİR TASARIM ÖZELLİĞİDİR

Site güzel olduğu kadar hızlı da olmalı.

Başlangıç JavaScript paketini mümkün olduğunca küçük tut.

Kullan:

* code splitting
* route-based splitting
* component lazy loading
* dynamic import
* prefetch
* preload yalnız gerçekten gerekli kaynaklarda
* tree shaking
* server rendering gerektiğinde
* static generation gerektiğinde

Her şeyi client-side render etme.

⸻

### 16. SSR / SSG / STREAMING

İçeriğe göre doğru render stratejisini seç.

SEO ve ilk açılış performansı önemli sayfalarda:

* SSR
* SSG
* gerektiğinde streaming

kullan.

Sadece gerçekten etkileşim gereken bileşenlerde istemci JavaScript’i yükle.

Hydration miktarını azalt.

⸻

### 17. JAVASCRIPT BÜTÇESİ

“Yapılabiliyor” diye her şeyi JavaScript ile yapma.

CSS ile yapılabilen şeyi CSS ile yap.

Gereksiz kütüphane ekleme.

Ağır UI paketlerinden kaçın.

Kullanıcının hiç açmayacağı modül başlangıç bundle’ına girmesin.

⸻

### 18. CORE WEB VITALS

Performans aktif olarak ölçülmeli.

Özellikle:

* LCP
* INP
* CLS

takip edilmeli.

Hedef:

* hızlı ilk görünüm
* kullanıcı etkileşimine hızlı cevap
* minimum layout shift

olmalı.

Gerçek kullanıcı performansı sadece geliştirici bilgisayarında değil, zayıf telefon ve yavaş bağlantıda da test edilmeli.

⸻

### 19. PROGRESSIVE ENHANCEMENT

Yeni teknoloji kullanmak için siteyi kırılgan hâle getirme.

Temel deneyim her desteklenen tarayıcıda çalışmalı.

Yeni özellik varsa:

destekliyorsa → gelişmiş deneyim

desteklemiyorsa → düzgün fallback

kullan.

Yeni API’ler sadece modern görünsün diye zorla kullanılmamalı.

⸻

### 20. VIEW TRANSITIONS

Desteklenen tarayıcılarda kaliteli sayfa ve içerik geçişleri için View Transitions kullanılabilir.

Ancak:

* site buna bağımlı olmamalı
* destek olmayan tarayıcıda normal geçiş çalışmalı
* animasyonlar kısa ve doğal olmalı
* performansı düşürmemeli

⸻

### 21. MOTION SYSTEM

Animasyonlar ayrı ayrı rastgele yazılmasın.

Merkezi motion sistemi olsun.

Tanımla:

* fast
* normal
* slow
* easing.standard
* easing.enter
* easing.exit

Geçişler fiziksel ve doğal hissedilmeli.

Gereksiz bounce veya abartılı hareket kullanma.

⸻

### 22. REDUCED MOTION

Kullanıcının prefers-reduced-motion tercihini dikkate al.

Animasyonlar bu durumda:

* azaltılmalı
* sadeleştirilmeli
* gerekirse tamamen kaldırılmalı

⸻

### 23. DARK MODE

Sistem tercihini okuyabilen gerçek dark mode oluştur.

Dark mode sadece beyazı siyah yapmak değildir.

Ayrı:

* surface
* background
* elevated surface
* border
* text
* muted text

değerleri kullan.

Kontrastlar yeniden kontrol edilmeli.

⸻

### 24. ERİŞİLEBİLİRLİK

En az WCAG 2.2 AA seviyesini hedefle.

Şunlar eksiksiz olmalı:

* semantic HTML
* heading hierarchy
* keyboard navigation
* focus states
* visible focus
* screen reader desteği
* ARIA gerektiği yerde
* form label
* error açıklamaları
* yeterli renk kontrastı
* alt text
* dokunma alanları
* klavye ile modal kullanım
* focus trap gerektiğinde

ARIA’yı semantik HTML yerine gereksiz kullanma.

⸻

### 25. TOUCH TARGET

Telefon ve tabletlerde küçük ikonları doğrudan tıklanabilir yapma.

Dokunma alanları parmak kullanımına uygun olmalı.

İkon küçük görünse bile interaction hit-area yeterli büyüklükte olsun.

⸻

### 26. INPUT YÖNTEMİNE UYUM

Mouse cihazında:

* hover
* precise pointer
* tooltip

kullanılabilir.

Touch cihazında:

* tap
* swipe
* bottom sheet
* large touch targets

tercih edilebilir.

Aynı etkileşimi bütün cihazlara zorla uygulama.

⸻

### 27. FORM TASARIMI

Formlar mobilde özellikle kolay kullanılmalı.

* uygun input type
* doğru mobil klavye
* autocomplete
* autofill
* hata mesajı
* loading state
* disabled state
* success state

bulunmalı.

Kullanıcıyı gereksiz alanlarla yorma.

⸻

### 28. SEARCH

Arama deneyimi üst düzey olmalı.

Desteklenebilecek özellikler:

* instant search
* suggestion
* recent searches
* typo tolerance
* keyboard navigation
* mobile full-screen search
* desktop command-style search

Ancak arama alanı gereksiz özelliklerle karmaşıklaştırılmamalı.

⸻

### 29. YÜKLEME DURUMLARI

Her sayfa için sadece ideal durumu tasarlama.

Aşağıdaki durumları da tasarla:

* loading
* skeleton
* no result
* empty
* error
* offline
* connection lost
* retry
* partial data
* slow connection

⸻

### 30. ERROR HANDLING

Kullanıcı hata kodu görmek zorunda kalmamalı.

Teknik hataları anlaşılır kullanıcı mesajına dönüştür.

Örneğin:

“500 Internal Server Error”

yerine uygun kullanıcı açıklaması ve yeniden deneme seçeneği göster.

⸻

### 31. URL VE NAVİGASYON

Sayfaların gerçek URL’leri olsun.

Back/forward düzgün çalışsın.

Deep link desteklensin.

Bir sayfa linki paylaşılırsa kullanıcı doğrudan ilgili içeriğe ulaşabilsin.

PWA olmasına rağmen site mantığını bozma.

⸻

### 32. SEO

SEO mimarisi tasarım aşamasından düşünülmeli.

Şunlar düzgün hazırlanmalı:

* semantic HTML
* title
* meta description
* canonical
* sitemap
* robots
* structured data
* Open Graph
* social preview
* heading hierarchy
* temiz URL
* server-rendered kritik içerik

SEO için kullanıcı deneyimini bozacak yöntem kullanma.

⸻

### 33. SECURITY

Temel güvenlik standartlarını ihmal etme.

Özellikle:

* XSS
* CSRF
* injection
* secure cookies
* authentication
* authorization
* content security policy
* input validation
* secret management

konularını dikkate al.

Gizli anahtarları istemci koduna koyma.

⸻

### 34. PRIVACY

Gereksiz kullanıcı verisi toplama.

Analytics ve telemetry kontrollü olsun.

Kullanıcı verisi toplanıyorsa açık amacı olmalı.

Gereksiz tracking kullanma.

⸻

### 35. GERÇEK CİHAZ TESTİ

Tasarımı yalnız tarayıcı penceresini küçülterek test edilmiş kabul etme.

Aşağıdakilerde test et:

* küçük iPhone
* büyük iPhone
* Android telefon
* iPad portrait
* iPad landscape
* Android tablet
* küçük laptop
* standart desktop
* büyük desktop
* ultra-wide ekran

Ayrıca:

* Safari
* Chrome
* Edge
* Firefox

uyumluluğu kontrol edilmeli.

⸻

### 36. FARKLI PENCERE BOYUTLARI

Tablet veya desktop kullanıcılarının tarayıcıyı tam ekran kullanacağını varsayma.

Site yarım ekran, split screen veya dar pencere genişliğinde de doğru davranmalı.

Bu nedenle cihaz adına değil kullanılabilir alana odaklan.

⸻

### 37. RESPONSIVE DAVRANIŞ

Ekran değiştiğinde sadece:

* font küçülmesi
* kart küçülmesi

olmamalı.

Gerektiğinde değişsin:

* navigasyon tipi
* layout
* sütun sayısı
* içerik sırası
* bilgi yoğunluğu
* filtre konumu
* panel yapısı
* modal türü
* kart biçimi
* arama biçimi
* toolbar yapısı

⸻

### 38. İÇERİK ÖNCELİĞİ

Mobilde birinci derece bilgi önde olsun.

Tablet biraz daha fazla bilgi göstersin.

Desktop en zengin bilgi görünümünü sunsun.

Ancak aynı verinin üç farklı kopyasını oluşturma.

Bilgi hiyerarşisini değiştir.

⸻

### 39. BÜYÜK EKRAN

4K veya ultra-wide monitörde:

* içerik gereksiz büyümesin
* satır uzunlukları bozulmasın
* aşırı boşluk oluşmasın
* kartlar anlamsız büyümesin

Genişlik sınırları ve responsive grid kullanılmalı.

⸻

### 40. ORIENTATION

Telefon ve tablet yatay çevrildiğinde site sadece genişlemiş mobil görünüm göstermemeli.

Yatay mod için daha uygun layout kullanılabilmeli.

⸻

### 41. SAFE AREA

Özellikle iPhone cihazlarında:

* notch
* Dynamic Island
* home indicator
* ekran kenarları

dikkate alınmalı.

Alt navigasyon veya floating element home indicator üzerine binmemeli.

⸻

### 42. SCROLL

Scroll davranışı doğal olmalı.

Gereksiz:

* scroll hijacking
* aşırı parallax
* ağır scroll animasyonları

kullanma.

Sticky öğeler sadece gerçekten faydalıysa kullanılmalı.

⸻

### 43. MICROINTERACTIONS

Küçük etkileşimler kullanıcıya durum anlatmalı.

Örneğin:

* buton basılması
* kaydetme
* favoriye ekleme
* filtre seçme
* menü açılması
* başarı durumu

hafif ve doğal feedback vermeli.

⸻

### 44. HAPTIC BENZERİ WEB HİSSİ

Web’in izin verdiği sınırlar içinde kullanıcıya güçlü durum feedback’i ver.

Ama native uygulama taklidi yapmak için gereksiz yapay davranışlar ekleme.

⸻

### 45. UYGULAMA HİSSİ

PWA telefonda açıldığında:

* hızlı başlamalı
* navigasyon stabil kalmalı
* sayfalar doğal geçmeli
* geri davranışı doğru olmalı
* içerik sıçramamalı
* dokunmatik etkileşim akıcı olmalı

Kullanıcıya “mobil site kullanıyorum” hissi vermemeli.

⸻

### 46. TASARIM İLKESİ

Tasarım şu dört özelliği aynı anda sağlamalı:

Sadelik + derinlik + hız + kullanım kolaylığı

Sade demek boş demek değildir.

Derinlik demek karmaşık demek değildir.

Premium görünüm demek çok efekt demek değildir.

⸻

### 47. TASARIM KARARLARI

Her eklenen öğe için şu soruyu sor:

“Bu gerçekten kullanıcıya yardımcı oluyor mu?”

Cevap hayırsa kaldır.

⸻

### 48. KOD KALİTESİ

Kod:

* modüler
* okunabilir
* yeniden kullanılabilir
* test edilebilir
* sürdürülebilir

olmalı.

Aşırı büyük component oluşturma.

UI, business logic ve veri erişimini gerektiğinde ayır.

⸻

### 49. TEST

En azından kritik akışlarda:

* unit test
* component test
* integration test
* end-to-end test

uygula.

Responsive layout regression testleri de yapılabilsin.

⸻

### 50. SON KALİTE KONTROLÜ

Projeyi “tamamlandı” olarak sunmadan önce bütün ekran aralıklarını kontrol et.

Kontrol listesi:

* yatay taşma var mı?
* metin kesiliyor mu?
* navigasyon bozuluyor mu?
* touch target küçük mü?
* iPhone safe-area doğru mu?
* tablet gerçekten tablet gibi mi?
* masaüstü gerçekten masaüstü gibi mi?
* ultra-wide düzgün mü?
* dark mode düzgün mü?
* reduced motion çalışıyor mu?
* klavye navigasyonu çalışıyor mu?
* ekran okuyucu anlamlı mı?
* PWA kurulabiliyor mu?
* offline fallback çalışıyor mu?
* görseller responsive mi?
* layout shift var mı?
* gereksiz JavaScript var mı?
* loading/error/empty state hazır mı?

Bu kontroller yapılmadan tasarımı bitmiş kabul etme.

⸻

### NİHAİ HEDEF

Ortaya çıkan ürün:

iPhone’da gerçek uygulamaya yakın,
iPad’de gerçek tablet uygulaması gibi,
Mac ve PC’de güçlü bir web uygulaması gibi,
büyük ekranlarda premium bir web deneyimi gibi

hissettirmeli.

Aynı marka dili ve aynı tasarım sistemi bütün cihazlarda korunmalı; fakat her cihazın kullanım biçimine göre arayüz doğal olarak yeniden şekillenmeli.

Masaüstü sitesini küçültüp telefona sığdırma.

Mobil uygulamayı büyütüp masaüstüne yayma.

Her ortam için doğru bilgi yoğunluğu, doğru navigasyon ve doğru etkileşim modelini kullan.

Site cihazı tanımaya çalışmaktan çok, kendisine sunulan alanı ve kullanıcının etkileşim yeteneklerini anlamalı; arayüzü buna göre doğal biçimde yeniden oluşturmalıdır.

Teknoloji seçerken de şu prensibi uygula:

En yeni olduğu için değil; en iyi kullanıcı deneyimini, performansı, erişilebilirliği ve sürdürülebilirliği sağladığı için kullan.
