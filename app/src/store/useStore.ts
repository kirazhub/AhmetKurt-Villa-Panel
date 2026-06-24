import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Faz, Mahal, IsKalemi, Taseron, Teklif, Odeme, Belge, Proje, IceAktarPaket } from '../types';
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
  belgeBaglari: Record<string, { fazId?: string; isKalemiId?: string }>; // manifest dosyaId -> bağlantı

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

  // Manifest dosyalarını faz/iş kalemine bağlama (disk yerine store'da tutulur)
  belgeBagla: (dosyaId: string, patch: { fazId?: string; isKalemiId?: string }) => void;

  // Proje künyesi
  projeGuncelle: (patch: Partial<Proje>) => void;

  // Bakım
  sifirla: () => void; // her şeyi seed'e döndürür
  disaAktar: () => string; // JSON yedek
  iceAktar: (json: string) => boolean;

  // AI içe-aktarma (additive — üstüne YAZMAZ, sadece ekler)
  iceAktarPaket: (p: IceAktarPaket) => { eklenenIs: number; eklenenTeklif: number; eklenenTaseron: number };
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
      belgeBaglari: {},

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

      belgeBagla: (dosyaId, patch) =>
        set((s) => ({ belgeBaglari: { ...s.belgeBaglari, [dosyaId]: { ...s.belgeBaglari[dosyaId], ...patch } } })),

      projeGuncelle: (patch) => set((s) => ({ proje: { ...s.proje, ...patch } })),

      sifirla: () =>
        set({
          proje: PROJE, fazlar: FAZLAR, mahaller: MAHALLER, isKalemleri: IS_KALEMLERI,
          taseronlar: [], teklifler: [], odemeler: [], belgeler: [], belgeBaglari: {},
        }),

      disaAktar: () => {
        const { proje, fazlar, mahaller, isKalemleri, taseronlar, teklifler, odemeler, belgeler } = get();
        return JSON.stringify({ proje, fazlar, mahaller, isKalemleri, taseronlar, teklifler, odemeler, belgeler }, null, 2);
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
          });
          return true;
        } catch {
          return false;
        }
      },

      iceAktarPaket: (p) => {
        const yeniIs = (p.isKalemleri ?? []).map((k) => ({ ...k, id: uid('ik') }));
        const yeniTeklif = (p.teklifler ?? []).map((t) => ({ ...t, id: uid('tk') }));
        const yeniTaseron = (p.taseronlar ?? []).map((t) => ({ ...t, id: uid('ts') }));
        set((s) => ({
          isKalemleri: [...s.isKalemleri, ...yeniIs],
          teklifler: [...s.teklifler, ...yeniTeklif],
          taseronlar: [...s.taseronlar, ...yeniTaseron],
        }));
        return { eklenenIs: yeniIs.length, eklenenTeklif: yeniTeklif.length, eklenenTaseron: yeniTaseron.length };
      },
    }),
    { name: 'ahmet-kurt-villa-panel', version: 1 },
  ),
);
