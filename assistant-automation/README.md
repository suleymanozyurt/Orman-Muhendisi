# ORMAN MÜHENDİSİ ASİSTANI — GitHub denetim ve Drive erişimi

Bu özel GitHub deposunda, web sitesi dosyalarından **ayrı** bir alanda çalışır.
İş akışı: [GitHub Actions](../../actions/workflows/assistant-monitor.yml).
Günlük ve raporlara ham Google Doküman veya E-Tablo içerikleri yazılmaz.

## Mevcut durum

- Saatlik GitHub Actions kontrolü ve `workflow_dispatch` ile manuel çalıştırma kuruldu.
- Kuralların, Word kanıtlarının ve Drive erişim sınırlarının otomatik birim testleri çalışır.
- Canlı özel ChatGPT eklentisinin Plugin Creator API'si GitHub'a bağlı değildir; eklentinin gerçek sürümü GitHub tarafından bağımsız olarak doğrulanamaz.
- GitHub'ın Google Drive erişimi, aşağıdaki **kullanıcı tarafından yapılacak** adımlar tamamlanmadıkça etkin değildir. Secret yoksa Drive işi bilerek atlanır ve "bağlandı" denmez.

## Erişim izni nasıl verilir? (salt okunur)

1. [Google Cloud Console](https://console.cloud.google.com/) içinde kendinize ait bir proje oluşturun/seçin. *Google Docs API* ve *Google Sheets API* hizmetlerini etkinleştirin.
2. **IAM & Admin → Service Accounts** bölümünden yalnız bu denetim için bir hizmet hesabı oluşturun. Gerektiğinde JSON anahtarı alın. Bu anahtar gizlidir; sohbete, GitHub dosyalarına veya Issues kayıtlarına yapıştırmayın.
3. Hizmet hesabının `...iam.gserviceaccount.com` adresini Google Drive'daki **yalnız iki dosyada** ayrı ayrı **Görüntüleyici (Viewer)** olarak paylaşın: 
   - Kanonik talimat belgesi: `10TaPAcs7rWkzQo4TJ2riN6u7OpMYbpWlElQzy8wdNsw`
   - Ortak içerik hafızası ve araştırma tablosu: `1ca2doEunplE6B47K8D35A2WxgLD1GAshQckmqepAtEs`
   Herhangi bir üst Drive klasörünü veya tüm Drive'ı paylaşmayın.
4. GitHub deposunda **Settings → Secrets and variables → Actions → New repository secret** bölümüne `GDRIVE_SERVICE_ACCOUNT_JSON` adında bir gizli değişken ekleyin. Değeri JSON anahtar dosyasının **tam içeriği** olmalı. JSON anahtarını depoda kaynak dosyası olarak tutmayın.
5. [Actions](../../actions/workflows/assistant-monitor.yml) bölümünde **Run workflow** ile deneyin. Sonuç özetinde `DOCS_SHEETS_VERIFIED` ve 15 sekmeye erişim görülürse yalnız ilgili dosyaların okuması doğrulanmıştır. `BLOCKED` veya `DRIFT_OR_INVALID` ise erişim/veri/sürüm uyumsuzluğu var demektir. GitHub'nın ilk kez yetkilendirilmesi kullanıcı eylemi gerektirir.

**Güvenlik:** Google OAuth kapsamı yalnız `documents.readonly` ve `spreadsheets.readonly`. Kod yalnız yukarıdaki iki sabit dosya kimliğine istek yapar. Hizmet hesabını sadece bu iki belgeye Viewer olarak eklerseniz başka dosyaları bu yetkiyle okuyamaz. Yeni dosyaya ayrıca izin verilirse hizmet hesabının gerçek erişimi genişleyebilir. Ek güvenlik için anahtar düzenli yenilenmeli; ileride anahtarsız GitHub OIDC/Google Workload Identity Federation'a geçilebilir.

## Hangi veriler okunur?

- Asistanın kanonik Google Docs talimat metni (sürüm/kural doğrulaması).
- Google Sheets'in sekme adları ve 15 ilgili sekmede ilk 1000 satıra kadar kayıtlar: `OrtakKurallar`, `OrtakKayitlar`, `ArastirmaHavuzu`, `ArastirmaKuyrugu`, `ArastirmaGunlugu`, `IcerikVersiyonlari`, `SecimGunlugu`, `SabahRaporlari`, `TurkiyeFlora`, `FloraKapsam`, `FloraKaynaklari`, `FloraKonuIzleri`, `OgrenmeDenetimi`, `KitapEnvanteri`, `PerformansVerileri`.

Bu veri **geçici GitHub Actions işleyici belleğinde** incelenir. Ham hücre değerleri GitHub deposuna, loglara veya artefaktlara yazılmaz. Erişim salt okunurdur; veri aktarımı ve tüm hücrelerin kapsamlı içerik analizi değildir. 1000'den fazla satır bulunan sekmelerde düzenli kontrol yalnız ilk 1000 satırla sınırlıdır.

## Korunan kurallar ve sınırlar

En az dört bağımsız ChatGPT image_gen sahnesi, bilimsel doğrulama, her eksende en az 300 efektif PPI, OOXML/ZIP/CRC, tüm sayfa render, eşsiz medya SHA, Word SHA ve kullanıcıdan **tam dosya SHA sürümüne özgü açık Onayla ve Kaydet** alınmadan Doğa Kitabı klasörüne arşivleme yapılmaması korunur. GitHub'daki manifest testleri, gerçekten oluşturulmuş Word dosyasının fiziksel kalite denetiminin yerine geçmez.

Saatlik iş planı, kesintisiz sunucu değildir; GitHub yoğunluğu, kota ve hesap ayarları nedeniyle zamanında çalışması garantili değildir. GitHub kendi başına özel ChatGPT eklentisini değiştirme, onu eğitme veya görsel üretme yetkisine sahip değildir.

Yerel test: `node --test assistant-automation/monitor.test.mjs`
Yetkili denetim: `node assistant-automation/monitor.mjs`.
