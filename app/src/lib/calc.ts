import type { IsKalemi, Odeme, Teklif } from '../types';

// Bir iş kaleminin planlanan bütçesi: elle girilmişse onu, yoksa metraj*birimFiyat
export function kalemPlanlanan(k: IsKalemi): number {
  if (k.planlananButce && k.planlananButce > 0) return k.planlananButce;
  if (k.metraj && k.birimFiyat) return k.metraj * k.birimFiyat;
  return 0;
}

export function kalemGerceklesen(k: IsKalemi): number {
  return k.gerceklesen ?? 0;
}

// Toplam planlanan / gerçekleşen
export function toplamPlanlanan(kalemler: IsKalemi[]): number {
  return kalemler.reduce((t, k) => t + kalemPlanlanan(k), 0);
}
export function toplamGerceklesen(kalemler: IsKalemi[]): number {
  return kalemler.reduce((t, k) => t + kalemGerceklesen(k), 0);
}

// Genel ilerleme (% — iş kalemlerinin ortalaması)
export function genelIlerleme(kalemler: IsKalemi[]): number {
  if (kalemler.length === 0) return 0;
  return kalemler.reduce((t, k) => t + (k.ilerleme || 0), 0) / kalemler.length;
}

// Faz bazında özet
export interface FazOzet {
  toplam: number;
  tamamlanan: number;
  ilerleme: number;
  planlanan: number;
  gerceklesen: number;
}
export function fazOzet(kalemler: IsKalemi[]): FazOzet {
  const toplam = kalemler.length;
  const tamamlanan = kalemler.filter((k) => k.durum === 'tamamlandi').length;
  return {
    toplam,
    tamamlanan,
    ilerleme: genelIlerleme(kalemler),
    planlanan: toplamPlanlanan(kalemler),
    gerceklesen: toplamGerceklesen(kalemler),
  };
}

// Bir taşerona yapılan toplam ödeme
export function taseronOdemeToplam(odemeler: Odeme[], taseronId: string): number {
  return odemeler.filter((o) => o.taseronId === taseronId).reduce((t, o) => t + o.tutar, 0);
}

// Bir iş kalemi için en uygun (en düşük) teklif
export function enUygunTeklif(teklifler: Teklif[]): Teklif | undefined {
  if (teklifler.length === 0) return undefined;
  return [...teklifler].sort((a, b) => a.tutar - b.tutar)[0];
}

// Geciken işler (bitiş tarihi geçmiş ama tamamlanmamış)
export function gecikenler(kalemler: IsKalemi[], bugunIso: string): IsKalemi[] {
  return kalemler.filter((k) => k.bitis && k.bitis < bugunIso && k.durum !== 'tamamlandi');
}
