import { TrendingUp, Wallet, Receipt, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Stat, ProgressBar, Badge, EmptyState } from '../components/ui';
import { tl, yuzde, tarih, bugun } from '../lib/format';
import {
  genelIlerleme, toplamPlanlanan, toplamGerceklesen, gecikenler, fazOzet,
} from '../lib/calc';

// ============================================================================
// ÖZET / DASHBOARD — Projenin tek bakışta durumu
// 4 üst stat + faz grafiği + faz listesi + geciken işler + son ödemeler
// ============================================================================

export default function Ozet() {
  // Store'dan veriyi okuyoruz (proje, fazlar, iş kalemleri, ödemeler)
  const fazlar = useStore((s) => s.fazlar);
  const isKalemleri = useStore((s) => s.isKalemleri);
  const odemeler = useStore((s) => s.odemeler);
  const projeAd = useStore((s) => s.proje.ad);

  // Üst stat kartları için hesaplamalar
  const ilerleme = genelIlerleme(isKalemleri);
  const planlanan = toplamPlanlanan(isKalemleri);
  const gerceklesen = toplamGerceklesen(isKalemleri);
  const gecikenList = gecikenler(isKalemleri, bugun());

  // Faz bazında özet — her faz için ayrı hesap (grafik ve liste paylaşıyor)
  const fazVerileri = fazlar.map((faz) => {
    const kalemler = isKalemleri.filter((k) => k.fazId === faz.id);
    return { faz, ozet: fazOzet(kalemler) };
  });

  // Grafik için sadeleştirilmiş veri (faz no kısa etiket olur, mobilde sığsın)
  const grafikVerisi = fazVerileri.map(({ faz, ozet }) => ({
    ad: `F${faz.no}`,
    planlanan: ozet.planlanan,
    gerceklesen: ozet.gerceklesen,
  }));

  // Son 5 ödeme — tarihe göre yeniden eskiye
  const sonOdemeler = [...odemeler]
    .sort((a, b) => (a.tarih < b.tarih ? 1 : a.tarih > b.tarih ? -1 : 0))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        baslik="Özet"
        aciklama={`${projeAd} — projenin genel durumu`}
      />

      {/* Üst sıra — 4 stat kartı, mobilde 1, sm'de 2, lg'de 4 sütun */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat
          baslik="Genel İlerleme"
          deger={yuzde(ilerleme)}
          alt={<div className="mt-2"><ProgressBar value={ilerleme} /></div>}
          ikon={<TrendingUp size={20} />}
          tone="mavi"
        />
        <Stat
          baslik="Planlanan Bütçe"
          deger={tl(planlanan)}
          alt="Toplam (iş kalemleri)"
          ikon={<Wallet size={20} />}
          tone="amber"
        />
        <Stat
          baslik="Gerçekleşen Harcama"
          deger={tl(gerceklesen)}
          alt={planlanan > 0 ? `Planlananın ${yuzde((gerceklesen / planlanan) * 100)}'i` : '—'}
          ikon={<Receipt size={20} />}
          tone="yesil"
        />
        <Stat
          baslik="Geciken İş Sayısı"
          deger={gecikenList.length}
          alt={gecikenList.length > 0 ? 'Bitiş tarihi geçti' : 'Gecikme yok'}
          ikon={<AlertTriangle size={20} />}
          tone={gecikenList.length > 0 ? 'kirmizi' : 'yesil'}
        />
      </div>

      {/* Faz bazında Planlanan vs Gerçekleşen grafiği */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-metin">Fazlara Göre Bütçe</h2>
            <Badge tone="gri">Planlanan ↔ Gerçekleşen</Badge>
          </div>
          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grafikVerisi} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="ad" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : String(v))}
                />
                <Tooltip
                  formatter={(v) => tl(Number(v))}
                  labelFormatter={(l) => `Faz ${String(l).replace('F', '')}`}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="planlanan" name="Planlanan" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="gerceklesen" name="Gerçekleşen" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* Alt blok — Fazlar listesi + sağda geciken işler & son ödemeler */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SOL — Fazlara göre ilerleme listesi */}
        <Card className="lg:col-span-2">
          <CardBody>
            <h2 className="font-semibold text-metin mb-4">Fazlara Göre İlerleme</h2>
            <div className="space-y-4">
              {fazVerileri.map(({ faz, ozet }) => (
                <div key={faz.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge tone="amber">F{faz.no}</Badge>
                      <span className="font-medium text-metin text-sm truncate">{faz.ad}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-metin-yum">
                      <span>{ozet.tamamlanan}/{ozet.toplam} iş</span>
                      <span className="font-medium text-metin">{tl(ozet.planlanan)}</span>
                      <span className="font-semibold text-marka-700 w-10 text-right">{yuzde(ozet.ilerleme)}</span>
                    </div>
                  </div>
                  <ProgressBar value={ozet.ilerleme} tone={ozet.ilerleme >= 100 ? 'yesil' : 'amber'} />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* SAĞ — Geciken işler ve son ödemeler kolonu */}
        <div className="space-y-6">
          {/* Geciken işler */}
          <Card className={gecikenList.length > 0 ? 'border-red-200 bg-red-50/30' : ''}>
            <CardBody>
              <div className="flex items-center gap-2 mb-3">
                {gecikenList.length > 0 ? (
                  <>
                    <AlertTriangle size={18} className="text-red-600" />
                    <h2 className="font-semibold text-red-700">Geciken İşler</h2>
                    <Badge tone="kirmizi">{gecikenList.length}</Badge>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <h2 className="font-semibold text-emerald-700">Gecikme Yok</h2>
                  </>
                )}
              </div>
              {gecikenList.length > 0 ? (
                <ul className="space-y-2.5">
                  {gecikenList.slice(0, 6).map((k) => (
                    <li key={k.id} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-metin truncate">{k.ad}</span>
                      <span className="text-red-600 font-medium whitespace-nowrap text-xs flex items-center gap-1">
                        <Calendar size={12} /> {tarih(k.bitis)}
                      </span>
                    </li>
                  ))}
                  {gecikenList.length > 6 && (
                    <li className="text-xs text-metin-yum pt-1">+ {gecikenList.length - 6} iş daha</li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-metin-yum">Bitiş tarihi geçen iş yok. İyi gidiyor.</p>
              )}
            </CardBody>
          </Card>

          {/* Son ödemeler */}
          <Card>
            <CardBody>
              <h2 className="font-semibold text-metin mb-3">Son Ödemeler</h2>
              {sonOdemeler.length > 0 ? (
                <ul className="divide-y divide-cizgi -my-2">
                  {sonOdemeler.map((o) => (
                    <li key={o.id} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-metin truncate">{o.aciklama}</p>
                        <p className="text-xs text-metin-yum mt-0.5">{tarih(o.tarih)} · {o.tur}</p>
                      </div>
                      <span className="text-sm font-semibold text-metin whitespace-nowrap">{tl(o.tutar)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  baslik="Henüz ödeme yok"
                  aciklama="Ödemeler eklenince son 5 tanesi burada görünür."
                />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
