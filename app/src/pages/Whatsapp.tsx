import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Loader2, Send, QrCode, CheckCircle2, RefreshCw, Inbox, LogOut, Search, Building, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { PageHeader, Card, CardBody, Button, Field, Input, Select, Textarea } from '../components/ui';
import { useStore } from '../store/useStore';
import { tarih } from '../lib/format';
import { TASERON_KATEGORILERI } from '../types';

interface Gelen { from: string; isim?: string; text: string; tarih: string; }
interface Firma { ad: string; email?: string; telefon?: string; web?: string; sehir?: string; }
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Whatsapp() {
  const gonderenProfil = useStore((s) => s.gonderenProfil);
  const [durum, setDurum] = useState<{ baglandi: boolean; qr: string | null } | null>(null);
  const [gelenler, setGelenler] = useState<Gelen[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Teklif iste (WhatsApp)
  const [kategori, setKategori] = useState('Hafriyat / Kazı');
  const [bolge, setBolge] = useState('İstanbul Avrupa Yakası / Arnavutköy');
  const [buluyor, setBuluyor] = useState(false);
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [mesaj, setMesaj] = useState('');
  const [durumlar, setDurumlar] = useState<Record<string, 'ok' | 'hata' | 'gonderiliyor'>>({});
  const [toplu, setToplu] = useState(false);

  // Manuel
  const [manuelAcik, setManuelAcik] = useState(false);
  const [mNumara, setMNumara] = useState('');
  const [mMesaj, setMMesaj] = useState('');
  const [mGonderiliyor, setMGonderiliyor] = useState(false);

  const durumGetir = () => fetch('/api/wa/durum').then((r) => r.json()).then(setDurum).catch(() => setDurum({ baglandi: false, qr: null }));
  const gelenGetir = () => fetch('/api/wa/gelenler').then((r) => r.json()).then((d) => setGelenler(d.mesajlar || [])).catch(() => {});

  useEffect(() => {
    durumGetir(); gelenGetir();
    timer.current = setInterval(() => { durumGetir(); gelenGetir(); }, 5000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const bagli = durum?.baglandi;
  const telefonlu = firmalar.filter((f) => f.telefon);

  const firmaBul = async () => {
    setBuluyor(true); setFirmalar([]); setDurumlar({});
    try {
      const imza = `${gonderenProfil.ad}\n${gonderenProfil.unvan}`;
      const r = await fetch('/api/teklif-otomatik', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kategori, bolge, imza, autoMail: false }) });
      const d = await r.json();
      if (r.ok) { setFirmalar(d.bulunan || []); setMesaj(d.waMesaj || ''); }
      else alert('Hata: ' + (d.hata || ''));
    } catch { alert('Bağlantı hatası'); }
    setBuluyor(false);
  };

  const waGonder = async (f: Firma) => {
    if (!f.telefon || !mesaj.trim()) return;
    setDurumlar((s) => ({ ...s, [f.telefon!]: 'gonderiliyor' }));
    try {
      const r = await fetch('/api/wa/gonder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numara: f.telefon, mesaj }) });
      setDurumlar((s) => ({ ...s, [f.telefon!]: r.ok ? 'ok' : 'hata' }));
      return r.ok;
    } catch { setDurumlar((s) => ({ ...s, [f.telefon!]: 'hata' })); return false; }
  };

  const sirayalGonder = async () => {
    const hedef = telefonlu.filter((f) => durumlar[f.telefon!] !== 'ok');
    if (hedef.length === 0) return;
    if (!confirm(`${hedef.length} firmaya sırayla WhatsApp gönderilecek (numaranın banlanmaması için aralarında bekleme konur). Onaylıyor musun?`)) return;
    setToplu(true);
    for (const f of hedef) {
      await waGonder(f);
      await delay(6000 + Math.random() * 4000); // 6-10 sn arası
    }
    setToplu(false);
  };

  const manuelGonder = async () => {
    if (!mNumara || !mMesaj) return;
    setMGonderiliyor(true);
    try { const r = await fetch('/api/wa/gonder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numara: mNumara, mesaj: mMesaj }) }); if (r.ok) { alert('✓ Gönderildi'); setMMesaj(''); } else alert('Gönderilemedi'); } catch { alert('Hata'); }
    setMGonderiliyor(false);
  };

  const cikis = async () => { if (!confirm('WhatsApp bağlantısı kesilsin mi?')) return; await fetch('/api/wa/cikis', { method: 'POST' }); durumGetir(); };

  return (
    <>
      <PageHeader baslik="WhatsApp Teklif" aciklama="Kendi hattından firmalara WhatsApp ile teklif iste, cevapları gör"
        sag={bagli ? <Button variant="ghost" size="sm" onClick={cikis}><LogOut size={15} /> Bağlantıyı kes</Button> : undefined} />

      {/* Bağlantı */}
      {!durum ? <Card className="mb-6"><CardBody className="flex items-center gap-2 text-metin-yum"><Loader2 size={16} className="animate-spin" /> Durum kontrol ediliyor…</CardBody></Card>
        : !bagli ? (
          <Card className="mb-6"><CardBody>
            <div className="flex items-center gap-2 font-semibold text-metin mb-3"><QrCode size={18} /> Telefonunu bağla (tek seferlik)</div>
            {durum.qr ? (
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <img src={durum.qr} alt="QR" className="w-52 h-52 border border-cizgi rounded-xl bg-white" />
                <ol className="list-decimal pl-5 text-sm text-metin space-y-1.5">
                  <li>Kullanmadığın hattın telefonunda <b>WhatsApp</b>'ı aç.</li>
                  <li><b>Ayarlar → Bağlı Cihazlar → Cihaz Bağla</b>.</li>
                  <li>Bu <b>QR'ı okut</b>; ekran otomatik "bağlı" olacak.</li>
                </ol>
              </div>
            ) : <p className="text-sm text-metin-yum flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> QR hazırlanıyor… <button onClick={durumGetir} className="underline">yenile</button></p>}
          </CardBody></Card>
        ) : <p className="mb-5 text-sm text-emerald-700 flex items-center gap-1.5"><CheckCircle2 size={16} /> WhatsApp <b>bağlı</b>.</p>}

      {bagli && (
        <>
          {/* WhatsApp ile Teklif İste */}
          <Card className="mb-6"><CardBody className="space-y-3">
            <p className="font-semibold text-metin flex items-center gap-2"><Search size={16} /> WhatsApp ile Teklif İste</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Hangi konuda?"><Select value={kategori} onChange={(e) => setKategori(e.target.value)}>{TASERON_KATEGORILERI.map((k) => <option key={k} value={k}>{k}</option>)}</Select></Field>
              <Field label="Bölge"><Input value={bolge} onChange={(e) => setBolge(e.target.value)} /></Field>
            </div>
            <Button onClick={firmaBul} disabled={buluyor}>{buluyor ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} AI ile firma bul</Button>
            {buluyor && <p className="text-sm text-metin-yum flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Firmalar araştırılıyor + kısa mesaj hazırlanıyor… (1-2 dk)</p>}

            {firmalar.length > 0 && (
              <>
                <Field label="WhatsApp mesajı (kısa, fiyat odaklı — düzenleyebilirsin)"><Textarea value={mesaj} onChange={(e) => setMesaj(e.target.value)} className="min-h-[100px] text-sm" /></Field>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm text-metin-yum">{telefonlu.length} telefonlu firma bulundu</span>
                  <Button variant="soft" size="sm" onClick={sirayalGonder} disabled={toplu || telefonlu.length === 0}>{toplu ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Sırayla hepsine gönder</Button>
                </div>
                <div className="space-y-1.5">
                  {telefonlu.map((f, i) => {
                    const d = waGonderilenDurum(durumlar, f);
                    return (
                      <div key={i} className="flex items-center justify-between gap-2 border-b border-cizgi/60 py-1.5">
                        <div className="text-sm min-w-0"><span className="inline-flex items-center gap-1"><Building size={13} className="text-metin-yum" /> <b>{f.ad}</b></span> <span className="text-metin-yum">· 📞 {f.telefon}</span></div>
                        <Button size="sm" variant={d === 'ok' ? 'ghost' : 'soft'} disabled={d === 'gonderiliyor' || d === 'ok' || toplu} onClick={() => waGonder(f)}>
                          {d === 'gonderiliyor' ? <Loader2 size={13} className="animate-spin" /> : d === 'ok' ? <CheckCircle2 size={13} className="text-emerald-600" /> : <MessageCircle size={13} />}
                          {d === 'ok' ? 'Gönderildi' : d === 'hata' ? 'Tekrar' : 'Gönder'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-metin-yum">⚠️ Numaranın banlanmaması için "sırayla gönder" arada bekleme koyar. Yine de günde çok fazla atma.</p>
              </>
            )}
          </CardBody></Card>

          {/* Manuel tek mesaj */}
          <Card className="mb-6"><CardBody>
            <button onClick={() => setManuelAcik((v) => !v)} className="w-full flex items-center justify-between font-semibold text-metin cursor-pointer">
              <span className="flex items-center gap-2"><Send size={16} /> Manuel Tek Mesaj</span>{manuelAcik ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {manuelAcik && (
              <div className="space-y-3 mt-3">
                <Field label="Numara"><Input value={mNumara} onChange={(e) => setMNumara(e.target.value)} placeholder="05XX..." /></Field>
                <Field label="Mesaj"><Textarea value={mMesaj} onChange={(e) => setMMesaj(e.target.value)} /></Field>
                <div className="flex justify-end"><Button onClick={manuelGonder} disabled={mGonderiliyor || !mNumara || !mMesaj}>{mGonderiliyor ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Gönder</Button></div>
              </div>
            )}
          </CardBody></Card>
        </>
      )}

      {/* Gelen mesajlar */}
      <Card><CardBody>
        <div className="flex items-center justify-between mb-3"><p className="font-semibold text-metin flex items-center gap-2"><Inbox size={16} /> Gelen Mesajlar</p><Button variant="ghost" size="sm" onClick={gelenGetir}><RefreshCw size={14} /></Button></div>
        {gelenler.length === 0 ? <p className="text-sm text-metin-yum">Henüz mesaj yok. Firmalar yazınca burada görünür.</p> : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {gelenler.map((m, i) => (
              <div key={i} className="rounded-xl border border-cizgi p-3">
                <div className="flex items-center justify-between gap-2 mb-1"><span className="font-medium text-metin text-sm">{m.isim || m.from}</span><span className="text-xs text-metin-yum">{tarih(m.tarih)}</span></div>
                <p className="text-xs text-metin-yum mb-1">{m.from}</p>
                <p className="text-sm text-metin whitespace-pre-wrap">{m.text}</p>
                <a href={`https://wa.me/${m.from.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 hover:underline mt-1 inline-block">WhatsApp'ta aç →</a>
              </div>
            ))}
          </div>
        )}
      </CardBody></Card>

      <p className="mt-5 text-xs text-metin-yum flex items-center gap-1.5"><Sparkles size={13} className="text-marka-500" /> Mesajlar kendi (Kiraz Kurt) hattından gider; gelen/giden telefonundaki WhatsApp ile aynıdır.</p>
    </>
  );
}

function waGonderilenDurum(d: Record<string, 'ok' | 'hata' | 'gonderiliyor'>, f: Firma) { return f.telefon ? d[f.telefon] : undefined; }
