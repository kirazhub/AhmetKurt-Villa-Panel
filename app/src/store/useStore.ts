import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Faz, Mahal, IsKalemi, Taseron, Teklif, Odeme, Belge, Proje, SahaGunluk, Sarfiyat } from '../types';
import { PROJE, FAZLAR, MAHALLER, IS_KALEMLERI } from '../data/seed';
import { uid } from '../lib/format';

// ============================================================================
// MERKEZİ VERİ DEPOSU
// Veriler tarayıcıda (localStorage) otomatik saklanır. Her modül bu store'u
// useStore() ile kullanır. CRUD aksiyonları aşağıdadır.
// ============================================================================

interface State {
  proje: Proje;
  fazlar: Faz[];
  mahaller: Mahal[];
  isKalemleri: IsKalemi[];
  taseronlar: Taseron[];
  teklifler: Teklif[];
  odemeler: Odeme[];
  belgeler: Belge[];
  sahaGunlukleri: SahaGunluk[];
  sarfiyatlar: Sarfiyat[];
  rehberBrifing: Record<string, string>; // rehber bölüm id -> AI brifing metni (önbellek)

  // İş kalemleri
  isKalemiEkle: (k: Omit<IsKalemi, 'id'>) => string;
  isKalemiGuncelle: (id: string, patch: Partial<IsKalemi>) => void;
  isKalemiSil: (id: string) => void;

  // Taşeronlar
  taseronEkle: (t: Omit<Taseron, 'id'>) => string;
  taseronGuncelle: (id: string, patch: Partial<Taseron>) => void;
  taseronSil: (id: string) => void;

  // Teklifler
  teklifEkle: (t: Omit<Teklif, 'id'>) => string;
  teklifGuncelle: (id: string, patch: Partial<Teklif>) => void;
  teklifSil: (id: string) => void;
  teklifSec: (id: string) => void; // aynı iş kalemindeki diğerlerini secildi=false yapar

  // Ödemeler
  odemeEkle: (o: Omit<Odeme, 'id'>) => string;
  odemeGuncelle: (id: string, patch: Partial<Odeme>) => void;
  odemeSil: (id: string) => void;

  // Belgeler
  belgeEkle: (b: Omit<Belge, 'id'>) => string;
  belgeGuncelle: (id: string, patch: Partial<Belge>) => void;
  belgeSil: (id: string) => void;

  // Saha takibi
  sahaEkle: (g: Omit<SahaGunluk, 'id'>) => string;
  sahaGuncelle: (id: string, patch: Partial<SahaGunluk>) => void;
  sahaSil: (id: string) => void;
  sarfiyatEkle: (s: Omit<Sarfiyat, 'id'>) => string;
  sarfiyatGuncelle: (id: string, patch: Partial<Sarfiyat>) => void;
  sarfiyatSil: (id: string) => void;

  // Rehber AI brifing önbelleği
  rehberBrifingKaydet: (id: string, metin: string) => void;

  // Proje künyesi
  projeGuncelle: (patch: Partial<Proje>) => void;
  // Bakım
  sifirla: () => void; // her şeyi seed'e döndürür
  disaAktar: () => string; // JSON yedek
  iceAktar: (json: string) => boolean;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      proje: PROJE,
      fazlar: FAZLAR,
      mahaller: MAHALLER,
      isKalemleri: IS_KALEMLERI,
      taseronlar: [],
      teklifler: [],
      odemeler: [],
      belgeler: [],
      sahaGunlukleri: [],
      sarfiyatlar: [],
      rehberBrifing: {},

