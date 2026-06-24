import { useEffect, useRef, useState } from 'react';
import { DxfViewer } from 'dxf-viewer';
import { Color } from 'three';
import { Loader2, AlertTriangle } from 'lucide-react';

// ============================================================================
// ÇİZİM GÖRÜNTÜLEYİCİ — DXF dosyalarını interaktif (yakınlaştır/kaydır) gösterir.
// DWG dosyaları için önce DXF'e çevrilmiş hâli (dxfYol) verilir.
// ============================================================================

export default function CizimGoruntuleyici({ yol }: { yol: string }) {
  const kapRef = useRef<HTMLDivElement>(null);
  const [durum, setDurum] = useState<'yukleniyor' | 'tamam' | 'hata'>('yukleniyor');
  const [mesaj, setMesaj] = useState('');

  useEffect(() => {
    const kap = kapRef.current;
    if (!kap) return;

    let viewer: DxfViewer | null = null;
    let iptal = false;
    setDurum('yukleniyor');
    setMesaj('');

    try {
      viewer = new DxfViewer(kap, {
        clearColor: new Color(0xffffff),
        autoResize: true,
        colorCorrection: true,
      });
      viewer
        .Load({ url: yol, fonts: [], workerFactory: null })
        .then(() => {
          if (iptal) return;
          viewer?.FitView?.();
          setDurum('tamam');
        })
        .catch((e: unknown) => {
          if (iptal) return;
          setMesaj(e instanceof Error ? e.message : 'Çizim okunamadı.');
          setDurum('hata');
        });
    } catch (e) {
      setMesaj(e instanceof Error ? e.message : 'Görüntüleyici başlatılamadı.');
      setDurum('hata');
    }

    // Temizlik — StrictMode çift-mount'a dayanıklı
    return () => {
      iptal = true;
      try {
        viewer?.Destroy?.();
      } catch {
        /* yok say */
      }
      if (kap) kap.innerHTML = '';
    };
  }, [yol]);

  return (
    <div className="relative w-full">
      <div
        ref={kapRef}
        className="w-full h-[70vh] rounded-xl border border-cizgi bg-white overflow-hidden"
      />
      {durum === 'yukleniyor' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-metin-yum gap-2 pointer-events-none">
          <Loader2 className="animate-spin" size={28} />
          <span className="text-sm">Çizim yükleniyor…</span>
        </div>
      )}
      {durum === 'hata' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-2">
          <div className="p-3 rounded-2xl bg-red-50 text-red-600"><AlertTriangle size={26} /></div>
          <p className="font-medium text-metin">Çizim açılamadı</p>
          <p className="text-sm text-metin-yum max-w-sm">{mesaj || 'Dosya bozuk olabilir ya da desteklenmeyen bir DXF sürümü.'}</p>
          <a href={yol} download className="text-sm text-marka-600 underline mt-1">Dosyayı indir</a>
        </div>
      )}
    </div>
  );
}
