import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { blobGetir } from '../lib/idb';
import { blobToDataUrl } from '../lib/gorsel';

// Sisteme giren her görsel belgeyi arka planda AI'ya okutur ve teknik spec'ini kaydeder.
// Hangi sayfada olunursa olunsun çalışır; sırayla, tek tek (çakışma yok).
export default function OtomatikSpec() {
  const belgeler = useStore((s) => s.belgeler);
  const belgeGuncelle = useStore((s) => s.belgeGuncelle);
  const calisiyor = useRef(false);

  useEffect(() => {
    if (calisiyor.current) return;
    // İşlenecek sıradaki: görsel olabilecek (sözleşme hariç), henüz spec'i ve durumu olmayan belge
    const sirada = belgeler.find((b) => (b.blobId || b.url) && !b.spec && !b.specDurum && b.tur !== 'sozlesme');
    if (!sirada) return;
    calisiyor.current = true;
    (async () => {
      try {
        let gorsel = '';
        if (sirada.blobId) { const bl = await blobGetir(sirada.blobId); if (!bl) { belgeGuncelle(sirada.id, { specDurum: 'atlandi' }); return; } gorsel = await blobToDataUrl(bl); }
        else if (sirada.url) { gorsel = sirada.url; }
        if (!/^(data:image|https?:\/\/)/.test(gorsel)) { belgeGuncelle(sirada.id, { specDurum: 'atlandi' }); return; }
        const r = await fetch('/api/ai/belge-spec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ad: sirada.ad, gorsel }) });
        const d = await r.json();
        if (r.ok && d.spec) belgeGuncelle(sirada.id, { spec: d.spec, specTarih: new Date().toISOString(), specDurum: 'islendi' });
        else belgeGuncelle(sirada.id, { specDurum: 'hata' });
      } catch { belgeGuncelle(sirada.id, { specDurum: 'hata' }); }
      finally { calisiyor.current = false; }
    })();
  }, [belgeler, belgeGuncelle]);

  return null;
}
