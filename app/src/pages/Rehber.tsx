import { useEffect, useMemo, useState } from 'react';
import {
  BookOpenText, Search, ListChecks, AlertTriangle, FileText, Wallet, XCircle, Lightbulb,
  Compass, Stamp, FileSignature, Rocket, Mountain, Layers, Building, Home, Blocks, Cable,
  PaintRoller, DoorOpen, Bath, Gem, Plug, CookingPot, Waves, Trees, BadgeCheck, Sparkles,
  Loader2, MessageCircleQuestion, RefreshCw,
} from 'lucide-react';
import { PageHeader, Card, CardBody, Badge, Input, Button } from '../components/ui';
import { useStore } from '../store/useStore';
import { projeBaglami } from '../lib/aiBaglam';
import { REHBER_GENEL, REHBER_FAZLAR, type RehberBolum } from '../data/rehber';

const IKONLAR: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Compass, Stamp, FileSignature, Wallet, Rocket, Mountain, Layers, Building, Home, Brick: Blocks,
  Cable, PaintRoller, DoorOpen, Bath, Gem, Plug, CookingPot, Waves, Trees, BadgeCheck,
};
const ikonGetir = (ad?: string) => (ad && IKONLAR[ad]) || BookOpenText;

// AI brifing istek metni — İstanbul piyasası + sıralı sorular + beklenen cevaplar
const BRIFING_PROMPT = (baslik: string) =>
`"${baslik}" konusu için bana İSTANBUL PİYASASINA göre, acemiye uygun, detaylı bir brifing yaz. Tam olarak şu 3 başlıkta olsun:

**1) BİLGİ METNİ:** Bu konuda nelere dikkat etmeliyim; hangi anlaşmaları yapmalı, hangi izin/evrakları almalıyım; İstanbul'da yaklaşık maliyet/piyasa mantığı nasıldır; alınması gereken önlemler neler; ve benim aklıma gelmeyecek, bilmediğim ama bilmem gereken önemli noktalar neler. Akıcı paragraflar.

**2) SORMAM GEREKEN SORULAR:** İşi yapacak kişiye/taşerona/ustaya/yetkiliye sormam gereken soruları 1, 2, 3, 4, 5... diye NUMARALI, alt alta yaz.

**3) ALMAM GEREKEN CEVAPLAR:** Yukarıdaki her soru için iyi/doğru cevabın ne olması gerektiğini, kandırılmamam için yine 1, 2, 3... NUMARALI yaz.

Türkçe ve net ol. Uydurma kesin rakam verme; piyasa aralığı/mantığı ver.`;

// Basit metin biçimleyici (kalın + satır)
function MetinGoster({ metin }: { metin: string }) {
  return (
    <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-metin">
      {metin.split('\n').map((satir, i) => {
        const p = satir.split(/(\*\*[^*]+\*\*)/g);
        return <div key={i}>{p.map((x, j) => x.startsWith('**') && x.endsWith('**') ? <strong key={j}>{x.slice(2, -2)}</strong> : <span key={j}>{x}</span>)}</div>;
      })}
    </div>
  );
}

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

  const rehberBrifing = useStore((s) => s.rehberBrifing);
  const brifingKaydet = useStore((s) => s.rehberBrifingKaydet);
  const dosyalariYenile = useStore((s) => s.dosyalariYenile);
  useEffect(() => { dosyalariYenile(); }, [dosyalariYenile]);
  const [brifingYukleniyor, setBrifingYukleniyor] = useState(false);
  const brifing = rehberBrifing[aktif.id];

  const brifingUret = async () => {
    setBrifingYukleniyor(true);
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baglam: projeBaglami(useStore.getState(), { konu: aktif.baslik }), mesajlar: [{ role: 'user', icerik: BRIFING_PROMPT(aktif.baslik) }] }),
      });
      const d = await r.json();
      if (r.ok && d.cevap) brifingKaydet(aktif.id, d.cevap);
      else brifingKaydet(aktif.id, `Brifing alınamadı: ${d.hata || 'AI bağlantısı yok. AI Asistan sayfasından kurulumu kontrol et.'}`);
    } catch { brifingKaydet(aktif.id, 'Bağlanılamadı. AI sunucusu çalışıyor mu?'); }
    setBrifingYukleniyor(false);
  };

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

            {/* Canlı AI brifingi — İstanbul piyasası + sorulacak sorular + beklenen cevaplar */}
            <div className="rounded-xl border-2 border-dashed border-marka-200 bg-marka-50/40 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="flex items-center gap-2 font-semibold text-sm text-marka-800">
                  <MessageCircleQuestion size={17} /> İstanbul Piyasası Brifingi + Sorulacak Sorular
                </p>
                {brifing && !brifingYukleniyor && (
                  <Button variant="ghost" size="sm" onClick={brifingUret}><RefreshCw size={14} /> Yenile</Button>
                )}
              </div>

              {!brifing && !brifingYukleniyor && (
                <>
                  <p className="text-sm text-metin-yum mb-3">
                    Bu konuda yapay zekâdan İstanbul piyasasına göre detaylı bir brifing iste: dikkat edilecekler, anlaşmalar, izinler, maliyet mantığı, önlemler ve <b>işi yapacak kişiye sorman gereken sorular + almanız gereken cevaplar</b> (numaralı).
                  </p>
                  <Button onClick={brifingUret}><Sparkles size={15} /> AI'dan detaylı brifing iste</Button>
                </>
              )}
              {brifingYukleniyor && (
                <p className="text-sm text-marka-800 flex items-center gap-2 py-2"><Loader2 size={15} className="animate-spin" /> AI İstanbul piyasasına göre brifing hazırlıyor…</p>
              )}
              {brifing && !brifingYukleniyor && (
                <div className="rounded-lg bg-white border border-marka-100 p-4 mt-1"><MetinGoster metin={brifing} /></div>
              )}
            </div>

            <div className="pt-2 border-t border-cizgi flex items-center gap-2 text-xs text-metin-yum">
              <Sparkles size={13} className="text-marka-500" />
              Statik rehber + canlı AI brifingi birlikte çalışır. Brifing bir kez üretilince saklanır; "Yenile" ile güncelleyebilirsin.
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
