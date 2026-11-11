# Orman Mühendisi — proje çalışma talimatı

Önce [BASLA.md](BASLA.md) ve [tam proje talimatını](docs/claude/CLAUDE_Orman_Muhendisi_Tam_Talimat.md) baştan sona oku. İki Google Lens kamera referansı ve devir kaydı [docs/claude/README.md](docs/claude/README.md) içindedir.

## Güncel başlangıç — 11 Kasım 2026

- Tek geliştirme deposu `suleymanozyurt/Orman-Muhendisi-Site`; ana geliştirme tabanı `main` dalıdır. Canlı v67 kaynağı bu dala `c5b6ca989bec5d5f9c09ffca931b997c8861e52a` commit'iyle zaten alınmıştır. Daha sonra yapılan tasarım, Orman Lens ve Pages önizleme çalışmalarını koru. Eski ZIP'i yeniden açıp güncel kodun üzerine yazma.
- Tam talimattaki “yeni dal aç / v67 paketini içeri al” adımı ilk aktarımın tarihsel tarifidir; güncel `main` dalını temel al ve sonraki değişiklikleri kısa çalışma dallarıyla geliştir. Tam talimatın diğer hükümleri ve en yeni açık kullanıcı kararları geçerlidir.
- Tasarım ve çalışan kod birlikte geliştirilsin. Önce iPhone'da denenecek kamera akışını, sonra arama, tür künyesi, harita ve gözlem akışlarını tamamla. İki referansla aynı ekran ölçüsünde karşılaştır. Bu aktarım tasarımın kullanıcı tarafından onaylandığı anlamına gelmez.
- Bu proje Orman Mühendisi doğa atlasıdır. Orman Parkları projesi yalnız GitHub çalışma düzeni için örnektir; kira, muhasebe ve park yönetimi modüllerini buraya taşıma.
- Sosyal paylaşım metinlerinde hashtag veya paylaşım sonu etiketi üretme; bu, 10 Kasım 2026 tarihli en yeni tercihtir ve tarihsel etiket kurallarının önüne geçer.
- Gerçek veri aktarımı ve mevcut canlı yayının değiştirilmesi, tam talimattaki son aşama koşullarına tabidir. GitHub Pages önizlemesi, kullanıcı talebiyle `main` değişikliklerinden yayımlanır. Üretim kayıtlarını, depo görünürlüğünü ve DNS'i ayrıca açık talimat olmadan değiştirme. Netlify kullanma.
- GitHub'daki kod aktarımı, canlı veritabanı veya kullanıcı görsellerinin yedeği değildir. GitHub depo bağlantısını çalışan uygulama bağlantısı olarak sunma. Otomatik Sites ↔ GitHub senkronizasyonu kurulduğunu iddia etme.

Kod incelemesi ve gerekli kontroller için depodaki güncel `README.md`, `package.json` ve `docs/ilk-teslim.md` dosyalarını kullan. Test edilmemiş bir özelliği, gerçek iPhone testini veya canlı yayını tamamlanmış sayma.

## GitHub yayını

Hedef canlı geliştirme adresi `https://suleymanozyurt.github.io/Orman-Muhendisi-Site/`. `.github/workflows/pages.yml`, `main` dalına gönderimde statik önizlemeyi derleyip Pages'e yayımlar. Ayar veya plan engelinde hatayı gizleme; yayın başarıyla tamamlanmadan bu adresi çalışan site diye sunma. GitHub Pages, sunucu isteyen üyelik, ortak veritabanına yazma ve yapay zekâ uçlarını tek başına sağlamaz. Mevcut ChatGPT Sites yayını bu çalışma sırasında değiştirilmez. Orman Parkları ayrı bir depodur ve bu projeye birleştirilmez.
