import { Download } from 'lucide-react';
import { Modal, Button } from '../../components/ui';
import type { Belge } from '../../types';
import { tarih } from '../../lib/format';

// ============================================================================
// OnizlemeModal — Büyük fotoğraf önizleme. Üst sayfa objectURL'i yönetir;
// burada sadece gösterim + indir butonu var.
// ============================================================================

interface Props {
  acik: boolean;
  kapat: () => void;
  belge: Belge | null;
  url: string | null;
  isKalemiAd?: string;
  fazAd?: string;
}

export default function OnizlemeModal({ acik, kapat, belge, url, isKalemiAd, fazAd }: Props) {
  if (!belge) return null;

  function indir() {
    if (!url || !belge) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = belge.ad;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <Modal acik={acik} kapat={kapat} baslik={belge.ad} genis>
      <div className="space-y-4">
        {url ? (
          <div className="rounded-xl overflow-hidden bg-zemin flex items-center justify-center">
            <img
              src={url}
              alt={belge.ad}
              className="max-h-[70vh] w-auto object-contain"
            />
          </div>
        ) : (
          <div className="rounded-xl bg-zemin h-64 flex items-center justify-center text-metin-yum">
            Görsel yüklenemedi
          </div>
        )}

        {/* Meta bilgiler */}
        <div className="text-sm text-metin-yum space-y-1">
          <p><span className="font-medium text-metin">Tarih:</span> {tarih(belge.tarih)}</p>
          {fazAd && <p><span className="font-medium text-metin">Faz:</span> {fazAd}</p>}
          {isKalemiAd && <p><span className="font-medium text-metin">İş Kalemi:</span> {isKalemiAd}</p>}
          {belge.notlar && <p><span className="font-medium text-metin">Not:</span> {belge.notlar}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={kapat}>Kapat</Button>
          <Button onClick={indir} disabled={!url}><Download size={16} /> İndir</Button>
        </div>
      </div>
    </Modal>
  );
}
