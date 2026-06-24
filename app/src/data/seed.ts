import type { Faz, Mahal, IsKalemi, Proje } from '../types';

// ============================================================================
// SEED VERİSİ — İlk açılışta panele yüklenir (onaylı projeden çıkarıldı)
// ============================================================================

export const PROJE: Proje = {
  ad: 'Ahmet Kurt Villa Projesi',
  sahibi: 'Ahmet Kurt',
  muteahhit: 'ALKA Gayrimenkul Değer ve Proje İnş. ve Tur. A.Ş.',
  santiyeSefi: 'Fatih Bozdemir (İnşaat Müh.)',
  yapiDenetim: 'Mimart Yapı Denetim Ltd. Şti.',
  mimar: 'KMG – Kemer Mimari Grup',
  konum: 'İstanbul / Arnavutköy / Boyalık – Beykonağı Cad.',
  adaParsel: 'Ada 135 / Parsel 132 (Pafta F21A23A-1B)',
  parselAlani: 8749.27,
  toplamInsaatAlani: 1142,
  toplamAlan: 1416.54,
  katAdedi: 3,
  yapiSinifi: 'IV-B',
  tasiyiciSistem: 'Betonarme Karkas (Asmolen döşeme)',
  ruhsatTarihi: '2025-01-24',
  ruhsatNo: '127',
};

export const FAZLAR: Faz[] = [
  { id: 'f0', no: 0, ad: 'Hazırlık ve Mobilizasyon', aciklama: 'İş başlama, şantiye kurulumu, teklif toplama' },
  { id: 'f1', no: 1, ad: 'Saha Hazırlık, Hafriyat ve İstinat', aciklama: 'Kazı, şev güvenliği, istinat duvarı' },
  { id: 'f2', no: 2, ad: 'Temel ve Bodrum', aciklama: 'Radye temel, perde, bodrum su yalıtımı' },
  { id: 'f3', no: 3, ad: 'Kaba Yapı / Karkas', aciklama: 'Kolon-kiriş-asmolen döşeme, kavisli merdiven' },
  { id: 'f4', no: 4, ad: 'Çatı', aciklama: 'Konstrüksiyon, kiremit, dere-oluk' },
  { id: 'f5', no: 5, ad: 'Duvarlar', aciklama: 'Tuğla dış+iç duvarlar' },
  { id: 'f6', no: 6, ad: 'Kaba Tesisat', aciklama: 'Elektrik + mekanik + havuz altyapısı' },
  { id: 'f7', no: 7, ad: 'Sıva, Şap ve Mantolama', aciklama: 'İç-dış sıva, şap, dış cephe mantolama' },
  { id: 'f8', no: 8, ad: 'Doğrama', aciklama: 'Alüminyum pencere/kapı, cam' },
  { id: 'f9', no: 9, ad: 'İnce İşler', aciklama: 'Seramik/mermer, parke, alçı, ıslak hacim' },
  { id: 'f10', no: 10, ad: 'Cephe Bitiş ve Taş Kaplama', aciklama: 'Taş kaplama, dış boya' },
  { id: 'f11', no: 11, ad: 'Mekanik/Elektrik Bitiş', aciklama: 'Kazan, klima, armatür, asansör' },
  { id: 'f12', no: 12, ad: 'Mutfak ve Banyo', aciklama: 'Dolap, vitrifiye, batarya' },
  { id: 'f13', no: 13, ad: 'Havuz Bitiş', aciklama: 'Kaplama, ekipman, test' },
  { id: 'f14', no: 14, ad: 'Çevre Düzenleme / Peyzaj', aciklama: '270 ağaç, bahçe, yol, çit' },
  { id: 'f15', no: 15, ad: 'Test, İskan ve Teslim', aciklama: 'Testler, yapı kullanma izni, teslim' },
];

