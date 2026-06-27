import { useEffect, useState } from 'react';
import { Banknote, Loader2, RefreshCw, FileDown, Sparkles, TrendingDown, Wallet, PieChart } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button } from '../components/ui';
import { tl, usd } from '../lib/format';
import { toplamPlanlanan } from '../lib/calc';
import { pdfUret } from '../lib/pdf';
import { projeBaglami } from '../lib/aiBaglam';

export default function NakitAkisi() {
  const { isKalemleri, odemeler, sarfiyatlar, harcamalar, maliyetRaporu, usdKur, dosyalariYenile } = useStore();
  const [d, setD] = useState('');
  const [yuk, setYuk] = useState(false);
  const [pdfYap, setPdfYap] = useState(false);
  useEffect(() => { dosyalariYenile(); }, [dosyalariYenile]);

  // Planlanan bütçe: maliyet raporu (orta) varsa onu, yoksa iş kalemleri planlanan toplamı
  const planlanan = maliyetRaporu?.senaryolar?.orta || toplamPlanlanan(isKalemleri) || 0;
  const odemeT = odemeler.reduce((t, o) => t + (o.tutar || 0), 0);
  const sarfT = sarfiyatlar.reduce((t, x) => t + (x.tutar || (x.miktar * (x.birimFiyat || 0))), 0);
  const harcamaT = harcamalar.reduce((t, h) => t + (h.tutar || 0), 0);
  const gercek = odemeT + sarfT + harcamaT;
  const kalan = planlanan - gercek;
  const yuzde = planlanan > 0 ? Math.round((gercek / planlanan) * 100) : 0;

  // Kategori bazında (harcamalar + sarfiyat)
  const kategoriler: Record<string, number> = {};
  harcamalar.forEach((h) => { const k = h.kategori || 'Diğer'; kategoriler[k] = (kategoriler[k] || 0) + (h.tutar || 0); });
  sarfiyatlar.forEach((x) => { const k = x.malzeme || 'Malzeme'; kategoriler[k] = (kategoriler[k] || 0) + (x.tutar || x.miktar * (x.birimFiyat || 0)); });
  const katListe = Object.entries(kategoriler).sort((a, b) => b[1] - a[1]);
  const enYuksek = katListe[0]?.[1] || 1;

  const degerlendir = async () => {
    setYuk(true);
    try {
      const ek = `NAKİT AKIŞI / BÜTÇE:\nPlanlanan bütçe: ${tl(planlanan)}\nGerçek harcama: ${tl(gercek)} (ödemeler ${tl(odemeT)} + malzeme ${tl(sarfT)} + faturalar ${tl(harcamaT)})\nKalan bütçe: ${tl(kalan)} (kullanım %${yuzde})\nKategori dağılımı: ${katListe.map(([k, v]) => `${k} ${tl(v)}`).join(', ') || 'yok'}`;
      const baglam = projeBaglami(useStore.getState(), { soru: 'bütçe maliyet nakit harcama tasarruf malzeme', ek });
      const r = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baglam, mesajlar: [{ role: 'user', icerik: 'Bu nakit akışı/bütçe durumunu değerlendir: 1) Bütçe aşımı/risk var mı, 2) En çok harcanan kalemler ve uyarı, 3) Kalan bütçeyle proje biter mi tahmini, 4) Tasarruf önerileri. Sadece verilen rakamlara dayan, uydurma. Kısa, madde madde Türkçe.' }] }) });
      const j = await r.json();
      setD(r.ok ? j.cevap : 'Alınamadı: ' + (j.hata || ''));
    } catch { setD('Bağlantı hatası.'); }
    setYuk(false);
  };

  const pdfIndir = async () => {
    setPdfYap(true);
    try {
      const govde = `## Bütçe Özeti
Planlanan: ${tl(planlanan)}
Gerçek harcama: ${tl(gercek)} (kullanım %${yuzde})
Kalan bütçe: ${tl(kalan)}

Ödemeler: ${tl(odemeT)} · Malzeme: ${tl(sarfT)} · Faturalar: ${tl(harcamaT)}

## Kategori Dağılımı
${katListe.map(([k, v]) => `- ${k}: ${tl(v)}`).join('\n') || '(harcama yok)'}

${d ? '## AI Değerlendirmesi\n' + d : ''}`;
      await pdfUret('Nakit Akışı Raporu — ' + new Date().toLocaleDateString('tr-TR'), govde, 'nakit');
    } catch { alert('PDF oluşturulamadı.'); }
    setPdfYap(false);
  };

  return (
    <>
      <PageHeader baslik="Nakit Akışı" aciklama="Planlanan bütçe ↔ gerçek harcama (ödeme + malzeme + fatura); kalan para ve sapma"
        sag={<Button variant="soft" size="sm" onClick={pdfIndir} disabled={pdfYap}>{pdfYap ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} PDF</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <Card><CardBody><p className="text-xs text-metin-yum flex items-center gap-1.5"><Wallet size={13} /> Planlanan Bütçe</p><p className="text-xl font-bold text-metin mt-1">{tl(planlanan)}</p>{usdKur ? <p className="text-[11px] text-emerald-600">≈ {usd(planlanan, usdKur)}</p> : null}</CardBody></Card>
        <Card><CardBody><p className="text-xs text-metin-yum flex items-center gap-1.5"><TrendingDown size={13} /> Gerçek Harcama</p><p className="text-xl font-bold text-metin mt-1">{tl(gercek)}</p><p className="text-[11px] text-metin-yum">kullanım %{yuzde}</p></CardBody></Card>
        <Card className={kalan < 0 ? 'border-rose-300' : ''}><CardBody><p className="text-xs text-metin-yum flex items-center gap-1.5"><Banknote size={13} /> Kalan Bütçe</p><p className={`text-xl font-bold mt-1 ${kalan < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{tl(kalan)}</p>{kalan < 0 && <p className="text-[11px] text-rose-600">bütçe aşıldı!</p>}</CardBody></Card>
      </div>

      <Card className="mb-5"><CardBody>
        <div className="flex items-center justify-between text-sm mb-2"><span className="font-medium text-metin">Bütçe Kullanımı</span><span className="text-metin-yum">%{yuzde}</span></div>
        <div className="h-3 rounded-full bg-zemin overflow-hidden"><div className={`h-full rounded-full ${yuzde > 100 ? 'bg-rose-500' : yuzde > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, yuzde)}%` }} /></div>
      </CardBody></Card>

      <Card className="mb-5"><CardBody>
        <p className="font-semibold text-metin flex items-center gap-2 mb-3"><PieChart size={16} className="text-marka-500" /> Kategori Bazında Harcama</p>
        {katListe.length === 0 ? <p className="text-sm text-metin-yum">Henüz harcama yok. <b>Fatura & Harcama</b> ve <b>Saha Kaydı</b>'ndan girdikçe burada dağılım çıkar.</p> : (
          <div className="space-y-2.5">
            {katListe.map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-sm mb-1"><span className="text-metin">{k}</span><span className="text-metin-yum">{tl(v)}</span></div>
                <div className="h-2 rounded-full bg-zemin overflow-hidden"><div className="h-full rounded-full bg-marka-500" style={{ width: `${Math.round((v / enYuksek) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </CardBody></Card>

      <Card><CardBody>
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <p className="font-semibold text-metin flex items-center gap-2"><Sparkles size={16} className="text-marka-500" /> AI Bütçe Değerlendirmesi</p>
          <Button size="sm" onClick={degerlendir} disabled={yuk}>{yuk ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {d ? 'Yenile' : 'Değerlendir'}</Button>
        </div>
        {yuk && !d ? <p className="text-sm text-metin-yum flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> İnceleniyor…</p>
          : d ? <div className="rounded-xl bg-marka-50 border border-marka-100 p-4 text-sm text-marka-900 whitespace-pre-wrap leading-relaxed">{d.replace(/\*\*/g, '')}</div>
          : <p className="text-sm text-metin-yum">"Değerlendir" ile AI bütçe aşım riskini, en çok harcanan kalemleri ve tasarruf önerilerini çıkarır.</p>}
      </CardBody></Card>
    </>
  );
}
