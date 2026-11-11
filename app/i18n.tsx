import { cloneElement, isValidElement, type ReactNode, type ReactElement } from "react";
export type Language = "tr" | "en";
// Keep internal filter values and user content unchanged; translate presentation only.
const pairs = `
Paylaşımlarımız|Our posts
Tüm paylaşımlar|All posts
Sosyal hesaplarımızdan doğa yazıları|Nature posts from our social accounts
Videolar|Videos
Doğayı izleyerek öğren|Learn by watching nature
Fotoğraflar|Photos
Fotoğraflı paylaşım arşivi|Photographic post archive
Canlılar ve Gözlemler|Living Things & Observations
Bölümler|Sections
Canlılar Dünyası|The Living World
Âlemlerden türlere görsel keşif|Visual discovery from kingdoms to species
Bitkilerin alt gruplarını keşfet|Explore plant groups
Mantarların canlılık ağacını keşfet|Explore the fungal tree of life
Hayvanlar|Animals
Familyalar, cinsler ve türler|Families, genera and species
Fotoğraflarla keşfet|Discover through photos
Gövde / kabuk|Stem / bark
Çiçek / meyve|Flowers / fruit

Giriş seçenekleri|Sign-in options
Google, Facebook, Apple ve diğer hesaplar|Google, Facebook, Apple and other accounts
Türkiye florası|Flora of Türkiye
Bitki bakımı|Plant care
Bitkini tanı. İyi bak.|Know your plant. Help it thrive.
Işık, sulama ve yetiştirme ipuçları.|Light, watering and growing tips.
Bakım kütüphanesi|Care library
Türkiye’de bu tür|This species in Türkiye
İl, grid karesi, rakım ve alt takson bilgilerini birlikte incele.|Explore province, grid, altitude and subtaxon information together.
İl ve grid ile flora tara|Browse flora by province and grid
Yayılış haritası|Distribution map
Türkiye florası · İl / Grid|Flora of Türkiye · Province / Grid
Bir bitki, farklı ayrıntılar|One plant, different details
Yaprak, çiçek, meyve ve genel görünüşü karşılaştır. Katalogdan tür seçebilir veya tür bekleyen bir gözlem paylaşabilirsin.|Compare leaves, flowers, fruit and overall appearance. Choose a catalogue species or share an observation needing identification.
Fotoğraf ekle|Add photo
Fotoğraf:|Photo:

Flora · Kaynak kaydı|Flora · Source record
TÜR GÜNLÜĞÜ|SPECIES JOURNAL
Türü keşfet|Explore species
Endemik değil|Not endemic
Kaynakta il kaydı yok|No province record in source
Kaynakta grid kaydı yok|No grid record in source
Flora kaynak kayıtları|Flora source records
Alt taksonların bilgileri ayrı gösterilir. Bu adlandırmalar flora kaynak kaydına aittir; güncel kabul edilen adlarla farklılık gösterebilir.|Subtaxa are shown separately. These names reflect flora source records and may differ from currently accepted names.
Kaynak kaydı|Source record
Türleri karşılaştır|Compare species
Oturum açmanız gerekiyor.|Please sign in.
Veri tabanı kullanılamıyor.|Database unavailable.
İstek okunamadı.|Request could not be read.
Fotoğraf veya açıklama gerekli.|A photo or description is required.
Fotoğraf geçersiz.|Invalid photo.
Tür bulunamadı.|Species not found.
Görünen ad gerekli.|Display name required.
Kayıt seçilmedi.|No record selected.
Yorum yazın.|Write a comment.
Gözlem bulunamadı.|Observation not found.
Geçerli bir tür seçin.|Select a valid species.
Öneri bulunamadı.|Suggestion not found.
Karar geçersiz.|Invalid decision.
Koleksiyon adı gerekli.|Collection name required.
Koleksiyon bulunamadı.|Collection not found.
Not türü geçersiz.|Invalid note type.
Not boş olamaz.|Note cannot be empty.
İşlem bulunamadı.|Action not found.
İşlem kaydedilemedi. Tekrar deneyin.|Changes could not be saved. Try again.
Yönetici yetkisi gerekli.|Administrator access required.
Ekoloji kaynak bağlantısı geçersiz.|Invalid ecology source URL.
Zorunlu alanları doldurun.|Fill in all required fields.
Özellik seçimi geçersiz.|Invalid trait selection.
Kaynak bağlantısı geçersiz.|Invalid source URL.
HTTPS kaynak bağlantısı gerekli.|An HTTPS source URL is required.
Bu bilimsel ad başlangıç kataloğunda var.|This scientific name is already in the starter catalogue.
Bu bilimsel ad zaten kayıtlı.|This scientific name is already registered.
Düzenlenecek tür bulunamadı.|Species to edit not found.
Fotoğraf deposu kullanılamıyor.|Photo storage unavailable.
JPG, PNG veya WebP biçiminde en fazla 1,5 MB fotoğraf seçin.|Select a JPG, PNG or WebP photo up to 1.5 MB.
Ana sayfa|Home
Keşfet|Explore
Taksonomi|Taxonomy
Veri tabanı|Database
Kütüphane|Library
Harita|Map
Sözlük|Glossary
Koleksiyonlar|Collections
Profil|Profile
Profilim|My profile
Hesap|Account
Gözlem|Observation
Künye|Profile
Tür|Species
Tümü|All
Familya|Family
Cins|Genus
Alem|Kingdom
Bitkiler|Plants
Kategori|Category
Habitat|Habitat
Nem|Moisture
Toprak|Soil
Kaynaklar|Sources
Yorum|Comment
Geri|Back
Ara|Search
Temizle|Clear
Kapat|Close
Kaydedilenler|Saved
İğne yapraklı ağaçlar|Coniferous trees
Geniş yapraklı ağaçlar|Broadleaf trees
Ağaççık ve çalılar|Shrubs and bushes
Sarılıcı bitkiler|Climbing plants
Yer örtücü bitkiler|Ground cover plants
Mevsimlik bitkiler|Seasonal plants
İç mekân bitkileri|Indoor plants
Çiçekli bitkiler|Flowering plants
Şifalı bitkiler|Medicinal plants
Su bitkileri|Aquatic plants
İğne|Needle
Geniş|Broad
Diğer|Other
Ağaç|Tree
Ağaççık / çalı|Shrub
Otsu|Herbaceous
Sarılıcı|Climbing
Yer örtücü|Ground cover
Orman|Forest
Kayalık|Rocky ground
Çayır|Meadow
Sulak alan|Wetland
Kıyı|Coast
İç mekân|Indoors
Bahçe|Garden
Yavaş|Slow
Orta|Moderate
Hızlı|Fast
Tek yıllık|Annual
İki yıllık|Biennial
Çok yıllık|Perennial
Tam güneş|Full sun
Yarı gölge|Partial shade
Gölge|Shade
Kuru|Dry
Nemli|Moist
Islak|Wet
Asidik|Acidic
Nötr|Neutral
Alkalin|Alkaline
25 m ve üzeri|25 m and above
Açık tohumlular|Gymnosperms
Kapalı tohumlular|Angiosperms
Editörün notu|Editor's note
Bir sediri tanırken yalnızca genel görünüşüne bakmayın. İğne yaprakları, sürgünleri ve kozalakları birlikte inceleyin; yetiştiği yer de size önemli bir ipucu verir.|When identifying a cedar, look beyond its overall appearance. Examine needles, shoots and cones together; its location provides another useful clue.
Genel görünüş|Whole plant
Kayıtlar yüklenemedi.|Records could not be loaded.
Veri bağlantısı kurulamadı.|Could not connect to the data service.
Tür bekliyor|Awaiting identification
İşlem kaydedilemedi.|Changes could not be saved.
Bu adla bir koleksiyon var.|A collection with this name already exists.
Koleksiyon kaydedilemedi.|Collection could not be saved.
Koleksiyon oluşturuldu.|Collection created.
Tür kaydedilemedi.|Species could not be saved.
Fotoğraf JPEG, PNG veya WebP biçiminde ve 1,5 MB'den küçük olmalı.|Use a JPEG, PNG or WebP image under 1.5 MB.
Bu tarayıcı konum erişimini desteklemiyor.|This browser does not support location access.
Konum alınamadı. Tarayıcı iznini kontrol edin.|Location unavailable. Check your browser permissions.
Gözleme bir açıklama veya fotoğraf ekleyin.|Add a description or photo to your observation.
Fotoğraf yüklenemedi.|Photo could not be uploaded.
Üye|Member
Gözlem kaydedilemedi.|Observation could not be saved.
Gözlem kaydedildi.|Observation saved.
Eski gözlem site hesabına aktarıldı.|Previous observation moved to your site account.
Eski gözlem aktarılamadı.|Previous observation could not be imported.
Yorum yapmadan önce eski gözlemi hesabınıza aktarın.|Import the previous observation to your account before commenting.
Yorum kaydedilemedi.|Comment could not be saved.
Not kaydedilemedi.|Note could not be saved.
Kişisel notunuz kaydedildi.|Your personal note was saved.
Site bağlantısı kopyalandı.|Site link copied.
Bağlantı kopyalanamadı.|Link could not be copied.
Tür kaydı veri tabanına eklendi.|Species added to the database.
Fotoğraf eklenmedi|No photo added
İğne yaprak|Needle leaf
Geniş yaprak|Broad leaf
Foto:|Photo:
Tür künyesini aç|View species profile
· Konumlu gözlem|· Geolocated observation
Tür seçildi|Species selected
Gözlemde yüklenen bitki|Uploaded plant observation
Fotoğraftaki bölüm:|Plant part:
Bu gözleme tür seç|Select species for this observation
Tür öner|Suggest a species
Farklı tür öner|Suggest another species
Tür önerileri|Species suggestions
Tür kaydı|Species record
Öneri onaylanamadı.|Suggestion could not be approved.
Onayla|Approve
Öneri reddedilemedi.|Suggestion could not be declined.
Reddet|Decline
Konumu OpenStreetMap'te aç|Open location in OpenStreetMap
Beğen|Like
Yorum yaz...|Write a comment...
Kaydet|Save
Paylaş|Share
Gönder|Send
BİTKİNİN SOSYAL HALİ|THE SOCIAL NETWORK FOR PLANTS
Bitki, tür veya kavram ara|Search plants, species or terms
Gözlem ekle|Add observation
KEŞFET|EXPLORE
Ana menü|Main navigation
Tür yönetimi|Manage species
Gördüğün bitkiyi kaydet.|Record the plants you discover.
Fotoğraf, tür ve konumla kendi gözlem arşivini oluştur.|Build your own observation archive with photos, species and locations.
Gözlem oluştur|Create observation
Bilgi kaynakları: Kew Science · Gözlemler site hesabında saklanır.|Sources: Kew Science · Observations are stored in your site account.
ORMAN MÜHENDİSİ / TOPLULUK|ORMAN MÜHENDİSİ / COMMUNITY
Bitkinin|The plant
sosyal medyası.|social network.
Gözlemini paylaş, türleri araştır ve doğadaki ayrıntıları birlikte keşfet.|Share observations, research species and discover the details of nature together.
Türleri keşfet|Explore species
Hızlı erişim|Quick access
Bitki tanımla|Identify a plant
Tür seçme akışı|Select a species
Familya, cins, tür|Family, genus, species
Haritalama|Mapping
Konumlu gözlemler|Geolocated observations
GÖZLEM AKIŞI|OBSERVATION FEED
Son gözlemler|Recent observations
Yeni gözlem|New observation
Bu bölümde henüz gözlem yok.|No observations in this section yet.
DOĞAYI ARAŞTIR|EXPLORE NATURE
Bugün neyi keşfedeceksin?|What will you discover today?
Bir bitkinin Türkçe veya bilimsel adını yaz; tür kayıtlarına ve gözlemlere ulaş.|Enter a common or scientific plant name to find species profiles and observations.
Örn. sedir, Abies veya meşe|E.g. cedar, Abies or oak
Aramayı temizle|Clear search
Bitki veri tabanı|Plant database
Türleri filtrele|Filter species
Taksonomik kütüphane|Taxonomic library
Familya · Cins · Tür|Family · Genus · Species
Botanik sözlük|Botanical glossary
Terimleri öğren|Learn the terms
Gözlem haritası|Observation map
Konumları keşfet|Explore locations
TÜR KAYITLARI|SPECIES RECORDS
Arama sonuçları|Search results
Öne çıkan bitkiler|Featured plants
Tümünü gör|View all
Bu adla kayıt bulunamadı.|No records found for this name.
FİLTRELENEBİLİR KATALOG|FILTERABLE CATALOGUE
Bitkileri ayrıntılarıyla bul.|Find plants by their characteristics.
Bilimsel ad, familya ve özelliklere göre kayıtları daralt.|Refine records by scientific name, family and plant traits.
Veri tabanında bitki ara|Search the plant database
Filtreler|Filters
Bitki özellikleri|Plant traits
Filtreleri temizle|Clear filters
Yaprak tipi|Leaf type
Büyüme şekli|Growth form
Büyüme hızı|Growth rate
Bitki yüksekliği|Plant height
Yaşam süresi|Life cycle
Işık|Light
Kaynak veri yok|No source data
Kaynak verisi bulunmayan ölçütler pasiftir; tahmini sonuç gösterilmez. Yönetici yeni tür kayıtlarına doğrulanmış özellik ekledikçe filtreler açılır.|Filters without sourced data are disabled. They become available as verified traits are added to the catalogue.
kayıt|records
Sırala|Sort
Türkçe ad|Turkish name
Bilimsel ad|Scientific name
İlk harfe göre filtrele|Filter by first letter
Bu ölçütlere uyan kayıt yok. Filtreleri değiştirebilirsiniz.|No records match these criteria. Try different filters.
BİTKİ KÜTÜPHANESİ|PLANT LIBRARY
Familyadan türe.|From family to species.
Taksonomik dizinde ilerleyin; her türün künyesine ve kaynak kaydına ulaşın.|Browse the taxonomic index to find species profiles and source records.
tür|species
Aradığın türü bulamadın mı?|Can't find the species you need?
Veri tabanında bilimsel adla aramayı dene.|Try searching the database by scientific name.
Bitki ara|Search plants
Bitki künyesi|Species profile
BİTKİ VERİ TABANI /|PLANT DATABASE /
topluluk gözlemi|community observations
Fotoğraf:|Photo:
· Kart ve kapak alanına sığdırılarak gösterildi.|· Cropped to fit the card and cover.
Koleksiyona kaydet|Save to collection
Bilimsel kaynak|Scientific source
Genel bilgi|Overview
Çiçek & meyve|Flower & fruit
Gövde & kabuk|Trunk & bark
Yayılış|Distribution
TAKSONOMİ|TAXONOMY
Türün yeri|Taxonomic classification
Tohum grubu|Seed group
Türkçe adı|Turkish name
Yöresel isimler|Local names
Bu kayıt için kişisel yöresel isim notunuz yok.|You have no personal local-name notes for this species.
Yöresel isim ekle|Add a local name
GENEL BİLGİ|OVERVIEW
MORFOLOJİ|MORPHOLOGY
Yaprak|Leaf
Bu tür için kaynaklı yaprak açıklaması henüz eklenmedi.|A sourced leaf description has not yet been added for this species.
Yaprak şekli ve dizilişi|Leaf shape and arrangement
Kaynak veri bekleniyor|Awaiting source data
Benim yaprak notum|My leaf note
Bu tür için henüz bir not yazmadınız.|You have not written a note for this species yet.
Yaprak bilgisi ekle|Add leaf information
Üreme yapıları|Reproductive structures
Bu tür için doğrulanmış çiçek, kozalak veya meyve açıklaması henüz eklenmedi.|A verified flower, cone or fruit description has not yet been added.
Gövde ve kabuk|Trunk and bark
Bu tür için doğrulanmış gövde ve kabuk açıklaması henüz eklenmedi.|A verified trunk and bark description has not yet been added.
COĞRAFYA|GEOGRAPHY
Doğal yayılış|Native range
Bu tür için doğal yayılış bilgisi eklenmedi.|Native range information has not yet been added.
Bu bilgi doğal yayılışı anlatır; kullanıcı gözlem haritasındaki kayıtlarla aynı şey değildir.|This describes the native range; it is distinct from locations in the observation map.
Yayılış kaynağını aç|View range source
KAYNAKÇA|REFERENCES
Bilgi kaynağı|Information source
Bilimsel ad ve doğal yayılış için tür kaynağına bakın. Kullanıcıların gözlemleri ve kişisel notları ayrı tutulur; fotoğraftaki bitkinin teşhisi bağımsız olarak doğrulanmalıdır.|Consult the species source for its scientific name and native range. Observations and personal notes are separate; photo identifications should be independently verified.
Tür kaynağını aç|View species source
SAHADAN|FROM THE FIELD
Bu türle ilişkili gözlemler|Observations of this species
Fotoğraf yok|No photo
Bu tür için henüz topluluk gözlemi yok. Yaprak, kozalak, meyve veya genel görünüş fotoğrafını ekleyebilirsiniz.|No community observations of this species yet. Add a photo of its leaves, cones, fruit or whole plant.
KARŞILAŞTIR|COMPARE
Yakın türler|Related species
Önce aynı cins, ardından aynı familyadaki kayıtlar gösterilir. Benzerlik bir teşhis sonucu değildir.|Species in the same genus appear first, followed by those in the same family. Relatedness is not an identification result.
AYNI CİNS|SAME GENUS
AYNI FAMİLYA|SAME FAMILY
1 · Fotoğraf|1 · Photo
2 · Tür seçimi|2 · Species
3 · Gözlem|3 · Observation
TÜR BELİRLEME|IDENTIFICATION
Bu bitki hangi tür?|What species is this plant?
Fotoğrafı ve bitkinin organlarını karşılaştırarak türü kendiniz seçin. Buradaki liste fotoğraf analizi sonucu değildir; otomatik teşhis veya güven yüzdesi üretmiyoruz.|Compare the photo and plant organs to select a species yourself. This list is not a photo-analysis result and does not provide automated identification scores.
Tanımlanacak bitki fotoğrafı|Plant photo to identify
Türkçe veya bilimsel adla ara|Search by common or scientific name
Bu adla tür bulunamadı. Gözlemi tür belirtmeden kaydedebilirsiniz.|No species found for this name. You can save the observation without identifying it.
SEÇİLEN TÜRÜ KARŞILAŞTIR|COMPARE SELECTED SPECIES
Kozalak / meyve|Cone / fruit
Bu kayıt için açıklama eklenmedi.|No description has been added for this record.
Kaynak veri eklenmedi.|No source data has been added.
Bilimsel kaydı incele|View scientific record
Hiçbirine benzemiyor|None of these match
Tür seçimi kaydedilemedi.|Species selection could not be saved.
Tür seçimi gözleme eklendi.|Species selection added to the observation.
Tür önerisi gözlem sahibine gönderildi.|Species suggestion submitted to the observation owner.
Gözlem tür bekliyor.|Observation awaiting identification.
Seçimi onayla|Confirm selection
Tür seçmeden devam et|Continue without a species
DOĞAYA KATKI|CONTRIBUTE TO NATURE
Bir bitki gördün mü?|Spotted a plant?
Fotoğraf, açıklama ve isteğe bağlı konumla gözlemini kaydet. Türü biliyorsan seç; emin değilsen boş bırak.|Save an observation with a photo, description and optional location. Select a species if you know it; leave it blank if unsure.
Fotoğrafı değiştir|Change photo
Bitki fotoğrafı ekle|Add a plant photo
JPG, PNG veya WebP · en fazla 1,5 MB|JPG, PNG or WebP · up to 1.5 MB
Yüklenecek bitki fotoğrafı|Plant photo to upload
Fotoğrafı kaldır|Remove photo
Fotoğrafta hangi bölüm var?|Which plant part is shown?
Çiçek|Flower
Meyve|Fruit
Kabuk|Bark
Gövde|Trunk
TÜR|SPECIES
Henüz tür seçilmedi|No species selected
Emin değilsen tür seçmeden devam edebilirsin.|If unsure, continue without selecting a species.
Değiştir|Change
Tür belirle|Identify species
Gözlem notu|Observation note
Bitkiyi nerede gördün? Yaprak, çiçek veya çevre koşullarında neler dikkatini çekti?|Where did you see the plant? What stood out about its leaves, flowers or surroundings?
Görünen ad|Display name
Konum|Location
İsteğe bağlı; tarayıcı izni gerekir.|Optional; requires browser permission.
Kaldır|Remove
Konum ekle|Add location
Gözlem ve fotoğraf site veritabanında saklanır. Site şu anda yalnızca sahibinin erişimine açıktır.|Observations and photos are saved in your site account. The site is currently accessible only to its owner.
Gözlemi kaydet|Save observation
HARİTALAMA|MAPPING
Sahadaki gözlemler|Observations in the field
Bir gözlem seçerek konumunu haritada inceleyin. Konum yalnızca gözlem sahibi tarafından eklendiğinde görünür.|Select an observation to explore its location on the map. Locations appear only when added by the observation owner.
konumlu gözlem|geolocated observations
Tüm türler|All species
Harita © OpenStreetMap katkıcıları|Map © OpenStreetMap contributors
Gözlem seç|Select observation
Tür belirlenmedi|Species not identified
Bu tür için konumlu gözlem yok.|No geolocated observations for this species.
Henüz konumlu gözlem yok.|No geolocated observations yet.
Yeni gözlem oluştururken konum eklediğinizde kayıtlar burada görünür.|Add a location when creating an observation to see it here.
Tüm gözlemleri göster|Show all observations
Konumlu gözlem ekle|Add a geolocated observation
SEÇİLEN GÖZLEM|SELECTED OBSERVATION
Konumlu gözlem|Geolocated observation
OpenStreetMap’te aç|Open in OpenStreetMap
BİTKİ SÖZLÜĞÜ|PLANT GLOSSARY
Terimleri kolayca bul.|Find botanical terms easily.
Bitki künyelerinde kullanılan temel kavramların kısa açıklamaları.|Short explanations of key terms used in plant profiles.
Sözlükte kelime ara|Search the glossary
Koleksiyonlarım|My collections
KİŞİSEL ARŞİV|PERSONAL ARCHIVE
Seçtiğin türler bir arada.|Your favourite species, together.
İlgilendiğin bitkiler için kendi koleksiyonlarını oluştur. Kayıtlar hesabına bağlıdır.|Create collections of plants that interest you. Records are linked to your account.
için koleksiyon seç|select a collection
Bitti|Done
Koleksiyon adı|Collection name
Örn. Torosların ağaçları|E.g. Trees of the Taurus Mountains
Yeni koleksiyon|New collection
Henüz tür eklenmedi.|No species added yet.
Koleksiyon silinemedi.|Collection could not be deleted.
Koleksiyonu sil|Delete collection
İlk koleksiyonunuzu adlandırarak başlayın.|Start by naming your first collection.
GÖZLEM ARŞİVİ|OBSERVATION ARCHIVE
Hesabındaki gözlemler ve koleksiyonlar|Your observations and collections
Hesap bilgileri|Account details
Koleksiyon|Collection
Kaydedilen|Saved
KİŞİSEL İÇERİK|PERSONAL CONTENT
Gözlemlerim|My observations
Fotoğraflı gözlem|Photo observation
Önceki sürüm · Bu cihazda|Previous version · On this device
Hesaba aktar|Import to account
Gözlem silinemedi.|Observation could not be deleted.
Sil|Delete
Henüz bir gözleminiz yok.|You have no observations yet.
Kaydedilen gönderiler|Saved posts
YÖNETİCİ PANELİ|ADMINISTRATION
Bitki kütüphanesini büyüt.|Grow the plant library.
Kaynağını doğruladığın yeni türü ekle. Boş morfoloji alanları tür sayfasında eksik veri olarak gösterilir.|Add a new species with a verified source. Empty morphology fields are labelled as missing data on the species page.
Türkçe ad *|Turkish name *
Bilimsel ad *|Scientific name *
Familya *|Family *
Cins *|Genus *
Bilgi ekleme|Leave blank
Tür fotoğrafı|Species photo
Doğal yayılış *|Native range *
Genel bilgi *|Overview *
Yaprak bilgisi|Leaf information
Çiçek, meyve veya kozalak bilgisi|Flower, fruit or cone information
Kaynak bağlantısı (HTTPS) *|Source URL (HTTPS) *
Değişiklikleri kaydet|Save changes
Türü veri tabanına ekle|Add species to database
İptal|Cancel
YÖNETİLEN KAYITLAR|MANAGED RECORDS
Eklenen türler|Added species
Düzenle|Edit
Henüz yeni bir tür eklenmedi.|No new species added yet.
HESAP VE GİZLİLİK|ACCOUNT & PRIVACY
Gözlemler, fotoğraflar ve koleksiyonlar site hesabında saklanır. Siteye erişim şu anda yalnızca sahibine açıktır.|Observations, photos and collections are stored in your site account. Access is currently limited to the owner.
Adınızı yazın|Enter your name
Giriş ve doğrulama|Sign-in and authentication
Görünen ad kaydedildi.|Display name saved.
Ad kaydedilemedi.|Name could not be saved.
Bilgileri kaydet|Save details
BUGÜN KEŞFET|DISCOVER TODAY
Türü bulmak ayrıntıda saklı.|Identification is in the details.
Yaprak, kozalak ve yayılış bilgisini birlikte incele.|Examine leaves, cones and distribution together.
Lübnan sediri künyesi|Lebanon cedar profile
Hızlı bağlantılar|Quick links
© Orman Mühendisi · Bitkinin Sosyal Medyası|© Orman Mühendisi · The Social Network for Plants
Mobil menü|Mobile navigation
KİŞİSEL NOT|PERSONAL NOTE
Bu bilgi hesabınızda kişisel not olarak saklanır; türün doğrulanmış künyesini değiştirmez.|This is stored as a personal note in your account and does not change the verified species profile.
Yöresel isim|Local name
Yaprak notu|Leaf note
Kayıtlar yükleniyor…|Loading records…
Eklendi|Added
Ekle|Add
Google’da ara|Search on Google
Web’de araştır|Research on the web
Anlık öneriler|Instant suggestions
Bölgesel keşif|Regional explorer
Topluluk haritası|Community map
Ekoloji ve Türkiye florası|Ecology & flora of Türkiye
İl / bölge|Province / region
Davis grid karesi|Davis grid square
Rakım aralığı|Elevation range
Çiçeklenme dönemi|Flowering period
Endemizm|Endemism
Fitocoğrafik bölge|Phytogeographic region
Veri eklenmedi|Data not supplied
TÜRKİYE FLORASI|FLORA OF TÜRKİYE
Türkiye florası kaynakları|Flora of Türkiye sources
Tür listeleri, eş adlar ve il / grid kayıtlarını kaynak sitelerde inceleyin.|Explore species lists, synonyms and province / grid records on the source websites.
Fotoğrafla tanımlama|Photo identification
Fotoğrafla otomatik tanımlama için Pl@ntNet’i açabilirsiniz. Buradaki tür seçimi elle yapılır.|Open Pl@ntNet for automated photo identification. Species selection here is manual.
Pl@ntNet’te tanımla|Identify on Pl@ntNet
Bitkiyi tanımaya buradan başla.|Start getting to know your plant.
Fotoğrafı karşılaştır, bilimsel kaydı incele, gözlemini ekle.|Compare photos, explore scientific records and add your observation.
Yerel katalog|Local catalogue
Bilimsel kayıtlar|Scientific records
Bu siteye ChatGPT hesabınızla giriş yaparsınız. Görünen adınızı aşağıdan düzenleyebilirsiniz.|Sign in to this site with your ChatGPT account. You can edit your display name below.
Kaynaklı ekoloji bilgileri|Sourced ecological information
Bu alanları yalnızca doğrulanmış kaynak varsa doldurun; rakım bitki boyundan farklıdır.|Fill these fields only from verified sources; elevation is distinct from plant height.
Güney Türkiye ile Lübnan arasındaki Doğu Akdeniz kuşağı|Eastern Mediterranean from southern Türkiye to Lebanon
Doğu Akdeniz dağlarının sedir türü. Bilimsel adı ve doğal yayılış kaydı Kew Science veri tabanında kabul edilmektedir.|A cedar native to the eastern Mediterranean mountains. Its scientific name and native range are recorded by Kew Science.
Kısa sürgünlerde bir araya gelen iğne yapraklar türü incelerken bakılacak özellikler arasındadır.|Needles clustered on short shoots are among the features to examine when identifying this species.
Kozalaklar ve tohumlar teşhiste yaprak ve sürgünle birlikte değerlendirilmelidir.|Consider cones and seeds together with leaves and shoots when identifying the plant.
Akdeniz çevresi|Mediterranean region
Olgun bireylerin şemsiye biçimindeki tacı ve yenilebilir tohumlarıyla tanınır.|Recognised by the umbrella-shaped crown of mature trees and its edible seeds.
İğne yaprak, sürgün ve kozalak birlikte incelenmelidir.|Examine needles, shoots and cones together.
Kozalakları yaklaşık üç yılda olgunlaşır; çam fıstığı bu kozalakların tohumudur.|Cones mature in about three years; pine nuts are their seeds.
Yunanistan'dan Güneybatı Asya'ya|From Greece to southwest Asia
Meşe cinsinin bir üyesidir. Dallarındaki mazılar meyve değildir; gerçek meyvesi palamuttur.|A member of the oak genus. Galls on its branches are not fruits; its true fruit is the acorn.
Palamut, meşenin gerçek meyvesidir. Mazı farklı bir bitki dokusudur.|The acorn is the oak's true fruit. A gall is a different plant structure.
Güney Türkiye ve Doğu Akdeniz|Southern Türkiye and the eastern Mediterranean
Toroslarla ilişkilendirilen göknar türü. Türü belirlerken kozalak, sürgün ve iğne yapraklar birlikte incelenir.|A fir associated with the Taurus Mountains. Examine cones, shoots and needles together when identifying it.
Pireneler'den Karpatlar ve Balkanlar'a|From the Pyrenees to the Carpathians and Balkans
Avrupa'da doğal yayılış gösteren bir göknar türüdür.|A fir species native to Europe.
Doğu Avrupa'dan Rusya Uzak Doğusu ve Sincan'a|From eastern Europe to the Russian Far East and Xinjiang
Geniş kuzey kuşağında doğal yayılış gösteren bir göknar türüdür.|A fir species native to a broad northern region.
Lübnan sediri|Lebanon cedar
Fıstık çamı|Stone pine
Mazı meşesi|Aleppo oak
Toros göknarı|Cilician fir
Avrupa göknarı|Silver fir
Sibirya göknarı|Siberian fir
Biyoçeşitlilik|Biodiversity
Endemik|Endemic
Mazı|Gall
Meşcere|Forest stand
Morfoloji|Morphology
Silvikültür|Silviculture
Taksonomi|Taxonomy
Canlıların sınıflandırılmasında kullanılan geniş taksonomik basamak.|A broad taxonomic rank used to classify organisms.
Canlıların gen, tür ve ekosistem düzeyindeki çeşitliliği.|The variety of life at genetic, species and ecosystem levels.
Birbirine yakın türleri bir araya getiren taksonomik basamak.|A taxonomic rank that groups closely related species.
Doğal yayılışı belirli bir coğrafi alanla sınırlı canlı.|An organism whose native distribution is restricted to a particular geographical area.
Birbiriyle ilişkili cinsleri bir araya getiren taksonomik basamak.|A taxonomic rank grouping related genera.
Bir canlının doğal olarak yaşadığı ortam.|The environment in which an organism naturally lives.
Bazı organizmaların etkisiyle bitki dokusunda gelişen farklılaşmış yapı.|A modified plant structure caused by the activity of certain organisms.
Belirli bir alanda bir arada bulunan ve benzer özellikler gösteren ağaç topluluğu.|A group of trees growing together in an area with similar characteristics.
Bir canlının biçim ve yapı özelliklerinin incelenmesi.|The study of an organism's form and structure.
Ormanın kurulması, yetiştirilmesi, bakımı ve gençleştirilmesiyle ilgilenen ormancılık alanı.|The forestry discipline concerned with establishing, growing, maintaining and regenerating forests.
Canlıları adlandırma ve sınıflandırma çalışması.|The naming and classification of organisms.
Sınıflandırmanın temel birimlerinden biri.|One of the fundamental units of classification.
`;
const extraPairs=`
Kaydedilen türler|Saved species
Haritada gör|View on map
Gözlem haritası|Observation map
Tür künyesini aç|Open species profile
Tür künyesini incele|View species profile

KEŞİF|EXPLORE
BİLGİ KAYNAKLARI|RESOURCES
BENİM ALANIM|MY SPACE
YÖNETİM|MANAGEMENT
Doğada gördüğünü kaydet.|Record what you see in nature.
Fotoğrafın, türün ve konumun bir arada.|Your photo, species and location together.
Kişisel alanım|My space
Gözlemler ve koleksiyonlar|Observations and collections
Bitki, tür veya familya ara|Search plants, species or families
Türleri bul|Find species
Haritada keşfet|Explore the map
Tüm bölümler|All sections
İçeriğe geç|Skip to content
Sayfa yolu|Page path
YAKINDAN TANI|LOOK CLOSER
Keşfe devam et|Keep exploring
İl ve grid kayıtları|Province and grid records
Bitkini tanı, iyi bak|Know your plant, care for it
Temel kavramlar|Key concepts
Benim arşivim|My archive
Bitkiler arasında ara|Search plants
Veri tabanında ara|Search the database
Sözlükte ara|Search the glossary
Tür künyeleri|Species profiles
Tür kütüphanesi|Species library
Botanik terimler|Botanical terms
Gözlemi haritada gör|View observation on the map
Tür kütüphanesini aç|Open the species library
İl, familya ve grid ile tara|Browse by province, family and grid
Işık, sulama ve yetiştirme|Light, watering and growing
Künyelerdeki kavramları öğren|Learn the terms in species profiles
Bu tür kaydı bulunamadı.|This species record was not found.
Bağlantıdaki tür katalogda yer almıyor.|The linked species is not in the catalogue.
Tür kayıtları yükleniyor…|Loading species records…
Veri tabanına dön|Back to the database

Fotoğrafları incele|Browse photos
Özel taslak|Private draft
Onay bekliyor|Awaiting approval
Düzeltme istendi|Revision requested
Yayımlandı|Published
Paylaşım için onaya gönder|Submit for approval
Özel taslağa al|Make private
Bilgiyi birlikte büyüt.|Grow the knowledge together.
Bekleyen gözlem|Pending observations
Fotoğraflı tür|Species with photos
Yeni tür ekle|Add a new species
Gövde ve kabuk bilgisi|Stem and bark description
Yaprak şekli ve dizilişi|Leaf shape and arrangement
Morfoloji kaynak bağlantısı|Morphology source URL
Doğrulanmış kaynak bilgisi bulunamadı|No verified source information found
`;
const refinementPairs=`
Çiçeklenme ayları|Flowering months
Rakım (metre)|Elevation (metres)
Dünya yayılışı|Global distribution
Endemizm|Endemism
Fitocoğrafik bölge|Floristic region
Üreme / çiçek / meyve|Reproduction / flower / fruit
Gövde / kabuk|Stem / bark
Canlılar ve Keşif|Life and Discovery
Bakım ve Sağlık|Care and Health
Ormancılık ve Bilgi|Forestry and Knowledge
Alışveriş ve Fidanlıklar|Shopping and Nurseries
Kişisel Alan|Personal Space
İçerik Yönetimi|Content Management
DOĞA VE SAĞLIK|NATURE AND HEALTH
ORMANCILIK VE YAYINLAR|FORESTRY AND PUBLICATIONS
KİTAP VE FİDAN|BOOKS AND SEEDLINGS
BENİM ALANIM|MY SPACE
YÖNETİM|MANAGEMENT
Dil ve görünüm tercihlerin|Your language and appearance preferences
Kişisel ayarlar|Personal settings
Bölümlere hızlı erişim|Quick section navigation
Doğa ve sağlık|Nature and health
Bilgi ve yayınlar|Knowledge and publications
Benim alanım|My space
ORMANIN SESSİZ DÜNYASI|THE QUIET WORLD OF THE FOREST
Mantarlar alemi|Kingdom of fungi
Bir türü tanı. Akrabalıklarını keşfet.|Meet a species. Explore its relatives.
Doğadaki fotoğraflı kayıtları incele.|Browse photographic observations in nature.
Saha gözlemleri|Field observations
Tüm türleri araştır|Search all species
Bir mantar türü, cins veya bilimsel ad yaz…|Enter a mushroom species, genus or scientific name…
Seçili türler|Featured species
Tüm katalog|Full catalogue
Bu sayfadaki tüm familyalar|All families on this page
Bilimsel ad · A–Z|Scientific name · A–Z
Familya · A–Z|Family · A–Z
Canlı arama · sayfada en fazla 24 tür|Live search · up to 24 species per page
Doğrulanmış keşif seçkisi|Verified discovery selection
KAYNAKLI TÜR KÜNYESİ|SOURCED SPECIES PROFILE
Türlere dön|Back to species
Künye güncelleniyor…|Updating profile…
Sınıflandırma|Classification
Fotoğraflı gözlemleri aç|Open photo observations
Takson kaynağı|Taxonomic source
Tür künyesi|Species profile
Gözlemler|Observations
Mantar kayıtları aranıyor…|Searching fungal records…
Tür künyesi yükleniyor…|Loading species profile…
Bu ölçütlerde kayıt bulunamadı.|No records match these criteria.
Seçili türlere dön|Return to featured species
Seçili türleri göster|Show featured species
SAHADAN|FROM THE FIELD
Fotoğrafın arkasındaki tür.|The species behind the photograph.
Tüm gözlemler|All observations
Fotoğraf kaynağı|Photo source
Türkiye’den fotoğraflı mantar gözlemleri yükleniyor…|Loading photo observations of fungi from Türkiye…
Fotoğraflı kayıtlara şu anda ulaşılamıyor. Tür kataloğunu kullanabilir veya saha gözlemlerini yeniden açabilirsin.|Photo records are currently unavailable. Use the species catalogue or try field observations again.
Renk teması|Colour theme
Sistem|System
Açık|Light
Koyu|Dark
Sistem seçildiğinde cihazının renk tercihine uyar.|System follows your device’s colour preference.
Kişisel ayarlar · dil ve görünüm|Personal settings · language and appearance
Takip ediliyor|Following
Takip et|Follow
Takip ettiklerin|Following
Fotoğraflarla keşfet|Discover through photos
Bölgesel keşif|Regional explorer
Gözlem paylaş|Share an observation
Fotoğraflı künyeler|Photo profiles
Tür karşılaştır|Compare species
Bitki gözlemleri|Plant observations
Mantar gözlemleri|Fungal observations
Tüm canlılar|All life
Tür künyeleri|Species profiles
Ormancılık kaynakları|Forestry resources
Ormancılık projeleri|Forestry projects
Yayınları araştır|Search publications
Fidanlıkları keşfet|Discover nurseries
Kaydedilen gözlemler|Saved observations
Yeni fotoğraflı gözlemler|New photo observations
Takip ettiğin kişilerin gözlemleri|Observations from people you follow
Fotoğraflarını saha defterine ekle|Add photos to your field journal
Doğanın güncel gözlemlerini gez|Browse recent nature observations
Gözlemine bir tür seç|Choose a species for your observation
Haritadan yakın çevreni araştır|Explore your surroundings on the map
İl, familya ve grid ile tarama|Search by province, family and grid
Bitkileri görselleriyle tanı|Meet plants through photos
İki bitkinin özelliklerini yan yana gör|Compare two plants side by side
Ülke, il ve yıla göre kayıt ara|Search records by country, province and year
Paylaşılan saha gözlemleri|Shared field observations
Bitkilerin ve bakım görevlerin|Your plants and care tasks
Belirtileri değerlendir|Assess symptoms
Bitkinin sorununu araştır|Investigate a plant problem
Bakım görevlerini takip et|Track care tasks
Türler, familyalar ve kaynaklı künyeler|Species, families and sourced profiles
Fotoğraflı saha kayıtları|Photographic field records
Topluluğun fotoğraflı kayıtları|Community photo observations
Mantarları sahada incele|Explore fungi in the field
Doğanın çeşitliliğini keşfet|Explore biodiversity
Fotoğraf ve morfoloji bilgileri|Photos and morphology
Botanik ve ormancılık kaynakları|Botanical and forestry resources
Terimleri ve açıklamalarını ara|Search terms and definitions
Kavramları bitkiler üzerinde keşfet|Explore botanical concepts
Projeler ve saha yöntemleri|Projects and field methods
Araştırmalar ve kaynak kayıtları|Research and source records
Başlık, yazar ve konu ara|Search titles, authors and topics
Saha çalışmaları ve yöntemler|Field studies and methods
Fidanlık kayıtlarını incele|Browse nursery records
İlanları ve ürünleri araştır|Explore listings and products
Ürünler ve ilanlar|Products and listings
Sepete eklediğin ürünler|Products in your cart
Kaydettiğin türlerin arşivi|Your saved species archive
Sonra bakmak üzere ayırdıkların|Observations saved for later
Kendi kayıtlarını yönet|Manage your records
Takip ettiğin kullanıcıların akışı|The feed from people you follow
Saha defterine fotoğraf ekle|Add a photo to your field journal
`;
const platformPairs= `
Kuşlar|Birds
Kuş gözlemleri|Bird observations
Sağlık kontrolü|Health check
Belirti rehberi|Symptom guide
Sağlık günlüğüm|My health journal
Bitkini dinle.|Listen to your plant.
Bakım planım|My care plan
Bitkinin adı|Plant name
Gördüğün belirtiler|Symptoms you see
Toprak nemi|Soil moisture
Bilmiyorum|I don't know
Kuru|Dry
Hafif nemli|Slightly moist
Uzun süre ıslak|Wet for a long time
Işık|Light
Doğrudan güneş|Direct sunlight
Aydınlık dolaylı ışık|Bright indirect light
Az ışık|Low light
Ne zamandır var?|How long has it been present?
Diğer gözlemler|Other observations
Ön değerlendirmeyi göster|Show initial assessment
Önce yakından bak.|First, take a closer look.
Yaprak altını inceledim|I checked beneath the leaves
Toprak nemini kontrol ettim|I checked soil moisture
Drenajı kontrol ettim|I checked drainage
Tür künyesini bul|Find species profile
Bakım kontrolü ekle|Add care check
Kontrol edilecek olasılıklar|Possibilities to check
Kesin teşhis değil|Not a definite diagnosis
Belirti eşleşmesi|Symptom match
Ayırt etmek için|How to distinguish it
İlk adım|First step
Seçtiğin koşullara göre|Based on your conditions
Kaynaklı asistana sor|Ask the sourced assistant
Sağlık günlüğüne kaydedildi|Saved to health journal
Sağlık günlüğüne kaydet|Save to health journal
Yenile|Refresh
Kontrolü yeniden aç|Reopen check
İlk kontrolümü oluştur|Create my first check
Mantarlar alemi|The world of fungi
Saha gözlemleri|Field observations
Tüm türleri araştır|Explore all species
Seçili türler|Featured species
Tüm katalog|Full catalogue
Familya|Family
Sıralama|Sort
Bu sayfadaki tüm familyalar|All families on this page
Tür karşılaştır|Compare species
Yan yana incele|Compare side by side
Karşılaştırmayı kapat|Close comparison
Taksonomik karşılaştırma|Taxonomic comparison
Basamak|Rank
Şube|Phylum
Sınıf|Class
Takım|Order
Cins|Genus
KAYNAKLI TÜR KÜNYESİ|SOURCED SPECIES PROFILE
Fotoğraflarla incele|Explore through photos
Harita ve tüm gözlemler|Map and all observations
Sınıflandırma|Classification
Takson kaynağı|Taxon source
Google’da araştır|Research on Google
Tür künyesi|Species profile
Gözlemler|Observations
Karşılaştır|Compare
Seçildi|Selected
Önceki|Previous
Sonraki|Next
Tüm gözlemler|All observations
Fotoğraf kaynağı|Photo source
`;
export const translations: Record<string, string> = Object.fromEntries((pairs+extraPairs+refinementPairs+platformPairs).trim().split("\n").map(line => line.split("|")));
export function translate(text: string, language: Language) {
  if (language === "tr") return text;
  const cleaned = text.replace(/[↗→]/g, "").trim();
  const direct = translations[cleaned];
  if (direct) return text.replace(text.trim(), direct);
  const prefix = cleaned.match(/^[＋♡▣≡✳⌖☷◌✓✎]\s*/)?.[0] || "";
  const suffix = cleaned.match(/\s*[＋]$/)?.[0] || "";
  const core = cleaned.slice(prefix.length, suffix ? -suffix.length : undefined).trim();
  return translations[core] ? `${prefix}${translations[core]}${suffix}` : text;
}
export function translateTree(node: ReactNode, language: Language): ReactNode {
  if (language === "tr") return node;
  if (typeof node === "string") return translate(node, language);
  if (Array.isArray(node)) return node.map(child => translateTree(child, language));
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  if (element.props["data-user-content"]) return node;
  const props: Record<string, unknown> = {};
  for (const key of ["placeholder", "aria-label", "title", "alt"]) if (typeof element.props[key] === "string") props[key] = translate(element.props[key] as string, language);
  // Options must retain their original values after their visible labels change.
  if (element.type === "option" && element.props.value === undefined && typeof element.props.children === "string") props.value = element.props.children;
  if (element.props.children !== undefined) props.children = translateTree(element.props.children as ReactNode, language);
  return cloneElement(element, props);
}
