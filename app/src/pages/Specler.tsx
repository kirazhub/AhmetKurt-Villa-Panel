import { useEffect, useState } from 'react';
import { Ruler, Loader2, RefreshCw, CheckCircle2, AlertTriangle, FileSearch, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, EmptyState, Badge } from '../components/ui';
import { blobGetir } from '../lib/idb';
import { blobToDataUrl } from '../lib/gorsel';
import { tarih } from '../lib/format';
import type { Belge } from '../types';

export default function Specler() {
  const belgeler = useStore((s) => s.belgeler);
  const belgeGuncelle = useStore((s) => s.belgeGuncelle);
  // Sözleşme hariç, görsel olabilecek tüm belgeler
  const liste = belgeler.filter((b) => (b.blobId || b.url) && b.tur !== 'sozlesme');

  const [isleniyor, setIsleniyor] = useState<string | null>(null);
  const [acik, setAcik] = useState<Record<string, boolean>>({});
  const [kapaklar, setKapaklar] = useState<Record<string, string>>({});

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
