export type Plant = {
  id: string;
  name: string;
  latin: string;
  family: string;
  genus: string;
  seedGroup?: string;
  category: string;
  leaf: string;
  form: string;
  habitat?: string;
  growth?: string;
  height?: string;
  life?: string;
  light?: string;
  humidity?: string;
  soil?: string;
  range: string;
  description: string;
  leafNote?: string;
  fruitNote?: string;
  barkNote?: string;
  leafShape?: string;
  morphologySource?: string;
  ecologySource?: string;
  floraRecords?: { name: string; source: string; provinces: string; grid: string; elevation: string; endemism: string }[];
  provinces?: string;
  grid?: string;
  elevation?: string;
  flowering?: string;
  endemism?: string;
  floristicRegion?: string;
  source: string;
  image?: string;
  photoCredit?: string;
  photoLicense?: string;
  photoSource?: string;
};

export const plantOptions = {
  category: ["İğne yapraklı ağaçlar", "Geniş yapraklı ağaçlar", "Ağaççık ve çalılar", "Sarılıcı bitkiler", "Yer örtücü bitkiler", "Mevsimlik bitkiler", "İç mekân bitkileri", "Çiçekli bitkiler", "Şifalı bitkiler", "Su bitkileri"],
  leaf: ["İğne", "Geniş", "Diğer"],
  form: ["Ağaç", "Ağaççık / çalı", "Otsu", "Sarılıcı", "Yer örtücü"],
  habitat: ["Orman", "Kayalık", "Çayır", "Sulak alan", "Kıyı", "İç mekân", "Bahçe"],
  growth: ["Yavaş", "Orta", "Hızlı"],
  life: ["Tek yıllık", "İki yıllık", "Çok yıllık"],
  light: ["Tam güneş", "Yarı gölge", "Gölge"],
  humidity: ["Kuru", "Nemli", "Islak"],
  soil: ["Asidik", "Nötr", "Alkalin"],
  height: ["5–10 cm", "10–20 cm", "20–50 cm", "50 cm–1 m", "1–2 m", "2–4 m", "4–10 m", "10–25 m", "25 m ve üzeri"],
} as const;

