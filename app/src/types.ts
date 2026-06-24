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
