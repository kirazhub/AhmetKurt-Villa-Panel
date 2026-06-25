import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Loader2, Send, QrCode, CheckCircle2, RefreshCw, Inbox, LogOut, Search, Building, Sparkles, ChevronDown, ChevronUp, ImagePlus, X, Wand2, Clock, StopCircle } from 'lucide-react';
import { PageHeader, Card, CardBody, Button, Field, Input, Select, Textarea } from '../components/ui';
import { useStore } from '../store/useStore';
import { tarih } from '../lib/format';
import { TASERON_KATEGORILERI } from '../types';

interface Gelen { from: string; isim?: string; text: string; tarih: string; }
interface Firma { ad: string; email?: string; telefon?: string; web?: string; sehir?: string; }

// Görseli tarayıcıda küçült (max 1280px, jpeg) — gönderim hafif olsun
function resmiKucult(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1280; let { width, height } = img;
        if (width > max || height > max) { const o = max / Math.max(width, height); width = Math.round(width * o); height = Math.round(height * o); }
        const c = document.createElement('canvas'); c.width = width; c.height = height;
        const ctx = c.getContext('2d'); if (!ctx) return reject(new Error('canvas'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = reject; img.src = reader.result as string;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

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
  const [kabaTarif, setKabaTarif] = useState('');
  const [aiYaziyor, setAiYaziyor] = useState(false);
  const [gorseller, setGorseller] = useState<string[]>([]);
  const [durumlar, setDurumlar] = useState<Record<string, 'ok' | 'hata' | 'gonderiliyor'>>({});
  const [aralikDk, setAralikDk] = useState(5);
  const [kuyruk, setKuyruk] = useState<{ aktif: boolean; bekleyen?: number; sonrakiSn?: number | null; gorselSayi?: number; items: { numara: string; durum: string }[] } | null>(null);

  // Manuel
  const [manuelAcik, setManuelAcik] = useState(false);
  const [mNumara, setMNumara] = useState('');
  const [mMesaj, setMMesaj] = useState('');
  const [mGonderiliyor, setMGonderiliyor] = useState(false);

  const durumGetir = () => fetch('/api/wa/durum').then((r) => r.json()).then(setDurum).catch(() => setDurum({ baglandi: false, qr: null }));
  const gelenGetir = () => fetch('/api/wa/gelenler').then((r) => r.json()).then((d) => setGelenler(d.mesajlar || [])).catch(() => {});
  const kuyrukGetir = () => fetch('/api/wa/kuyruk').then((r) => r.json()).then(setKuyruk).catch(() => {});

  useEffect(() => {
    durumGetir(); gelenGetir(); kuyrukGetir();
    timer.current = setInterval(() => { durumGetir(); gelenGetir(); kuyrukGetir(); }, 5000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const bagli = durum?.baglandi;
  const telefonlu = firmalar.filter((f) => f.telefon);
  const imza = `${gonderenProfil.ad}\n${gonderenProfil.unvan}`;

  const firmaBul = async () => {
    setBuluyor(true); setFirmalar([]); setDurumlar({});
    try {
      const r = await fetch('/api/teklif-otomatik', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kategori, bolge, imza, autoMail: false }) });
      const d = await r.json();
      if (r.ok) { setFirmalar(d.bulunan || []); if (!mesaj) setMesaj(d.waMesaj || ''); }
      else alert('Hata: ' + (d.hata || ''));
    } catch { alert('Bağlantı hatası'); }
    setBuluyor(false);
  };

  const aiMesajYaz = async () => {
    setAiYaziyor(true);
    try {
      const r = await fetch('/api/ai/mesaj-yaz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kabaTarif, baslik: kategori, profil: imza, kanal: 'whatsapp' }) });
      const d = await r.json();
      if (r.ok && d.mesaj) setMesaj(d.mesaj); else alert('Yazılamadı: ' + (d.hata || ''));
    } catch { alert('Bağlantı hatası'); }
    setAiYaziyor(false);
  };

  const dosyaEkle = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) { if (!f.type.startsWith('image/')) continue; try { const d = await resmiKucult(f); setGorseller((g) => [...g, d]); } catch { /**/ } }
  };

  const waGonder = async (f: Firma) => {
    if (!f.telefon || (!mesaj.trim() && gorseller.length === 0)) return;
    setDurumlar((s) => ({ ...s, [f.telefon!]: 'gonderiliyor' }));
    try {
      const r = await fetch('/api/wa/gonder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numara: f.telefon, mesaj, gorseller }) });
      setDurumlar((s) => ({ ...s, [f.telefon!]: r.ok ? 'ok' : 'hata' }));
      return r.ok;
    } catch { setDurumlar((s) => ({ ...s, [f.telefon!]: 'hata' })); return false; }
  };

  const kuyrukBaslat = async () => {
    const hedef = telefonlu.filter((f) => kuyrukDurum(f) !== 'ok');
    if (hedef.length === 0) return;
    if (!confirm(`${hedef.length} firmaya ~${aralikDk} dakika aralıkla (rastgele sapmayla) sırayla gönderilecek.\n\nBir kez başlat, gerisini sistem halleder — bu ekranı kapatsan bile devam eder. Onaylıyor musun?`)) return;
    try {
      const r = await fetch('/api/wa/kuyruk-baslat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hedefler: hedef.map((f) => ({ numara: f.telefon, ad: f.ad })), mesaj, gorseller, aralikDk }) });
      const d = await r.json();
      if (!r.ok) alert('Başlatılamadı: ' + (d.hata || ''));
      else kuyrukGetir();
    } catch { alert('Bağlantı hatası'); }
  };

  const kuyrukDurdur = async () => { if (!confirm('Otomatik gönderim durdurulsun mu? (gönderilenler geri alınmaz)')) return; await fetch('/api/wa/kuyruk-durdur', { method: 'POST' }); kuyrukGetir(); };

  // Firmanın gönderim durumu: kuyruktaki kayıt > tekil gönderim
  const kuyrukDurum = (f: Firma): 'ok' | 'hata' | 'gonderiliyor' | 'bekliyor' | undefined => {
    if (!f.telefon) return undefined;
    const k = kuyruk?.items?.find((i) => i.numara === f.telefon);
    if (k) return k.durum === 'gonderildi' ? 'ok' : k.durum === 'hata' ? 'hata' : 'bekliyor';
    return durumlar[f.telefon];
  };

  const manuelGonder = async () => {
    if (!mNumara || !mMesaj) return;
    setMGonderiliyor(true);
    try { const r = await fetch('/api/wa/gonder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numara: mNumara, mesaj: mMesaj }) }); if (r.ok) { alert('✓ Gönderildi'); setMMesaj(''); } else alert('Gönderilemedi'); } catch { alert('Hata'); }
    setMGonderiliyor(false);
  };

  const cikis = async () => { if (!confirm('WhatsApp bağlantısı kesilsin mi?')) return; await fetch('/api/wa/cikis', { method: 'POST' }); durumGetir(); };

  const [yenileniyor, setYenileniyor] = useState(false);
  const yenidenBagla = async () => {
    setYenileniyor(true);
    try { await fetch('/api/wa/yenile', { method: 'POST' }); await new Promise((r) => setTimeout(r, 3000)); await durumGetir(); } catch { /**/ }
    setYenileniyor(false);
  };

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
            <div className="mt-4 pt-3 border-t border-cizgi/60">
              <p className="text-xs text-metin-yum mb-2">QR görünmüyorsa veya bağlantı koptuysa (örn. engel sonrası), yeni QR üret:</p>
              <Button size="sm" variant="soft" onClick={yenidenBagla} disabled={yenileniyor}>{yenileniyor ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Yeniden bağlan (yeni QR üret)</Button>
            </div>
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
                {/* Kaba anlat → AI yazsın */}
                <div className="rounded-xl bg-marka-50/60 border border-marka-100 p-3 space-y-2">
                  <p className="text-sm font-medium text-metin flex items-center gap-1.5"><Wand2 size={15} className="text-marka-500" /> İşi kabaca anlat — AI düzgün mesaja çevirsin</p>
                  <Textarea value={kabaTarif} onChange={(e) => setKabaTarif(e.target.value)} placeholder="Örn: hafriyat lazım, yaklaşık 350 m2 alan yarım metre kazılacak, çıkan toprak arsada kalacak nakliye yok, ne zaman başlarsın fiyatın ne…" className="min-h-[80px] text-sm bg-white" />
                  <Button size="sm" variant="soft" onClick={aiMesajYaz} disabled={aiYaziyor}>{aiYaziyor ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} AI ile mesajı yaz</Button>
                </div>

                <Field label="Gönderilecek WhatsApp mesajı (düzenleyebilirsin)"><Textarea value={mesaj} onChange={(e) => setMesaj(e.target.value)} className="min-h-[120px] text-sm" /></Field>

                {/* Görseller — kare thumbnail */}
                <div>
                  <p className="text-sm font-medium text-metin mb-2 flex items-center gap-1.5"><ImagePlus size={15} /> Mesajla gönderilecek görseller</p>
                  <div className="flex flex-wrap gap-2">
                    {gorseller.map((g, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-cizgi group">
                        <img src={g} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setGorseller((arr) => arr.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 bg-black/55 hover:bg-black/75 text-white rounded-full p-0.5"><X size={12} /></button>
                      </div>
                    ))}
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-cizgi hover:border-marka-400 flex flex-col items-center justify-center cursor-pointer text-metin-yum hover:text-marka-500 transition">
                      <ImagePlus size={20} /><span className="text-[10px] mt-0.5">Ekle</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { dosyaEkle(e.target.files); e.target.value = ''; }} />
                    </label>
                  </div>
                  {gorseller.length > 0 && <p className="text-xs text-metin-yum mt-1.5">{gorseller.length} görsel — mesajla birlikte gönderilecek.</p>}
                </div>

                {/* Güvenli aralıklı otomatik gönderim */}
                <div className="rounded-xl border border-cizgi p-3 space-y-2.5">
                  {kuyruk?.aktif ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-emerald-700 flex items-center gap-1.5"><Clock size={15} /> Otomatik gönderim çalışıyor</p>
                      <p className="text-xs text-metin-yum">Bekleyen: <b>{kuyruk.bekleyen}</b> firma · Sıradaki yaklaşık <b>{kuyruk.sonrakiSn != null ? (kuyruk.sonrakiSn >= 60 ? Math.ceil(kuyruk.sonrakiSn / 60) + ' dk' : kuyruk.sonrakiSn + ' sn') : '—'}</b> sonra. Bu ekranı kapatabilirsin, sistem devam eder.</p>
                      <Button size="sm" variant="ghost" onClick={kuyrukDurdur} className="text-rose-600"><StopCircle size={14} /> Otomatik gönderimi durdur</Button>
                    </div>
                  ) : (
                    <div className="flex items-end gap-3 flex-wrap">
                      <Field label="Gönderim aralığı (banlanmamak için)"><Select value={aralikDk} onChange={(e) => setAralikDk(Number(e.target.value))} className="w-44">
                        <option value={2}>2 dakika (riskli)</option>
                        <option value={5}>5 dakika (önerilen)</option>
                        <option value={10}>10 dakika (güvenli)</option>
                        <option value={15}>15 dakika (çok güvenli)</option>
                      </Select></Field>
                      <Button variant="soft" size="sm" onClick={kuyrukBaslat} disabled={telefonlu.length === 0}><Clock size={14} /> Güvenli aralıkla hepsine gönder</Button>
                    </div>
                  )}
                  <p className="text-xs text-metin-yum">Sistem her firmaya seçtiğin aralıkla + <b>rastgele sapmayla</b> sırayla gönderir. Bir kez basman yeterli. (WhatsApp güvenli aralığı garanti etmez; numaran yeniyse 10-15 dk ve günde az sayıda öneririm.)</p>
                </div>

                <p className="text-sm text-metin-yum pt-1">{telefonlu.length} telefonlu firma — istersen tek tek de gönderebilirsin:</p>
                <div className="space-y-1.5">
                  {telefonlu.map((f, i) => {
                    const d = kuyrukDurum(f);
                    return (
                      <div key={i} className="flex items-center justify-between gap-2 border-b border-cizgi/60 py-1.5">
                        <div className="text-sm min-w-0"><span className="inline-flex items-center gap-1"><Building size={13} className="text-metin-yum" /> <b>{f.ad}</b></span> <span className="text-metin-yum">· 📞 {f.telefon}</span></div>
                        {d === 'bekliyor' ? (
                          <span className="text-xs text-amber-600 flex items-center gap-1 px-2"><Clock size={13} /> Sırada</span>
                        ) : (
                          <Button size="sm" variant={d === 'ok' ? 'ghost' : 'soft'} disabled={d === 'gonderiliyor' || d === 'ok' || !!kuyruk?.aktif} onClick={() => waGonder(f)}>
                            {d === 'gonderiliyor' ? <Loader2 size={13} className="animate-spin" /> : d === 'ok' ? <CheckCircle2 size={13} className="text-emerald-600" /> : <MessageCircle size={13} />}
                            {d === 'ok' ? 'Gönderildi' : d === 'hata' ? 'Tekrar' : 'Gönder'}
                          </Button>
                        )}
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
