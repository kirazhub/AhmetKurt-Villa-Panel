import { useEffect, useRef, useState } from 'react';
import { Images, Upload, Loader2, Trash2, CloudUpload, CheckCircle2, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, EmptyState, Badge } from '../components/ui';
import { dosyaYukle, dosyaSil, dosyaOnizleme, dosyaUrl } from '../lib/sunucuGorsel';
import { blobGetir, blobSil } from '../lib/idb';

type Filtre = 'tumu' | 'foto' | 'fatura' | 'diger';
const SEKMELER: { id: Filtre; ad: string }[] = [
  { id: 'tumu', ad: 'Tümü' }, { id: 'foto', ad: 'Fotoğraf/Plan' }, { id: 'fatura', ad: 'Fatura' }, { id: 'diger', ad: 'Diğer' },
];

export default function Belgeler() {
  const sunucuDosyalar = useStore((s) => s.sunucuDosyalar);
  const dosyalariYenile = useStore((s) => s.dosyalariYenile);
  const eskiBelgeler = useStore((s) => s.belgeler);   // tarayıcıdaki (IndexedDB) eski görseller
  const belgeSil = useStore((s) => s.belgeSil);

  const [filtre, setFiltre] = useState<Filtre>('tumu');
  const [yukleniyor, setYukleniyor] = useState<{ var: number; toplam: number } | null>(null);
  const [tasiniyor, setTasiniyor] = useState<{ var: number; toplam: number } | null>(null);
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { dosyalariYenile(); }, [dosyalariYenile]);

  // Yeni görseller yükle (sunucuya)
  const yukle = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const liste = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (liste.length === 0) { alert('Lütfen görsel dosyalar seç (HEIC ise önce HEIC→JPG sayfasından çevir).'); return; }
    setYukleniyor({ var: 0, toplam: liste.length });
    for (let i = 0; i < liste.length; i++) {
      try { await dosyaYukle(liste[i], 'foto'); } catch (e) { console.error(e); }
      setYukleniyor({ var: i + 1, toplam: liste.length });
    }
    await dosyalariYenile();
    setYukleniyor(null);
  };

  // Tarayıcıdaki eski görselleri sunucuya taşı
  const tasi = async () => {
    const tasinacak = eskiBelgeler.filter((b) => b.blobId);
    if (tasinacak.length === 0) { alert('Tarayıcıda taşınacak görsel bulunamadı.'); return; }
    if (!confirm(`Tarayıcındaki ${tasinacak.length} görsel sunucuya taşınacak (kalıcı olur, AI otomatik işler). Onaylıyor musun?`)) return;
    setTasiniyor({ var: 0, toplam: tasinacak.length });
    for (let i = 0; i < tasinacak.length; i++) {
      const b = tasinacak[i];
      try {
        const blob = await blobGetir(b.blobId!);
        if (blob) {
          const file = new File([blob], b.ad || 'gorsel.jpg', { type: blob.type || 'image/jpeg' });
          await dosyaYukle(file, b.tur === 'fatura' ? 'fatura' : b.tur === 'sozlesme' ? 'diger' : 'foto');
          await blobSil(b.blobId!).catch(() => {});
          belgeSil(b.id); // taşındı, eski kopyayı kaldır
        }
      } catch (e) { console.error('taşıma hata', b.ad, e); }
      setTasiniyor({ var: i + 1, toplam: tasinacak.length });
    }
    await dosyalariYenile();
    setTasiniyor(null);
  };

  const sil = async (id: string, ad: string) => {
    if (!confirm(`"${ad}" silinsin mi?`)) return;
    await dosyaSil(id); await dosyalariYenile();
  };

  const gorseller = sunucuDosyalar.filter((d) => filtre === 'tumu' ? true : d.tur === filtre);
  const sayim = (t: Filtre) => t === 'tumu' ? sunucuDosyalar.length : sunucuDosyalar.filter((d) => d.tur === t).length;
  const eskiSayi = eskiBelgeler.filter((b) => b.blobId).length;

  return (
    <>
      <PageHeader baslik="Fotoğraf & Belge Arşivi" aciklama="Görseller artık sunucuda saklanır — her cihazdan erişilir, yedeklenir, AI otomatik analiz eder"
        sag={<Button onClick={() => inputRef.current?.click()} disabled={!!yukleniyor}><Upload size={16} /> Yükle</Button>} />
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { yukle(e.target.files); e.target.value = ''; }} />

      {/* Tarayıcıdan taşıma uyarısı */}
      {eskiSayi > 0 && (
        <Card className="mb-5 border-marka-200"><CardBody className="flex items-center gap-3 flex-wrap">
          <div className="p-2.5 rounded-xl bg-marka-50 text-marka-600"><CloudUpload size={22} /></div>
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-semibold text-metin">Tarayıcında {eskiSayi} eski görsel var</h3>
            <p className="text-sm text-metin-yum">Bunlar sadece bu cihazda; sunucuya taşıyınca kalıcı olur, AI otomatik işler, her cihazdan görünür.</p>
          </div>
          <Button onClick={tasi} disabled={!!tasiniyor}>{tasiniyor ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />} Sunucuya taşı</Button>
        </CardBody></Card>
      )}

      {(yukleniyor || tasiniyor) && (
        <Card className="mb-5"><CardBody className="flex items-center gap-2 text-sm text-metin-yum">
          <Loader2 size={15} className="animate-spin" />
          {yukleniyor ? `Yükleniyor… ${yukleniyor.var}/${yukleniyor.toplam}` : `Sunucuya taşınıyor… ${tasiniyor!.var}/${tasiniyor!.toplam}`} (sayfayı kapatma)
        </CardBody></Card>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        {SEKMELER.map((s) => (
          <button key={s.id} onClick={() => setFiltre(s.id)}
            className={'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition cursor-pointer ' + (filtre === s.id ? 'bg-marka-500 text-white shadow-sm' : 'bg-white border border-cizgi text-metin-yum hover:bg-zemin')}>
            {s.ad}<Badge tone={filtre === s.id ? 'amber' : 'gri'}>{sayim(s.id)}</Badge>
          </button>
        ))}
      </div>

      {gorseller.length === 0 ? (
        <Card><EmptyState ikon={<Images size={28} />} baslik="Henüz görsel yok"
          aciklama="Yükle ile mimari plan, ölçü kağıdı, fatura veya saha fotoğrafı ekle. Sunucuda saklanır, AI (Teknik Specler) otomatik analiz eder."
          aksiyon={<Button onClick={() => inputRef.current?.click()}><Upload size={16} /> İlk görseli yükle</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {gorseller.map((d) => (
            <div key={d.id} className="relative group rounded-xl overflow-hidden border border-cizgi bg-white">
              <button onClick={() => setOnizleme(d.id)} className="block w-full aspect-square cursor-pointer">
                <img src={dosyaOnizleme(d.id)} alt={d.ad} className="w-full h-full object-cover" loading="lazy" />
              </button>
              <div className="px-2 py-1.5 flex items-center justify-between gap-1">
                <span className="text-xs text-metin-yum truncate flex items-center gap-1">{d.spec ? <CheckCircle2 size={12} className="text-emerald-600 shrink-0" /> : null}{d.ad}</span>
                <button onClick={() => sil(d.id, d.ad)} className="text-metin-yum hover:text-rose-600 shrink-0"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {onizleme && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setOnizleme(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={28} /></button>
          <img src={dosyaUrl(onizleme)} alt="" className="max-w-full max-h-full rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
