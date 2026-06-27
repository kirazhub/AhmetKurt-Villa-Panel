import { useState } from 'react';
import { Receipt, Loader2, RefreshCw, FileDown, Sparkles, Plus, HardHat, Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, Field, Input, Select } from '../components/ui';
import { tl, bugun } from '../lib/format';
import { kalemPlanlanan, taseronOdemeToplam } from '../lib/calc';
import { pdfUret } from '../lib/pdf';

export default function Hakedis() {
  const { taseronlar, isKalemleri, odemeler, odemeEkle } = useStore();
  const [degerlendirme, setDegerlendirme] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [pdfYap, setPdfYap] = useState(false);
  const [odemeForm, setOdemeForm] = useState<{ taseronId: string; tutar: string; tur: 'avans' | 'hakedis' | 'kesin' } | null>(null);

  // Taşeron bazında hakediş: hak edilen = Σ(iş planlanan × ilerleme%); ödenen; kalan
  const satirlar = taseronlar.map((t) => {
    const isler = isKalemleri.filter((k) => k.taseronId === t.id);
    const hakEdilen = isler.reduce((s, k) => s + kalemPlanlanan(k) * (k.ilerleme || 0) / 100, 0);
    const sozlesme = isler.reduce((s, k) => s + kalemPlanlanan(k), 0);
    const odenen = taseronOdemeToplam(odemeler, t.id);
    return { t, isSayisi: isler.length, sozlesme, hakEdilen, odenen, kalan: hakEdilen - odenen };
  }).filter((x) => x.isSayisi > 0 || x.odenen > 0);

  const toplamHak = satirlar.reduce((s, x) => s + x.hakEdilen, 0);
  const toplamOdenen = satirlar.reduce((s, x) => s + x.odenen, 0);
  const toplamKalan = toplamHak - toplamOdenen;

  const odemeKaydet = () => {
    if (!odemeForm || !odemeForm.taseronId || !odemeForm.tutar) return;
    const t = taseronlar.find((x) => x.id === odemeForm.taseronId);
    odemeEkle({ taseronId: odemeForm.taseronId, taseronAdi: t?.ad, aciklama: `${odemeForm.tur} ödemesi`, tutar: Number(odemeForm.tutar), tarih: bugun(), tur: odemeForm.tur });
    setOdemeForm(null);
  };

  const degerlendir = async () => {
    setYukleniyor(true);
    try {
      const baglam = `HAKEDİŞ DURUMU (taşeron bazında):\n${satirlar.map((x) => `- ${x.t.ad} (${x.t.uzmanlik}): sözleşme ${tl(x.sozlesme)}, hak edilen ${tl(x.hakEdilen)}, ödenen ${tl(x.odenen)}, kalan ${tl(x.kalan)}`).join('\n')}\nTOPLAM: hak edilen ${tl(toplamHak)}, ödenen ${tl(toplamOdenen)}, kalan ${tl(toplamKalan)}`;
      const r = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baglam, mesajlar: [{ role: 'user', icerik: 'Bu hakediş tablosunu değerlendir: 1) Hangi taşerona ne kadar ödeme borcu var (öncelik sırası), 2) Fazla/erken ödeme yapılmış taşeron var mı (risk), 3) Nakit planlaması için öneri. Sadece verilen tabloya dayan, uydurma. Kısa, madde madde Türkçe.' }] }),
      });
      const d = await r.json();
      setDegerlendirme(r.ok ? d.cevap : 'Alınamadı: ' + (d.hata || ''));
    } catch { setDegerlendirme('Bağlantı hatası.'); }
    setYukleniyor(false);
  };

  const pdfIndir = async () => {
    setPdfYap(true);
    try {
      const govde = `## Hakediş Özeti
Toplam hak edilen: ${tl(toplamHak)}
Toplam ödenen: ${tl(toplamOdenen)}
Kalan ödenecek: ${tl(toplamKalan)}

## Taşeron Bazında
${satirlar.map((x) => `- ${x.t.ad} (${x.t.uzmanlik}): hak edilen ${tl(x.hakEdilen)} · ödenen ${tl(x.odenen)} · kalan ${tl(x.kalan)} (${x.isSayisi} iş, sözleşme ${tl(x.sozlesme)})`).join('\n') || '(taşeron/iş kaydı yok)'}

${degerlendirme ? '## AI Değerlendirmesi\n' + degerlendirme : ''}`;
      await pdfUret('Hakediş Raporu — ' + new Date().toLocaleDateString('tr-TR'), govde, 'hakedis');
    } catch { alert('PDF oluşturulamadı.'); }
    setPdfYap(false);
  };

  return (
    <>
      <PageHeader baslik="Hakediş Motoru" aciklama="Yapılan iş × birim fiyat = hak ediş; taşeron bazında ödenen ve kalan borç"
        sag={<Button variant="soft" size="sm" onClick={pdfIndir} disabled={pdfYap}>{pdfYap ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} PDF</Button>} />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card><CardBody><p className="text-xs text-metin-yum flex items-center gap-1.5"><Receipt size={13} /> Hak Edilen</p><p className="text-xl font-bold text-metin mt-1">{tl(toplamHak)}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs text-metin-yum flex items-center gap-1.5"><CheckCircle2 size={13} /> Ödenen</p><p className="text-xl font-bold text-metin mt-1">{tl(toplamOdenen)}</p></CardBody></Card>
        <Card className={toplamKalan > 0 ? 'border-amber-300' : ''}><CardBody><p className="text-xs text-metin-yum flex items-center gap-1.5"><Wallet size={13} /> Kalan Borç</p><p className={`text-xl font-bold mt-1 ${toplamKalan > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{tl(toplamKalan)}</p></CardBody></Card>
      </div>

      <Card className="mb-5"><CardBody>
        <p className="font-semibold text-metin flex items-center gap-2 mb-3"><HardHat size={16} className="text-marka-500" /> Taşeron Bazında Hakediş</p>
        {satirlar.length === 0 ? (
          <p className="text-sm text-metin-yum">Taşeron + iş kalemi girilince burada hak ediş otomatik hesaplanır. <b>Taşeronlar</b> ve <b>İş Takibi</b> sayfalarından ekle (iş kalemine taşeron + planlanan tutar + ilerleme % gir).</p>
        ) : (
          <div className="space-y-2">
            {satirlar.map((x) => {
              const fazla = x.kalan < -1;
              return (
                <div key={x.t.id} className="border border-cizgi rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                    <div className="min-w-0"><span className="font-medium text-metin">{x.t.ad}</span> <span className="text-xs text-metin-yum">· {x.t.uzmanlik} · {x.isSayisi} iş</span></div>
                    <Button size="sm" variant="soft" onClick={() => setOdemeForm({ taseronId: x.t.id, tutar: '', tur: 'hakedis' })}><Plus size={13} /> Ödeme</Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div><p className="text-[11px] text-metin-yum">Hak edilen</p><p className="font-semibold text-metin">{tl(x.hakEdilen)}</p></div>
                    <div><p className="text-[11px] text-metin-yum">Ödenen</p><p className="font-semibold text-metin">{tl(x.odenen)}</p></div>
                    <div><p className="text-[11px] text-metin-yum">Kalan</p><p className={`font-semibold ${fazla ? 'text-rose-600' : x.kalan > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{tl(x.kalan)}{fazla && ' (fazla!)'}</p></div>
                  </div>
                  {x.sozlesme > 0 && <div className="mt-2 h-1.5 rounded-full bg-zemin overflow-hidden"><div className="h-full rounded-full bg-marka-500" style={{ width: `${Math.min(100, Math.round((x.hakEdilen / x.sozlesme) * 100))}%` }} /></div>}
                </div>
              );
            })}
          </div>
        )}
      </CardBody></Card>

      {/* Ödeme ekleme formu */}
      {odemeForm && (
        <Card className="mb-5"><CardBody>
          <p className="font-semibold text-metin mb-3 flex items-center gap-2"><Plus size={16} /> Ödeme Ekle — {taseronlar.find((t) => t.id === odemeForm.taseronId)?.ad}</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Tutar (TL)"><Input type="number" value={odemeForm.tutar} onChange={(e) => setOdemeForm({ ...odemeForm, tutar: e.target.value })} placeholder="örn. 50000" /></Field>
            <Field label="Tür"><Select value={odemeForm.tur} onChange={(e) => setOdemeForm({ ...odemeForm, tur: e.target.value as 'avans' | 'hakedis' | 'kesin' })}><option value="avans">Avans</option><option value="hakedis">Hakediş</option><option value="kesin">Kesin</option></Select></Field>
            <div className="flex items-end gap-2"><Button onClick={odemeKaydet} disabled={!odemeForm.tutar}>Kaydet</Button><Button variant="ghost" onClick={() => setOdemeForm(null)}>İptal</Button></div>
          </div>
        </CardBody></Card>
      )}

      <Card><CardBody>
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <p className="font-semibold text-metin flex items-center gap-2"><Sparkles size={16} className="text-marka-500" /> AI Hakediş Değerlendirmesi</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={degerlendir} disabled={yukleniyor || satirlar.length === 0}>{yukleniyor ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {degerlendirme ? 'Yenile' : 'Değerlendir'}</Button>
          </div>
        </div>
        {yukleniyor && !degerlendirme ? <p className="text-sm text-metin-yum flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> İnceleniyor…</p>
          : degerlendirme ? <div className="rounded-xl bg-marka-50 border border-marka-100 p-4 text-sm text-marka-900 whitespace-pre-wrap leading-relaxed">{degerlendirme.replace(/\*\*/g, '')}</div>
          : <p className="text-sm text-metin-yum">"Değerlendir" ile AI hangi taşerona öncelikle ödeme yapman gerektiğini, fazla ödeme riskini ve nakit planını çıkarır.</p>}
      </CardBody></Card>

      <p className="mt-4 text-xs text-metin-yum"><AlertTriangle size={12} className="inline" /> Hak ediş = iş kaleminin planlanan tutarı × ilerleme %. Doğru sonuç için İş Takibi'nde her işe <b>taşeron + planlanan tutar + ilerleme</b> gir.</p>
    </>
  );
}
