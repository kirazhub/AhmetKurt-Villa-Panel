import { useEffect, useRef, useState } from 'react';
import { Ruler, Loader2, RefreshCw, CheckCircle2, AlertTriangle, FileSearch, ChevronDown, ChevronUp, Sparkles, BrainCircuit, Play } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, EmptyState } from '../components/ui';
import { dosyaOnizleme } from '../lib/sunucuGorsel';
import { tarih } from '../lib/format';

function AnalizMetni({ metin }: { metin: string }) {
  return (
    <div className="text-sm text-metin leading-relaxed space-y-1.5">
      {metin.split('\n').map((satir, i) => {
        const t = satir.trim();
        if (!t) return null;
        if (t.startsWith('## ')) return <h4 key={i} className="font-bold text-metin mt-3 mb-1 text-[15px]">{t.replace(/^##\s*/, '')}</h4>;
        if (t.startsWith('# ')) return <h3 key={i} className="font-bold text-metin mt-3 text-base">{t.replace(/^#\s*/, '')}</h3>;
        return <p key={i} className="whitespace-pre-wrap">{t.replace(/\*\*/g, '')}</p>;
      })}
    </div>
  );
}

export default function Specler() {
  const sunucuDosyalar = useStore((s) => s.sunucuDosyalar);
  const dosyalariYenile = useStore((s) => s.dosyalariYenile);
  const proje = useStore((s) => s.proje);
  const projeAnaliz = useStore((s) => s.projeAnaliz);
  const projeAnalizKaydet = useStore((s) => s.projeAnalizKaydet);

  const [durum, setDurum] = useState<{ aktif: boolean; toplam: number; islenen: number; hata: number; bekleyen: number } | null>(null);
  const [analizYukleniyor, setAnalizYukleniyor] = useState(false);
  const [acik, setAcik] = useState<Record<string, boolean>>({});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const liste = sunucuDosyalar.filter((d) => d.tur !== 'drone');
  const specli = liste.filter((d) => d.spec);

  const durumGetir = () => fetch('/api/dosya/isle-durum').then((r) => r.json()).then(setDurum).catch(() => {});

  useEffect(() => {
    dosyalariYenile(); durumGetir();
    fetch('/api/dosya/isle-basla', { method: 'POST' }).catch(() => {}); // bekleyen varsa sunucu işlemeye başlasın
    timer.current = setInterval(() => { durumGetir(); dosyalariYenile(); }, 5000);
    return () => { if (timer.current) clearInterval(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isleBaslat = () => fetch('/api/dosya/isle-basla', { method: 'POST' }).then(() => durumGetir());

  const projeAnalizCikar = async () => {
    setAnalizYukleniyor(true);
    try {
      const specler = specli.map((d) => `## ${d.ad}\n${d.spec}`).join('\n\n');
      const r = await fetch('/api/ai/proje-analiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ specler, proje: JSON.stringify(proje) }) });
      const d = await r.json();
      if (r.ok && d.analiz) projeAnalizKaydet({ metin: d.analiz, tarih: new Date().toISOString() });
      else alert('Analiz çıkarılamadı: ' + (d.hata || ''));
    } catch { alert('Bağlantı hatası'); }
    setAnalizYukleniyor(false);
  };

  if (liste.length === 0) {
    return (
      <>
        <PageHeader baslik="Teknik Specler" aciklama="Sunucudaki plan/belgelerden AI'nın çıkardığı tüm teknik bilgiler" />
        <Card><EmptyState ikon={<Ruler size={28} />} baslik="Henüz görsel yok" aciklama="Foto & Belge'den plan/çizim yükle (veya tarayıcıdaki görselleri sunucuya taşı). Sunucu her görseli otomatik, arka planda derinlemesine analiz eder — tarayıcın kapalıyken bile." /></Card>
      </>
    );
  }

  return (
    <>
      <PageHeader baslik="Teknik Specler" aciklama="Sunucu, her görseli arka planda mimar+statik+tesisat gözüyle analiz eder; sonra hepsini karşılaştırır" />

      <div className="mb-4 text-sm flex items-center gap-2 text-metin-yum flex-wrap">
        <Sparkles size={15} className="text-marka-500" />
        {durum && durum.bekleyen > 0
          ? <span className="flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Sunucu analiz ediyor… <b>{durum.islenen}/{durum.toplam}</b> hazır, {durum.bekleyen} sırada{durum.hata ? ` · ${durum.hata} hata` : ''}</span>
          : <span><b>{specli.length}/{liste.length}</b> görsel analiz edildi.{durum && durum.hata ? ` (${durum.hata} hata)` : ''} Tarayıcını kapatsan bile sunucu işlemeye devam eder.</span>}
        {durum && durum.bekleyen > 0 && !durum.aktif && <Button size="sm" variant="soft" onClick={isleBaslat}><Play size={13} /> Devam et</Button>}
      </div>

      {/* Proje Geneli Analiz */}
      <Card className="mb-5"><CardBody>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <p className="font-semibold text-metin flex items-center gap-2"><BrainCircuit size={17} className="text-marka-500" /> Proje Geneli Analiz (karşılaştırmalı)</p>
          <Button size="sm" onClick={projeAnalizCikar} disabled={analizYukleniyor || specli.length === 0}>
            {analizYukleniyor ? <Loader2 size={14} className="animate-spin" /> : projeAnaliz ? <RefreshCw size={14} /> : <BrainCircuit size={14} />} {projeAnaliz ? 'Yeniden analiz et' : 'Tüm planları karşılaştır'}
          </Button>
        </div>
        <p className="text-xs text-metin-yum">Opus, analiz edilmiş {specli.length} görseli birleştirip karşılaştırır: mimari + taşıyıcı sistem + tesisat + kot/eğim, paftalar arası çelişki/eksik tespiti.</p>
        {analizYukleniyor && <p className="text-sm text-metin-yum flex items-center gap-2 mt-3"><Loader2 size={14} className="animate-spin" /> Tüm planlar birlikte değerlendiriliyor… (1-2 dk)</p>}
        {projeAnaliz && !analizYukleniyor && (
          <div className="mt-3 border-t border-cizgi/60 pt-3">
            <p className="text-xs text-metin-yum mb-2">{tarih(projeAnaliz.tarih)} tarihli analiz</p>
            <AnalizMetni metin={projeAnaliz.metin} />
          </div>
        )}
      </CardBody></Card>

      <div className="space-y-4">
        {liste.map((d) => {
          const gizli = acik[d.id] === false;
          return (
            <Card key={d.id}>
              <CardBody>
                <div className="flex gap-4">
                  <img src={dosyaOnizleme(d.id)} alt="" className="w-20 h-20 rounded-lg object-cover border border-cizgi shrink-0" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-semibold text-metin truncate flex items-center gap-2"><FileSearch size={15} className="text-marka-500 shrink-0" /> {d.ad}</p>
                        <p className="text-xs text-metin-yum mt-0.5">
                          {d.spec ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={12} /> Analiz edildi{d.specTarih ? ' · ' + tarih(d.specTarih) : ''}</span>
                            : d.specDurum === 'hata' ? <span className="inline-flex items-center gap-1 text-rose-600"><AlertTriangle size={12} /> Okunamadı</span>
                            : <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Sırada / işleniyor…</span>}
                        </p>
                      </div>
                      {d.spec && <Button size="sm" variant="ghost" onClick={() => setAcik((a) => ({ ...a, [d.id]: gizli ? true : false }))}>{gizli ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</Button>}
                    </div>
                    {d.spec && !gizli && <div className="mt-3 text-sm text-metin whitespace-pre-wrap leading-relaxed border-t border-cizgi/60 pt-3">{d.spec}</div>}
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <p className="mt-5 text-xs text-metin-yum">AI yalnızca görselde okunabilen bilgiyi çıkarır, tahmin yürütmez. Net/yüksek çözünürlüklü görsellerde daha çok detay çıkar.</p>
    </>
  );
}
