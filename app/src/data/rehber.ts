// ============================================================================
// İNŞAAT REHBERİ — AI (Claude Opus) tarafından yazılmış bilgi tabanı.
// Acemiye anlatır gibi, sıfırdan, faz faz. Ahmet Kurt Villa projesine göre
// uyarlanmıştır (eğimli arazi, lüks villa, Arnavutköy, ruhsat alınmış).
// Bu içerik panelde "İnşaat Rehberi" sayfasında okunur.
// ============================================================================

export interface RehberBolum {
  id: string;
  baslik: string;
  fazId?: string;          // FAZLAR ile eşleşen faz (varsa)
  ikon?: string;           // lucide ikon adı (UI seçer)
  ozet: string;            // 1-2 cümle, ne anlatıyor
  giris: string;           // acemiye giriş açıklaması
  adimlar?: string[];      // adım adım yapılış
  dikkat?: string[];       // dikkat edilecekler
  izinlerFormlar?: string[]; // gerekli izin / form / evrak
  fiyatlama?: string[];    // fiyatlandırma mantığı / maliyet kalemleri
  hatalar?: string[];      // sık yapılan hatalar
  ipuclari?: string[];     // püf noktaları
}

export const REHBER_GENEL: RehberBolum[] = [
  {
    id: 'g-baslangic',
    baslik: 'İnşaata Başlamadan: Büyük Resim',
    ikon: 'Compass',
    ozet: 'Bir binayı bitirene kadar kim ne yapar, sen nerede durursun, para nereye gider.',
    giris:
      'Bir bina, "kaba yapı" (betonun dikilip ayağa kalkması) ve "ince yapı" (içinin yaşanır hale gelmesi) diye iki büyük bölümden oluşur. Sen bu işte mal sahibi + yöneticisin: taşeronları (işi yapan ekipler) sen bulursun, sen pazarlık edersin, sen kontrol edersin. Senin işin "tuğla dizmek" değil; doğru ekibi, doğru sırada, doğru parayla çalıştırmaktır. Bu rehber sana o sırayı ve her adımda nelere dikkat edeceğini öğretir.',
    adimlar: [
      'Önce ekibini kur: şantiye şefi (sende var: İnş. Müh. Fatih Bozdemir) ve yapı denetim (Mimart) işin teknik güvencesidir.',
      'Sonra iş kalemlerini ve metrajları çıkar (panelde hazır), her iş için en az 3 taşerondan teklif al.',
      'Parayı fazlara böl: hepsini bir anda harcamazsın; iş ilerledikçe "hakediş" ile ödersin.',
      'Her büyük adımda yapı denetimden onay al, fotoğraf çek, panele işle.',
    ],
    dikkat: [
      'En pahalı hatalar görünmeyen yerlerde olur: su yalıtımı, temel, istinat duvarı. Buralarda asla ucuza kaçma.',
      'Yazılı sözleşme olmadan hiçbir işe başlatma. Sözlü anlaşma = ileride kavga.',
      'Acele karar verme; bir taşeron "bugün başlamazsak fiyat artar" diyorsa bu bir baskı taktiğidir.',
    ],
    ipuclari: [
      'Her şeyi panele yaz: konuşma, fiyat, tarih, ödeme. Hafızana güvenme; inşaat 2 yıl sürer.',
      'Şantiyeye düzenli git, gidemediğin zaman fotoğraf/video iste.',
    ],
  },
  {
    id: 'g-izinler',
    baslik: 'İzinler, Ruhsat ve Resmi Süreç',
    ikon: 'Stamp',
    ozet: 'Hangi belge ne zaman lazım; ruhsattan iskâna kadar resmi yol.',
    giris:
      'İnşaatın "kimliği" yapı ruhsatıdır. Senin ruhsatın ALINMIŞ durumda (24.01.2025, No 127) — bu büyük bir avantaj, çoğu kişi aylarca burada bekler. Ama iş ruhsatla bitmez: başlarken "yapı denetim iş başlama bildirimi", biterken "yapı kullanma izni (iskân)" gerekir. Arada da bazı bildirimler ve abonelikler vardır.',
    adimlar: [
      'İş başlamadan: Yapı denetim firması (Mimart) ile "işe başlama" tutanağı düzenlenir, belediyeye bildirilir.',
      'Şantiye tabelası asılır (yapı sahibi, müteahhit, denetim, ruhsat no — zorunlu).',
      'Geçici şantiye elektriği ve suyu için abonelik başvurusu yapılır.',
      'İnşaat boyunca yapı denetim her kritik aşamada (temel, her kat betonu) yerinde kontrol eder ve seviye tespit tutanağı tutar.',
      'Bitince: eksikler giderilir, yapı denetim uygunluk verir, belediyeden YAPI KULLANMA İZNİ (iskân) alınır.',
      'İskân sonrası: kat irtifakı/kat mülkiyeti, daimi elektrik-su-doğalgaz abonelikleri, numarataj.',
    ],
    izinlerFormlar: [
      'Yapı Ruhsatı (✓ alındı, No 127)',
      'Yapı denetim hizmet sözleşmesi ve işe başlama bildirimi',
      'Şantiye şefi sözleşmesi (✓ Fatih Bozdemir)',
      'Geçici/daimi elektrik-su-doğalgaz abonelik başvuruları',
      'Yapı kullanma izni (iskân) başvuru dosyası (bitişte)',
      'Asansör tescil ve periyodik kontrol belgesi (asansör var)',
      'Zorunlu: 270 ağaç dikim taahhüdü iskân şartıdır',
    ],
    dikkat: [
      'Ruhsata aykırı bir şey yapma (kat ekleme, çıkma büyütme) — iskân alamazsın, yıkım/ceza riski.',
      'Yapı denetimin istediği kontrolleri atlatma; beton dökmeden önce mutlaka onay al.',
    ],
  },
  {
    id: 'g-para',
    baslik: 'Para Yönetimi ve Nakit Akışı',
    ikon: 'Wallet',
    ozet: 'Maliyet nasıl hesaplanır, para ne zaman çıkar, kendini nasıl korursun.',
    giris:
      'İnşaat maliyeti = her iş kaleminin "metraj × birim fiyat" toplamıdır. Ruhsattaki resmi rakam (≈19,87 milyon TL) sadece harç hesabıdır, GERÇEK maliyet değildir — lüks villada gerçek maliyet bunun belirgin üstündedir. Gerçek rakam taşeron tekliflerinden çıkar. Para bir anda değil, iş ilerledikçe "hakediş" ile çıkar.',
    fiyatlama: [
      'Her işi birim fiyatla anlaş (m², m³, ton). Götürü (tek fiyat) anlaşmada kapsamı çok net yaz.',
      'Sözleşmeye "fiyat farkı (eskalasyon)" maddesi koy — uzun işte malzeme zammına karşı korur.',
      'Toplam bütçenin %10-15\'i kadar "beklenmedik" (kontenjans) payı ayır; sürpriz hep çıkar.',
      'Eğim, istinat, hafriyat, su yalıtımı, havuz, peyzaj (270 ağaç) gizli ama büyük kalemlerdir.',
    ],
    dikkat: [
      'Avans (peşin para) kontrollü ver; verdiğin avansı hakedişten düş ("avans mahsubu").',
      'Hafriyat (m³) ve demir (ton) en çok metraj şişirilen kalemlerdir — kamyon/irsaliye say.',
      'Faturasız büyük ödeme yapma; hem vergi hem ispat sorunu olur.',
    ],
    ipuclari: [
      'Aylık nakit ihtiyacın dalgalanır: kaba yapıda beton/demir yüklü, ince işte malzeme yüklü.',
      'Pahalı ve uzun teslimli kalemleri (asansör, alüminyum doğrama, mermer, havuz) erken sipariş et.',
    ],
  },
  {
    id: 'g-sozlesme',
    baslik: 'Taşeron Seçimi ve Sözleşme',
    ikon: 'FileSignature',
    ozet: 'İyi taşeron nasıl seçilir, sözleşmede hangi maddeler olmazsa olmaz.',
    giris:
      'Taşeron, belirli bir işi (örn. sıva, fayans, çatı) yapan ekiptir. Doğru taşeron işin %70\'idir. Ucuz teklif her zaman iyi değildir; iş bitmeden kaçan, kalitesiz yapan taşeron sana daha pahalıya patlar. Her işi yazılı sözleşmeyle bağla.',
    adimlar: [
      'Her iş için en az 3 taşerondan AYNI kapsamla teklif al (panelde Teklif Karşılaştırma).',
      'Referans sor: daha önce yaptığı işi gör/ara.',
      'Kazananı seç, sözleşme imzala, panele taşeron olarak ekle.',
      'İş ilerledikçe hakediş yap, performansını panele not et.',
    ],
    izinlerFormlar: [
      'Yazılı taşeron sözleşmesi (iş tanımı, birim fiyat, termin, ceza, ödeme, İSG, garanti)',
      'Hakediş tutanağı (her ödeme öncesi yapılan iş × birim fiyat)',
      'İş güvenliği (İSG) sorumluluğu ve SGK bildirimleri taşeronda olmalı (sözleşmede netle)',
    ],
    dikkat: [
      'Sözleşmesiz iş yaptırma; kapsam dışı "ek iş"leri de yazılı fiyatla onayla.',
      'Gecikme cezası ve işi bırakma durumunu sözleşmeye yaz.',
      'İş güvenliği: kazada sorumluluk sana döner — taşeronun SGK ve İSG yükümlülüğünü garantiye al.',
    ],
    ipuclari: ['Sözleşme taslağı için: dokumanlar/05-TASERON-SOZLESME-VE-HAKEDIS.md belgesine bak.'],
  },
];

