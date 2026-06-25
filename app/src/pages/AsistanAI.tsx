import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Send, Loader2, Sparkles, AlertTriangle, KeyRound, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, Badge } from '../components/ui';
import { tl, bugun } from '../lib/format';
import { toplamPlanlanan, toplamGerceklesen, genelIlerleme, fazOzet, gecikenler } from '../lib/calc';

interface Mesaj { role: 'user' | 'assistant'; icerik: string; }

const HIZLI = [
  'Şu an hangi aşamadayım ve sıradaki adımım ne olmalı?',
  'Bu projede en riskli noktalar neler, nelere dikkat etmeliyim?',
  'Maliyeti nasıl düşürebilirim? Somut öneriler ver.',
  'Bugünün günlük raporunu yaz.',
  'Bu haftanın yapılacaklar listesini çıkar.',
  'Geciken işler var mı? Ne yapmalıyım?',
  'Bütçem nasıl gidiyor, bütçe aşımı riski var mı?',
  'Önümüzdeki fazda nelere dikkat etmeliyim?',
];

// AI'ya gönderilecek anlık panel özeti
function baglamKur(s: ReturnType<typeof useStore.getState>): string {
  const { proje, fazlar, isKalemleri, taseronlar, odemeler, dersler } = s;
  const plan = toplamPlanlanan(isKalemleri);
  const ger = toplamGerceklesen(isKalemleri);
  const ilerleme = Math.round(genelIlerleme(isKalemleri));
  const geciken = gecikenler(isKalemleri, bugun());
  const fazSatir = fazlar.map((f) => {
    const oz = fazOzet(isKalemleri.filter((k) => k.fazId === f.id));
    return `  - ${f.ad}: %${Math.round(oz.ilerleme)} (${oz.tamamlanan}/${oz.toplam} iş bitti)`;
  }).join('\n');
  const dersSatir = dersler.length
    ? dersler.slice(-15).map((d) => `  - [${d.tur}] ${d.baslik}: ${d.icerik}`).join('\n')
    : '  (henüz ders yok)';
  return `PROJE: ${proje.ad} — ${proje.konum}
GENEL İLERLEME: %${ilerleme}
BÜTÇE: planlanan ${tl(plan)}, gerçekleşen ${tl(ger)}, fark ${tl(plan - ger)}
TAŞERON SAYISI: ${taseronlar.length}
TOPLAM ÖDENEN: ${tl(odemeler.reduce((t, o) => t + o.tutar, 0))}
GECİKEN İŞ: ${geciken.length ? geciken.map((g) => g.ad).join(', ') : 'yok'}
FAZ DURUMLARI:
${fazSatir}
ÖĞRENİLEN DERSLER (hatırla ve kararlarında kullan):
${dersSatir}`;
}

