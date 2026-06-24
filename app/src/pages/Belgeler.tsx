import { useState } from 'react';
import { Images, Upload, FileText } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, Button, EmptyState, Badge } from '../components/ui';
import { blobSil } from '../lib/idb';
import type { Belge } from '../types';
import YuklemeModal from './belgeler/YuklemeModal';
import FotoKart from './belgeler/FotoKart';
import BelgeSatir from './belgeler/BelgeSatir';
import OnizlemeModal from './belgeler/OnizlemeModal';

type Filtre = 'tumu' | 'foto' | 'fatura' | 'sozlesme' | 'diger';

const SEKMELER: { id: Filtre; ad: string }[] = [
  { id: 'tumu', ad: 'Tümü' },
  { id: 'foto', ad: 'Fotoğraf' },
  { id: 'fatura', ad: 'Fatura' },
  { id: 'sozlesme', ad: 'Sözleşme' },
  { id: 'diger', ad: 'Diğer' },
];

export default function Belgeler() {
  const belgeler = useStore((s) => s.belgeler);
  const fazlar = useStore((s) => s.fazlar);
  const isKalemleri = useStore((s) => s.isKalemleri);
  const belgeEkle = useStore((s) => s.belgeEkle);
  const belgeSil = useStore((s) => s.belgeSil);

  const [yuklemeAcik, setYuklemeAcik] = useState(false);
  const [filtre, setFiltre] = useState<Filtre>('tumu');
  const [onizleme, setOnizleme] = useState<{ belge: Belge; url: string } | null>(null);

  const fazAd = (id?: string) => fazlar.find((f) => f.id === id)?.ad;
  const isAd = (id?: string) => isKalemleri.find((k) => k.id === id)?.ad;

  const sayim = (t: Filtre) => (t === 'tumu' ? belgeler.length : belgeler.filter((b) => b.tur === t).length);
  const filtreli = filtre === 'tumu' ? belgeler : belgeler.filter((b) => b.tur === filtre);
  const fotolar = filtreli.filter((b) => b.tur === 'foto');
  const digerler = filtreli.filter((b) => b.tur !== 'foto');

  const sil = async (b: Belge) => {
    if (!confirm(`"${b.ad}" silinsin mi? Bu işlem geri alınamaz.`)) return;
    if (b.blobId) { try { await blobSil(b.blobId); } catch { /* yok say */ } }
    belgeSil(b.id);
  };

  return (
    <>
      <PageHeader
        baslik="Fotoğraf & Belge Arşivi"
        aciklama="Şantiye fotoğrafları, faturalar, sözleşmeler — hepsi tek yerde"
        sag={<Button onClick={() => setYuklemeAcik(true)}><Upload size={16} /> Yükle</Button>}
      />

      <div className="flex flex-wrap gap-2 mb-5">
        {SEKMELER.map((s) => (
          <button
            key={s.id}
            onClick={() => setFiltre(s.id)}
            className={
              'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition cursor-pointer ' +
              (filtre === s.id ? 'bg-marka-500 text-white shadow-sm' : 'bg-white border border-cizgi text-metin-yum hover:bg-zemin')
            }
          >
            {s.ad}
            <Badge tone={filtre === s.id ? 'amber' : 'gri'}>{sayim(s.id)}</Badge>
          </button>
        ))}
      </div>

      {filtreli.length === 0 ? (
        <Card>
          <EmptyState
            ikon={<Images size={28} />}
            baslik="Henüz belge yok"
            aciklama="Şantiyeden çektiğin fotoğrafları, faturaları ve sözleşmeleri buraya yükle."
            aksiyon={<Button onClick={() => setYuklemeAcik(true)}><Upload size={16} /> İlk belgeyi yükle</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {fotolar.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-metin-yum mb-3 flex items-center gap-2"><Images size={16} /> Fotoğraflar ({fotolar.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {fotolar.map((b) => (
                  <FotoKart key={b.id} belge={b} onAc={(belge, url) => setOnizleme({ belge, url })} onSil={sil} />
                ))}
              </div>
            </div>
          )}

          {digerler.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-metin-yum mb-3 flex items-center gap-2"><FileText size={16} /> Belgeler ({digerler.length})</h3>
              <Card>
                <div className="divide-y divide-cizgi">
                  {digerler.map((b) => (
                    <BelgeSatir key={b.id} belge={b} isKalemiAd={isAd(b.isKalemiId)} fazAd={fazAd(b.fazId)} onSil={sil} />
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      <YuklemeModal
        acik={yuklemeAcik}
        kapat={() => setYuklemeAcik(false)}
        fazlar={fazlar}
        isKalemleri={isKalemleri}
        belgeEkle={belgeEkle}
      />
      <OnizlemeModal
        acik={!!onizleme}
        kapat={() => setOnizleme(null)}
        belge={onizleme?.belge ?? null}
        url={onizleme?.url ?? null}
        isKalemiAd={isAd(onizleme?.belge.isKalemiId)}
        fazAd={fazAd(onizleme?.belge.fazId)}
      />
    </>
  );
}
