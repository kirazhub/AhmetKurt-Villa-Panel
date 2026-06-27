import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Send, Loader2, Sparkles, AlertTriangle, KeyRound, RefreshCw, FileDown, Download, Trash2, FileText, MessageSquareText, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, Badge } from '../components/ui';
import { tl, bugun, tarih } from '../lib/format';
import { pdfUret, raporListe, raporSil, raporUrl, type RaporMeta } from '../lib/pdf';
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

// AI'ya gönderilecek anlık panel özeti + AKILLI belge/spec seçimi
function baglamKur(s: ReturnType<typeof useStore.getState>, soru?: string): string {
  const { proje, fazlar, isKalemleri, taseronlar, odemeler, dersler, sunucuDosyalar, projeAnaliz } = s;
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

  // Analiz edilmiş belgeler
  const specli = sunucuDosyalar.filter((d) => d.spec);
  const belgeBaslik = specli.length
    ? specli.map((d) => `  - ${d.ad}: ${(d.spec || '').split('\n')[0].replace(/^Belge türü:\s*/i, '').slice(0, 80)}`).join('\n')
    : '  (henüz analiz edilmiş belge yok)';
  const analizMetni = projeAnaliz?.metin ? `\nPROJE GENELİ ANALİZ (bütünleşik):\n${projeAnaliz.metin.slice(0, 8000)}` : '';

  // AKILLI SEÇİM: sorudaki kelimelere göre ilgili paftaların TAM spec'i
  let ilgili = '';
  if (soru) {
    const kelimeler = soru.toLowerCase().split(/[^a-zçğıöşü0-9]+/).filter((k) => k.length >= 4);
    const eslesen = specli.filter((d) => {
      const metin = ((d.spec || '') + ' ' + (d.ad || '')).toLowerCase();
      return kelimeler.some((k) => metin.includes(k));
    }).slice(0, 30);
    if (eslesen.length) {
      ilgili = `\n\nSORUYLA İLGİLİ PAFTALARIN TAM TEKNİK ANALİZİ — CEVABINI KESİNLİKLE BUNLARDAN VER, uydurma; rakam/ölçü/adet bunlarda yoksa "ilgili paftada bu bilgi yok" de:\n` +
        eslesen.map((d) => `### ${d.ad}\n${(d.spec || '').slice(0, 2800)}`).join('\n\n');
    }
  }

  return `PROJE: ${proje.ad} — ${proje.konum}
GENEL İLERLEME: %${ilerleme}
BÜTÇE: planlanan ${tl(plan)}, gerçekleşen ${tl(ger)}, fark ${tl(plan - ger)}
TAŞERON SAYISI: ${taseronlar.length}
TOPLAM ÖDENEN: ${tl(odemeler.reduce((t, o) => t + o.tutar, 0))}
GECİKEN İŞ: ${geciken.length ? geciken.map((g) => g.ad).join(', ') : 'yok'}
FAZ DURUMLARI:
${fazSatir}
ÖĞRENİLEN DERSLER (hatırla ve kararlarında kullan):
${dersSatir}

YÜKLÜ VE ANALİZ EDİLMİŞ PAFTALAR (${specli.length} adet — mimari, statik, tesisat, elektrik):
${belgeBaslik}${analizMetni}${ilgili}`;
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
  const [raporlar, setRaporlar] = useState<RaporMeta[]>([]);
  const [pdfYap, setPdfYap] = useState<number | null>(null);
  const [gecmis, setGecmis] = useState<{ id: string; baslik: string; soru: string; cevap: string; tarih: string }[]>([]);
  const [acikG, setAcikG] = useState<Record<string, boolean>>({});
  const sonRef = useRef<HTMLDivElement>(null);

  const raporlariYenile = () => raporListe().then(setRaporlar).catch(() => {});
  const gecmisYenile = () => fetch('/api/sohbet/liste').then((r) => r.json()).then((d) => setGecmis(d.sohbetler || [])).catch(() => {});
  const dosyalariYenile = useStore((s) => s.dosyalariYenile);
  useEffect(() => { raporlariYenile(); gecmisYenile(); dosyalariYenile(); }, [dosyalariYenile]);

  const mesajPdf = async (i: number) => {
    setPdfYap(i);
    try {
      const m = mesajlar[i];
      const soru = i > 0 && mesajlar[i - 1].role === 'user' ? mesajlar[i - 1].icerik : '';
      await pdfUret('AI Yanıtı — ' + new Date().toLocaleDateString('tr-TR'), (soru ? `Soru: ${soru}\n\n` : '') + m.icerik, 'asistan', soru.slice(0, 90));
      await raporlariYenile();
    } catch { alert('PDF oluşturulamadı.'); }
    setPdfYap(null);
  };
  const raporuSil = async (id: string) => { if (!confirm('Bu PDF arşivden silinsin mi?')) return; await raporSil(id); raporlariYenile(); };

  const [gPdf, setGPdf] = useState<string | null>(null);
  const gecmisPdf = async (k: { id: string; baslik: string; soru: string; cevap: string }) => {
    setGPdf(k.id);
    try { await pdfUret('AI Yanıtı — ' + k.baslik.slice(0, 40), `Soru: ${k.soru}\n\n${k.cevap}`, 'asistan', k.baslik); await raporlariYenile(); } catch { alert('PDF oluşturulamadı.'); }
    setGPdf(null);
  };
  const gecmisSil = async (id: string) => { if (!confirm('Bu soru-cevap silinsin mi?')) return; await fetch('/api/sohbet/sil', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); gecmisYenile(); };

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
      const baglam = baglamKur(useStore.getState(), soru);
      const r = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesajlar: yeni, baglam }),
      });
      const d = await r.json();
      const cevap = r.ok ? d.cevap : `Bir sorun oldu: ${d.hata || 'bilinmeyen'}`;
      setMesajlar((m) => [...m, { role: 'assistant', icerik: cevap }]);
      if (r.ok && d.cevap) {
        fetch('/api/sohbet/yukle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ soru, cevap: d.cevap, baslik: soru }) })
          .then(() => gecmisYenile()).catch(() => {});
      }
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
                  {m.role === 'assistant' && (
                    <button onClick={() => mesajPdf(i)} disabled={pdfYap === i} className="mt-2 inline-flex items-center gap-1.5 text-xs text-marka-600 hover:text-marka-700 cursor-pointer">
                      {pdfYap === i ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />} PDF indir
                    </button>
                  )}
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

      {/* Soru-Cevap Geçmişi (kalıcı) */}
      <Card className="mt-5"><CardBody>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-metin flex items-center gap-2"><MessageSquareText size={16} className="text-marka-500" /> Soru-Cevap Geçmişi <span className="text-xs font-normal text-metin-yum">({gecmis.length} kayıt, kalıcı)</span></p>
          <Button variant="ghost" size="sm" onClick={gecmisYenile}><RefreshCw size={14} /></Button>
        </div>
        {gecmis.length === 0 ? (
          <p className="text-sm text-metin-yum">Henüz kayıt yok. Sorduğun her soru cevabıyla birlikte burada <b>kalıcı</b> saklanır; tekrar girince görürsün.</p>
        ) : (
          <div className="divide-y divide-cizgi">
            {gecmis.map((k) => {
              const acik = !!acikG[k.id];
              return (
                <div key={k.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => setAcikG((s) => ({ ...s, [k.id]: !acik }))} className="flex-1 min-w-0 text-left flex items-start gap-2 cursor-pointer">
                      {acik ? <ChevronUp size={16} className="text-marka-500 shrink-0 mt-0.5" /> : <ChevronDown size={16} className="text-metin-yum shrink-0 mt-0.5" />}
                      <div className="min-w-0"><p className="font-medium text-metin text-sm">{k.baslik}</p><p className="text-xs text-metin-yum">{tarih(k.tarih)}</p></div>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => gecmisPdf(k)} disabled={gPdf === k.id} className="inline-flex items-center gap-1 text-xs text-marka-600 hover:text-marka-700 border border-cizgi rounded-lg px-2 py-1.5">{gPdf === k.id ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />} PDF</button>
                      <button onClick={() => gecmisSil(k.id)} className="text-metin-yum hover:text-rose-600 p-1.5"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  {acik && (
                    <div className="mt-2 ml-6 space-y-2">
                      <div className="rounded-lg bg-marka-500 text-white text-sm px-3 py-2 whitespace-pre-wrap inline-block max-w-full">{k.soru}</div>
                      <div className="rounded-lg bg-zemin text-metin text-sm px-3 py-2"><Bicimli metin={k.cevap} /></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardBody></Card>

      {/* PDF Arşivi */}
      <Card className="mt-5"><CardBody>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-metin flex items-center gap-2"><FileText size={16} className="text-marka-500" /> PDF Arşivi <span className="text-xs font-normal text-metin-yum">(sunucuda, her cihazdan indir)</span></p>
          <Button variant="ghost" size="sm" onClick={raporlariYenile}><RefreshCw size={14} /></Button>
        </div>
        {raporlar.length === 0 ? (
          <p className="text-sm text-metin-yum">Henüz PDF yok. Bir AI yanıtının altındaki <b>"PDF indir"</b> ile oluşturduğun belgeler burada birikir.</p>
        ) : (
          <div className="divide-y divide-cizgi">
            {raporlar.map((r) => (
              <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0"><p className="font-medium text-metin text-sm truncate">{r.ad}</p><p className="text-xs text-metin-yum">{tarih(r.tarih)} · {r.tur}{r.boyut ? ` · ${Math.round(r.boyut / 1024)} KB` : ''}</p></div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a href={raporUrl(r.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-marka-600 hover:text-marka-700 border border-cizgi rounded-lg px-2.5 py-1.5"><Download size={13} /> İndir</a>
                  <button onClick={() => raporuSil(r.id)} className="text-metin-yum hover:text-rose-600 p-1.5"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody></Card>
    </>
  );
}
