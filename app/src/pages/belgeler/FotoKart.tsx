import { useEffect, useState } from 'react';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { blobGetir } from '../../lib/idb';
import type { Belge } from '../../types';
import { tarih } from '../../lib/format';

// ============================================================================
// FotoKart — Tek bir fotoğraf için küçük resim kartı.
// blobGetir ile IndexedDB'den dosyayı çekip URL.createObjectURL üretir.
// Bileşen kalktığında URL'i mutlaka revoke eder (bellek sızıntısı olmasın).
// ============================================================================

interface Props {
  belge: Belge;
  onAc: (belge: Belge, url: string) => void;
  onSil: (belge: Belge) => void;
}

export default function FotoKart({ belge, onAc, onSil }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(false);

  useEffect(() => {
    let iptal = false;
    let olusanUrl: string | null = null;

    async function yukle() {
      if (!belge.blobId) {
        // Dış URL ile gelen belgelerde blobId olmayabilir
        if (belge.url) {
          setUrl(belge.url);
          setYukleniyor(false);
        } else {
          setHata(true);
          setYukleniyor(false);
        }
        return;
      }
      try {
        const blob = await blobGetir(belge.blobId);
        if (iptal) return;
        if (!blob) {
          setHata(true);
          setYukleniyor(false);
          return;
        }
        olusanUrl = URL.createObjectURL(blob);
        setUrl(olusanUrl);
        setYukleniyor(false);
      } catch {
        if (!iptal) {
          setHata(true);
          setYukleniyor(false);
        }
      }
    }
    yukle();

    // Temizlik — objectURL'i serbest bırak
    return () => {
      iptal = true;
      if (olusanUrl) URL.revokeObjectURL(olusanUrl);
    };
  }, [belge.blobId, belge.url]);

  return (
    <div className="relative group rounded-xl border border-cizgi bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => url && onAc(belge, url)}
        disabled={!url}
        className="block w-full aspect-square bg-zemin cursor-pointer"
        aria-label={`${belge.ad} önizleme`}
      >
        {yukleniyor && (
          <div className="w-full h-full flex items-center justify-center text-metin-yum">
            <ImageIcon size={32} className="animate-pulse" />
          </div>
        )}
        {hata && (
          <div className="w-full h-full flex flex-col items-center justify-center text-metin-yum text-xs gap-1 px-2 text-center">
            <ImageIcon size={28} />
            <span>Görsel yüklenemedi</span>
          </div>
        )}
        {url && !hata && (
          <img
            src={url}
            alt={belge.ad}
            className="w-full h-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        )}
      </button>

      {/* Alt bilgi şeridi */}
      <div className="px-2.5 py-2 border-t border-cizgi">
        <p className="text-xs font-medium text-metin truncate" title={belge.ad}>{belge.ad}</p>
        <p className="text-[11px] text-metin-yum mt-0.5">{tarih(belge.tarih)}</p>
      </div>

      {/* Sil butonu (hover'da görünür) */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onSil(belge); }}
        className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-white/90 text-red-600 opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-red-50 cursor-pointer"
        aria-label="Sil"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
