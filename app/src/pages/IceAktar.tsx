import { useRef, useState } from 'react';
import { Sparkles, Upload, CheckCircle2, AlertTriangle, FileJson, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, Badge, EmptyState, TableWrap } from '../components/ui';
import { tl, sayi } from '../lib/format';
import { BIRIM_ETIKET, type IceAktarPaket } from '../types';

// ============================================================================
// İÇE AKTAR (AI) — OpenCode asistanının ürettiği ice-aktar.json dosyasını okur,
// ÖNCE önizleme gösterir, kullanıcı onaylayınca panele EKLER (üstüne yazmaz).
// ============================================================================

function paketGecerliMi(x: unknown): x is IceAktarPaket {
  if (!x || typeof x !== 'object') return false;
  const p = x as Record<string, unknown>;
  const enAzBir =
    Array.isArray(p.isKalemleri) || Array.isArray(p.teklifler) || Array.isArray(p.taseronlar);
  return enAzBir;
}

const ORNEK = `{
  "kaynak": "mimari/zemin-kat-plani.pdf",
  "uretim": "2026-06-25T10:00:00.000Z",
  "not": "Zemin kat metrajı çıkarıldı",
  "isKalemleri": [
    { "fazId": "f5", "ad": "Zemin kat iç bölme duvarı", "birim": "m2",
      "metraj": 145, "birimFiyat": 480, "durum": "baslamadi", "ilerleme": 0 }
  ]
}`;

