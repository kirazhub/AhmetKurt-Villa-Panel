import { useState } from 'react';
import { ImageDown, Upload, Download, Loader2, CheckCircle2, XCircle, Archive } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, EmptyState } from '../components/ui';
import { blobKaydet } from '../lib/idb';
import { uid, bugun } from '../lib/format';

interface Oge {
  id: string;
  ad: string;          // jpg adı
  durum: 'cevriliyor' | 'bitti' | 'hata';
  url?: string;
  blob?: Blob;
  arsivlendi?: boolean;
}

export default function HeicDonustur() {
  const belgeEkle = useStore((s) => s.belgeEkle);
  const [ogeler, setOgeler] = useState<Oge[]>([]);

  const dosyaSec = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const id = uid('heic');
      const jpgAd = f.name.replace(/\.(heic|heif)$/i, '') + '.jpg';
      setOgeler((o) => [...o, { id, ad: jpgAd, durum: 'cevriliyor' }]);
      try {
        const resp = await fetch('/api/heic-jpg', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: f });
        if (!resp.ok) throw new Error('cevrim hatasi');
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        setOgeler((o) => o.map((x) => (x.id === id ? { ...x, durum: 'bitti', url, blob } : x)));
      } catch {
        setOgeler((o) => o.map((x) => (x.id === id ? { ...x, durum: 'hata' } : x)));
      }
    }
  };

  const indir = (o: Oge) => {
    if (!o.url) return;
    const a = document.createElement('a');
    a.href = o.url; a.download = o.ad; a.click();
  };

  const hepsiniIndir = () => ogeler.filter((o) => o.durum === 'bitti').forEach((o, i) => setTimeout(() => indir(o), i * 350));

  const arsiveEkle = async (o: Oge) => {
    if (!o.blob) return;
    const blobId = uid('blob');
    await blobKaydet(blobId, o.blob);
    belgeEkle({ ad: o.ad, tur: 'foto', blobId, tarih: bugun() });
    setOgeler((arr) => arr.map((x) => (x.id === o.id ? { ...x, arsivlendi: true } : x)));
  };

  const biten = ogeler.filter((o) => o.durum === 'bitti').length;

  return (
    <>
      <PageHeader
        baslik="HEIC → JPG Dönüştürücü"
        aciklama="iPhone fotoğraflarını (HEIC) JPG'ye çevir; indir veya arşive ekle"
        sag={biten > 1 ? <Button variant="soft" size="sm" onClick={hepsiniIndir}><Download size={15} /> Hepsini indir ({biten})</Button> : undefined}
      />

      <Card className="mb-6">
        <CardBody>
          <label className="flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-cizgi rounded-2xl cursor-pointer hover:border-marka-300 hover:bg-zemin transition">
            <div className="p-3 rounded-2xl bg-marka-50 text-marka-600"><Upload size={26} /></div>
            <div className="text-center">
              <p className="font-medium text-metin">HEIC dosyalarını seç</p>
              <p className="text-sm text-metin-yum">Birden fazla seçebilirsin · tarayıcıda çevrilir, hiçbir yere yüklenmez</p>
            </div>
            <input type="file" accept=".heic,.heif,image/heic,image/heif" multiple hidden onChange={(e) => dosyaSec(e.target.files)} />
          </label>
        </CardBody>
      </Card>

      {ogeler.length === 0 ? (
        <Card><EmptyState ikon={<ImageDown size={26} />} baslik="Henüz dosya yok" aciklama="Yukarıdan HEIC fotoğraflarını seç; otomatik JPG'ye çevrilsin." /></Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {ogeler.map((o) => (
            <Card key={o.id}>
              <div className="aspect-square bg-zemin rounded-t-2xl overflow-hidden flex items-center justify-center">
                {o.durum === 'cevriliyor' && <Loader2 className="animate-spin text-marka-500" size={26} />}
                {o.durum === 'hata' && <XCircle className="text-red-400" size={30} />}
                {o.durum === 'bitti' && o.url && <img src={o.url} alt={o.ad} className="w-full h-full object-cover" />}
              </div>
              <CardBody className="p-3">
                <p className="text-xs font-medium text-metin truncate" title={o.ad}>{o.ad}</p>
                {o.durum === 'cevriliyor' && <p className="text-xs text-metin-yum mt-1">Çevriliyor…</p>}
                {o.durum === 'hata' && <p className="text-xs text-red-600 mt-1">Çevrilemedi</p>}
                {o.durum === 'bitti' && (
                  <div className="flex gap-1.5 mt-2">
                    <Button size="sm" className="flex-1 !px-2" onClick={() => indir(o)}><Download size={13} /> İndir</Button>
                    <Button size="sm" variant={o.arsivlendi ? 'ghost' : 'soft'} className="!px-2" onClick={() => arsiveEkle(o)} disabled={o.arsivlendi}>
                      {o.arsivlendi ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Archive size={14} />}
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-5 text-xs text-metin-yum flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> Çevirme işlemi tamamen senin cihazında olur; fotoğraflar internete gönderilmez.</p>
    </>
  );
}
