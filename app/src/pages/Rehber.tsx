import { useMemo, useState } from 'react';
import {
  BookOpenText, Search, ListChecks, AlertTriangle, FileText, Wallet, XCircle, Lightbulb,
  Compass, Stamp, FileSignature, Rocket, Mountain, Layers, Building, Home, Blocks, Cable,
  PaintRoller, DoorOpen, Bath, Gem, Plug, CookingPot, Waves, Trees, BadgeCheck, Sparkles,
} from 'lucide-react';
import { PageHeader, Card, CardBody, Badge, Input } from '../components/ui';
import { REHBER_GENEL, REHBER_FAZLAR, type RehberBolum } from '../data/rehber';

const IKONLAR: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Compass, Stamp, FileSignature, Wallet, Rocket, Mountain, Layers, Building, Home, Brick: Blocks,
  Cable, PaintRoller, DoorOpen, Bath, Gem, Plug, CookingPot, Waves, Trees, BadgeCheck,
};
const ikonGetir = (ad?: string) => (ad && IKONLAR[ad]) || BookOpenText;

function Blok({ baslik, ikon, tone, maddeler, sirali }: {
  baslik: string; ikon: React.ReactNode; tone: string; maddeler?: string[]; sirali?: boolean;
}) {
  if (!maddeler || maddeler.length === 0) return null;
  const Liste = sirali ? 'ol' : 'ul';
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <p className="flex items-center gap-2 font-semibold text-sm mb-2.5">{ikon} {baslik}</p>
      <Liste className={`space-y-1.5 text-sm ${sirali ? 'list-decimal pl-5' : ''}`}>
        {maddeler.map((m, i) => (
          <li key={i} className={sirali ? '' : 'flex gap-2'}>
            {!sirali && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-40 shrink-0" />}
            <span>{m}</span>
          </li>
        ))}
      </Liste>
    </div>
  );
}

export default function Rehber() {
  const [aktifId, setAktifId] = useState<string>(REHBER_GENEL[0].id);
  const [arama, setArama] = useState('');

  const tumu = useMemo(() => [...REHBER_GENEL, ...REHBER_FAZLAR], []);
  const aktif: RehberBolum = tumu.find((b) => b.id === aktifId) ?? tumu[0];

  const ara = (liste: RehberBolum[]) =>
    arama.trim()
      ? liste.filter((b) => (b.baslik + ' ' + b.ozet + ' ' + b.giris).toLocaleLowerCase('tr').includes(arama.toLocaleLowerCase('tr')))
      : liste;
  const genel = ara(REHBER_GENEL);
  const fazlar = ara(REHBER_FAZLAR);

  const SekmeListe = (
    <nav className="space-y-1">
      {genel.length > 0 && <p className="px-3 pt-1 pb-1.5 text-xs font-semibold text-metin-yum uppercase tracking-wide">Temel Bilgiler</p>}
      {genel.map((b) => {
        const Ikon = ikonGetir(b.ikon);
        return (
          <button key={b.id} onClick={() => setAktifId(b.id)}
            className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition cursor-pointer ${aktif.id === b.id ? 'bg-marka-500 text-white' : 'text-metin hover:bg-zemin'}`}>
            <Ikon size={16} /> <span className="truncate">{b.baslik}</span>
          </button>
        );
      })}
      {fazlar.length > 0 && <p className="px-3 pt-3 pb-1.5 text-xs font-semibold text-metin-yum uppercase tracking-wide">Fazlar (Sırayla)</p>}
      {fazlar.map((b) => {
        const Ikon = ikonGetir(b.ikon);
        return (
          <button key={b.id} onClick={() => setAktifId(b.id)}
            className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition cursor-pointer ${aktif.id === b.id ? 'bg-marka-500 text-white' : 'text-metin hover:bg-zemin'}`}>
            <Ikon size={16} /> <span className="truncate">{b.baslik}</span>
          </button>
        );
      })}
      {genel.length === 0 && fazlar.length === 0 && <p className="px-3 py-4 text-sm text-metin-yum">Sonuç bulunamadı.</p>}
    </nav>
  );

  const AktifIkon = ikonGetir(aktif.ikon);

  return (
    <>
      <PageHeader
        baslik="İnşaat Rehberi"
        aciklama="Sıfırdan, adım adım — yapay zekânın senin için hazırladığı inşaat el kitabı"
        sag={<Badge tone="amber"><Sparkles size={13} /> &nbsp;AI tarafından yazıldı</Badge>}
      />

      <div className="mb-5 max-w-md relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-metin-yum" />
        <Input placeholder="Rehberde ara… (örn. su yalıtımı, izin, beton)" value={arama} onChange={(e) => setArama(e.target.value)} className="pl-9" />
      </div>

      {/* Mobil: bölüm seçici */}
      <div className="lg:hidden mb-4">
        <Card><CardBody className="py-3 max-h-72 overflow-y-auto">{SekmeListe}</CardBody></Card>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Masaüstü sol liste */}
        <Card className="hidden lg:block sticky top-6">
          <CardBody className="py-3 max-h-[calc(100vh-140px)] overflow-y-auto">{SekmeListe}</CardBody>
        </Card>

        {/* İçerik */}
        <Card>
          <CardBody className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-marka-50 text-marka-600 shrink-0"><AktifIkon size={22} /></div>
              <div>
                <h2 className="text-xl font-bold text-metin">{aktif.baslik}</h2>
                <p className="text-sm text-metin-yum mt-0.5">{aktif.ozet}</p>
              </div>
            </div>

            <p className="text-[15px] leading-relaxed text-metin">{aktif.giris}</p>

            <Blok baslik="Adım Adım Yapılışı" ikon={<ListChecks size={16} className="text-blue-600" />} tone="border-blue-100 bg-blue-50/50 text-blue-900" maddeler={aktif.adimlar} sirali />
            <Blok baslik="Dikkat Edilecekler" ikon={<AlertTriangle size={16} className="text-marka-600" />} tone="border-marka-200 bg-marka-50 text-marka-900" maddeler={aktif.dikkat} />
            <Blok baslik="İzinler / Formlar / Evraklar" ikon={<FileText size={16} className="text-slate-600" />} tone="border-cizgi bg-zemin text-metin" maddeler={aktif.izinlerFormlar} />
            <Blok baslik="Fiyatlandırma Mantığı" ikon={<Wallet size={16} className="text-emerald-600" />} tone="border-emerald-100 bg-emerald-50/60 text-emerald-900" maddeler={aktif.fiyatlama} />
            <Blok baslik="Sık Yapılan Hatalar" ikon={<XCircle size={16} className="text-red-600" />} tone="border-red-100 bg-red-50/60 text-red-900" maddeler={aktif.hatalar} />
            <Blok baslik="Püf Noktaları" ikon={<Lightbulb size={16} className="text-amber-500" />} tone="border-amber-100 bg-amber-50/50 text-amber-900" maddeler={aktif.ipuclari} />

            <div className="pt-2 border-t border-cizgi flex items-center gap-2 text-xs text-metin-yum">
              <Sparkles size={13} className="text-marka-500" />
              Bu rehber yapay zekâ tarafından hazırlandı. Canlı soru-cevap asistanı bir sonraki aşamada eklenecek.
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
