import { useState, useEffect } from 'react';
import { Calculator, Loader2, Sparkles, AlertTriangle, RefreshCw, TrendingUp, Package, Info } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, EmptyState, Badge } from '../components/ui';
import { tl, usd, tarih } from '../lib/format';
import type { MaliyetVaryasyon, MaliyetKategori } from '../types';

const SENARYO = [
  { key: 'ekonomik' as const, ad: 'Ekonomik', kart: 'border-emerald-200', yazi: 'text-emerald-600', aciklama: 'Uygun fiyatlı / giriş segment' },
  { key: 'orta' as const, ad: 'Orta', kart: 'border-amber-200', yazi: 'text-amber-600', aciklama: 'Dengeli kalite-fiyat' },
  { key: 'premium' as const, ad: 'Premium', kart: 'border-rose-200', yazi: 'text-rose-600', aciklama: 'Üst segment / lüks' },
];

function topla(kategoriler: MaliyetKategori[], key: 'ekonomik' | 'orta' | 'premium') {
  return kategoriler.reduce((acc, k) => acc + (k.altToplam?.[key] ?? k.kalemler.reduce((a, kl) => a + (kl[key]?.toplam ?? 0), 0)), 0);
}

function Hucre({ v, kur }: { v?: MaliyetVaryasyon; kur?: number | null }) {
  if (!v) return <td className="px-2 py-2 text-metin-yum text-xs">—</td>;
  return (
    <td className="px-2 py-2 align-top">
      <div className="font-semibold text-metin text-sm whitespace-nowrap">{tl(v.toplam)}</div>
      {kur && v.toplam ? <div className="text-[11px] text-emerald-600 whitespace-nowrap">≈ {usd(v.toplam, kur)}</div> : null}
      <div className="text-[11px] text-metin-yum leading-tight">{[v.marka, v.urun].filter(Boolean).join(' · ')}{v.birim ? ` · ${tl(v.birim)}/br` : ''}</div>
    </td>
  );
}

