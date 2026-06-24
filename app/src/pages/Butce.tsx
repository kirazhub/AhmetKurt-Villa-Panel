import { useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useStore } from '../store/useStore';
import {
  PageHeader, Card, CardBody, Stat, Badge, Input, TableWrap,
} from '../components/ui';
import { tl, sayi, yuzde } from '../lib/format';
import {
  toplamPlanlanan, toplamGerceklesen, kalemPlanlanan, kalemGerceklesen,
} from '../lib/calc';
import { BIRIM_ETIKET } from '../types';
import type { IsKalemi } from '../types';

// ============================================================================
// BÜTÇE / MALİYET MODÜLÜ
// Planlanan (metraj × birimFiyat) vs Gerçekleşen harcama karşılaştırması.
// Satır içi düzenleme: birimFiyat ve gerceklesen alanları anında store'a yazar.
// ============================================================================

export default function Butce() {
  const fazlar = useStore((s) => s.fazlar);
  const isKalemleri = useStore((s) => s.isKalemleri);
  const isKalemiGuncelle = useStore((s) => s.isKalemiGuncelle);

  // Üst kart toplamları (memo — büyük listede gereksiz hesaplamayı önler)
  const planlananToplam = useMemo(() => toplamPlanlanan(isKalemleri), [isKalemleri]);
  const gerceklesenToplam = useMemo(() => toplamGerceklesen(isKalemleri), [isKalemleri]);
  const fark = planlananToplam - gerceklesenToplam;
  const asim = fark < 0;

  // Faz bazında gruplama + alt toplamlar
  const fazVerileri = useMemo(() => {
    return fazlar.map((f) => {
      const kalemler = isKalemleri.filter((k) => k.fazId === f.id);
      const planlanan = kalemler.reduce((t, k) => t + kalemPlanlanan(k), 0);
      const gerceklesen = kalemler.reduce((t, k) => t + kalemGerceklesen(k), 0);
      return { faz: f, kalemler, planlanan, gerceklesen };
    });
  }, [fazlar, isKalemleri]);

  // Grafik verisi — sadece planlanan VEYA gerçekleşeni olan fazlar görünsün
  const grafikData = useMemo(() => {
    return fazVerileri
      .filter((v) => v.planlanan > 0 || v.gerceklesen > 0)
      .map((v) => ({
        ad: `F${v.faz.no}`,
        adUzun: v.faz.ad,
        Planlanan: v.planlanan,
        Gerçekleşen: v.gerceklesen,
      }));
  }, [fazVerileri]);

  return (
    <>
      <PageHeader
        baslik="Bütçe / Maliyet"
        aciklama="Planlanan vs gerçekleşen, kalem kalem"
      />

      {/* 3 üst istatistik kartı */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Stat
          baslik="Toplam Planlanan"
          deger={tl(planlananToplam)}
          alt="Tüm iş kalemlerinin metraj × birim fiyat toplamı"
          ikon={<Wallet size={20} />}
          tone="mavi"
        />
        <Stat
          baslik="Toplam Gerçekleşen"
          deger={tl(gerceklesenToplam)}
          alt="Şu ana kadar yapılan toplam harcama"
          ikon={<TrendingUp size={20} />}
          tone="amber"
        />
        <Stat
          baslik={asim ? 'Bütçe Aşımı' : 'Kalan Bütçe'}
          deger={
            <span className={asim ? 'text-red-600' : 'text-emerald-600'}>
              {tl(Math.abs(fark))}
            </span>
          }
          alt={asim ? 'Planlanandan fazla harcandı' : 'Planlanandan geriye kalan'}
          ikon={asim ? <AlertTriangle size={20} /> : <TrendingDown size={20} />}
          tone={asim ? 'kirmizi' : 'yesil'}
        />
      </div>

      {/* Faz bazında karşılaştırma grafiği */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-metin">Faz Bazında Karşılaştırma</h2>
            <Badge tone="gri">Planlanan vs Gerçekleşen</Badge>
          </div>
          {grafikData.length === 0 ? (
            <p className="text-sm text-metin-yum text-center py-10">
              Grafik için önce birim fiyat veya gerçekleşen tutar girmelisin.
            </p>
          ) : (
            <div className="w-full h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={grafikData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="ad" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => {
                      // Mobilde sığsın diye kısaltma: 1.500.000 → 1.5M
                      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                      return String(v);
                    }}
                    width={50}
                  />
                  <Tooltip
                    formatter={(v) => tl(Number(v))}
                    labelFormatter={(label, payload) => {
                      const ilk = payload?.[0];
                      return ilk?.payload?.adUzun ?? label;
                    }}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="Planlanan" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Gerçekleşen" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Faz bazında detay tablosu */}
      <Card className="mb-6">
        <CardBody className="!p-0">
          <div className="px-5 pt-5 pb-3">
            <h2 className="font-semibold text-metin">Kalem Bazında Bütçe</h2>
            <p className="text-sm text-metin-yum mt-1">
              Birim fiyat ve gerçekleşen tutarı satır içinde düzenleyebilirsin.
            </p>
          </div>

          <TableWrap>
            <table className="min-w-full text-sm">
              <thead className="bg-zemin text-metin-yum">
                <tr className="text-left">
                  <th className="px-4 py-2.5 font-medium">İş Kalemi</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">Metraj</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">Birim Fiyat</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap text-right">Planlanan</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap text-right">Gerçekleşen</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap text-right">Fark</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap text-right">Sapma</th>
                </tr>
              </thead>
              <tbody>
                {fazVerileri.map(({ faz, kalemler, planlanan, gerceklesen }) => (
                  <FazGrubu
                    key={faz.id}
                    fazNo={faz.no}
                    fazAd={faz.ad}
                    kalemler={kalemler}
                    planlanan={planlanan}
                    gerceklesen={gerceklesen}
                    onGuncelle={isKalemiGuncelle}
                  />
                ))}
              </tbody>
              {/* Genel toplam — footer */}
              <tfoot className="bg-marka-50 text-metin font-semibold border-t-2 border-marka-200">
                <tr>
                  <td className="px-4 py-3" colSpan={3}>GENEL TOPLAM</td>
                  <td className="px-4 py-3 text-right">{tl(planlananToplam)}</td>
                  <td className="px-4 py-3 text-right">{tl(gerceklesenToplam)}</td>
                  <td className={`px-4 py-3 text-right ${asim ? 'text-red-600' : 'text-emerald-600'}`}>
                    {asim ? '-' : ''}{tl(Math.abs(fark))}
                  </td>
                  <td className={`px-4 py-3 text-right ${asim ? 'text-red-600' : 'text-emerald-600'}`}>
                    {planlananToplam > 0
                      ? yuzde((Math.abs(fark) / planlananToplam) * 100)
                      : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </TableWrap>
        </CardBody>
      </Card>

      {/* Uyarı / bilgilendirme kutusu */}
      <Card>
        <CardBody className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <Info size={18} />
          </div>
          <div>
            <p className="font-medium text-metin text-sm">Maliyet hesabı hakkında</p>
            <p className="text-sm text-metin-yum mt-1 leading-relaxed">
              Resmi yaklaşık maliyet <strong>19.870.800 TL</strong> sadece harç hesabıdır;
              gerçek maliyet buradaki <strong>metraj × birim fiyat</strong> üzerinden oluşur.
              Taşeron teklifleri geldikçe birim fiyatları güncelle, gerçekleşen sütununa da
              yapılan ödemeleri yaz — fark ve sapma otomatik hesaplanır.
            </p>
          </div>
        </CardBody>
      </Card>
    </>
  );
}

// ============================================================================
// FAZ GRUBU — başlık satırı + kalem satırları + alt toplam satırı
// ============================================================================
interface FazGrubuProps {
  fazNo: number;
  fazAd: string;
  kalemler: IsKalemi[];
  planlanan: number;
  gerceklesen: number;
  onGuncelle: (id: string, patch: Partial<IsKalemi>) => void;
}

function FazGrubu({ fazNo, fazAd, kalemler, planlanan, gerceklesen, onGuncelle }: FazGrubuProps) {
  if (kalemler.length === 0) return null;
  const fark = planlanan - gerceklesen;
  const asim = fark < 0;
  const sapma = planlanan > 0 ? (Math.abs(fark) / planlanan) * 100 : 0;

  return (
    <>
      {/* Faz başlık satırı */}
      <tr className="bg-zemin/60 border-t border-cizgi">
        <td colSpan={7} className="px-4 py-2.5">
          <span className="text-xs font-semibold text-marka-700 mr-2">F{fazNo}</span>
          <span className="font-medium text-metin">{fazAd}</span>
          <span className="text-xs text-metin-yum ml-2">({kalemler.length} kalem)</span>
        </td>
      </tr>

      {/* Kalem satırları */}
      {kalemler.map((k) => (
        <KalemSatir key={k.id} kalem={k} onGuncelle={onGuncelle} />
      ))}

      {/* Faz alt toplam */}
      <tr className="bg-white border-b border-cizgi text-sm">
        <td className="px-4 py-2 text-right text-metin-yum italic" colSpan={3}>
          Faz alt toplamı
        </td>
        <td className="px-4 py-2 text-right font-semibold text-metin">{tl(planlanan)}</td>
        <td className="px-4 py-2 text-right font-semibold text-metin">{tl(gerceklesen)}</td>
        <td className={`px-4 py-2 text-right font-semibold ${asim ? 'text-red-600' : 'text-emerald-600'}`}>
          {asim ? '-' : ''}{tl(Math.abs(fark))}
        </td>
        <td className={`px-4 py-2 text-right font-semibold ${asim ? 'text-red-600' : 'text-emerald-600'}`}>
          {planlanan > 0 ? yuzde(sapma) : '—'}
        </td>
      </tr>
    </>
  );
}

// ============================================================================
// KALEM SATIRI — satır içi düzenleme (birimFiyat + gerçekleşen)
// ============================================================================
interface KalemSatirProps {
  kalem: IsKalemi;
  onGuncelle: (id: string, patch: Partial<IsKalemi>) => void;
}

function KalemSatir({ kalem, onGuncelle }: KalemSatirProps) {
  const planlanan = kalemPlanlanan(kalem);
  const gerceklesen = kalemGerceklesen(kalem);
  const fark = planlanan - gerceklesen;
  // Henüz birim fiyat girilmemişse fark/sapma anlamsız — sadece planlanan>0 ise renklendir
  const gosterFark = planlanan > 0 || gerceklesen > 0;
  const asim = fark < 0;
  const sapma = planlanan > 0 ? (Math.abs(fark) / planlanan) * 100 : 0;

  return (
    <tr className="border-t border-cizgi hover:bg-zemin/40 transition">
      <td className="px-4 py-2 text-metin">{kalem.ad}</td>
      <td className="px-4 py-2 text-metin-yum whitespace-nowrap">
        {kalem.metraj
          ? `${sayi(kalem.metraj, kalem.metraj % 1 === 0 ? 0 : 2)} ${BIRIM_ETIKET[kalem.birim]}`
          : BIRIM_ETIKET[kalem.birim]}
      </td>
      <td className="px-4 py-2">
        <Input
          type="number"
          min={0}
          step="any"
          value={kalem.birimFiyat ?? ''}
          placeholder="0"
          onChange={(e) => {
            const v = e.target.value;
            onGuncelle(kalem.id, {
              birimFiyat: v === '' ? undefined : Number(v),
            });
          }}
          className="!py-1.5 !px-2 text-right min-w-[110px]"
        />
      </td>
      <td className="px-4 py-2 text-right text-metin tabular-nums">
        {planlanan > 0 ? tl(planlanan) : '—'}
      </td>
      <td className="px-4 py-2">
        <Input
          type="number"
          min={0}
          step="any"
          value={kalem.gerceklesen ?? ''}
          placeholder="0"
          onChange={(e) => {
            const v = e.target.value;
            onGuncelle(kalem.id, {
              gerceklesen: v === '' ? undefined : Number(v),
            });
          }}
          className="!py-1.5 !px-2 text-right min-w-[110px]"
        />
      </td>
      <td className={`px-4 py-2 text-right tabular-nums ${gosterFark ? (asim ? 'text-red-600' : 'text-emerald-600') : 'text-metin-yum'}`}>
        {gosterFark ? `${asim ? '-' : ''}${tl(Math.abs(fark))}` : '—'}
      </td>
      <td className={`px-4 py-2 text-right tabular-nums ${gosterFark && planlanan > 0 ? (asim ? 'text-red-600' : 'text-emerald-600') : 'text-metin-yum'}`}>
        {gosterFark && planlanan > 0 ? yuzde(sapma) : '—'}
      </td>
    </tr>
  );
}