// Small, sourced starter catalogue. Empty botanical fields are deliberately not inferred.
export const plants: Plant[] = [
  {
    floraRecords: [{"name": "Cedrus libani var. libani", "source": "http://194.27.225.161/yasin/tubives/index.php?sayfa=1&tax_id=108", "provinces": "Adana, Afyonkarahisar, Antalya, Hatay, Kahramanmaraş, Muğla, Tokat, Karaman", "grid": "A6, B3, B6, C2, C3, C4, C5, C6", "elevation": "1000–2000 m", "endemism": "Endemik değil"}, {"name": "Cedrus libani var. stenocoma", "source": "http://194.27.225.161/yasin/tubives/index.php?sayfa=1&tax_id=109", "provinces": "Kaynakta il kaydı yok", "grid": "Kaynakta grid kaydı yok", "elevation": "2000 m", "endemism": "Endemik"}],
    id: "cedrus-libani", name: "Lübnan sediri", latin: "Cedrus libani A.Rich.",
    family: "Pinaceae", genus: "Cedrus", category: "İğne yapraklı ağaçlar", leaf: "İğne", form: "Ağaç",
    seedGroup: "Açık tohumlular",
    range: "Güney Türkiye ile Lübnan arasındaki Doğu Akdeniz kuşağı",
    description: "Doğu Akdeniz dağlarının sedir türü. Bilimsel adı ve doğal yayılış kaydı Kew Science veri tabanında kabul edilmektedir.",
    leafNote: "Kısa sürgünlerde bir araya gelen iğne yapraklar türü incelerken bakılacak özellikler arasındadır.",
    fruitNote: "Kozalaklar ve tohumlar teşhiste yaprak ve sürgünle birlikte değerlendirilmelidir.",
    source: "https://powo.science.kew.org/taxon/676705-1",
    image: "/species/cedrus-libani.jpg", photoCredit: "Zeynel Cebeci", photoLicense: "CC BY-SA 4.0", photoSource: "https://commons.wikimedia.org/wiki/File:Cedrus_libani_-_L%C3%BCbnan_sediri_02.jpg",
  },
  {
    ecologySource: "http://194.27.225.161/yasin/tubives/index.php?sayfa=1&tax_id=115",
    provinces: "Antalya, Artvin, Bursa, İzmir, Kahramanmaraş, Trabzon", grid: "A2, A7, A8, B1, C3, C6", elevation: "0–350 m", endemism: "Endemik değil", life: "Çok yıllık", habitat: "Kıyı",
    id: "pinus-pinea", name: "Fıstık çamı", latin: "Pinus pinea L.",
    family: "Pinaceae", genus: "Pinus", category: "İğne yapraklı ağaçlar", leaf: "İğne", form: "Ağaç",
    seedGroup: "Açık tohumlular",
    range: "Akdeniz çevresi", description: "Olgun bireylerin şemsiye biçimindeki tacı ve yenilebilir tohumlarıyla tanınır.",
    leafNote: "İğne yaprak, sürgün ve kozalak birlikte incelenmelidir.",
    fruitNote: "Kozalakları yaklaşık üç yılda olgunlaşır; çam fıstığı bu kozalakların tohumudur.",
    source: "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:263221-1/general-information",
    image: "/species/pinus-pinea.jpg", photoCredit: "Zeynel Cebeci", photoLicense: "CC BY-SA 4.0", photoSource: "https://commons.wikimedia.org/wiki/File:Pinus_pinea_01.jpg",
  },
  {
    floraRecords: [{"name": "Quercus infectoria subsp. infectoria", "source": "http://194.27.225.161/yasin/tubives/index.php?sayfa=1&tax_id=8454", "provinces": "İstanbul, Zonguldak, Karabük, Bursa, Çanakkale, Giresun, Kırklareli, Tokat", "grid": "A1, A2, A3, A4, A5, A6, A7", "elevation": "150–850 m", "endemism": "Endemik değil"}, {"name": "Quercus infectoria subsp. boissieri", "source": "http://194.27.225.161/yasin/tubives/index.php?sayfa=1&tax_id=8455", "provinces": "Osmaniye, Hakkâri, Batman, Şırnak, Kastamonu, Bitlis, Ankara, Artvin, Balıkesir, Bilecik, Bingöl, Burdur, Elazığ, Hatay, İçel, İzmir, Konya, Malatya, Muğla, Niğde, Şanlıurfa, Aksaray", "grid": "A2, A3, A4, A5, C9, C10", "elevation": "200–1850 m", "endemism": "Endemik değil"}],
    id: "quercus-infectoria", name: "Mazı meşesi", latin: "Quercus infectoria Olivier",
    family: "Fagaceae", genus: "Quercus", category: "Geniş yapraklı ağaçlar", leaf: "Geniş", form: "Ağaççık / çalı",
    seedGroup: "Kapalı tohumlular",
    range: "Yunanistan'dan Güneybatı Asya'ya", description: "Meşe cinsinin bir üyesidir. Dallarındaki mazılar meyve değildir; gerçek meyvesi palamuttur.",
    fruitNote: "Palamut, meşenin gerçek meyvesidir. Mazı farklı bir bitki dokusudur.",
    source: "https://powo.science.kew.org/taxon/296305-1",
    image: "/species/quercus-infectoria.jpg", photoCredit: "Krzysztof Ziarnek", photoLicense: "CC BY-SA 4.0", photoSource: "https://commons.wikimedia.org/wiki/File:Quercus_infectoria_kz02.jpg",
  },
  {
    floraRecords: [{"name": "Abies cilicica subsp. cilicica", "source": "http://194.27.225.161/yasin/tubives/index.php?sayfa=1&tax_id=102", "provinces": "Osmaniye, Hatay, İçel, Kayseri, Kahramanmaraş", "grid": "B5, B6, C4, C5, C6", "elevation": "1200–2000 m", "endemism": "Endemik değil"}, {"name": "Abies cilicica subsp. isaurica", "source": "http://194.27.225.161/yasin/tubives/index.php?sayfa=1&tax_id=103", "provinces": "Antalya, Karaman", "grid": "C3, C4", "elevation": "1000–2000 m", "endemism": "Endemik"}],
    id: "abies-cilicica", name: "Toros göknarı", latin: "Abies cilicica (Antoine & Kotschy) Carrière",
    family: "Pinaceae", genus: "Abies", category: "İğne yapraklı ağaçlar", leaf: "İğne", form: "Ağaç",
    seedGroup: "Açık tohumlular",
    range: "Güney Türkiye ve Doğu Akdeniz", description: "Toroslarla ilişkilendirilen göknar türü. Türü belirlerken kozalak, sürgün ve iğne yapraklar birlikte incelenir.",
    source: "https://powo.science.kew.org/taxon/261491-1",
    image: "/species/abies-cilicica.jpg", photoCredit: "Elie plus", photoLicense: "CC BY-SA 3.0", photoSource: "https://commons.wikimedia.org/wiki/File:Abies_cilicica_in_Ehden_cedar_reserve.jpg",
  },
  {
    id: "abies-alba", name: "Avrupa göknarı", latin: "Abies alba Mill.",
    family: "Pinaceae", genus: "Abies", category: "İğne yapraklı ağaçlar", leaf: "İğne", form: "Ağaç",
    seedGroup: "Açık tohumlular",
    range: "Pireneler'den Karpatlar ve Balkanlar'a", description: "Avrupa'da doğal yayılış gösteren bir göknar türüdür.",
    source: "https://powo.science.kew.org/taxon/60468511-2",
    image: "/species/abies-alba.jpg", photoCredit: "Meneerke bloem", photoLicense: "CC BY-SA 3.0", photoSource: "https://commons.wikimedia.org/wiki/File:Abies_alba_young_tree.jpg",
  },
  {
    id: "abies-sibirica", name: "Sibirya göknarı", latin: "Abies sibirica Ledeb.",
    family: "Pinaceae", genus: "Abies", category: "İğne yapraklı ağaçlar", leaf: "İğne", form: "Ağaç",
    seedGroup: "Açık tohumlular",
    range: "Doğu Avrupa'dan Rusya Uzak Doğusu ve Sincan'a", description: "Geniş kuzey kuşağında doğal yayılış gösteren bir göknar türüdür.",
    source: "https://powo.science.kew.org/taxon/261635-1",
    image: "/species/abies-sibirica.jpg", photoCredit: "Krzysztof Ziarnek", photoLicense: "CC BY-SA 4.0", photoSource: "https://commons.wikimedia.org/wiki/File:Abies_sibirica_kz2.jpg",
  },
];

