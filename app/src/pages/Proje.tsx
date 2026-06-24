import { Building2, MapPin, Ruler, FileText, RotateCcw, Download, Upload } from 'lucide-react';
import { useRef } from 'react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, Badge } from '../components/ui';
import { sayi, tarih } from '../lib/format';

// REFERANS SAYFA — diğer modüller bu görünüm diline uysun.
export default function Proje() {
  const proje = useStore((s) => s.proje);
  const disaAktar = useStore((s) => s.disaAktar);
  const iceAktar = useStore((s) => s.iceAktar);
  const sifirla = useStore((s) => s.sifirla);
  const fileRef = useRef<HTMLInputElement>(null);

  const yedekAl = () => {
    const blob = new Blob([disaAktar()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `villa-panel-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  const yedekYukle = (f: File) => {
    const r = new FileReader();
    r.onload = () => { if (iceAktar(String(r.result))) alert('Yedek yüklendi.'); else alert('Dosya okunamadı.'); };
    r.readAsText(f);
  };

  const satirlar: [string, string][] = [
    ['Yapı Sahibi', proje.sahibi],
    ['Müteahhit', proje.muteahhit],
    ['Şantiye Şefi', proje.santiyeSefi],
    ['Yapı Denetim', proje.yapiDenetim],
    ['Mimari Proje', proje.mimar],
    ['Ada / Parsel', proje.adaParsel],
    ['Taşıyıcı Sistem', proje.tasiyiciSistem],
    ['Yapı Sınıfı', proje.yapiSinifi],
    ['Ruhsat', `${proje.ruhsatNo} · ${tarih(proje.ruhsatTarihi)}`],
  ];

  return (
    <>
      <PageHeader
        baslik="Proje Künyesi"
        aciklama="Onaylı projeden alınan resmi bilgiler"
        sag={
          <>
            <Button variant="soft" size="sm" onClick={yedekAl}><Download size={16} /> Yedek Al</Button>
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}><Upload size={16} /> Yükle</Button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && yedekYukle(e.target.files[0])} />
          </>
        }
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card><CardBody className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-marka-50 text-marka-600"><Ruler size={20} /></div><div><p className="text-metin-yum text-sm">Parsel Alanı</p><p className="text-xl font-bold">{sayi(proje.parselAlani, 2)} m²</p></div></CardBody></Card>
        <Card><CardBody className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><Building2 size={20} /></div><div><p className="text-metin-yum text-sm">Toplam İnşaat</p><p className="text-xl font-bold">{sayi(proje.toplamInsaatAlani)} m²</p></div></CardBody></Card>
        <Card><CardBody className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><FileText size={20} /></div><div><p className="text-metin-yum text-sm">Kat Adedi</p><p className="text-xl font-bold">{proje.katAdedi} kat</p></div></CardBody></Card>
      </div>

      <Card className="mb-6">
        <CardBody>
          <h2 className="font-semibold text-metin mb-1">{proje.ad}</h2>
          <p className="flex items-center gap-1.5 text-sm text-metin-yum mb-4"><MapPin size={14} /> {proje.konum}</p>
          <dl className="divide-y divide-cizgi">
            {satirlar.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="text-sm text-metin-yum">{k}</dt>
                <dd className="text-sm font-medium text-metin text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-metin flex items-center gap-2"><Badge tone="kirmizi">Dikkat</Badge> Verileri sıfırla</p>
            <p className="text-sm text-metin-yum mt-1">Tüm girdiğin veriler silinip başlangıç durumuna döner. Önce yedek al!</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => confirm('Tüm veriler sıfırlansın mı? Geri alınamaz.') && sifirla()}>
            <RotateCcw size={16} /> Sıfırla
          </Button>
        </CardBody>
      </Card>
    </>
  );
}
