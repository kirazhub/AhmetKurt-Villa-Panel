import { differenceInDays, parseISO } from 'date-fns';
import type { IsKalemi, Faz } from '../../types';
import { Card, CardBody, DurumBadge, Input, Badge } from '../../components/ui';
import { tarih } from '../../lib/format';

// ============================================================================
// IsSatiri — Tek bir iş kaleminin takvim satırı.
// Hem "Geciken", hem "Yaklaşan", hem "Tarihi Atanmamış" listelerinde kullanılır.
// ============================================================================

interface Props {
  kalem: IsKalemi;
  faz?: Faz;
  bugunIso: string;
  // Tarih değişince çağrılır. Üst bileşen store'u günceller.
  onTarihDegis: (id: string, patch: { baslangic?: string; bitis?: string }) => void;
  // Görsel mod — "geciken" kırmızı vurgulu olabilir, diğerleri normal.
  vurgu?: 'geciken' | 'normal';
}

export default function IsSatiri({ kalem, faz, bugunIso, onTarihDegis, vurgu = 'normal' }: Props) {
  // Kalan / geçen gün hesabı — bitiş tarihine göre
  let gunMesaji: { metin: string; tone: 'kirmizi' | 'amber' | 'mavi' | 'yesil' | 'gri' } | null = null;
  if (kalem.bitis) {
    const fark = differenceInDays(parseISO(kalem.bitis), parseISO(bugunIso));
    if (kalem.durum === 'tamamlandi') {
      gunMesaji = { metin: 'Tamamlandı', tone: 'yesil' };
    } else if (fark < 0) {
      // Geçmiş tarih — gecikme
      gunMesaji = { metin: `${Math.abs(fark)} gün gecikti`, tone: 'kirmizi' };
    } else if (fark === 0) {
      gunMesaji = { metin: 'Bugün bitiyor', tone: 'amber' };
    } else if (fark <= 7) {
      gunMesaji = { metin: `${fark} gün kaldı`, tone: 'amber' };
    } else {
      gunMesaji = { metin: `${fark} gün kaldı`, tone: 'mavi' };
    }
  }

  return (
    <Card className={vurgu === 'geciken' ? 'border-red-200 bg-red-50/40' : ''}>
      <CardBody className="space-y-3">
        {/* Üst kısım: ad, faz, durum */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-metin truncate">{kalem.ad}</h4>
            {faz && (
              <p className="text-xs text-metin-yum mt-0.5">
                Faz {faz.no} · {faz.ad}
              </p>
            )}
          </div>
          <DurumBadge durum={kalem.durum} />
        </div>

        {/* Tarih düzenleme — başlangıç ve bitiş */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-metin-yum mb-1">Başlangıç</label>
            <Input
              type="date"
              value={kalem.baslangic ?? ''}
              onChange={(e) => onTarihDegis(kalem.id, { baslangic: e.target.value || undefined })}
            />
          </div>
          <div>
            <label className="block text-xs text-metin-yum mb-1">Bitiş</label>
            <Input
              type="date"
              value={kalem.bitis ?? ''}
              onChange={(e) => onTarihDegis(kalem.id, { bitis: e.target.value || undefined })}
            />
          </div>
        </div>

        {/* Alt bilgi şeridi: tarih özeti + kalan gün */}
        {(kalem.baslangic || kalem.bitis) && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-metin-yum">
              {tarih(kalem.baslangic)} → {tarih(kalem.bitis)}
            </span>
            {gunMesaji && <Badge tone={gunMesaji.tone}>{gunMesaji.metin}</Badge>}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