export const glossary: [string, string][] = [
  ["Alem", "Canlıların sınıflandırılmasında kullanılan geniş taksonomik basamak."],
  ["Biyoçeşitlilik", "Canlıların gen, tür ve ekosistem düzeyindeki çeşitliliği."],
  ["Cins", "Birbirine yakın türleri bir araya getiren taksonomik basamak."],
  ["Endemik", "Doğal yayılışı belirli bir coğrafi alanla sınırlı canlı."],
  ["Familya", "Birbiriyle ilişkili cinsleri bir araya getiren taksonomik basamak."],
  ["Habitat", "Bir canlının doğal olarak yaşadığı ortam."],
  ["Mazı", "Bazı organizmaların etkisiyle bitki dokusunda gelişen farklılaşmış yapı."],
  ["Meşcere", "Belirli bir alanda bir arada bulunan ve benzer özellikler gösteren ağaç topluluğu."],
  ["Morfoloji", "Bir canlının biçim ve yapı özelliklerinin incelenmesi."],
  ["Silvikültür", "Ormanın kurulması, yetiştirilmesi, bakımı ve gençleştirilmesiyle ilgilenen ormancılık alanı."],
  ["Taksonomi", "Canlıları adlandırma ve sınıflandırma çalışması."],
  ["Tür", "Sınıflandırmanın temel birimlerinden biri."],
];
