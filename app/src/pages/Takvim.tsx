import { useMemo } from 'react';
import { CalendarClock, AlertTriangle, CalendarCheck2, CalendarX, Sparkles } from 'lucide-react';
import {
  startOfMonth, endOfMonth, isWithinInterval, parseISO, format, isValid,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import {
  PageHeader, Card, CardBody, Stat, EmptyState,
} from '../components/ui';
import type { IsKalemi, Faz } from '../types';
import { bugun } from '../lib/format';
import { gecikenler } from '../lib/calc';
import IsSatiri from './takvim/IsSatiri';

// ============================================================================
// TAKVİM / TERMİN — İş kalemlerinin zaman çizelgesi.
// - Üstte özet istatistikler (geciken, bu ay, tarihi yok)
// - Geciken işler (kırmızı bölüm)
// - Yaklaşan işler (aya gruplanmış timeline)
// - Tarihi atanmamış işler (buradan tarih girilebilir)
// ============================================================================

// Bir kalemin sıralama anahtarı: bitiş tarihi varsa onu, yoksa başlangıcı kullan
function sortAnahtar(k: IsKalemi): string {
  return k.bitis ?? k.baslangic ?? '9999-12-31';
}

// Bir tarihi "YYYY-MM" ay anahtarına çevirir (gruplama için)
function ayAnahtar(iso: string): string {
  const d = parseISO(iso);
  if (!isValid(d)) return '0000-00';
  return format(d, 'yyyy-MM');
}

// "YYYY-MM" → "Mart 2026" (Türkçe başlık)
function ayBaslik(anahtar: string): string {
  const [yil, ay] = anahtar.split('-').map(Number);
  if (!yil || !ay) return anahtar;
  const d = new Date(yil, ay - 1, 1);
  return format(d, 'LLLL yyyy', { locale: tr })
    .replace(/^./, (c) => c.toLocaleUpperCase('tr-TR'));
}

export default function Takvim() {
  const isKalemleri = useStore((s) => s.isKalemleri);
  const fazlar = useStore((s) => s.fazlar);
  const isKalemiGuncelle = useStore((s) => s.isKalemiGuncelle);

  const bugunIso = bugun();

  // Hızlı erişim için fazları haritaya çevir
  const fazMap = useMemo(() => {
    const m = new Map<string, Faz>();
    fazlar.forEach((f) => m.set(f.id, f));
    return m;
  }, [fazlar]);

  // --- Hesaplamalar (useMemo ile cache) ---
  const hesaplamalar = useMemo(() => {
    const geciken = gecikenler(isKalemleri, bugunIso);

    // Bu ay aralığı
    const bugunD = parseISO(bugunIso);
    const ayBas = startOfMonth(bugunD);
    const ayBitis = endOfMonth(bugunD);

    // Bu ay biten veya başlayan iş sayısı
    const buAyEtkin = isKalemleri.filter((k) => {
      const tarihler = [k.baslangic, k.bitis].filter(Boolean) as string[];
      return tarihler.some((t) => {
        const d = parseISO(t);
        return isValid(d) && isWithinInterval(d, { start: ayBas, end: ayBitis });
      });
    });

    // Tarihi atanmamış: hem başlangıç hem bitiş yok
    const tarihiYok = isKalemleri.filter((k) => !k.baslangic && !k.bitis);

    // Yaklaşan: tarihi var ve geciken değil; sıralı
    const gecikenIds = new Set(geciken.map((k) => k.id));
    const yaklasan = isKalemleri
      .filter((k) => (k.baslangic || k.bitis) && !gecikenIds.has(k.id))
      .sort((a, b) => sortAnahtar(a).localeCompare(sortAnahtar(b)));

    // Yaklaşanları aya grupla
    const aylar = new Map<string, IsKalemi[]>();
    yaklasan.forEach((k) => {
      const anahtar = ayAnahtar(sortAnahtar(k));
      if (!aylar.has(anahtar)) aylar.set(anahtar, []);
      aylar.get(anahtar)!.push(k);
    });
    // Anahtarları sırala
    const ayListesi = Array.from(aylar.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    return { geciken, buAyEtkin, tarihiYok, ayListesi };
  }, [isKalemleri, bugunIso]);

  // Satırlardaki tarih değişikliğini store'a yansıt
  const tarihDegis = (id: string, patch: { baslangic?: string; bitis?: string }) => {
    isKalemiGuncelle(id, patch);
  };

  return (
    <>
      <PageHeader
        baslik="Takvim / Termin"
        aciklama="İş başlangıç/bitiş tarihleri ve gecikme uyarıları"
      />

      {/* Üst özet istatistikleri */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Stat
          baslik="Geciken İş"
          deger={hesaplamalar.geciken.length}
          alt="Bitiş tarihi geçmiş, tamamlanmadı"
          ikon={<AlertTriangle size={20} />}
          tone="kirmizi"
        />
        <Stat
          baslik="Bu Ay Etkin"
          deger={hesaplamalar.buAyEtkin.length}
          alt="Bu ay başlayan veya biten"
          ikon={<CalendarCheck2 size={20} />}
          tone="mavi"
        />
        <Stat
          baslik="Tarihi Yok"
          deger={hesaplamalar.tarihiYok.length}
          alt="Henüz tarih atanmamış"
          ikon={<CalendarX size={20} />}
          tone="amber"
        />
      </div>

      {/* Geciken işler bölümü */}
      <Card className="mb-6">
        <CardBody>
          <h2 className="font-semibold text-metin mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" />
            Geciken İşler
            {hesaplamalar.geciken.length > 0 && (
              <span className="ml-1 text-sm text-red-600">({hesaplamalar.geciken.length})</span>
            )}
          </h2>

          {hesaplamalar.geciken.length === 0 ? (
            <EmptyState
              ikon={<Sparkles size={28} />}
              baslik="Harika! Gecikme yok."
              aciklama="Tüm işler termin tarihine uygun ilerliyor."
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {hesaplamalar.geciken.map((k) => (
                <IsSatiri
                  key={k.id}
                  kalem={k}
                  faz={fazMap.get(k.fazId)}
                  bugunIso={bugunIso}
                  onTarihDegis={tarihDegis}
                  vurgu="geciken"
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Yaklaşan işler — aylara grupla */}
      <Card className="mb-6">
        <CardBody>
          <h2 className="font-semibold text-metin mb-4 flex items-center gap-2">
            <CalendarClock size={18} className="text-marka-600" />
            Yaklaşan İşler
          </h2>

          {hesaplamalar.ayListesi.length === 0 ? (
            <EmptyState
              ikon={<CalendarClock size={28} />}
              baslik="Henüz planlanmış iş yok"
              aciklama="Aşağıdaki 'Tarihi Atanmamış' kalemlere tarih ekleyerek planlamaya başla."
            />
          ) : (
            <div className="space-y-6">
              {hesaplamalar.ayListesi.map(([anahtar, kalemler]) => (
                <div key={anahtar}>
                  {/* Ay başlığı */}
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-semibold text-metin text-sm uppercase tracking-wide">
                      {ayBaslik(anahtar)}
                    </h3>
                    <span className="text-xs text-metin-yum">{kalemler.length} iş</span>
                    <div className="flex-1 h-px bg-cizgi" />
                  </div>
                  {/* Aya ait kalemler */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    {kalemler.map((k) => (
                      <IsSatiri
                        key={k.id}
                        kalem={k}
                        faz={fazMap.get(k.fazId)}
                        bugunIso={bugunIso}
                        onTarihDegis={tarihDegis}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Tarihi atanmamış işler */}
      <Card>
        <CardBody>
          <h2 className="font-semibold text-metin mb-1 flex items-center gap-2">
            <CalendarX size={18} className="text-metin-yum" />
            Tarihi Atanmamış
            {hesaplamalar.tarihiYok.length > 0 && (
              <span className="ml-1 text-sm text-metin-yum">({hesaplamalar.tarihiYok.length})</span>
            )}
          </h2>
          <p className="text-sm text-metin-yum mb-4">
            Aşağıdaki kalemlere tarih girersen otomatik olarak takvime düşer.
          </p>

          {hesaplamalar.tarihiYok.length === 0 ? (
            <EmptyState
              ikon={<CalendarCheck2 size={28} />}
              baslik="Tüm işler planlandı"
              aciklama="Her kaleme tarih atanmış durumda."
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {hesaplamalar.tarihiYok.map((k) => (
                <IsSatiri
                  key={k.id}
                  kalem={k}
                  faz={fazMap.get(k.fazId)}
                  bugunIso={bugunIso}
                  onTarihDegis={tarihDegis}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