export default function MaliyetRaporu() {
  const belgeler = useStore((s) => s.sunucuDosyalar);
  const dosyalariYenile = useStore((s) => s.dosyalariYenile);
  useEffect(() => { dosyalariYenile(); }, [dosyalariYenile]);
  const proje = useStore((s) => s.proje);
  const mahaller = useStore((s) => s.mahaller);
  const rapor = useStore((s) => s.maliyetRaporu);
  const kaydet = useStore((s) => s.maliyetRaporuKaydet);
  const usdKur = useStore((s) => s.usdKur);
  const usdKurTarih = useStore((s) => s.usdKurTarih);

  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  const specli = belgeler.filter((b) => b.spec);

  const olustur = async () => {
    setYukleniyor(true); setHata('');
    try {
      const specler = specli.map((b) => `### ${b.ad}\n${b.spec}`).join('\n\n').slice(0, 24000);
      const baglam = `Mahaller: ${mahaller.map((m) => m.ad).join(', ') || '—'}. Teknik spec çıkarılmış belge sayısı: ${specli.length}.`;
      const r = await fetch('/api/ai/maliyet-raporu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ specler, proje: JSON.stringify(proje), baglam }) });
      const d = await r.json();
      if (r.ok && d.rapor) kaydet({ ...d.rapor, tarih: new Date().toISOString(), kaynakSayisi: specli.length });
      else setHata(d.hata || 'Rapor üretilemedi');
    } catch { setHata('Bağlantı hatası'); }
    setYukleniyor(false);
  };

  const kategoriler = rapor?.kategoriler ?? [];
  const toplamlar = { ekonomik: topla(kategoriler, 'ekonomik'), orta: topla(kategoriler, 'orta'), premium: topla(kategoriler, 'premium') };

  return (
    <>
      <PageHeader
        baslik="Maliyet Raporu"
        aciklama="Teknik specler + proje verisinden AI'nın çıkardığı 3 senaryolu (ekonomik / orta / premium) malzeme ve fiyat tahmini"
        sag={<Button onClick={olustur} disabled={yukleniyor}>{yukleniyor ? <Loader2 size={16} className="animate-spin" /> : rapor ? <RefreshCw size={16} /> : <Calculator size={16} />} {rapor ? 'Yeniden oluştur' : 'Rapor oluştur'}</Button>}
      />

      {yukleniyor && <Card className="mb-5"><CardBody className="flex items-center gap-2 text-metin-yum text-sm"><Loader2 size={16} className="animate-spin" /> AI tüm teknik verileri okuyup malzeme listesini ve fiyatları hesaplıyor… (1-3 dk sürebilir, sayfada kal)</CardBody></Card>}
      {hata && <Card className="mb-5"><CardBody className="flex items-center gap-2 text-rose-600 text-sm"><AlertTriangle size={16} /> {hata}</CardBody></Card>}

      {!rapor && !yukleniyor && (
        <Card><EmptyState
          ikon={<Calculator size={28} />}
          baslik="Henüz maliyet raporu yok"
          aciklama={specli.length > 0
            ? `${specli.length} belgeden teknik veri hazır. "Rapor oluştur"a bas — AI elektrik, mekanik, kaba yapı, ince işler dahil tüm malzemeleri 3 fiyat segmentinde listelesin.`
            : 'Önce Foto & Belge\'den plan/çizim yükle (otomatik teknik spec çıkar), sonra burada rapor oluştur. Veri olmasa bile proje büyüklüğünden tahmini rapor üretebilir.'}
          aksiyon={<Button onClick={olustur}><Calculator size={16} /> Rapor oluştur</Button>}
        /></Card>
      )}

      {rapor && (
        <div className="space-y-6">
          {/* Senaryo kartları */}
          <div className="grid sm:grid-cols-3 gap-3">
            {SENARYO.map((s) => (
              <Card key={s.key} className={s.kart}>
                <CardBody>
                  <p className={`text-xs font-medium ${s.yazi} flex items-center gap-1.5`}><TrendingUp size={13} /> {s.ad}</p>
                  <p className="text-2xl font-bold text-metin mt-1 leading-tight">{tl(rapor.senaryolar?.[s.key] ?? toplamlar[s.key])}</p>
                  {usdKur && <p className="text-xs text-emerald-600 font-medium">≈ {usd(rapor.senaryolar?.[s.key] ?? toplamlar[s.key], usdKur)}</p>}
                  <p className="text-[11px] text-metin-yum mt-0.5">{s.aciklama}</p>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Özet */}
          {rapor.ozet && <Card><CardBody className="flex gap-3"><Sparkles size={16} className="text-marka-500 shrink-0 mt-0.5" /><p className="text-sm text-metin leading-relaxed">{rapor.ozet}</p></CardBody></Card>}

          <p className="text-xs text-metin-yum flex items-center gap-1.5 flex-wrap"><Info size={12} /> {tarih(rapor.tarih)} tarihli · {rapor.kaynakSayisi ?? 0} belge dikkate alındı · Fiyatlar TAHMİNİDİR, kesin teklif firmadan alınır.{usdKur ? ` · 💵 1 $ = ₺${usdKur.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}${usdKurTarih ? ' (' + usdKurTarih + ')' : ''}` : ''}</p>

          {/* Kategoriler */}
          {kategoriler.map((kat, i) => (
            <Card key={i}>
              <CardBody>
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h3 className="font-semibold text-metin flex items-center gap-2"><Package size={16} className="text-marka-500" /> {kat.ad}</h3>
                  <div className="flex gap-1.5 text-xs">
                    <Badge tone="gri">Eko {tl(kat.altToplam?.ekonomik ?? kat.kalemler.reduce((a, k) => a + (k.ekonomik?.toplam ?? 0), 0))}</Badge>
                    <Badge tone="amber">Orta {tl(kat.altToplam?.orta ?? kat.kalemler.reduce((a, k) => a + (k.orta?.toplam ?? 0), 0))}</Badge>
                    <Badge tone="gri">Premium {tl(kat.altToplam?.premium ?? kat.kalemler.reduce((a, k) => a + (k.premium?.toplam ?? 0), 0))}</Badge>
                  </div>
                </div>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="text-left text-xs text-metin-yum border-b border-cizgi">
                        <th className="px-2 py-2 font-medium">Malzeme</th>
                        <th className="px-2 py-2 font-medium">Miktar</th>
                        <th className="px-2 py-2 font-medium text-emerald-600">Ekonomik</th>
                        <th className="px-2 py-2 font-medium text-amber-600">Orta</th>
                        <th className="px-2 py-2 font-medium text-rose-600">Premium</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cizgi/60">
                      {kat.kalemler.map((k, j) => (
                        <tr key={j}>
                          <td className="px-2 py-2 align-top">
                            <div className="font-medium text-metin">{k.malzeme}</div>
                            {k.not && <div className="text-[11px] text-metin-yum">{k.not}</div>}
                          </td>
                          <td className="px-2 py-2 align-top text-metin-yum whitespace-nowrap">{k.miktar || '—'}</td>
                          <Hucre v={k.ekonomik} kur={usdKur} />
                          <Hucre v={k.orta} kur={usdKur} />
                          <Hucre v={k.premium} kur={usdKur} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          ))}

          {/* Uyarılar */}
          {rapor.uyarilar && rapor.uyarilar.length > 0 && (
            <Card><CardBody>
              <h3 className="font-semibold text-metin flex items-center gap-2 mb-2"><AlertTriangle size={16} className="text-amber-500" /> Uyarılar & Notlar</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-metin">{rapor.uyarilar.map((u, i) => <li key={i}>{u}</li>)}</ul>
            </CardBody></Card>
          )}

          <p className="text-xs text-metin-yum">Bu rapor AI tahminidir; piyasa, kur ve ürün seçimine göre değişir. Yeni belge yükledikçe "Yeniden oluştur" ile güncelle. Kesin fiyat için Teklif Toplama / WhatsApp'tan firmalardan teklif al.</p>
        </div>
      )}
    </>
  );
}