// AI metnini basitçe biçimle (kalın **..** ve satırlar)
function Bicimli({ metin }: { metin: string }) {
  return (
    <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
      {metin.split('\n').map((satir, i) => {
        const parcalar = satir.split(/(\*\*[^*]+\*\*)/g);
        return (
          <div key={i}>
            {parcalar.map((p, j) =>
              p.startsWith('**') && p.endsWith('**')
                ? <strong key={j}>{p.slice(2, -2)}</strong>
                : <span key={j}>{p}</span>,
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AsistanAI() {
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const [girdi, setGirdi] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [analiz, setAnaliz] = useState<string>('');
  const [analizYukleniyor, setAnalizYukleniyor] = useState(false);
  const [hazir, setHazir] = useState<boolean | null>(null); // backend + key durumu
  const sonRef = useRef<HTMLDivElement>(null);

  useEffect(() => { sonRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mesajlar, yukleniyor]);

  // Sağlık kontrolü
  useEffect(() => {
    fetch('/api/ai/health')
      .then((r) => r.json())
      .then((d) => setHazir(Boolean(d.yapilandirilmis)))
      .catch(() => setHazir(false));
  }, []);

  const analizGetir = async () => {
    setAnalizYukleniyor(true);
    try {
      const baglam = baglamKur(useStore.getState());
      const r = await fetch('/api/ai/analiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baglam }) });
      const d = await r.json();
      setAnaliz(r.ok ? d.analiz : '');
    } catch { setAnaliz(''); }
    setAnalizYukleniyor(false);
  };

  useEffect(() => { if (hazir) analizGetir(); /* eslint-disable-next-line */ }, [hazir]);

  const gonder = async (metin: string) => {
    const soru = metin.trim();
    if (!soru || yukleniyor) return;
    const yeni = [...mesajlar, { role: 'user' as const, icerik: soru }];
    setMesajlar(yeni);
    setGirdi('');
    setYukleniyor(true);
    try {
      const baglam = baglamKur(useStore.getState());
      const r = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesajlar: yeni, baglam }),
      });
      const d = await r.json();
      setMesajlar((m) => [...m, { role: 'assistant', icerik: r.ok ? d.cevap : `Bir sorun oldu: ${d.hata || 'bilinmeyen'}` }]);
    } catch {
      setMesajlar((m) => [...m, { role: 'assistant', icerik: 'Bağlanılamadı. Arka uç (AI sunucusu) çalışıyor mu?' }]);
    }
    setYukleniyor(false);
  };

  const headerSag = useMemo(() => <Badge tone="amber"><Sparkles size={13} />&nbsp;Opus · OpenRouter</Badge>, []);

  // Anahtar yoksa kurulum ekranı
  if (hazir === false) {
    return (
      <>
        <PageHeader baslik="AI Asistan" aciklama="Panelin canlı yapay zekâ danışmanı" sag={headerSag} />
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-marka-50 text-marka-600"><KeyRound size={22} /></div>
              <div>
                <h3 className="font-semibold text-metin">Asistanı uyandırmak için tek anahtar lazım</h3>
                <p className="text-sm text-metin-yum">Anthropic API anahtarını ekleyince asistan anında çalışır.</p>
              </div>
            </div>
            <ol className="list-decimal pl-5 space-y-1.5 text-sm text-metin">
              <li><b>openrouter.ai</b> adresine gir, Google/GitHub ile giriş yap.</li>
              <li><b>openrouter.ai/keys</b> → <b>Create Key</b>.</li>
              <li>Çıkan anahtarı (<code>sk-or-...</code>) kopyala ve <b>bana yapıştır</b> — gerisini ben hallederim.</li>
            </ol>
            <p className="text-xs text-metin-yum">Anahtar yalnızca senin sunucunda (.env) saklanır, tarayıcıya/internete açılmaz.</p>
            <Button variant="soft" size="sm" onClick={() => location.reload()}><RefreshCw size={15} /> Anahtarı ekledim, yenile</Button>
          </CardBody>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader baslik="AI Asistan" aciklama="Projeni bilen, sana danışmanlık yapan yapay zekâ" sag={headerSag} />

      {/* Proaktif gözlemler */}
      <Card className="mb-5">
        <CardBody>
          <div className="flex items-center justify-between mb-2">
            <p className="flex items-center gap-2 font-semibold text-metin"><Sparkles size={16} className="text-marka-500" /> AI'nın Anlık Gözlemleri</p>
            <Button variant="ghost" size="sm" onClick={analizGetir} disabled={analizYukleniyor}>
              {analizYukleniyor ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Yenile
            </Button>
          </div>
          {analizYukleniyor && !analiz ? (
            <p className="text-sm text-metin-yum flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Panel inceleniyor…</p>
          ) : analiz ? (
            <div className="rounded-xl bg-marka-50 border border-marka-100 p-4 text-marka-900"><Bicimli metin={analiz} /></div>
          ) : (
            <p className="text-sm text-metin-yum">Gözlem alınamadı.</p>
          )}
        </CardBody>
      </Card>

      {/* Sohbet */}
      <Card>
        <CardBody>
          <div className="min-h-[240px] max-h-[52vh] overflow-y-auto space-y-4 mb-4">
            {mesajlar.length === 0 && (
              <div className="text-center py-8">
                <div className="inline-flex p-3 rounded-2xl bg-zemin text-metin-yum mb-3"><Bot size={26} /></div>
                <p className="text-metin font-medium">Bir şey sor, projene göre yanıtlayayım.</p>
                <p className="text-sm text-metin-yum mt-1">Aşağıdaki hazır sorulardan biriyle başlayabilirsin.</p>
              </div>
            )}
            {mesajlar.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && <div className="p-2 rounded-xl bg-marka-50 text-marka-600 h-fit shrink-0"><Bot size={18} /></div>}
                <div className={`rounded-2xl px-4 py-2.5 max-w-[80%] ${m.role === 'user' ? 'bg-marka-500 text-white' : 'bg-zemin text-metin'}`}>
                  {m.role === 'assistant' ? <Bicimli metin={m.icerik} /> : <span className="whitespace-pre-wrap">{m.icerik}</span>}
                </div>
              </div>
            ))}
            {yukleniyor && (
              <div className="flex gap-3">
                <div className="p-2 rounded-xl bg-marka-50 text-marka-600 h-fit"><Bot size={18} /></div>
                <div className="rounded-2xl px-4 py-2.5 bg-zemin text-metin-yum flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Düşünüyor…</div>
              </div>
            )}
            <div ref={sonRef} />
          </div>

          {mesajlar.length === 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {HIZLI.map((h) => (
                <button key={h} onClick={() => gonder(h)} className="text-left text-sm px-3 py-2 rounded-xl border border-cizgi bg-white hover:bg-zemin text-metin transition cursor-pointer">{h}</button>
              ))}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); gonder(girdi); }} className="flex gap-2">
            <input
              value={girdi}
              onChange={(e) => setGirdi(e.target.value)}
              placeholder="Sorunu yaz… (örn. temel betonu dökerken neye dikkat etmeliyim?)"
              className="flex-1 rounded-xl border border-cizgi bg-white px-4 py-3 text-sm outline-none focus:border-marka-400 focus:ring-2 focus:ring-marka-100"
            />
            <Button type="submit" disabled={yukleniyor || !girdi.trim()}>{yukleniyor ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</Button>
          </form>
        </CardBody>
      </Card>

      <p className="mt-4 text-xs text-metin-yum flex items-center gap-1.5">
        <AlertTriangle size={13} /> Asistan yardımcıdır, danışmanlık verir; kritik kararlarda şantiye şefin ve yapı denetimle de teyit et.
      </p>
    </>
  );
}
