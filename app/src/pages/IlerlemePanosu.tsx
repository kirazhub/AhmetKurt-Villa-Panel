import { useEffect, useState } from 'react';
import { Activity, Loader2, RefreshCw, AlertTriangle, TrendingUp, Wallet, ListChecks, FileDown, Sparkles, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, Badge } from '../components/ui';
import { tl, bugun, tarih } from '../lib/format';
import { toplamPlanlanan, toplamGerceklesen, genelIlerleme, fazOzet, gecikenler } from '../lib/calc';
import { pdfUret } from '../lib/pdf';
import { projeBaglami } from '../lib/aiBaglam';

export default function IlerlemePanosu() {
  const { fazlar, isKalemleri, odemeler, dosyalariYenile } = useStore();
  const [degerlendirme, setDegerlendirme] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [pdfYap, setPdfYap] = useState(false);
  useEffect(() => { dosyalariYenile(); }, [dosyalariYenile]);

  const plan = toplamPlanlanan(isKalemleri);
  const ger = toplamGerceklesen(isKalemleri);
  const ilerleme = Math.round(genelIlerleme(isKalemleri));
  const geciken = gecikenler(isKalemleri, bugun());
  const odenen = odemeler.reduce((t, o) => t + o.tutar, 0);
  const bitenIs = isKalemleri.filter((k) => k.durum === 'tamamlandi').length;

  const fazlarOzet = fazlar.map((f) => ({ faz: f, oz: fazOzet(isKalemleri.filter((k) => k.fazId === f.id)) })).filter((x) => x.oz.toplam > 0);

  const degerlendir = async () => {
    setYukleniyor(true);
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baglam: projeBaglami(useStore.getState(), { soru: 'ilerleme faz kapsam imalat sıradaki aşama' }),
          mesajlar: [{ role: 'user', icerik: 'Yukarıdaki ilerleme verisine göre bir İLERLEME DEĞERLENDİRME RAPORU yaz: 1) Genel durum özeti, 2) Hangi fazdayız ve sıradaki kritik adım, 3) Geciken/risk taşıyan işler ve ne yapılmalı, 4) Bütçe-ilerleme uyumu (sapma var mı), 5) Bu hafta odaklanılacak 3 madde. Sadece panel verisine dayan, uydurma. Net, madde madde Türkçe.' }],
        }),
      });
      const d = await r.json();
      setDegerlendirme(r.ok ? d.cevap : 'Değerlendirme alınamadı: ' + (d.hata || ''));
    } catch { setDegerlendirme('Bağlantı hatası.'); }
    setYukleniyor(false);
  };

  const pdfIndir = async () => {
    setPdfYap(true);
    try {
      const govde = `## Genel Durum
Genel ilerleme: %${ilerleme} (${bitenIs}/${isKalemleri.length} iş tamamlandı)
Planlanan bütçe: ${tl(plan)}
Gerçekleşen: ${tl(ger)} · Ödenen: ${tl(odenen)}
Geciken iş: ${geciken.length}

## Faz Durumları
${fazlarOzet.map((x) => `- ${x.faz.ad}: %${Math.round(x.oz.ilerleme)} (${x.oz.tamamlanan}/${x.oz.toplam} iş) — planlanan ${tl(x.oz.planlanan)}, gerçekleşen ${tl(x.oz.gerceklesen)}`).join('\n') || '(iş kalemi yok)'}

${geciken.length ? '## Geciken İşler\n' + geciken.map((g) => `- ${g.ad} (bitiş: ${tarih(g.bitis)})`).join('\n') : ''}

${degerlendirme ? '## AI Değerlendirmesi\n' + degerlendirme : ''}`;
      await pdfUret('İlerleme Raporu — ' + new Date().toLocaleDateString('tr-TR'), govde, 'ilerleme');
    } catch { alert('PDF oluşturulamadı.'); }
    setPdfYap(false);
  };

  const renkSinif = (y: number) => y >= 80 ? 'bg-emerald-500' : y >= 40 ? 'bg-marka-500' : 'bg-amber-500';

  return (
    <>
      <PageHeader baslik="İlerleme Panosu" aciklama="Projenin gerçek durumu: faz faz ilerleme, gecikme ve bütçe uyumu"
        sag={<Button variant="soft" size="sm" onClick={pdfIndir} disabled={pdfYap}>{pdfYap ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} PDF</Button>} />

      {/* Üst kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Card><CardBody><p className="text-xs text-metin-yum flex items-center gap-1.5"><TrendingUp size={13} /> Genel İlerleme</p><p className="text-2xl font-bold text-metin mt-1">%{ilerleme}</p><p className="text-[11px] text-metin-yum">{bitenIs}/{isKalemleri.length} iş bitti</p></CardBody></Card>
        <Card><CardBody><p className="text-xs text-metin-yum flex items-center gap-1.5"><Wallet size={13} /> Bütçe (gerçek/plan)</p><p className="text-2xl font-bold text-metin mt-1">{tl(ger)}</p><p className="text-[11px] text-metin-yum">plan {tl(plan)}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs text-metin-yum flex items-center gap-1.5"><CheckCircle2 size={13} /> Ödenen</p><p className="text-2xl font-bold text-metin mt-1">{tl(odenen)}</p><p className="text-[11px] text-metin-yum">{odemeler.length} ödeme</p></CardBody></Card>
        <Card className={geciken.length ? 'border-amber-300' : ''}><CardBody><p className="text-xs text-metin-yum flex items-center gap-1.5"><AlertTriangle size={13} /> Geciken İş</p><p className={`text-2xl font-bold mt-1 ${geciken.length ? 'text-amber-600' : 'text-metin'}`}>{geciken.length}</p><p className="text-[11px] text-metin-yum">bitiş tarihi geçti</p></CardBody></Card>
      </div>

      {/* Faz ilerleme çubukları */}
      <Card className="mb-5"><CardBody>
        <p className="font-semibold text-metin flex items-center gap-2 mb-3"><ListChecks size={16} className="text-marka-500" /> Faz Faz İlerleme</p>
        {fazlarOzet.length === 0 ? (
          <p className="text-sm text-metin-yum">Henüz iş kalemi girilmemiş. <b>İş Takibi</b> sayfasından fazlara iş ekledikçe burada gerçek ilerleme görünür.</p>
        ) : (
          <div className="space-y-3">
            {fazlarOzet.map((x) => {
              const y = Math.round(x.oz.ilerleme);
              return (
                <div key={x.faz.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-metin">{x.faz.ad}</span>
                    <span className="text-metin-yum text-xs">%{y} · {x.oz.tamamlanan}/{x.oz.toplam} iş</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-zemin overflow-hidden"><div className={`h-full rounded-full ${renkSinif(y)}`} style={{ width: `${y}%` }} /></div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody></Card>

      {/* Geciken işler */}
      {geciken.length > 0 && (
        <Card className="mb-5"><CardBody>
          <p className="font-semibold text-metin flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-amber-500" /> Geciken İşler ({geciken.length})</p>
          <div className="divide-y divide-cizgi">
            {geciken.map((g) => (
              <div key={g.id} className="py-2 flex items-center justify-between gap-2">
                <span className="text-sm text-metin">{g.ad}</span>
                <Badge tone="kirmizi">bitiş {tarih(g.bitis)}</Badge>
              </div>
            ))}
          </div>
        </CardBody></Card>
      )}

      {/* AI Değerlendirme */}
      <Card><CardBody>
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <p className="font-semibold text-metin flex items-center gap-2"><Sparkles size={16} className="text-marka-500" /> AI İlerleme Değerlendirmesi</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={degerlendir} disabled={yukleniyor}>{yukleniyor ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {degerlendirme ? 'Yenile' : 'Değerlendir'}</Button>
            {degerlendirme && <Button size="sm" variant="soft" onClick={pdfIndir} disabled={pdfYap}>{pdfYap ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} PDF</Button>}
          </div>
        </div>
        {yukleniyor && !degerlendirme ? <p className="text-sm text-metin-yum flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Panel inceleniyor…</p>
          : degerlendirme ? <div className="rounded-xl bg-marka-50 border border-marka-100 p-4 text-sm text-marka-900 whitespace-pre-wrap leading-relaxed">{degerlendirme.replace(/\*\*/g, '')}</div>
          : <p className="text-sm text-metin-yum">"Değerlendir" ile AI, ilerleme + bütçe + gecikme durumunu yorumlayıp bu hafta odaklanman gerekenleri çıkarır.</p>}
      </CardBody></Card>

      <p className="mt-4 text-xs text-metin-yum"><Activity size={12} className="inline" /> Veriler İş Takibi, Bütçe ve Ödeme sayfalarından gelir; oraları güncel tuttukça pano gerçeği yansıtır.</p>
    </>
  );
}