export const MAHALLER: Mahal[] = [
  // Bodrum
  { id: 'm-b-otopark', kat: 'Bodrum', ad: 'Kapalı Otopark (4 araç)', alanM2: 123 },
  { id: 'm-b-merdiven', kat: 'Bodrum', ad: 'Merdiven Holü', alanM2: 33 },
  { id: 'm-b-asansorhol', kat: 'Bodrum', ad: 'Asansör Holü', alanM2: 10 },
  { id: 'm-b-asansormakine', kat: 'Bodrum', ad: 'Asansör Makine Dairesi', alanM2: 18 },
  { id: 'm-b-kazan', kat: 'Bodrum', ad: 'Kazan Dairesi', alanM2: 17 },
  { id: 'm-b-sudepo', kat: 'Bodrum', ad: 'Su Deposu', alanM2: 26 },
  { id: 'm-b-hidrofor', kat: 'Bodrum', ad: 'Hidrofor', alanM2: 18 },
  { id: 'm-b-koridor', kat: 'Bodrum', ad: 'Koridor', alanM2: 12 },
  // Zemin
  { id: 'm-z-giris', kat: 'Zemin', ad: 'Giriş Holü', alanM2: 20 },
  { id: 'm-z-salon', kat: 'Zemin', ad: 'Salon', alanM2: 116 },
  { id: 'm-z-oda', kat: 'Zemin', ad: 'Oda', alanM2: 51 },
  { id: 'm-z-mutfak', kat: 'Zemin', ad: 'Mutfak', alanM2: 30 },
  { id: 'm-z-teras', kat: 'Zemin', ad: 'Zemin Terası', alanM2: 28.93 },
  // 1. Kat
  { id: 'm-1-koridor', kat: '1. Kat', ad: 'Koridor / Galeri', alanM2: 40 },
  { id: 'm-1-oda1', kat: '1. Kat', ad: 'Yatak Odası 1', alanM2: 35 },
  { id: 'm-1-oda2', kat: '1. Kat', ad: 'Yatak Odası 2', alanM2: 35 },
  { id: 'm-1-oda3', kat: '1. Kat', ad: 'Yatak Odası 3', alanM2: 30 },
  { id: 'm-1-oda4', kat: '1. Kat', ad: 'Yatak Odası 4', alanM2: 30 },
  { id: 'm-1-banyolar', kat: '1. Kat', ad: 'Banyolar (ensuite)', alanM2: 40 },
  { id: 'm-1-balkonlar', kat: '1. Kat', ad: 'Balkonlar (4 adet)', alanM2: 54 },
  // Dış
  { id: 'm-havuz', kat: 'Havuz', ad: 'Yüzme Havuzu', alanM2: 206.5 },
  { id: 'm-havuz-teknik', kat: 'Havuz', ad: 'Havuz Teknik Oda', alanM2: 9.3 },
  { id: 'm-mustemilat', kat: 'Müştemilat', ad: 'Müştemilat', alanM2: 60.4 },
  { id: 'm-cevre', kat: 'Çevre', ad: 'Bahçe / Açık Alan', alanM2: 8000 },
];

// Yardımcı: yeni iş kalemi oluştururken varsayılanlar
const ik = (
  id: string, fazId: string, ad: string, birim: IsKalemi['birim'], metraj?: number,
): IsKalemi => ({
  id, fazId, ad, birim, metraj,
  birimFiyat: undefined, planlananButce: undefined, gerceklesen: undefined,
  durum: 'baslamadi', ilerleme: 0,
});

