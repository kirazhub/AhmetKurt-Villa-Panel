import { useEffect, useMemo, useState } from 'react';
import { MessagesSquare, Send, Loader2, Globe, Trash2, Search, ExternalLink, KeyRound, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, Badge, EmptyState } from '../components/ui';
import { tl, tarih, bugun } from '../lib/format';
import { toplamPlanlanan, toplamGerceklesen, genelIlerleme, gecikenler } from '../lib/calc';
import type { Danisma } from '../types';

const HIZLI = [
  'Fayans/seramik m² fiyatı İstanbul Avrupa Yakası — ekonomik / orta / üst kalite?',
  'İstinat duvarı m³ maliyeti Arnavutköy civarı ne kadar olur?',
  'Alüminyum doğrama m² fiyatı ve teslim süresi (İstanbul) nedir?',
  'Bu bölgede güvenilir betonarme taşeronunu nasıl bulur, nasıl seçerim?',
];

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

export default function Danisma() {
  const s = useStore();
  const danismalar = s.danismalar;
  const danismaSet = s.danismaSet;
  const [soru, setSoru] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hazir, setHazir] = useState<boolean | null>(null);
  const [arama, setArama] = useState('');
  const [acik, setAcik] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/ai/health').then((r) => r.json()).then((d) => setHazir(!!d.yapilandirilmis)).catch(() => setHazir(false));
    fetch('/api/danisma/gecmis').then((r) => r.json()).then((d) => { if (Array.isArray(d)) danismaSet(d); }).catch(() => {});
  }, [danismaSet]);

  const baglamKur = () => {
    const plan = toplamPlanlanan(s.isKalemleri), ger = toplamGerceklesen(s.isKalemleri);
    const geciken = gecikenler(s.isKalemleri, bugun());
    return `PROJE: ${s.proje.ad} — ${s.proje.konum}\nGENEL İLERLEME: %${Math.round(genelIlerleme(s.isKalemleri))}\nBÜTÇE: planlanan ${tl(plan)}, gerçekleşen ${tl(ger)}\nGECİKEN İŞ: ${geciken.length ? geciken.map((g) => g.ad).join(', ') : 'yok'}\nTAŞERON SAYISI: ${s.taseronlar.length}`;
  };

  const sor = async (metin: string) => {
    const q = metin.trim();
    if (!q || yukleniyor) return;
    setYukleniyor(true); setSoru('');
    try {
      const r = await fetch('/api/danisma/sor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ soru: q, baglam: baglamKur() }) });
      const d = await r.json();
      if (r.ok) { danismaSet([...danismalar, d as Danisma]); setAcik((a) => ({ ...a, [d.id]: true })); }
      else alert('Danışma alınamadı: ' + (d.hata || ''));
    } catch { alert('Bağlanılamadı. AI sunucusu çalışıyor mu?'); }
    setYukleniyor(false);
  };

  const sil = async (id: string) => {
    if (!confirm('Bu soru-cevap silinsin mi?')) return;
    try { await fetch('/api/danisma/' + id, { method: 'DELETE' }); } catch { /* yoksay */ }
    danismaSet(danismalar.filter((x) => x.id !== id));
  };

  const liste = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr');
    const f = q ? danismalar.filter((d) => (d.soru + ' ' + d.cevap).toLocaleLowerCase('tr').includes(q)) : danismalar;
    return [...f].reverse(); // en yeni üstte
  }, [danismalar, arama]);

  if (hazir === false) {
    return (
      <>
        <PageHeader baslik="Danışma" aciklama="Web araştırmalı, İstanbul piyasası odaklı danışmanlık" sag={<Globe size={16} className="text-marka-500" />} />
        <Card><CardBody className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-marka-50 text-marka-600"><KeyRound size={22} /></div>
          <div><h3 className="font-semibold text-metin">AI bağlantısı gerekli</h3><p className="text-sm text-metin-yum">AI Asistan sayfasındaki kurulumu tamamla, sonra buraya dön.</p></div>
        </CardBody></Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        baslik="Danışma"
        aciklama="Her konuyu sor — AI internetten İstanbul/Avrupa Yakası piyasasını araştırıp iç verinle harmanlar"
        sag={<Badge tone="amber"><Globe size={13} />&nbsp;Web + İstanbul odaklı</Badge>}
      />

      {/* Soru kutusu */}
      <Card className="mb-5">
        <CardBody>
          <form onSubmit={(e) => { e.preventDefault(); sor(soru); }} className="flex flex-col gap-3">
            <textarea
              value={soru} onChange={(e) => setSoru(e.target.value)}
              placeholder="Sorunu yaz… (örn. Arnavutköy'de fayans ustası m² işçilik fiyatı; ekonomik/orta/üst)"
              className="w-full rounded-xl border border-cizgi bg-white px-4 py-3 text-sm outline-none focus:border-marka-400 focus:ring-2 focus:ring-marka-100 min-h-[80px] resize-y"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-metin-yum flex items-center gap-1"><Globe size={13} /> Cevap internetten araştırılır (30-60 sn sürebilir)</span>
              <Button type="submit" disabled={yukleniyor || !soru.trim()}>{yukleniyor ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Sor</Button>
            </div>
          </form>
          {danismalar.length === 0 && !yukleniyor && (
            <div className="flex flex-wrap gap-2 mt-3">
              {HIZLI.map((h) => <button key={h} onClick={() => sor(h)} className="text-left text-xs px-3 py-2 rounded-xl border border-cizgi bg-white hover:bg-zemin text-metin transition cursor-pointer">{h}</button>)}
            </div>
          )}
        </CardBody>
      </Card>

      {yukleniyor && (
        <Card className="mb-5"><CardBody className="flex items-center gap-3 text-metin-yum">
          <Loader2 className="animate-spin text-marka-500" size={18} />
          <div><p className="font-medium text-metin">İnternetten araştırıyor…</p><p className="text-sm">İstanbul/Avrupa Yakası fiyatları ve güncel bilgiler taranıyor.</p></div>
        </CardBody></Card>
      )}

      {/* Geçmiş */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-semibold text-metin flex items-center gap-2"><MessagesSquare size={16} /> Danışma Geçmişi ({danismalar.length})</h3>
        {danismalar.length > 0 && (
          <div className="relative w-56 max-w-[50%]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-metin-yum" />
            <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Geçmişte ara…" className="w-full rounded-xl border border-cizgi bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-marka-400" />
          </div>
        )}
      </div>

      {danismalar.length === 0 ? (
        <Card><EmptyState ikon={<MessagesSquare size={26} />} baslik="Henüz soru sormadın" aciklama="Yukarıdan bir soru sor; cevap kalıcı olarak kaydedilir, istediğinde tekrar görürsün." /></Card>
      ) : (
        <div className="space-y-3">
          {liste.map((d) => {
            const open = acik[d.id] ?? false;
            return (
              <Card key={d.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => setAcik((a) => ({ ...a, [d.id]: !open }))} className="flex-1 text-left cursor-pointer">
                      <p className="font-medium text-metin flex items-start gap-2">
                        <span className="text-marka-500 mt-0.5">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                        <span>{d.soru}</span>
                      </p>
                      <p className="text-xs text-metin-yum mt-1 ml-6">{tarih(d.tarih)}</p>
                    </button>
                    <button onClick={() => sil(d.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer shrink-0"><Trash2 size={15} /></button>
                  </div>
                  {open && (
                    <div className="mt-3 ml-6 space-y-3">
                      <div className="rounded-xl bg-zemin border border-cizgi p-4"><MetinGoster metin={d.cevap} /></div>
                      {d.kaynaklar && d.kaynaklar.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-metin-yum mb-1.5">KAYNAKLAR</p>
                          <div className="flex flex-col gap-1">
                            {d.kaynaklar.map((k, i) => (
                              <a key={i} href={k.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1.5 truncate"><ExternalLink size={13} /> {k.baslik || k.url}</a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-5 text-xs text-metin-yum flex items-center gap-1.5"><Sparkles size={13} className="text-marka-500" /> Tüm soru-cevaplar sunucuda kalıcı kaydedilir — hiçbiri kaybolmaz.</p>
    </>
  );
}
