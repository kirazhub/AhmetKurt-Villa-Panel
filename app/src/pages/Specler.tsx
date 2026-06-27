import { useEffect, useState } from 'react';
import { Ruler, Loader2, RefreshCw, CheckCircle2, AlertTriangle, FileSearch, ChevronDown, ChevronUp, Sparkles, BrainCircuit } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, EmptyState, Badge } from '../components/ui';
import { blobGetir } from '../lib/idb';
import { blobToDataUrl } from '../lib/gorsel';
import { tarih } from '../lib/format';
import type { Belge } from '../types';

// Basit markdown: ## başlık + paragraf
function AnalizMetni({ metin }: { metin: string }) {
  return (
    <div className="text-sm text-metin leading-relaxed space-y-1.5">
      {metin.split('\n').map((satir, i) => {
        const t = satir.trim();
        if (!t) return null;
        if (t.startsWith('## ')) return <h4 key={i} className="font-bold text-metin mt-3 mb-1 text-[15px]">{t.replace(/^##\s*/, '')}</h4>;
        if (t.startsWith('# ')) return <h3 key={i} className="font-bold text-metin mt-3 text-base">{t.replace(/^#\s*/, '')}</h3>;
        return <p key={i} className="whitespace-pre-wrap">{t.replace(/\*\*/g, '')}</p>;
      })}
    </div>
  );
}

export default function Specler() {
  const belgeler = useStore((s) => s.belgeler);
  const belgeGuncelle = useStore((s) => s.belgeGuncelle);
  const proje = useStore((s) => s.proje);
  const projeAnaliz = useStore((s) => s.projeAnaliz);
  const projeAnalizKaydet = useStore((s) => s.projeAnalizKaydet);
  // Sözleşme hariç, görsel olabilecek tüm belgeler
  const liste = belgeler.filter((b) => (b.blobId || b.url) && b.tur !== 'sozlesme');

  const [isleniyor, setIsleniyor] = useState<string | null>(null);
  const [acik, setAcik] = useState<Record<string, boolean>>({});
  const [kapaklar, setKapaklar] = useState<Record<string, string>>({});
  const [analizYukleniyor, setAnalizYukleniyor] = useState(false);
  const specliSayi = belgeler.filter((b) => b.spec).length;

  const projeAnalizCikar = async () => {
    setAnalizYukleniyor(true);
    try {
      const specler = belgeler.filter((b) => b.spec).map((b) => `## ${b.ad}\n${b.spec}`).join('\n\n');
      const r = await fetch('/api/ai/proje-analiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ specler, proje: JSON.stringify(proje) }) });
      const d = await r.json();
      if (r.ok && d.analiz) projeAnalizKaydet({ metin: d.analiz, tarih: new Date().toISOString() });
      else alert('Analiz çıkarılamadı: ' + (d.hata || ''));
    } catch { alert('Bağlantı hatası'); }
    setAnalizYukleniyor(false);
  };

  // Küçük önizleme görselleri
  useEffect(() => {
    let iptal = false;
    (async () => {
      const yeni: Record<string, string> = {};
      for (const b of liste) {
        if (kapaklar[b.id]) continue;
        if (b.url) { yeni[b.id] = b.url; continue; }
        if (b.blobId) { try { const bl = await blobGetir(b.blobId); if (bl) yeni[b.id] = URL.createObjectURL(bl); } catch { /**/ } }
      }
      if (!iptal && Object.keys(yeni).length) setKapaklar((k) => ({ ...k, ...yeni }));
    })();
    return () => { iptal = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [belgeler.length]);

  // Tek belge için elle (yeniden) çıkar
  const cikar = async (b: Belge) => {
    setIsleniyor(b.id);
    try {
      let gorsel = '';
      if (b.blobId) { const bl = await blobGetir(b.blobId); if (!bl) throw new Error('Dosya bulunamadı'); gorsel = await blobToDataUrl(bl); }
      else if (b.url) gorsel = b.url;
      const r = await fetch('/api/ai/belge-spec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ad: b.ad, gorsel }) });
      const d = await r.json();
      if (r.ok && d.spec) belgeGuncelle(b.id, { spec: d.spec, specTarih: new Date().toISOString(), specDurum: 'islendi' });
      else belgeGuncelle(b.id, { specDurum: 'hata' });
    } catch { belgeGuncelle(b.id, { specDurum: 'hata' }); }
    finally { setIsleniyor(null); }
  };

  const bekleyen = liste.filter((b) => !b.spec && b.specDurum !== 'hata' && b.specDurum !== 'atlandi').length;
  const islenen = liste.filter((b) => b.spec).length;

  if (liste.length === 0) {
    return (
      <>
        <PageHeader baslik="Teknik Specler" aciklama="Yüklediğin plan/belgelerden AI'nın çıkardığı tüm teknik bilgiler" />
        <Card><EmptyState ikon={<Ruler size={28} />} baslik="Henüz görsel belge yok" aciklama="Foto & Belge'den mimari plan, ölçü kağıdı, liste veya çizim fotoğrafı yükle. Sisteme giren her görsel otomatik okunup buraya teknik bilgi olarak kaydedilir." /></Card>
      </>
    );
  }

  return (
    <>
      <PageHeader baslik="Teknik Specler" aciklama="Sisteme yüklenen her görselin ölçüleri, m²'leri, kotları ve teknik notları — otomatik çıkarılır" />

      <div className="mb-4 text-sm flex items-center gap-2 text-metin-yum">
        <Sparkles size={15} className="text-marka-500" />
        {bekleyen > 0
          ? <span className="flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> AI yeni belgeleri otomatik okuyor… ({islenen}/{liste.length} hazır)</span>
          : <span>Tüm görseller işlendi · {islenen}/{liste.length}. Yeni yüklediğin her görsel otomatik buraya eklenir.</span>}
      </div>

      {/* Proje Geneli Analiz */}
      <Card className="mb-5"><CardBody>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <p className="font-semibold text-metin flex items-center gap-2"><BrainCircuit size={17} className="text-marka-500" /> Proje Geneli Analiz</p>
          <Button size="sm" onClick={projeAnalizCikar} disabled={analizYukleniyor || specliSayi === 0}>
            {analizYukleniyor ? <Loader2 size={14} className="animate-spin" /> : projeAnaliz ? <RefreshCw size={14} /> : <BrainCircuit size={14} />} {projeAnaliz ? 'Yeniden analiz et' : 'Tüm planları analiz et'}
          </Button>
        </div>
        <p className="text-xs text-metin-yum">AI, işlenmiş {specliSayi} belgeyi birleştirip mimari + taşıyıcı sistem + tesisat + kot/eğim açısından bütünleşik bir proje raporu çıkarır; eksik paftaları da söyler.</p>
        {analizYukleniyor && <p className="text-sm text-metin-yum flex items-center gap-2 mt-3"><Loader2 size={14} className="animate-spin" /> Tüm planlar birlikte değerlendiriliyor… (1-2 dk)</p>}
        {projeAnaliz && !analizYukleniyor && (
          <div className="mt-3 border-t border-cizgi/60 pt-3">
            <p className="text-xs text-metin-yum mb-2">{tarih(projeAnaliz.tarih)} tarihli analiz</p>
            <AnalizMetni metin={projeAnaliz.metin} />
          </div>
        )}
      </CardBody></Card>

      <div className="space-y-4">
        {liste.map((b) => {
          const bu = isleniyor === b.id;
          const gizli = acik[b.id] === false;
          return (
            <Card key={b.id}>
              <CardBody>
                <div className="flex gap-4">
                  {kapaklar[b.id] && <img src={kapaklar[b.id]} alt="" className="w-20 h-20 rounded-lg object-cover border border-cizgi shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-semibold text-metin truncate flex items-center gap-2"><FileSearch size={15} className="text-marka-500 shrink-0" /> {b.ad}</p>
                        <p className="text-xs text-metin-yum mt-0.5">
                          {bu ? <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Okunuyor…</span>
                            : b.spec ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={12} /> Analiz edildi · {b.specTarih ? tarih(b.specTarih) : ''}</span>
                            : b.specDurum === 'hata' ? <span className="inline-flex items-center gap-1 text-rose-600"><AlertTriangle size={12} /> Okunamadı — "Yeniden" deneyebilirsin</span>
                            : b.specDurum === 'atlandi' ? <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle size={12} /> Görsel değil (PDF/HEIC olabilir)</span>
                            : <Badge tone="gri">Sırada</Badge>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {b.spec && <Button size="sm" variant="ghost" onClick={() => setAcik((a) => ({ ...a, [b.id]: gizli ? true : false }))}>{gizli ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</Button>}
                        <Button size="sm" variant="soft" onClick={() => cikar(b)} disabled={bu}>{bu ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {b.spec ? 'Yeniden' : 'Çıkar'}</Button>
                      </div>
                    </div>
                    {b.spec && !gizli && (
                      <div className="mt-3 text-sm text-metin whitespace-pre-wrap leading-relaxed border-t border-cizgi/60 pt-3">{b.spec}</div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <p className="mt-5 text-xs text-metin-yum">AI yalnızca görselde okunabilen bilgileri çıkarır, tahmin yürütmez. Fotoğraf ne kadar net/yüksek çözünürlüklü olursa o kadar çok detay çıkar.</p>
    </>
  );
}
