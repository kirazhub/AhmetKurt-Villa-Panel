// ============================================================================
// AHMET KURT VİLLA PANELİ — Ortak Veri Modeli (Tüm modüller bunu kullanır)
// Bu dosya "sözleşme"dir. Alan adlarını DEĞİŞTİRME, sadece kullan.
// ============================================================================

export type Durum = 'baslamadi' | 'devam' | 'tamamlandi' | 'beklemede';

export const DURUM_ETIKET: Record<Durum, string> = {
  baslamadi: 'Başlamadı',
  devam: 'Devam Ediyor',
  tamamlandi: 'Tamamlandı',
  beklemede: 'Beklemede',
};

export type Birim = 'm2' | 'm3' | 'mtul' | 'adet' | 'ton' | 'kg' | 'gtr' | 'set';

export const BIRIM_ETIKET: Record<Birim, string> = {
  m2: 'm²', m3: 'm³', mtul: 'mtül', adet: 'adet',
  ton: 'ton', kg: 'kg', gtr: 'götürü', set: 'set',
};

/** İnşaat fazı (16 ana faz) */
export interface Faz {
  id: string;
  no: number;
  ad: string;
  aciklama?: string;
}

/** Yapıdaki mahal (oda/bölüm) */
export interface Mahal {
  id: string;
  kat: string;        // 'Bodrum' | 'Zemin' | '1. Kat' | 'Havuz' | 'Müştemilat' | 'Çevre'
  ad: string;
  alanM2?: number;
}

/** Tek bir iş kalemi — panelin merkezindeki kayıt */
export interface IsKalemi {
  id: string;
  fazId: string;
  ad: string;
  birim: Birim;
  metraj?: number;
  birimFiyat?: number;       // planlanan birim fiyat (TL)
  planlananButce?: number;   // genelde metraj * birimFiyat; elle de girilebilir
  gerceklesen?: number;      // bu kaleme yapılan toplam gerçek harcama (TL)
  durum: Durum;
  ilerleme: number;          // 0-100
  taseronId?: string;
  baslangic?: string;        // ISO tarih (YYYY-MM-DD)
  bitis?: string;            // ISO tarih (YYYY-MM-DD)
  notlar?: string;
}

/** Taşeron / firma */
export interface Taseron {
  id: string;
  ad: string;
  firma?: string;
  uzmanlik: string;          // bkz. TASERON_KATEGORILERI
  telefon?: string;
  email?: string;
  sozlesmeNotu?: string;
  performans?: number;       // 1-5 yıldız
  notlar?: string;
}

/** Bir iş için alınan teklif (karşılaştırma için) */
export interface Teklif {
  id: string;
  isKalemiId?: string;       // bağlı iş kalemi (opsiyonel)
  kalemAdi: string;          // serbest metin başlık
  taseronId?: string;
  taseronAdi?: string;       // taşeron kayıtlı değilse serbest ad
  tutar: number;             // toplam teklif (TL)
  birimFiyat?: number;
  tarih?: string;            // ISO
  secildi: boolean;          // kazanan teklif mi
  notlar?: string;
}

/** Taşerona yapılan ödeme / hakediş */
export interface Odeme {
  id: string;
  taseronId?: string;
  taseronAdi?: string;
  isKalemiId?: string;
  aciklama: string;
  tutar: number;             // ödenen tutar (TL)
  tarih: string;             // ISO
  tur: 'avans' | 'hakedis' | 'kesin';
}

/** Şantiye fotoğrafı / fatura / sözleşme vb. belge */
export interface Belge {
  id: string;
  ad: string;
  tur: 'foto' | 'fatura' | 'sozlesme' | 'diger';
  isKalemiId?: string;
  fazId?: string;
  blobId?: string;           // IndexedDB'deki dosyanın anahtarı (bkz. lib/idb.ts)
  url?: string;              // veya dış URL
  tarih: string;             // ISO
  notlar?: string;
}

/** Proje künyesi (sabit bilgiler) */
export interface Proje {
  ad: string;
  sahibi: string;
  muteahhit: string;
  santiyeSefi: string;
  yapiDenetim: string;
  mimar: string;
  konum: string;
  adaParsel: string;
  parselAlani: number;
  toplamInsaatAlani: number;
  toplamAlan: number;
  katAdedi: number;
  yapiSinifi: string;
  tasiyiciSistem: string;
  ruhsatTarihi: string;
  ruhsatNo: string;
}