export const REHBER_FAZLAR: RehberBolum[] = [
  {
    id: 'r-f0', fazId: 'f0', baslik: 'Faz 0 — Hazırlık ve Mobilizasyon', ikon: 'Rocket',
    ozet: 'Şantiyeyi kur, ekibi topla, ilk teklifleri al. Kazma vurmadan önceki her şey.',
    giris: 'Mobilizasyon, "şantiyeyi çalışır hale getirme" demektir. Hiç acele etmeden burada sağlam kurulum yaparsan tüm inşaat rahat gider.',
    adimlar: [
      'Yapı denetim ile işe başlama tutanağını düzenle, belediyeye bildir.',
      'Arsayı çevir (şantiye çiti), giriş kapısı ve şantiye tabelası koy.',
      'Konteyner/şantiye binası kur (ofis, malzeme, işçi WC).',
      'Geçici elektrik ve su bağlantısını ayarla.',
      'Aplikasyon yaptır: binanın arsadaki yerini harita mühendisi kotlu olarak işaretler.',
      'Zemin/geoteknik raporunu (✓ mevcut) şantiye şefiyle birlikte oku; temel/istinat önerilerini not al.',
      'İlk teklifleri topla: hafriyat ve betonarme taşeronları (ilk başlayacaklar).',
    ],
    dikkat: [
      'Aplikasyon ve kot (±0.00) yanlışsa tüm bina yanlış yerde/yükseklikte olur — harita mühendisine kesinlikle kontrol ettir.',
      'Eğimli arazide şantiye yolu ve makine giriş-çıkışını baştan planla.',
    ],
    izinlerFormlar: ['İşe başlama bildirimi', 'Şantiye tabelası', 'Geçici elektrik/su aboneliği'],
    fiyatlama: ['Şantiye kurulumu genelde götürü. Konteyner kiralık/satın alma kıyasla.'],
    hatalar: ['Aplikasyonu atlayıp "göz kararı" başlamak — en büyük başlangıç hatası.'],
  },
  {
    id: 'r-f1', fazId: 'f1', baslik: 'Faz 1 — Hafriyat, Şev ve İstinat Duvarı', ikon: 'Mountain',
    ozet: 'Toprağı kaz, eğimi güvene al, dayanma duvarını ör. Bu projenin en kritik ve gizli-maliyetli fazı.',
    giris: 'Senin arazin eğimli (%27 şev, ~10 m kot farkı). Bu yüzden hafriyat (kazı) ve istinat (dayanma) duvarı burada çok önemli ve pahalı. İstinat duvarı, toprağın kaymasını/göçmesini önleyen betonarme duvardır; statik projeye birebir uymalı.',
    adimlar: [
      'Ağaç/bitki örtüsünü kaldır (varsa kesim izni al), sahayı temizle.',
      'Kazıyı kademeli yap; eğimde tek seferde dik kazma (göçük riski).',
      'İstinat duvarı yerlerini statik projeye göre kaz, demir-kalıp-beton ile ör.',
      'Drenaj borularını ve filtre malzemesini duvar arkasına yerleştir (su birikmesin).',
      'Dolguyu tabaka tabaka serip sıkıştır (kompaktör ile).',
    ],
    dikkat: [
      'KAZI GÜVENLİĞİ: derin/dik kazıda göçük insan hayatına mal olur — şev açısına ve iksaya dikkat.',
      'İstinat duvarı su tahliyesi (drenaj) olmadan yapılırsa su basıncıyla zamanla çatlar/yıkılır.',
      'Hafriyat m³ üzerinden ölçülür: çıkan toprağı taşıyan kamyon sayısı × hacmi say (en çok şişirilen kalem).',
    ],
    fiyatlama: [
      'Hafriyat: m³ birim fiyat + nakliye mesafesi. Kaya çıkarsa fiyat artar (sözleşmede ayrı yaz).',
      'İstinat duvarı: m³ beton + ton demir + kalıp m² ayrı ayrı veya götürü.',
    ],
    hatalar: ['Drenajı atlamak', 'Dolguyu sıkıştırmadan bırakmak (sonradan çökme)', 'Kamyon sayısını kontrol etmemek'],
  },
  {
    id: 'r-f2', fazId: 'f2', baslik: 'Faz 2 — Temel ve Bodrum (Su Yalıtımı Kritik)', ikon: 'Layers',
    ozet: 'Binanın ayağı: radye temel + bodrum perdeleri + su yalıtımı. Sonradan tamiri en pahalı yer.',
    giris: 'Temel, binanın tüm yükünü toprağa aktaran betonarme tabandır. Senin projende "radye temel" var (60 cm kalın tek parça plaka) — sağlam ama beton/demir yoğun. Bodrum toprak altında olduğu için su yalıtımı hayati: yanlış yapılırsa bodrum sürekli nemli/su alır ve sonradan tamiri çok pahalıdır.',
    adimlar: [
      'Grobeton dök (temel altına ince tesviye betonu).',
      'Radye temelin demirini statik projeye göre bağla; yapı denetime KONTROL ETTİR.',
      'Beton dökümünü hazır beton (santral) + pompa ile yap; küp numune aldır.',
      'Bodrum perde (duvar) betonlarını dök.',
      'Su yalıtımını uygula (çimento esaslı + perde drenajı), sonra dolgu yap.',
    ],
    dikkat: [
      'BETON DÖKMEDEN ÖNCE yapı denetim demir/kalıp onayı şart — onaysız döküm büyük sorun.',
      'Su yalıtımını test etmeden kapatma; bir kez toprak altında kaldı mı bir daha ulaşamazsın.',
      'Beton kürünü (sulama/örtme) ihmal etme — yoksa çatlar, dayanım düşer.',
    ],
    fiyatlama: ['Beton: m³ (santralden, pompa dahil mi ayrı mı netle).', 'Demir: ton.', 'Su yalıtımı: m².', 'Kalıp: m².'],
    hatalar: ['Yağmurda/donda beton dökmek', 'Numune almamak', 'Su yalıtımında köşe/birleşim detaylarını eksik bırakmak'],
  },
  {
    id: 'r-f3', fazId: 'f3', baslik: 'Faz 3 — Kaba Yapı / Karkas (Bina Yükseliyor)', ikon: 'Building',
    ozet: 'Kolon-kiriş-döşeme ile bina kat kat yükselir. Kavisli merdiven gibi özel işler burada.',
    giris: 'Karkas, binanın betonarme iskeletidir (kolonlar, kirişler, döşemeler). Senin projende "asmolen" döşeme ve görkemli "kavisli merdiven" var — kavisli merdiven özel kalıp ustası ister, pahalı ve hüner işidir.',
    adimlar: [
      'Her kat için: kolon-perde demiri → kalıp → döşeme demiri → beton.',
      'Kavisli merdiven kalıbını usta hazırlar, demir bağlanır, beton dökülür.',
      'Asansör kuyusu/çekirdeğini birlikte yükselt.',
      'Her kat betonundan önce yapı denetim kontrolü ve seviye tespit tutanağı.',
    ],
    dikkat: [
      'Demir çapları ve aralıkları statik projeye birebir olmalı (denetim kontrol eder).',
      'Kalıp düzgün/teraziye olmalı; eğri kolon sonradan düzelmez.',
      'Beton dökümünde "vibrasyon" (titreşim) ile boşluk bırakma.',
    ],
    fiyatlama: ['Genelde komple "kaba yapı" m² götürü veya beton m³ + demir ton + kalıp m² ayrı.', 'Kavisli merdiven ayrı fiyatlanır (özel imalat).'],
    hatalar: ['Kalıp sökümünü erken yapmak (beton tam priz almadan)', 'Kemerli/kavisli detayları acemiye yaptırmak'],
  },
  {
    id: 'r-f4', fazId: 'f4', baslik: 'Faz 4 — Çatı', ikon: 'Home',
    ozet: 'Binayı yağmurdan koru: konstrüksiyon + su yalıtımı + kiremit + dere/oluk.',
    giris: 'Çatı bitmeden iç işlere başlanmaz (yağmur korumalısı). Senin projende kırma (eğimli) kiremit çatı var, eğim ~%33 dik — güvenlik önemli.',
    adimlar: ['Çatı konstrüksiyonunu (ahşap/çelik) kur.', 'Su yalıtım membranı ser.', 'Kiremit ört.', 'Çinko dere-oluk-iniş borularını yap.', 'Baca diplerini sızdırmaz şekilde kapat.'],
    dikkat: ['Dere/oluk birleşimleri en sık su sızdıran yerlerdir — detaya dikkat.', 'Dik çatıda işçi güvenliği (paraşüt/iskele) zorunlu.'],
    fiyatlama: ['Çatı m² (eğimli alan, taban alanından büyüktür).', 'Çinko işleri mtül/götürü.'],
    hatalar: ['Su yalıtımını atlayıp doğrudan kiremit', 'Kar tutucu koymamak'],
  },
  {
    id: 'r-f5', fazId: 'f5', baslik: 'Faz 5 — Duvarlar (Tuğla)', ikon: 'Brick',
    ozet: 'Dış ve iç duvarların örülmesi; kapı-pencere boşlukları.',
    giris: 'Karkas iskelet, duvarlar ise bölmelerdir. Senin projende delikli tuğla kullanılıyor. Kemerli pencere boşlukları projeye göre örülmeli.',
    adimlar: ['Dış duvarları ör.', 'İç bölme duvarlarını ör.', 'Kapı-pencere boşluklarını ölçülü bırak.', 'Lento/hatıl (boşluk üstü kiriş) yap.'],
    dikkat: ['Doğrama (pencere) ölçüleri için boşlukları net bırak; doğramacı sonra ölçü alır.', 'Duvarların düşeyde şakulünde olması sıvada kalınlık/maliyet farkı yaratır.'],
    fiyatlama: ['Duvar m² (tuğla cinsine göre). İşçilik + malzeme ayrı olabilir.'],
    hatalar: ['Boşlukları yanlış ölçü bırakmak', 'Hatıl atlamak'],
  },
  {
    id: 'r-f6', fazId: 'f6', baslik: 'Faz 6 — Kaba Tesisat (Elektrik + Mekanik)', ikon: 'Cable',
    ozet: 'Sıva/şaptan önce: elektrik boruları, su-pis su, ısıtma, havuz altyapısı.',
    giris: 'Kaba tesisat, duvar/zemin kapanmadan önce gizlenecek boru ve kabloların döşenmesidir. Bir kez sıva/şap kapandı mı, sonradan eklemek için kırmak gerekir — o yüzden her şey önceden planlı olmalı.',
    adimlar: ['Elektrik borularını ve buatları döşe.', 'Temiz ve pis su borularını çek.', 'Yerden/merkezi ısıtma borularını ser.', 'Doğalgaz ve havuz tesisat altyapısını yap.', 'Tüm sistemleri basınç/sızdırmazlık testinden geçir.'],
    dikkat: ['Test yapmadan kapatma; gizli kaçak felakettir.', 'Priz/anahtar/armatür yerlerini şimdiden netle (sonradan zor).'],
    fiyatlama: ['Genelde proje m² üzerinden götürü; malzeme markası fiyatı çok değiştirir.'],
    hatalar: ['Test atlamak', 'Yetersiz priz/aydınlatma noktası bırakmak'],
  },
  {
    id: 'r-f7', fazId: 'f7', baslik: 'Faz 7 — Sıva, Şap ve Mantolama', ikon: 'PaintRoller',
    ozet: 'Yüzeyleri düzelt: iç sıva, zemin şapı, dış cephe ısı yalıtımı (mantolama).',
    giris: 'Sıva duvarları düzgünleştirir, şap zemini düzler (ısıtma boruları üstüne), mantolama ise dışarıdan ısı yalıtımıdır (faturayı düşürür, küfü önler).',
    adimlar: ['İç sıva (alçı/kara sıva).', 'Şap dökümü (ısıtma borularının üstüne).', 'Dış cephe mantolama: strafor + file + dekoratif sıva.'],
    dikkat: ['Şap kürü iyi yapılmalı (çatlama).', 'Mantolama köşe profilleri ve filesi düzgün olmazsa cephe çatlar.'],
    fiyatlama: ['Sıva m², şap m², mantolama m² (strafor kalınlığına göre).'],
    hatalar: ['Islak hacim su yalıtımını şap aşamasında unutmak'],
  },
  {
    id: 'r-f8', fazId: 'f8', baslik: 'Faz 8 — Doğrama (Pencere / Dış Kapı)', ikon: 'DoorOpen',
    ozet: 'Alüminyum pencere ve dış kapılar. Uzun teslimli — erken sipariş!',
    giris: 'Senin projende izolasyonlu alüminyum doğrama ve kemerli özel pencereler var. Kemerli formlar özel imalattır, üretimi uzun sürer.',
    adimlar: ['Doğramacı yerinde ölçü alır.', 'Üretim (kemerliler özel kalıp).', 'Montaj + ısı camı.', 'Denizlik/damlalık ve mantolama ile birleşim su almayacak şekilde.'],
    dikkat: ['ERKEN SİPARİŞ ver — teslim süresi haftalar/aylar sürebilir, işi geciktirme.', 'Montaj-mantolama birleşimi su sızdırmamalı.'],
    fiyatlama: ['Doğrama m² (profil markası + cam tipi belirler). Kemerli imalat daha pahalı.'],
    hatalar: ['Ölçüyü erken/yanlış almak', 'Siparişi geciktirip tüm şantiyeyi bekletmek'],
  },
  {
    id: 'r-f9', fazId: 'f9', baslik: 'Faz 9 — İnce İşler (Islak Hacim + Kaplamalar)', ikon: 'Bath',
    ozet: 'Banyo/mutfak su yalıtımı, seramik/mermer, parke, alçı, asma tavan.',
    giris: 'Artık binanın "yüzü" ortaya çıkıyor. Lüks villada malzeme seçimi (mermer, seramik, parke) bütçeyi çok etkiler.',
    adimlar: ['Islak hacim su yalıtımı (su testli).', 'Seramik/mermer döşe.', 'Kuru hacimlere parke.', 'Alçı/kartonpiyer/asma tavan.', 'Boya astarı.'],
    dikkat: ['Banyo su yalıtımı seramikten ÖNCE ve test edilmeli — alttaki komşu/oda su almasın.', 'Mermer/seramik numunesini onayla (parti farkı, renk).'],
    fiyatlama: ['Fayans/mermer m² (işçilik + malzeme ayrı). Parke m². Alçı m².'],
    hatalar: ['Su yalıtımını test etmeden kapatmak', 'Malzeme numunesi onaylamadan toplu sipariş'],
  },
  {
    id: 'r-f10', fazId: 'f10', baslik: 'Faz 10 — Cephe Bitiş ve Taş Kaplama', ikon: 'Gem',
    ozet: 'Binanın dış görünüşü: doğal taş kaplama + dekoratif sıva + dış boya.',
    giris: 'Senin projende köşelerde doğal taş kaplama var — ustalık ve malzeme maliyeti yüksek, ama villanın "lüks" görüntüsünü bu verir.',
    adimlar: ['Cephe taş kaplama (doğal taş).', 'Dekoratif dış sıva bitişi.', 'Dış cephe boyası.', 'Damlalık/söve detayları.'],
    dikkat: ['Doğal taş renk/doku numunesini onayla.', 'Cephe iskelesi güvenliği.'],
    fiyatlama: ['Taş kaplama m² (taş cinsi pahalı kalem). Boya m².'],
    hatalar: ['Numunesiz taş siparişi (renk tutmazsa cephe alaca olur)'],
  },
  {
    id: 'r-f11', fazId: 'f11', baslik: 'Faz 11 — Mekanik/Elektrik Bitiş', ikon: 'Plug',
    ozet: 'Kazan, klima, armatür, anahtar-priz, asansör montajı ve devreye alma.',
    giris: 'Kaba tesisatta bıraktığın altyapıya artık cihazlar bağlanır. Asansör uzun teslimlidir.',
    adimlar: ['Kazan/merkezi ısıtma sistemi kurulumu.', 'Klima iç-dış üniteler.', 'Armatür, anahtar-priz, pano, aydınlatma.', 'Asansör montajı + tescil.', 'Tüm sistemlerin testi ve devreye alma.'],
    dikkat: ['Asansörü ERKEN sipariş et.', 'Elektrik panosu ve topraklama yapı denetim kontrollü.'],
    fiyatlama: ['Kazan/klima set fiyatı. Elektrik bitiş götürü. Asansör adet (durak sayısına göre).'],
    hatalar: ['Topraklama ölçümünü atlamak', 'Asansör tescilini geciktirip iskânı sarkıtmak'],
  },
  {
    id: 'r-f12', fazId: 'f12', baslik: 'Faz 12 — Mutfak ve Banyo', ikon: 'CookingPot',
    ozet: 'Mutfak dolabı + tezgah, banyo dolabı, vitrifiye, bataryalar.',
    giris: 'İnce işler bitince ölçüler netleşir; mutfak/banyo mobilyaları ona göre üretilir.',
    adimlar: ['Mutfak dolapları + tezgah (yerinde ölçü).', 'Banyo dolabı, klozet, lavabo, küvet, batarya montajı.'],
    dikkat: ['Ölçüyü ince iş bitince al.', 'Lüks villada malzeme/marka bütçeyi çok değiştirir.'],
    fiyatlama: ['Mutfak götürü/mtül. Vitrifiye+batarya set.'],
  },
  {
    id: 'r-f13', fazId: 'f13', baslik: 'Faz 13 — Havuz Bitiş', ikon: 'Waves',
    ozet: 'Havuz su yalıtımı + kaplama + ekipman. Sızıntı riski yüksek, uzman işi.',
    giris: 'Havuz ayrı bir uzmanlıktır; genel taşerona verme. En büyük risk sızıntıdır.',
    adimlar: ['Havuz su yalıtımı.', 'Kaplama (seramik/cam mozaik).', 'Filtre-pompa-teknik oda ekipmanı.', 'Su tutma testi.'],
    dikkat: ['Su tutma testi yapılmadan kaplama bitirilmemeli.', 'Teknik oda ve tesisat erişilebilir olmalı.'],
    fiyatlama: ['Havuz genelde komple götürü (uzman firma).'],
    hatalar: ['Sızıntı testini atlamak'],
  },
  {
    id: 'r-f14', fazId: 'f14', baslik: 'Faz 14 — Çevre Düzenleme / Peyzaj', ikon: 'Trees',
    ozet: 'Bahçe, 270 ağaç (zorunlu), yol, çit, aydınlatma, kat bahçesi.',
    giris: 'Dış mekan işleri. 270 ağaç dikimi senin için iskân şartı — bütçeye ve takvime baştan koy.',
    adimlar: ['İstinat duvarı bitişi + bahçe tesviyesi.', '270 ağaç dikimi.', 'Çim/peyzaj/sulama.', 'Yürüyüş yolu, çit, otopark, bahçe aydınlatma.', 'Kat bahçesi (yeşil çatı) bitkilendirme.'],
    dikkat: ['270 ağaç olmadan iskân çıkmaz.', 'Eğimli arazide peyzaj + istinat birlikte planlanmalı.'],
    fiyatlama: ['Ağaç adet (tür/boy). Peyzaj m². Sulama/aydınlatma götürü.'],
  },
  {
    id: 'r-f15', fazId: 'f15', baslik: 'Faz 15 — Test, İskân ve Teslim', ikon: 'BadgeCheck',
    ozet: 'Eksikleri bitir, testleri yap, yapı kullanma iznini (iskân) al, teslim et.',
    giris: 'Son düzlük. Burada "punch list" (eksikler listesi) çıkarıp tek tek kapatırsın, sonra resmi iskân süreci başlar.',
    adimlar: ['Genel temizlik.', 'Tüm sistem testleri.', 'Eksik/kusur listesi (punch list) tamamlama.', 'Yapı denetim son uygunluk.', 'Belediyeden yapı kullanma izni (iskân).', 'Daimi abonelikler + kat irtifakı/mülkiyeti.'],
    dikkat: ['İskân için: 270 ağaç, otopark, asansör tescili, tüm imar şartları tamam olmalı.', 'Eksiksiz teslim için detaylı punch list tut.'],
    izinlerFormlar: ['Yapı kullanma izni (iskân) dosyası', 'Asansör tescil', 'Daimi elektrik/su/doğalgaz abonelikleri', 'Kat irtifakı/mülkiyeti'],
  },
];

export const REHBER_TUMU = [...REHBER_GENEL, ...REHBER_FAZLAR];
