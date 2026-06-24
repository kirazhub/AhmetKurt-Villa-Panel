import { useState } from 'react';
import { FileText, FileSignature, FileBox, Download, Trash2, ExternalLink } from 'lucide-react';
import { blobGetir } from '../../lib/idb';
import type { Belge } from '../../types';
import { tarih } from '../../lib/format';
import { Button, Badge } from '../../components/ui';

// ============================================================================
// BelgeSatir — Foto olmayan belgeler (fatura/sözleşme/diğer) için liste satırı.
// İndir/Aç butonu blobGetir ile dosyayı çekip geçici objectURL üretir, anında
// tıklatır ve hemen revoke eder (bellek sızıntısı olmasın).
// ============================================================================

interface Props {
  belge: Belge;
  isKalemiAd?: string;
  fazAd?: string;
  onSil: (belge: Belge) => void;
}

// Tür → ikon eşlemesi
function turIkon(tur: Belge['tur']) {
  if (tur === 'fatura') return <FileText size={20} />;
  if (tur === 'sozlesme') return <FileSignature size={20} />;
  return <FileBox size={20} />;
}

// Tür → görünen ad
const TUR_ETIKET: Record<Belge['tur'], string> = {
  foto: 'Fotoğraf',
  fatura: 'Fatura',
  sozlesme: 'Sözleşme',
  diger: 'Diğer',
};

// Tür → rozet rengi
const TUR_TONE: Record<Belge['tur'], 'mavi' | 'amber' | 'yesil' | 'gri'> = {
  foto: 'mavi',
  fatura: 'amber',
  sozlesme: 'yesil',
  diger: 'gri',
};

export default function BelgeSatir({ belge, isKalemiAd, fazAd, onSil }: Props) {
  const [indiriliyor, setIndiriliyor] = useState(false);

  // Dosyayı indir (veya yeni sekmede aç)
  async function dosyaIndir(yeniSekme: boolean) {
    if (belge.url && !belge.blobId) {
      // Dış URL'ye sahip belge — direkt aç
      window.open(belge.url, '_blank');
      return;
    }
    if (!belge.blobId) {
      alert('Dosya bulunamadı.');
      return;
    }
    setIndiriliyor(true);
    try {
      const blob = await blobGetir(belge.blobId);
      if (!blob) {
        alert('Dosya bulunamadı.');
        return;
      }
      const url = URL.createObjectURL(blob);
      if (yeniSekme) {
        window.open(url, '_blank');
        // Yeni sekmede açıldıktan sonra biraz bekle, sonra revoke et
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = belge.ad;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Tarayıcı indirmeyi başlattıktan sonra serbest bırak
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      alert('Dosya açılamadı.');
    } finally {
      setIndiriliyor(false);
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-cizgi bg-white hover:bg-zemin/50 transition">
      <div className="p-2.5 rounded-xl bg-zemin text-metin-yum shrink-0">
        {turIkon(belge.tur)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-metin truncate" title={belge.ad}>{belge.ad}</p>
          <Badge tone={TUR_TONE[belge.tur]}>{TUR_ETIKET[belge.tur]}</Badge>
        </div>
        <div className="text-xs text-metin-yum mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          <span>{tarih(belge.tarih)}</span>
          {fazAd && <span className="truncate">Faz: {fazAd}</span>}
          {isKalemiAd && <span className="truncate">İş: {isKalemiAd}</span>}
        </div>
        {belge.notlar && (
          <p className="text-xs text-metin-yum mt-1 line-clamp-2">{belge.notlar}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dosyaIndir(true)}
          disabled={indiriliyor}
          aria-label="Aç"
          title="Yeni sekmede aç"
        >
          <ExternalLink size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dosyaIndir(false)}
          disabled={indiriliyor}
          aria-label="İndir"
          title="İndir"
        >
          <Download size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSil(belge)}
          aria-label="Sil"
          title="Sil"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}