export const TASERON_KATEGORILERI = [
  'Hafriyat / Kazı',
  'İstinat Duvarı',
  'Betonarme (Kalıp-Demir-Beton)',
  'Su Yalıtımı',
  'Çatı (Ahşap-Kiremit)',
  'Çinko / Galvaniz',
  'Duvar (Örme)',
  'Elektrik',
  'Mekanik (Sıhhi Tesisat-Isıtma)',
  'Sıva',
  'Şap',
  'Mantolama (Isı Yalıtım)',
  'Doğrama (Alüminyum)',
  'Fayans / Mermer',
  'Parke',
  'Alçı / Kartonpiyer',
  'Boya',
  'Taş Kaplama',
  'Asansör',
  'Klima',
  'Mutfak / Mobilya',
  'Havuz',
  'Peyzaj / Çevre',
  'Nakliye / Genel',
] as const;

// ============================================================================
// SAHA TAKİBİ — Günlük saha kaydı ve malzeme sarfiyatı (AI maliyet raporları için)
// ============================================================================

/** Bir günün saha özeti: kaç kamyon geldi, kaç işçi çalıştı, hava vb. */
export interface SahaGunluk {
  id: string;
  tarih: string;          // ISO (YYYY-MM-DD)
  kamyon?: number;        // gelen kamyon sayısı
  isci?: number;          // çalışan işçi sayısı
  calismaSaati?: number;  // o gün çalışılan saat
  hava?: string;          // 'güneşli' | 'yağmurlu' | 'karlı' ...
  fazId?: string;
  notlar?: string;
}

/** Malzeme sarfiyatı / gelen mal: çelik, beton, tuğla, çimento vb. */
export interface Sarfiyat {
  id: string;
  tarih: string;          // ISO
  malzeme: string;        // 'İnşaat demiri', 'Hazır beton', 'Tuğla' ...
  miktar: number;
  birim: Birim;
  birimFiyat?: number;    // TL
  tutar?: number;         // miktar * birimFiyat (otomatik hesaplanır)
  tedarikci?: string;
  fazId?: string;
  isKalemiId?: string;
  notlar?: string;
}

// ============================================================================
// İSTEK LİSTESİ — AI'nın tam performans için ihtiyaç duyduğu belge/bilgi/karar
// "Tahmin yürütme, dosya gelince tam rakam çıkar" ilkesi.
// ============================================================================

export type IstekDurum = 'bekliyor' | 'saglandi' | 'gereksiz';

export interface IstekKalemi {
  id: string;
  kategori: string;       // bkz. ISTEK_KATEGORILERI
  baslik: string;
  aciklama: string;       // neden gerekli + hangi TAM rakamı/kararı açar
  zorunlu?: boolean;      // tam çalışma için şart mı
  durum: IstekDurum;
  belgeId?: string;       // Foto & Belge arşivindeki dosya
  not?: string;
}

export const ISTEK_KATEGORILERI = [
  'Resmi Belgeler & Belediye',
  'Projeler (Tam Metraj İçin)',
  'Saha & Keşif',
  'Malzeme Seçimleri (Kararın)',
  'Ekip & Makine',
  'Tedarikçi & Fiyat',
] as const;

// ============================================================================
// ÖĞRENME HAFIZASI — Dersler (hata/doğru iş/genel). AI bunları sonraki
// kararlarda hatırlar (bağlama eklenir).
// ============================================================================

export type DersTur = 'hata' | 'dogru' | 'genel';

export const DERS_ETIKET: Record<DersTur, string> = {
  hata: 'Hatadan Ders', dogru: 'Doğru İş', genel: 'Genel Bilgi',
};

export interface Ders {
  id: string;
  tarih: string;          // ISO
  tur: DersTur;
  baslik: string;
  icerik: string;
  fazId?: string;
  taseronId?: string;
  kaynak: 'kullanici' | 'ai';
}

// ============================================================================
// DANIŞMA — Web araştırmalı soru-cevap (kalıcı; hiçbir soru/cevap kaybolmaz)
// ============================================================================

export interface DanismaKaynak { baslik?: string; url: string; }

export interface Danisma {
  id: string;
  tarih: string;          // ISO
  soru: string;
  cevap: string;
  kaynaklar?: DanismaKaynak[];
  model?: string;
}

// ============================================================================
// TEKLİF TOPLAMA — Firma listesi + gönderilen teklif istekleri (RFQ)
// ============================================================================

export interface Firma {
  id: string;
  ad: string;
  email: string;
  kategori?: string;       // hafriyat, demir-beton, doğrama, mermer...
  telefon?: string;
  sehir?: string;
  not?: string;
  kaynak: 'kullanici' | 'ai';
}

export interface RfqKayit {
  id: string;
  tarih: string;           // ISO
  konu: string;
  govde: string;
  kategori?: string;
  alicilar: string[];      // gönderilen e-postalar
  ekSayisi?: number;
  durum: 'gonderildi' | 'hata';
  hata?: string;
}

// ============================================================================
// GÖNDEREN PROFİLİ — Teklif maillerinin imzası
// ============================================================================
export interface GonderenProfil {
  ad: string;
  unvan: string;
  telefon?: string;
}