export default function IceAktar() {
  const fazlar = useStore((s) => s.fazlar);
  const iceAktarPaket = useStore((s) => s.iceAktarPaket);
  const fileRef = useRef<HTMLInputElement>(null);

  const [paket, setPaket] = useState<IceAktarPaket | null>(null);
  const [hata, setHata] = useState('');
  const [sonuc, setSonuc] = useState<{ eklenenIs: number; eklenenTeklif: number; eklenenTaseron: number } | null>(null);

  const dosyaSec = (f: File) => {
    setHata(''); setSonuc(null); setPaket(null);
    const r = new FileReader();
    r.onload = () => {
      try {
        const veri = JSON.parse(String(r.result));
        if (!paketGecerliMi(veri)) {
          setHata('Dosya beklenen biçimde değil. İçinde isKalemleri / teklifler / taseronlar listelerinden en az biri olmalı.');
          return;
        }
        setPaket(veri);
      } catch {
        setHata('Dosya okunamadı — geçerli bir JSON değil.');
      }
    };
    r.readAsText(f);
  };

  const onayla = () => {
    if (!paket) return;
    const r = iceAktarPaket(paket);
    setSonuc(r);
    setPaket(null);
  };

  const fazAdi = (id?: string) => fazlar.find((f) => f.id === id)?.ad ?? '—';
  const sayilar = paket
    ? { is: paket.isKalemleri?.length ?? 0, tk: paket.teklifler?.length ?? 0, ts: paket.taseronlar?.length ?? 0 }
    : null;

  return (
    <>
      <PageHeader
        baslik="İçe Aktar (AI)"
        aciklama="OpenCode asistanının teknik dosyalardan çıkardığı veriyi panele aktarın"
        sag={
          <>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden
              onChange={(e) => e.target.files?.[0] && dosyaSec(e.target.files[0])} />
            <Button variant="primary" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> ice-aktar.json seç
            </Button>
          </>
        }
      />

      {/* Nasıl çalışır */}
      <Card className="mb-5">
        <CardBody>
          <p className="font-medium text-metin flex items-center gap-2"><Sparkles size={16} className="text-marka-500" /> Nasıl çalışır?</p>
          <ol className="list-decimal list-inside text-sm text-metin-yum mt-2 space-y-1">
            <li>Teknik dosyaları <code className="text-metin">proje-dosyalari</code> klasörüne atın.</li>
            <li>OpenCode'a deyin: <em>"Mimari projeden metraj çıkar ve ice-aktar.json üret."</em></li>
            <li>Üretilen <code className="text-metin">ice-aktar.json</code>'u yukarıdan seçin.</li>
            <li>Önizlemeyi kontrol edip <strong>Onayla</strong>'ya basın. Onaylamadan hiçbir şey eklenmez.</li>
          </ol>
          <details className="mt-3">
            <summary className="text-sm text-marka-600 cursor-pointer">Örnek ice-aktar.json yapısı</summary>
            <pre className="mt-2 text-xs bg-zemin rounded-xl p-3 overflow-x-auto text-metin">{ORNEK}</pre>
          </details>
        </CardBody>
      </Card>

      {/* Hata */}
      {hata && (
        <Card className="mb-5 border-red-200">
          <CardBody className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-red-50 text-red-600"><AlertTriangle size={18} /></div>
            <div className="flex-1"><p className="font-medium text-metin">Dosya alınamadı</p><p className="text-sm text-metin-yum mt-0.5">{hata}</p></div>
            <button onClick={() => setHata('')} className="p-1.5 rounded-lg hover:bg-zemin text-metin-yum"><X size={16} /></button>
          </CardBody>
        </Card>
      )}

      {/* Başarı */}
      {sonuc && (
        <Card className="mb-5 border-emerald-200">
          <CardBody className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={18} /></div>
            <div className="flex-1">
              <p className="font-medium text-metin">Panele eklendi</p>
              <p className="text-sm text-metin-yum mt-0.5">
                {sonuc.eklenenIs} iş kalemi, {sonuc.eklenenTeklif} teklif, {sonuc.eklenenTaseron} taşeron eklendi.
                İş Takibi / Teklifler / Taşeronlar sayfalarından görebilirsiniz.
              </p>
            </div>
            <button onClick={() => setSonuc(null)} className="p-1.5 rounded-lg hover:bg-zemin text-metin-yum"><X size={16} /></button>
          </CardBody>
        </Card>
      )}

      {/* Önizleme */}
      {paket && sayilar && (
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="amber">{sayilar.is} iş kalemi</Badge>
                <Badge tone="mavi">{sayilar.tk} teklif</Badge>
                <Badge tone="yesil">{sayilar.ts} taşeron</Badge>
                <span className="text-sm text-metin-yum">Kaynak: {paket.kaynak || '—'}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPaket(null)}>Vazgeç</Button>
                <Button variant="primary" size="sm" onClick={onayla}><CheckCircle2 size={16} /> Onayla ve Ekle</Button>
              </div>
            </div>
            {paket.not && <p className="text-sm text-metin-yum mb-4">Not: {paket.not}</p>}

            {!!sayilar.is && (
              <>
                <h3 className="font-semibold text-metin mb-2">İş Kalemleri</h3>
                <TableWrap>
                  <table className="min-w-full text-sm mb-6">
                    <thead><tr className="text-left text-metin-yum border-b border-cizgi">
                      <th className="py-2 px-3 font-medium">Ad</th><th className="py-2 px-3 font-medium">Faz</th>
                      <th className="py-2 px-3 font-medium">Birim</th><th className="py-2 px-3 font-medium">Metraj</th>
                      <th className="py-2 px-3 font-medium">Birim Fiyat</th>
                    </tr></thead>
                    <tbody>
                      {paket.isKalemleri!.map((k, i) => (
                        <tr key={i} className="border-b border-cizgi/60">
                          <td className="py-2 px-3 text-metin">{k.ad}</td>
                          <td className="py-2 px-3 text-metin-yum">{fazAdi(k.fazId)}</td>
                          <td className="py-2 px-3 text-metin-yum">{BIRIM_ETIKET[k.birim] ?? k.birim}</td>
                          <td className="py-2 px-3 text-metin-yum">{sayi(k.metraj, 2)}</td>
                          <td className="py-2 px-3 text-metin-yum">{tl(k.birimFiyat)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </>
            )}

            {!!sayilar.tk && (
              <>
                <h3 className="font-semibold text-metin mb-2">Teklifler</h3>
                <TableWrap>
                  <table className="min-w-full text-sm mb-6">
                    <thead><tr className="text-left text-metin-yum border-b border-cizgi">
                      <th className="py-2 px-3 font-medium">Kalem</th><th className="py-2 px-3 font-medium">Taşeron</th><th className="py-2 px-3 font-medium">Tutar</th>
                    </tr></thead>
                    <tbody>
                      {paket.teklifler!.map((t, i) => (
                        <tr key={i} className="border-b border-cizgi/60">
                          <td className="py-2 px-3 text-metin">{t.kalemAdi}</td>
                          <td className="py-2 px-3 text-metin-yum">{t.taseronAdi ?? '—'}</td>
                          <td className="py-2 px-3 text-metin-yum">{tl(t.tutar)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </>
            )}

            {!!sayilar.ts && (
              <>
                <h3 className="font-semibold text-metin mb-2">Taşeronlar</h3>
                <TableWrap>
                  <table className="min-w-full text-sm">
                    <thead><tr className="text-left text-metin-yum border-b border-cizgi">
                      <th className="py-2 px-3 font-medium">Ad</th><th className="py-2 px-3 font-medium">Firma</th><th className="py-2 px-3 font-medium">Uzmanlık</th>
                    </tr></thead>
                    <tbody>
                      {paket.taseronlar!.map((t, i) => (
                        <tr key={i} className="border-b border-cizgi/60">
                          <td className="py-2 px-3 text-metin">{t.ad}</td>
                          <td className="py-2 px-3 text-metin-yum">{t.firma ?? '—'}</td>
                          <td className="py-2 px-3 text-metin-yum">{t.uzmanlik}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* Boş durum */}
      {!paket && !sonuc && !hata && (
        <Card>
          <CardBody>
            <EmptyState
              ikon={<FileJson size={28} />}
              baslik="Henüz dosya seçilmedi"
              aciklama="Yukarıdaki 'ice-aktar.json seç' butonuyla OpenCode'un ürettiği veriyi yükleyin."
            />
          </CardBody>
        </Card>
      )}
    </>
  );
}