      isKalemiEkle: (k) => {
        const id = uid('ik');
        set((s) => ({ isKalemleri: [...s.isKalemleri, { ...k, id }] }));
        return id;
      },
      isKalemiGuncelle: (id, patch) =>
        set((s) => ({ isKalemleri: s.isKalemleri.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      isKalemiSil: (id) =>
        set((s) => ({ isKalemleri: s.isKalemleri.filter((x) => x.id !== id) })),

      taseronEkle: (t) => {
        const id = uid('ts');
        set((s) => ({ taseronlar: [...s.taseronlar, { ...t, id }] }));
        return id;
      },
      taseronGuncelle: (id, patch) =>
        set((s) => ({ taseronlar: s.taseronlar.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      taseronSil: (id) =>
        set((s) => ({ taseronlar: s.taseronlar.filter((x) => x.id !== id) })),

      teklifEkle: (t) => {
        const id = uid('tk');
        set((s) => ({ teklifler: [...s.teklifler, { ...t, id }] }));
        return id;
      },
      teklifGuncelle: (id, patch) =>
        set((s) => ({ teklifler: s.teklifler.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      teklifSil: (id) =>
        set((s) => ({ teklifler: s.teklifler.filter((x) => x.id !== id) })),
      teklifSec: (id) =>
        set((s) => {
          const secilen = s.teklifler.find((x) => x.id === id);
          if (!secilen) return {};
          return {
            teklifler: s.teklifler.map((x) => {
              if (x.id === id) return { ...x, secildi: true };
              if (secilen.isKalemiId && x.isKalemiId === secilen.isKalemiId) return { ...x, secildi: false };
              return x;
            }),
          };
        }),

      odemeEkle: (o) => {
        const id = uid('od');
        set((s) => ({ odemeler: [...s.odemeler, { ...o, id }] }));
        return id;
      },
      odemeGuncelle: (id, patch) =>
        set((s) => ({ odemeler: s.odemeler.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      odemeSil: (id) =>
        set((s) => ({ odemeler: s.odemeler.filter((x) => x.id !== id) })),

      belgeEkle: (b) => {
        const id = uid('bg');
        set((s) => ({ belgeler: [...s.belgeler, { ...b, id }] }));
        return id;
      },
      belgeGuncelle: (id, patch) =>
        set((s) => ({ belgeler: s.belgeler.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      belgeSil: (id) =>
        set((s) => ({ belgeler: s.belgeler.filter((x) => x.id !== id) })),

      sahaEkle: (g) => {
        const id = uid('sg');
        set((s) => ({ sahaGunlukleri: [...s.sahaGunlukleri, { ...g, id }] }));
        return id;
      },
      sahaGuncelle: (id, patch) =>
        set((s) => ({ sahaGunlukleri: s.sahaGunlukleri.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      sahaSil: (id) =>
        set((s) => ({ sahaGunlukleri: s.sahaGunlukleri.filter((x) => x.id !== id) })),

      sarfiyatEkle: (sf) => {
        const id = uid('sf');
        const tutar = sf.miktar && sf.birimFiyat ? sf.miktar * sf.birimFiyat : sf.tutar;
        set((s) => ({ sarfiyatlar: [...s.sarfiyatlar, { ...sf, tutar, id }] }));
        return id;
      },
      sarfiyatGuncelle: (id, patch) =>
        set((s) => ({
          sarfiyatlar: s.sarfiyatlar.map((x) => {
            if (x.id !== id) return x;
            const y = { ...x, ...patch };
            if (y.miktar && y.birimFiyat) y.tutar = y.miktar * y.birimFiyat;
            return y;
          }),
        })),
      sarfiyatSil: (id) =>
        set((s) => ({ sarfiyatlar: s.sarfiyatlar.filter((x) => x.id !== id) })),

      rehberBrifingKaydet: (id, metin) =>
        set((s) => ({ rehberBrifing: { ...s.rehberBrifing, [id]: metin } })),

      projeGuncelle: (patch) => set((s) => ({ proje: { ...s.proje, ...patch } })),
      sifirla: () =>
        set({
          proje: PROJE, fazlar: FAZLAR, mahaller: MAHALLER, isKalemleri: IS_KALEMLERI,
          taseronlar: [], teklifler: [], odemeler: [], belgeler: [], sahaGunlukleri: [], sarfiyatlar: [], rehberBrifing: {},
        }),

      disaAktar: () => {
        const { proje, fazlar, mahaller, isKalemleri, taseronlar, teklifler, odemeler, belgeler, sahaGunlukleri, sarfiyatlar } = get();
        return JSON.stringify({ proje, fazlar, mahaller, isKalemleri, taseronlar, teklifler, odemeler, belgeler, sahaGunlukleri, sarfiyatlar }, null, 2);
      },
      iceAktar: (json) => {
        try {
          const d = JSON.parse(json);
          set({
            proje: d.proje ?? PROJE,
            fazlar: d.fazlar ?? FAZLAR,
            mahaller: d.mahaller ?? MAHALLER,
            isKalemleri: d.isKalemleri ?? [],
            taseronlar: d.taseronlar ?? [],
            teklifler: d.teklifler ?? [],
            odemeler: d.odemeler ?? [],
            belgeler: d.belgeler ?? [],
            sahaGunlukleri: d.sahaGunlukleri ?? [],
            sarfiyatlar: d.sarfiyatlar ?? [],
          });
          return true;
        } catch {
          return false;
        }
      },
    }),
    { name: 'ahmet-kurt-villa-panel', version: 1 },
  ),
);
