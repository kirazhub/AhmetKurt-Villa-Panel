import { useEffect, useMemo, useState } from 'react';
import { Brain, GraduationCap, Sparkles, Loader2, Plus, Trash2, AlertTriangle, CheckCircle2, Info, KeyRound, Save, Skull, BookOpen, FileDown, ChevronDown, ChevronUp, XCircle, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, Badge, Field, Input, Select, Textarea, Modal, EmptyState } from '../components/ui';
import { tarih, bugun } from '../lib/format';
import { projeBaglami } from '../lib/aiBaglam';
import { pdfUret } from '../lib/pdf';
import { DERS_ETIKET, type DersTur } from '../types';

// ---- tipler ----
interface TestSoru { soru: string; secenekler: string[]; dogruIndex: number; aciklama?: string; }
interface DersVeri { konu: string; seviye?: string; icerik: string; test?: TestSoru[]; }
interface EgitimKayit { id: string; tur: 'okul' | 'acimasiz'; baslik: string; icerik: string; test?: TestSoru[] | null; tarih: string; }
type Sekme = 'okul' | 'acimasiz' | 'hafiza';

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

// ---- interaktif mini test ----
function MiniTest({ test }: { test: TestSoru[] }) {
  const [secim, setSecim] = useState<Record<number, number>>({});
  const [kontrol, setKontrol] = useState(false);
  if (!test?.length) return null;
  const dogruSayi = test.filter((s, i) => secim[i] === s.dogruIndex).length;
  return (
    <div className="mt-4 rounded-xl border border-marka-100 bg-marka-50/40 p-4">
      <p className="font-semibold text-metin flex items-center gap-2 mb-3"><GraduationCap size={16} className="text-marka-500" /> Mini Test ({test.length} soru)</p>
      <div className="space-y-4">
        {test.map((s, i) => (
          <div key={i}>
            <p className="font-medium text-metin text-sm mb-1.5">{i + 1}. {s.soru}</p>
            <div className="space-y-1.5">
              {s.secenekler.map((sec, j) => {
                const secili = secim[i] === j;
                const dogru = j === s.dogruIndex;
                let stil = 'border-cizgi bg-white hover:bg-zemin';
                if (kontrol) {
                  if (dogru) stil = 'border-emerald-300 bg-emerald-50 text-emerald-800';
                  else if (secili) stil = 'border-rose-300 bg-rose-50 text-rose-800';
                } else if (secili) stil = 'border-marka-400 bg-marka-50';
                return (
                  <button key={j} disabled={kontrol} onClick={() => setSecim((p) => ({ ...p, [i]: j }))}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition flex items-center gap-2 cursor-pointer ${stil}`}>
                    <span className="font-semibold shrink-0">{String.fromCharCode(65 + j)}</span>
                    <span className="flex-1">{sec}</span>
                    {kontrol && dogru && <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />}
                    {kontrol && secili && !dogru && <XCircle size={15} className="text-rose-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
            {kontrol && s.aciklama && <p className="text-xs text-metin-yum mt-1.5 pl-1"><Info size={11} className="inline mb-0.5" /> {s.aciklama}</p>}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        {!kontrol ? (
          <Button size="sm" onClick={() => setKontrol(true)} disabled={Object.keys(secim).length < test.length}>Cevapları kontrol et</Button>
        ) : (
          <>
            <Badge tone={dogruSayi === test.length ? 'yesil' : dogruSayi > test.length / 2 ? 'amber' : 'kirmizi'}>{dogruSayi}/{test.length} doğru</Badge>
            <Button variant="ghost" size="sm" onClick={() => { setKontrol(false); setSecim({}); }}>Tekrar dene</Button>
          </>
        )}
      </div>
    </div>
  );
}

const TUR_STIL: Record<DersTur, { tone: 'kirmizi' | 'yesil' | 'mavi'; ikon: React.ReactNode }> = {
  hata: { tone: 'kirmizi', ikon: <AlertTriangle size={14} /> },
  dogru: { tone: 'yesil', ikon: <CheckCircle2 size={14} /> },
  genel: { tone: 'mavi', ikon: <Info size={14} /> },
};

export default function Ogrenme() {
  const { dersler, dersEkle, dersSil, fazlar, dosyalariYenile } = useStore();
  const [sekme, setSekme] = useState<Sekme>('okul');
  const [hazir, setHazir] = useState<boolean | null>(null);

  // ortak arşiv
  const [arsiv, setArsiv] = useState<EgitimKayit[]>([]);
  const arsiviYenile = () => fetch('/api/egitim/liste').then((r) => r.json()).then((d) => setArsiv(d.kayitlar || [])).catch(() => {});
  useEffect(() => {
    fetch('/api/ai/health').then((r) => r.json()).then((d) => setHazir(!!d.yapilandirilmis)).catch(() => setHazir(false));
    dosyalariYenile(); arsiviYenile();
  }, [dosyalariYenile]);

  const okulArsiv = useMemo(() => arsiv.filter((x) => x.tur === 'okul'), [arsiv]);
  const acimasizArsiv = useMemo(() => arsiv.filter((x) => x.tur === 'acimasiz'), [arsiv]);

  // ---- İnşaat Okulu ----
  const [ders, setDers] = useState<DersVeri | null>(null);
  const [dersYuk, setDersYuk] = useState(false);
  const [dersKayitli, setDersKayitli] = useState(false);
  const dersUret = async () => {
    setDersYuk(true); setDers(null); setDersKayitli(false);
    try {
      const oncekiBasliklar = okulArsiv.map((x) => x.baslik);
      const baglam = projeBaglami(useStore.getState(), { soru: 'inşaat eğitim faz aşama' });
      const r = await fetch('/api/ai/ders-uret', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baglam, oncekiBasliklar, dersNo: okulArsiv.length + 1 }) });
      const d = await r.json();
      if (r.ok && d.ders) setDers(d.ders);
      else setDers({ konu: 'Ders alınamadı', icerik: d.hata || 'Bağlantı hatası', test: [] });
    } catch { setDers({ konu: 'Hata', icerik: 'Bağlanılamadı.', test: [] }); }
    setDersYuk(false);
  };
  const dersiKaydet = async () => {
    if (!ders) return;
    await fetch('/api/egitim/yukle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tur: 'okul', baslik: ders.konu, icerik: ders.icerik, test: ders.test || null, ekstra: { seviye: ders.seviye } }) });
    setDersKayitli(true); arsiviYenile();
  };
  const dersPdf = (k: { konu?: string; baslik?: string; icerik: string; test?: TestSoru[] | null }) => {
    const testMetni = (k.test || []).map((t, i) => `${i + 1}. ${t.soru}\n${t.secenekler.map((s, j) => `   ${String.fromCharCode(65 + j)}) ${s}`).join('\n')}\nDoğru: ${String.fromCharCode(65 + t.dogruIndex)}${t.aciklama ? ' — ' + t.aciklama : ''}`).join('\n\n');
    pdfUret('İnşaat Okulu — ' + (k.konu || k.baslik || 'Ders'), k.icerik + (testMetni ? '\n\n## Mini Test\n' + testMetni : ''), 'okul', k.konu || k.baslik);
  };

  // ---- Acımasız Danışman ----
  const [acSoru, setAcSoru] = useState('');
  const [acCevap, setAcCevap] = useState('');
  const [acYuk, setAcYuk] = useState(false);
  const [acKayitli, setAcKayitli] = useState(false);
  const acimasizSor = async () => {
    setAcYuk(true); setAcCevap(''); setAcKayitli(false);
    try {
      const baglam = projeBaglami(useStore.getState(), { soru: acSoru || 'genel durum risk hata taşeron ödeme' });
      const r = await fetch('/api/ai/acimasiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baglam, soru: acSoru }) });
      const d = await r.json();
      setAcCevap(r.ok ? d.cevap : (d.hata || 'Bağlantı hatası'));
    } catch { setAcCevap('Bağlanılamadı.'); }
    setAcYuk(false);
  };
  const acimasizKaydet = async () => {
    if (!acCevap) return;
    await fetch('/api/egitim/yukle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tur: 'acimasiz', baslik: acSoru ? acSoru.slice(0, 80) : 'Acımasız değerlendirme — ' + tarih(bugun()), icerik: acCevap }) });
    setAcKayitli(true); arsiviYenile();
  };

  // ---- Hafıza notları (eski) ----
  const [ekleModal, setEkleModal] = useState(false);
  const [yeni, setYeni] = useState({ tur: 'genel' as DersTur, baslik: '', icerik: '', fazId: '' });
  const elleEkle = () => {
    if (!yeni.baslik) return;
    dersEkle({ tarih: bugun(), tur: yeni.tur, baslik: yeni.baslik, icerik: yeni.icerik, fazId: yeni.fazId || undefined, kaynak: 'kullanici' });
    setYeni({ tur: 'genel', baslik: '', icerik: '', fazId: '' });
    setEkleModal(false);
  };

  // ---- arşiv kartı ----
  const [acik, setAcik] = useState<Record<string, boolean>>({});
  const arsivKaydiSil = async (id: string) => { if (!confirm('Bu kayıt silinsin mi?')) return; await fetch('/api/egitim/sil', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); arsiviYenile(); };

  const sekmeButon = (k: Sekme, etiket: string, ikon: React.ReactNode) => (
    <button onClick={() => setSekme(k)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${sekme === k ? 'bg-marka-500 text-white shadow-sm' : 'bg-white border border-cizgi text-metin hover:bg-zemin'}`}>{ikon}{etiket}</button>
  );

  const ArsivListe = ({ liste, tur }: { liste: EgitimKayit[]; tur: 'okul' | 'acimasiz' }) => (
    liste.length === 0 ? (
      <p className="text-sm text-metin-yum">Henüz kayıt yok. {tur === 'okul' ? 'Ürettiğin dersleri kaydet, burada birikir.' : 'Aldığın değerlendirmeleri kaydet, burada birikir.'}</p>
    ) : (
      <div className="divide-y divide-cizgi">
        {liste.map((k) => {
          const a = !!acik[k.id];
          return (
            <div key={k.id} className="py-2.5">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => setAcik((s) => ({ ...s, [k.id]: !a }))} className="flex-1 min-w-0 text-left flex items-start gap-2 cursor-pointer">
                  {a ? <ChevronUp size={16} className="text-marka-500 shrink-0 mt-0.5" /> : <ChevronDown size={16} className="text-metin-yum shrink-0 mt-0.5" />}
                  <div className="min-w-0"><p className="font-medium text-metin text-sm">{k.baslik}</p><p className="text-xs text-metin-yum">{tarih(k.tarih)}</p></div>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => dersPdf(k)} className="inline-flex items-center gap-1 text-xs text-marka-600 hover:text-marka-700 border border-cizgi rounded-lg px-2 py-1.5"><FileDown size={12} /> PDF</button>
                  <button onClick={() => arsivKaydiSil(k.id)} className="text-metin-yum hover:text-rose-600 p-1.5"><Trash2 size={13} /></button>
                </div>
              </div>
              {a && (
                <div className="mt-2 ml-6">
                  <div className="rounded-lg bg-zemin p-3"><MetinGoster metin={k.icerik} /></div>
                  {k.test && k.test.length > 0 && <MiniTest test={k.test} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )
  );

  return (
    <>
      <PageHeader baslik="Öğrenme & Hafıza" aciklama="İnşaat Okulu seni sıfırdan eğitir; Acımasız Danışman gerçeği söyler" />

      <div className="flex flex-wrap gap-2 mb-5">
        {sekmeButon('okul', 'İnşaat Okulu', <BookOpen size={16} />)}
        {sekmeButon('acimasiz', 'Acımasız Danışman', <Skull size={16} />)}
        {sekmeButon('hafiza', `Hafıza Notları (${dersler.length})`, <Brain size={16} />)}
      </div>

      {hazir === false && sekme !== 'hafiza' && (
        <Card className="mb-5"><CardBody><p className="text-sm text-metin-yum flex items-center gap-2"><KeyRound size={15} /> AI bağlantısı için AI Asistan sayfasındaki kurulumu tamamla.</p></CardBody></Card>
      )}

      {/* ===== İNŞAAT OKULU ===== */}
      {sekme === 'okul' && (
        <>
          <Card className="mb-5"><CardBody>
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
              <div>
                <p className="flex items-center gap-2 font-semibold text-metin"><GraduationCap size={18} className="text-marka-500" /> Sıradaki Ders</p>
                <p className="text-sm text-metin-yum mt-0.5">Sıfırdan başlayıp adım adım: her ders detaylı anlatım + püf noktaları + sık hatalar + kandırılma tuzakları + mini test. ({okulArsiv.length} ders tamamlandı)</p>
              </div>
              {hazir !== false && <Button onClick={dersUret} disabled={dersYuk}>{dersYuk ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />} {okulArsiv.length ? 'Sıradaki dersi öğret' : 'İlk dersi başlat'}</Button>}
            </div>
            {dersYuk && !ders ? (
              <p className="text-sm text-metin-yum flex items-center gap-2 mt-3"><Loader2 size={14} className="animate-spin" /> Ders hazırlanıyor…</p>
            ) : ders ? (
              <div className="mt-3 rounded-xl bg-marka-50/50 border border-marka-100 p-4">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <p className="font-semibold text-metin flex items-center gap-2">{ders.konu} {ders.seviye && <Badge tone="amber">{ders.seviye}</Badge>}</p>
                  <div className="flex gap-2">
                    {!dersKayitli ? <Button size="sm" onClick={dersiKaydet}><Save size={14} /> Dersi kaydet</Button> : <Badge tone="yesil"><CheckCircle2 size={12} />&nbsp;Kaydedildi</Badge>}
                    <Button variant="ghost" size="sm" onClick={() => dersPdf(ders)}><FileDown size={14} /> PDF</Button>
                  </div>
                </div>
                <MetinGoster metin={ders.icerik} />
                {ders.test && ders.test.length > 0 && <MiniTest test={ders.test} />}
              </div>
            ) : null}
          </CardBody></Card>

          <h3 className="font-semibold text-metin mb-3 flex items-center gap-2"><BookOpen size={16} /> Tamamlanan Dersler ({okulArsiv.length})</h3>
          <Card><CardBody><ArsivListe liste={okulArsiv} tur="okul" /></CardBody></Card>
        </>
      )}

      {/* ===== ACIMASIZ DANIŞMAN ===== */}
      {sekme === 'acimasiz' && (
        <>
          <Card className="mb-5"><CardBody>
            <p className="flex items-center gap-2 font-semibold text-metin mb-1"><Skull size={18} className="text-rose-500" /> Acımasız Danışman</p>
            <p className="text-sm text-metin-yum mb-3">Yağ çekmez, gerçeği söyler. Nerede kazık yiyorsun, hangi hatayı yapıyorsun, taşeron/malzeme/ödeme hırsızlık riskleri, insan yönetimi — projenin gerçek durumuna göre.</p>
            <Textarea value={acSoru} onChange={(e) => setAcSoru(e.target.value)} placeholder="İstersen özel bir konu yaz (örn. 'demir taşeronu fazla metraj yazıyor olabilir mi?'). Boş bırakırsan genel acımasız değerlendirme yapar." />
            {hazir !== false && <div className="mt-3"><Button onClick={acimasizSor} disabled={acYuk} variant="soft">{acYuk ? <Loader2 size={15} className="animate-spin" /> : <Skull size={15} />} Acımasızca değerlendir</Button></div>}
            {acYuk && !acCevap ? (
              <p className="text-sm text-metin-yum flex items-center gap-2 mt-3"><Loader2 size={14} className="animate-spin" /> Gerçekler yazılıyor…</p>
            ) : acCevap ? (
              <div className="mt-4 rounded-xl bg-rose-50/60 border border-rose-100 p-4">
                <MetinGoster metin={acCevap} />
                <div className="mt-3 flex gap-2">
                  {!acKayitli ? <Button size="sm" onClick={acimasizKaydet}><Save size={14} /> Kaydet</Button> : <Badge tone="yesil"><CheckCircle2 size={12} />&nbsp;Kaydedildi</Badge>}
                  <Button variant="ghost" size="sm" onClick={() => pdfUret('Acımasız Değerlendirme', acCevap, 'acimasiz', acSoru.slice(0, 80))}><FileDown size={14} /> PDF</Button>
                </div>
              </div>
            ) : null}
          </CardBody></Card>

          <h3 className="font-semibold text-metin mb-3 flex items-center gap-2"><Skull size={16} /> Geçmiş Değerlendirmeler ({acimasizArsiv.length})</h3>
          <Card><CardBody><ArsivListe liste={acimasizArsiv} tur="acimasiz" /></CardBody></Card>
        </>
      )}

      {/* ===== HAFIZA NOTLARI (eski dersler — AI bağlamında hatırlanır) ===== */}
      {sekme === 'hafiza' && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-metin-yum">Buraya kaydettiğin notlar, <b>tüm sekmelerdeki AI</b> tarafından otomatik hatırlanır (hata/doğru iş/genel bilgi).</p>
            <Button variant="soft" size="sm" onClick={() => setEkleModal(true)}><Plus size={15} /> Not ekle</Button>
          </div>
          {dersler.length === 0 ? (
            <Card><EmptyState ikon={<Brain size={26} />} baslik="Hafıza boş" aciklama="Yapılan hataları, doğru işleri ve önemli bilgileri buraya kaydet. AI bunları sonraki kararlarında hatırlar." /></Card>
          ) : (
            <div className="space-y-3">
              {[...dersler].reverse().map((d) => {
                const st = TUR_STIL[d.tur];
                return (
                  <Card key={d.id}><CardBody className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-metin flex items-center gap-2 flex-wrap">
                        <Badge tone={st.tone}>{st.ikon}&nbsp;{DERS_ETIKET[d.tur]}</Badge>
                        {d.baslik}
                        {d.kaynak === 'ai' && <Badge tone="amber"><Sparkles size={11} />&nbsp;AI</Badge>}
                      </p>
                      {d.icerik && <p className="text-sm text-metin-yum mt-1 whitespace-pre-wrap">{d.icerik}</p>}
                      <p className="text-xs text-metin-yum mt-1">{tarih(d.tarih)}</p>
                    </div>
                    <button onClick={() => dersSil(d.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer shrink-0"><Trash2 size={15} /></button>
                  </CardBody></Card>
                );
              })}
            </div>
          )}
          <Modal acik={ekleModal} kapat={() => setEkleModal(false)} baslik="Yeni Not / Ders">
            <div className="space-y-4">
              <Field label="Tür"><Select value={yeni.tur} onChange={(e) => setYeni({ ...yeni, tur: e.target.value as DersTur })}><option value="hata">Hatadan Ders</option><option value="dogru">Doğru İş</option><option value="genel">Genel Bilgi</option></Select></Field>
              <Field label="Başlık"><Input value={yeni.baslik} onChange={(e) => setYeni({ ...yeni, baslik: e.target.value })} placeholder="örn. Beton dökümünde numune unutuldu" /></Field>
              <Field label="Açıklama"><Textarea value={yeni.icerik} onChange={(e) => setYeni({ ...yeni, icerik: e.target.value })} placeholder="Ne oldu, ne öğrendik, bir daha nasıl önleriz?" /></Field>
              <Field label="İlgili faz (ops.)"><Select value={yeni.fazId} onChange={(e) => setYeni({ ...yeni, fazId: e.target.value })}><option value="">—</option>{fazlar.map((f) => <option key={f.id} value={f.id}>{f.ad}</option>)}</Select></Field>
              <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEkleModal(false)}>Vazgeç</Button><Button onClick={elleEkle}>Kaydet</Button></div>
            </div>
          </Modal>
        </>
      )}
    </>
  );
}