// İş kalemleri — metrajlar TAHMİNİDİR; kesin değerler statik/uygulama projesi ve
// taşeron tekliflerinden netleşecek. Birim fiyatlar teklif geldikçe doldurulacak.
export const IS_KALEMLERI: IsKalemi[] = [
  // Faz 0 — Hazırlık
  ik('ik-0-1', 'f0', 'Şantiye kurulumu (konteyner, çevre çiti, geçici tesisat)', 'gtr'),
  ik('ik-0-2', 'f0', 'Geçici elektrik ve su aboneliği', 'gtr'),
  ik('ik-0-3', 'f0', 'Aplikasyon ve zemin etüdü değerlendirme', 'gtr'),
  // Faz 1 — Hafriyat & İstinat
  ik('ik-1-1', 'f1', 'Ağaç/bitki kaldırma ve saha temizliği', 'gtr'),
  ik('ik-1-2', 'f1', 'Hafriyat / kazı (eğimli arazi)', 'm3', 2800),
  ik('ik-1-3', 'f1', 'İstinat (dayanma) duvarı imalatı', 'm3', 180),
  ik('ik-1-4', 'f1', 'Dolgu ve sıkıştırma', 'm3', 600),
  ik('ik-1-5', 'f1', 'Drenaj altyapısı', 'mtul', 220),
  // Faz 2 — Temel & Bodrum
  ik('ik-2-1', 'f2', 'Grobeton', 'm3', 55),
  ik('ik-2-2', 'f2', 'Radye temel (demir+kalıp+beton, 60 cm)', 'm3', 230),
  ik('ik-2-3', 'f2', 'Bodrum perde betonları', 'm3', 140),
  ik('ik-2-4', 'f2', 'Bodrum su yalıtımı + perde drenajı', 'm2', 520),
  ik('ik-2-5', 'f2', 'Bodrum döşeme', 'm2', 350),
  // Faz 3 — Kaba Yapı
  ik('ik-3-1', 'f3', 'Kolon-kiriş-perde betonu (kat: zemin)', 'm3', 130),
  ik('ik-3-2', 'f3', 'Asmolen döşeme (zemin tavanı)', 'm2', 380),
  ik('ik-3-3', 'f3', 'Kolon-kiriş-perde betonu (kat: 1.kat)', 'm3', 130),
  ik('ik-3-4', 'f3', 'Asmolen döşeme (1.kat tavanı)', 'm2', 410),
  ik('ik-3-5', 'f3', 'Kavisli merdiven (özel kalıp+beton)', 'gtr'),
  ik('ik-3-6', 'f3', 'İnşaat demiri (toplam)', 'ton', 95),
  // Faz 4 — Çatı
  ik('ik-4-1', 'f4', 'Çatı konstrüksiyonu (ahşap/çelik)', 'm2', 470),
  ik('ik-4-2', 'f4', 'Çatı su yalıtım membranı', 'm2', 470),
  ik('ik-4-3', 'f4', 'Kiremit örtü', 'm2', 470),
  ik('ik-4-4', 'f4', 'Çinko dere-oluk-iniş + bacalar', 'gtr'),
  // Faz 5 — Duvarlar
  ik('ik-5-1', 'f5', 'Dış duvarlar (delikli tuğla)', 'm2', 620),
  ik('ik-5-2', 'f5', 'İç bölme duvarları', 'm2', 540),
  ik('ik-5-3', 'f5', 'Lento / hatıl / denizlik', 'gtr'),
  // Faz 6 — Kaba Tesisat
  ik('ik-6-1', 'f6', 'Elektrik kaba tesisat (boru, buat, pano altyapı)', 'm2', 1142),
  ik('ik-6-2', 'f6', 'Sıhhi tesisat (temiz+pis su)', 'm2', 1142),
  ik('ik-6-3', 'f6', 'Merkezi/yerden ısıtma boru tesisatı', 'm2', 900),
  ik('ik-6-4', 'f6', 'Doğalgaz tesisatı altyapısı', 'gtr'),
  ik('ik-6-5', 'f6', 'Havuz tesisat altyapısı', 'gtr'),
  // Faz 7 — Sıva, Şap, Mantolama
  ik('ik-7-1', 'f7', 'İç sıva (alçı/kara)', 'm2', 2600),
  ik('ik-7-2', 'f7', 'Şap dökümü', 'm2', 1100),
  ik('ik-7-3', 'f7', 'Dış cephe mantolama (strafor+file+sıva)', 'm2', 720),
  // Faz 8 — Doğrama
  ik('ik-8-1', 'f8', 'Alüminyum pencere doğrama (kemerli özel) + cam', 'm2', 220),
  ik('ik-8-2', 'f8', 'Dış kapı(lar)', 'adet', 3),
  // Faz 9 — İnce İşler
  ik('ik-9-1', 'f9', 'Islak hacim su yalıtımı', 'm2', 180),
  ik('ik-9-2', 'f9', 'Seramik / mermer kaplama', 'm2', 600),
  ik('ik-9-3', 'f9', 'Laminat parke', 'm2', 700),
  ik('ik-9-4', 'f9', 'Alçı / kartonpiyer / asma tavan', 'm2', 900),
  ik('ik-9-5', 'f9', 'İç boya', 'm2', 2600),
  // Faz 10 — Cephe
  ik('ik-10-1', 'f10', 'Cephe taş kaplama (doğal taş)', 'm2', 260),
  ik('ik-10-2', 'f10', 'Dış cephe dekoratif sıva + boya', 'm2', 460),
  // Faz 11 — Mekanik/Elektrik Bitiş
  ik('ik-11-1', 'f11', 'Kazan / merkezi ısıtma sistemi', 'set'),
  ik('ik-11-2', 'f11', 'Klima (VRF/split)', 'set'),
  ik('ik-11-3', 'f11', 'Elektrik bitiş (armatür, anahtar-priz, pano)', 'gtr'),
  ik('ik-11-4', 'f11', 'Asansör (temin + montaj)', 'adet', 1),
  // Faz 12 — Mutfak & Banyo
  ik('ik-12-1', 'f12', 'Mutfak dolapları + tezgah', 'gtr'),
  ik('ik-12-2', 'f12', 'Banyo dolapları + vitrifiye + batarya', 'set'),
  // Faz 13 — Havuz
  ik('ik-13-1', 'f13', 'Havuz su yalıtımı + kaplama', 'm2', 240),
  ik('ik-13-2', 'f13', 'Havuz ekipman (filtre, pompa)', 'set'),
  // Faz 14 — Peyzaj
  ik('ik-14-1', 'f14', 'Bahçe tesviye + altyapı', 'gtr'),
  ik('ik-14-2', 'f14', '270 ağaç dikimi (zorunlu)', 'adet', 270),
  ik('ik-14-3', 'f14', 'Çim / peyzaj / sulama', 'm2', 3000),
  ik('ik-14-4', 'f14', 'Yürüyüş yolu, çit, bahçe aydınlatma', 'gtr'),
  ik('ik-14-5', 'f14', 'Kat bahçesi (yeşil çatı) bitkilendirme', 'm2', 60),
  // Faz 15 — Teslim
  ik('ik-15-1', 'f15', 'Genel temizlik + eksik tamamlama (punch list)', 'gtr'),
  ik('ik-15-2', 'f15', 'İskan (yapı kullanma izni) süreci', 'gtr'),
];
