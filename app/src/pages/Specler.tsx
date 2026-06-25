import { useEffect, useRef, useState } from 'react';
import { Ruler, Loader2, RefreshCw, CheckCircle2, AlertTriangle, Play, StopCircle, FileSearch, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, EmptyState, Badge } from '../components/ui';
import { blobGetir } from '../lib/idb';
import { blobToDataUrl } from '../lib/gorsel';
import { tarih } from '../lib/format';
import type { Belge } from '../types';

export default function Specler() {
  const belgeler = useStore((s) => s.belgeler);
  const belgeGuncelle = useStore((s) => s.belgeGuncelle);
  const fotolar = belgeler.filter((b) => b.tur === 'foto' && (b.blobId || b.url));

  const [isleniyor, setIsleniyor] = useState<string | null>(null);
  const [hata, setHata] = useState<Record<string, string>>({});
  const [calisiyor, setCalisiyor] = useState(false);
  const [acik, setAcik] = useState<Record<string, boolean>>({});
  const [kapaklar, setKapaklar] = useState<Record<string, string>>({});
  const durdurRef = useRef(false);
  const baslatildi = useRef(false);

  // Küçük önizleme görselleri
  useEffect(() => {
    let iptal = false;
    (async () => {
      const yeni: Record<string, string> = {};
      for (const b of fotolar) {
        if (kapaklar[b.id]) continue;
        if (b.url) { yeni[b.id] = b.url; continue; }
        if (b.blobId) { try { const bl = await blobGetir(b.blobId); if (bl) yeni[b.id] = URL.createObjectURL(bl); } catch { /**/ } }
      }
      if (!iptal && Object.keys(yeni).length) setKapaklar((k) => ({ ...k, ...yeni }));
    })();
    return () => { iptal = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [belgeler.length]);

  const cikar = async (b: Belge): Promise<boolean> => {
    setIsleniyor(b.id); setHata((h) => { const n = { ...h }; delete n[b.id]; return n; });
    try {
      let dataUrl = '';
      if (b.blobId) { const bl = await blobGetir(b.blobId); if (!bl) throw new Error('Dosya bulunamadı'); dataUrl = await blobToDataUrl(bl); }
      else if (b.url) { dataUrl = b.url; }
      const r = await fetch('/api/ai/belge-spec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ad: b.ad, gorsel: dataUrl }) });
      const d = await r.json();
      if (r.ok && d.spec) { belgeGuncelle(b.id, { spec: d.spec, specTarih: new Date().toISOString() }); return true; }
      throw new Error(d.hata || 'AI yanıtı boş');
    } catch (e) {
      setHata((h) => ({ ...h, [b.id]: String((e as Error)?.message || e) }));
      return false;
    } finally { setIsleniyor(null); }
  };

  const hepsiniCikar = async (sadeceEksik = true) => {
    durdurRef.current = false; setCalisiyor(true);
    const hedef = sadeceEksik ? fotolar.filter((b) => !b.spec) : fotolar;
    for (const b of hedef) { if (durdurRef.current) break; await cikar(b); }
    setCalisiyor(false);
  };

  // Sayfa açılınca eksik olanları otomatik çıkar (bir kez)
  useEffect(() => {
    if (baslatildi.current) return;
    baslatildi.current = true;
    if (fotolar.some((b) => !b.spec)) hepsiniCikar(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eksik = fotolar.filter((b) => !b.spec).length;

  if (fotolar.length === 0) {
    return (
      <>
        <PageHeader baslik="Teknik Specler" aciklama="Yüklediğin plan ve belgelerden AI'nın çıkardığı tüm teknik bilgiler" />
        <Card><EmptyState ikon={<Ruler size={28} />} baslik="Henüz fotoğraf/belge yok" aciklama="Foto & Belge sayfasından mimari plan, ölçü kağıdı veya çizim fotoğrafı yükle; AI buradan tüm ölçüleri, m²'leri ve teknik detayları çıkarsın." /></Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        baslik="Teknik Specler"
        aciklama="Yüklediğin plan/belgelerden AI'nın okuduğu ölçüler, m²'ler, kotlar ve teknik notlar"
        sag={calisiyor
          ? <Button variant="ghost" size="sm" onClick={() => { durdurRef.current = true; }} className="text-rose-600"><StopCircle size={15} /> Durdur</Button>
          : <Button size="sm" onClick={() => hepsiniCikar(true)} disabled={eksik === 0}><Play size={15} /> Eksikleri çıkar ({eksik})</Button>}
      />

      {calisiyor && <p className="mb-4 text-sm text-metin-yum flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> AI belgeleri tek tek okuyor… ({fotolar.filter((b) => b.spec).length}/{fotolar.length})</p>}

      <div className="space-y-4">
        {fotolar.map((b) => {
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
                          {b.spec ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={12} /> Analiz edildi · {b.specTarih ? tarih(b.specTarih) : ''}</span>
                            : bu ? <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Okunuyor…</span>
                            : hata[b.id] ? <span className="inline-flex items-center gap-1 text-rose-600"><AlertTriangle size={12} /> {hata[b.id]}</span>
                            : <Badge tone="gri">Bekliyor</Badge>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {b.spec && <Button size="sm" variant="ghost" onClick={() => setAcik((a) => ({ ...a, [b.id]: gizli ? true : false }))}>{gizli ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</Button>}
                        <Button size="sm" variant="soft" onClick={() => cikar(b)} disabled={bu || calisiyor}>{bu ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {b.spec ? 'Yeniden' : 'Çıkar'}</Button>
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

      <p className="mt-5 text-xs text-metin-yum">Not: AI yalnızca görselde okunabilen bilgileri çıkarır, tahmin yürütmez. Sonuç eksikse fotoğrafın daha net/yüksek çözünürlüklü halini yükleyip "Yeniden" de.</p>
    </>
  );
}
