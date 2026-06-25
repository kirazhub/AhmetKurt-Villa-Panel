import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, QrCode, CheckCircle2, RefreshCw, Inbox, LogOut, Search, Building, Sparkles, ImagePlus, X, Wand2, Clock, StopCircle, Phone, Square, CheckSquare } from 'lucide-react';
import { PageHeader, Card, CardBody, Button, Field, Input, Select, Textarea, Badge } from '../components/ui';
import { useStore } from '../store/useStore';
import { tarih } from '../lib/format';
import { TASERON_KATEGORILERI } from '../types';

interface Gelen { from: string; isim?: string; text: string; tarih: string; }
interface Firma { ad: string; email?: string; telefon?: string; web?: string; sehir?: string; }
interface Kuyruk { aktif: boolean; bekleyen?: number; sonrakiSn?: number | null; sonrakiDk?: number | null; minDk?: number; maxDk?: number; gorselSayi?: number; items: { numara: string; durum: string }[]; }

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
        ctx.drawImage(img, 0, 0, width, height); resolve(c.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = reject; img.src = reader.result as string;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

export default function Whatsapp() {
  const gonderenProfil = useStore((s) => s.gonderenProfil);
  const belgeler = useStore((s) => s.belgeler);
  const proje = useStore((s) => s.proje);
  const [durum, setDurum] = useState<{ baglandi: boolean; qr: string | null } | null>(null);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [gelenler, setGelenler] = useState<Gelen[]>([]);
  const [kuyruk, setKuyruk] = useState<Kuyruk | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1) Mesaj
  const [kategori, setKategori] = useState('Hafriyat / Kazı');
  const [kabaNot, setKabaNot] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [aiYaziyor, setAiYaziyor] = useState(false);
  const [teknikDetay, setTeknikDetay] = useState(true);
  const [gorseller, setGorseller] = useState<string[]>([]);

  // 2) Firma
  const [bolge, setBolge] = useState('İstanbul Avrupa Yakası / Arnavutköy');
  const [ariyor, setAriyor] = useState(false);
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [secili, setSecili] = useState<Record<string, boolean>>({});

  // 3) Motor
  const [minDk, setMinDk] = useState(2);
  const [maxDk, setMaxDk] = useState(9);

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
  const seciliTel = telefonlu.filter((f) => secili[f.telefon!]);
  const imza = `${gonderenProfil.ad}\n${gonderenProfil.unvan}`;
  const speclerTopla = () => belgeler.filter((b) => b.spec).map((b) => `### ${b.ad}\n${b.spec}`).join('\n\n');

  // AI ile WhatsApp mesajı yaz / düzelt
  const aiYaz = async () => {
    setAiYaziyor(true);
    try {
      const r = await fetch('/api/ai/mesaj-yaz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kabaTarif: kabaNot || mesaj, baslik: kategori, profil: imza, kanal: 'whatsapp', teknikDetay, proje: teknikDetay ? JSON.stringify(proje) : '', specler: teknikDetay ? speclerTopla() : '' }) });
      const d = await r.json();
      if (r.ok && d.mesaj) setMesaj(d.mesaj); else alert('Yazılamadı: ' + (d.hata || ''));
    } catch { alert('Bağlantı hatası'); }
    setAiYaziyor(false);
  };

  const dosyaEkle = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) { if (!f.type.startsWith('image/')) continue; try { const d = await resmiKucult(f); setGorseller((g) => [...g, d]); } catch { /**/ } }
  };

  const firmaAra = async () => {
    setAriyor(true); setFirmalar([]); setSecili({});
    try {
      const r = await fetch('/api/firma-bul', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kategori, bolge, kanal: 'telefon' }) });
      const d = await r.json();
      if (r.ok) setFirmalar(d.firmalar || []); else alert('Hata: ' + (d.hata || ''));
    } catch { alert('Bağlantı hatası'); }
    setAriyor(false);
  };

  const tumunuSec = () => { const hepsi = telefonlu.every((f) => secili[f.telefon!]); const y: Record<string, boolean> = {}; telefonlu.forEach((f) => { y[f.telefon!] = !hepsi; }); setSecili(y); };

  const motorBaslat = async () => {
    if (!bagli) { alert('Önce WhatsApp bağlanmalı.'); return; }
    if (!mesaj.trim() && gorseller.length === 0) { alert('Önce mesajı hazırla.'); return; }
    if (seciliTel.length === 0) { alert('Listeden firma seç.'); return; }
    if (minDk > maxDk) { alert('En az dakika, en çoktan büyük olamaz.'); return; }
    if (!confirm(`${seciliTel.length} firmaya, her biri arasında ${minDk}-${maxDk} dakika RASTGELE aralıkla WhatsApp gönderilecek.\n\nBir kez başlat — bu ekranı kapatsan bile sistem devam eder. Onaylıyor musun?`)) return;
    try {
      const r = await fetch('/api/wa/kuyruk-baslat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hedefler: seciliTel.map((f) => ({ numara: f.telefon, ad: f.ad })), mesaj, gorseller, minDk, maxDk }) });
      const d = await r.json();
      if (!r.ok) alert('Başlatılamadı: ' + (d.hata || '')); else kuyrukGetir();
    } catch { alert('Bağlantı hatası'); }
  };

  const motorDurdur = async () => { if (!confirm('Gönderim motoru durdurulsun mu? (gönderilenler geri alınmaz)')) return; await fetch('/api/wa/kuyruk-durdur', { method: 'POST' }); kuyrukGetir(); };

  const kuyrukDurum = (f: Firma): string | undefined => { const k = kuyruk?.items?.find((i) => i.numara === f.telefon); return k?.durum; };

  const cikis = async () => { if (!confirm('WhatsApp bağlantısı kesilsin mi?')) return; await fetch('/api/wa/cikis', { method: 'POST' }); durumGetir(); };
  const yenidenBagla = async () => { setYenileniyor(true); try { await fetch('/api/wa/yenile', { method: 'POST' }); await new Promise((r) => setTimeout(r, 3000)); await durumGetir(); } catch { /**/ } setYenileniyor(false); };

  const adimNo = (n: string) => <span className="w-6 h-6 rounded-full bg-marka-500 text-white text-xs flex items-center justify-center font-bold">{n}</span>;
  const sonrakiYazi = kuyruk?.sonrakiSn != null ? (kuyruk.sonrakiSn >= 60 ? `${Math.ceil(kuyruk.sonrakiSn / 60)} dk` : `${kuyruk.sonrakiSn} sn`) : '—';

  return (
    <>
      <PageHeader baslik="WhatsApp Teklif" aciklama="Mesajı hazırla → firma ara → düzensiz aralıklarla otomatik gönder. Gelen cevapları gör."
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
                  <li>Telefonda <b>WhatsApp</b> → <b>Ayarlar → Bağlı Cihazlar → Cihaz Bağla</b>.</li>
                  <li>Bu <b>QR'ı okut</b>; ekran otomatik "bağlı" olacak.</li>
                </ol>
              </div>
            ) : <p className="text-sm text-metin-yum flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> QR hazırlanıyor… <button onClick={durumGetir} className="underline">yenile</button></p>}
            <div className="mt-4 pt-3 border-t border-cizgi/60">
              <p className="text-xs text-metin-yum mb-2">QR görünmüyorsa / bağlantı koptuysa (örn. engel sonrası) yeni QR üret:</p>
              <Button size="sm" variant="soft" onClick={yenidenBagla} disabled={yenileniyor}>{yenileniyor ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Yeniden bağlan (yeni QR)</Button>
            </div>
          </CardBody></Card>
        ) : <p className="mb-5 text-sm text-emerald-700 flex items-center gap-1.5"><CheckCircle2 size={16} /> WhatsApp <b>bağlı</b>.</p>}

      {bagli && (
        <>
          {/* ADIM 1 — Mesajı hazırla */}
          <Card className="mb-6"><CardBody className="space-y-4">
            <p className="font-semibold text-metin flex items-center gap-2">{adimNo('1')} Mesajı hazırla</p>
            <Field label="Hangi konuda?"><Select value={kategori} onChange={(e) => setKategori(e.target.value)}>{TASERON_KATEGORILERI.map((k) => <option key={k} value={k}>{k}</option>)}</Select></Field>

            <div className="rounded-xl bg-marka-50/60 border border-marka-100 p-3 space-y-1.5">
              <p className="text-sm font-medium text-metin flex items-center gap-1.5"><Wand2 size={15} className="text-marka-500" /> İşi kısaca anlat — AI WhatsApp mesajına çevirir (kısa-net)</p>
              <Textarea value={kabaNot} onChange={(e) => setKabaNot(e.target.value)} placeholder="Örn: hafriyat lazım, ~350 m² yarım metre kazı, toprak arsada kalır nakliye yok, fiyat ve ne zaman başlanır öğrenmek istiyorum…" className="min-h-[80px] text-sm bg-white" />
              <div className="flex items-center gap-3 flex-wrap">
                <Button size="sm" variant="soft" onClick={aiYaz} disabled={aiYaziyor}>{aiYaziyor ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} AI ile yaz / düzelt</Button>
                <button type="button" onClick={() => setTeknikDetay((v) => !v)} className="inline-flex items-center gap-1.5 text-xs text-metin cursor-pointer">
                  {teknikDetay ? <CheckSquare size={15} className="text-marka-500" /> : <Square size={15} className="text-metin-yum" />} Teknik detay ekle (m² / malzeme / süre)
                </button>
              </div>
            </div>

            <Field label="Gönderilecek WhatsApp mesajı (düzenleyebilirsin)"><Textarea value={mesaj} onChange={(e) => setMesaj(e.target.value)} className="min-h-[120px] text-sm" placeholder="Buraya kendi mesajını da yazabilirsin; 'AI ile düzelt' ile profesyonelleştir." /></Field>

            <div>
              <p className="text-sm font-medium text-metin mb-2 flex items-center gap-1.5"><ImagePlus size={15} /> Mesajla gönderilecek görseller</p>
              <div className="flex flex-wrap gap-2">
                {gorseller.map((g, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-cizgi">
                    <img src={g} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setGorseller((arr) => arr.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 bg-black/55 hover:bg-black/75 text-white rounded-full p-0.5"><X size={12} /></button>
                  </div>
                ))}
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-cizgi hover:border-marka-400 flex flex-col items-center justify-center cursor-pointer text-metin-yum hover:text-marka-500 transition">
                  <ImagePlus size={20} /><span className="text-[10px] mt-0.5">Ekle</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { dosyaEkle(e.target.files); e.target.value = ''; }} />
                </label>
              </div>
            </div>
          </CardBody></Card>

          {/* ADIM 2 — Firma ara */}
          <Card className="mb-6"><CardBody className="space-y-4">
            <p className="font-semibold text-metin flex items-center gap-2">{adimNo('2')} Firma ara</p>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]"><Field label="Bölge"><Input value={bolge} onChange={(e) => setBolge(e.target.value)} /></Field></div>
              <Button onClick={firmaAra} disabled={ariyor}>{ariyor ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} "{kategori}" için ara</Button>
            </div>
            {ariyor && <p className="text-sm text-metin-yum flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Telefonlu firmalar araştırılıyor… (1-2 dk)</p>}

            {firmalar.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex gap-2 flex-wrap"><Badge tone="mavi">{telefonlu.length} telefonlu</Badge><Badge tone="yesil">{seciliTel.length} seçili</Badge></div>
                  <Button size="sm" variant="ghost" onClick={tumunuSec} disabled={telefonlu.length === 0}>{telefonlu.every((f) => secili[f.telefon!]) && telefonlu.length > 0 ? 'Seçimi kaldır' : 'Tümünü seç'}</Button>
                </div>
                <div className="space-y-1">
                  {telefonlu.map((f, i) => {
                    const sec = !!secili[f.telefon!]; const d = kuyrukDurum(f);
                    return (
                      <button key={i} onClick={() => setSecili((s) => ({ ...s, [f.telefon!]: !sec }))}
                        className="w-full text-left flex items-center gap-2.5 border-b border-cizgi/60 py-2 px-1 rounded-lg hover:bg-zemin cursor-pointer">
                        {sec ? <CheckSquare size={17} className="text-marka-500 shrink-0" /> : <Square size={17} className="text-metin-yum shrink-0" />}
                        <div className="text-sm min-w-0 flex-1"><span className="inline-flex items-center gap-1"><Building size={13} className="text-metin-yum" /> <b>{f.ad}</b></span> <span className="text-metin-yum"> · <Phone size={12} className="inline" /> {f.telefon}</span></div>
                        {d === 'gonderildi' ? <Badge tone="yesil">gönderildi ✓</Badge> : d === 'bekliyor' ? <Badge tone="amber">sırada</Badge> : d === 'hata' ? <Badge tone="kirmizi">hata</Badge> : null}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </CardBody></Card>

          {/* ADIM 3 — Gönderim motoru */}
          <Card className="mb-6"><CardBody className="space-y-3">
            <p className="font-semibold text-metin flex items-center gap-2">{adimNo('3')} Gönderim motoru (düzensiz aralıklı)</p>
            {kuyruk?.aktif ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-emerald-700 flex items-center gap-1.5"><Clock size={15} /> Motor çalışıyor</p>
                <p className="text-xs text-metin-yum">Bekleyen: <b>{kuyruk.bekleyen}</b> firma · Sıradaki ~<b>{sonrakiYazi}</b> sonra ({kuyruk.minDk}-{kuyruk.maxDk} dk arası rastgele). Bu ekranı kapatabilirsin, sistem devam eder.</p>
                <Button size="sm" variant="ghost" onClick={motorDurdur} className="text-rose-600"><StopCircle size={14} /> Motoru durdur</Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-metin-yum">Mesajlar arasında <b>{minDk}-{maxDk} dakika arası TAMAMEN rastgele</b> (alakasız) bekleme konur — robot gibi sabit aralık ban sebebidir.</p>
                <div className="flex items-end gap-3 flex-wrap">
                  <div className="w-28"><Field label="En az (dk)"><Input type="number" value={minDk} min={1} onChange={(e) => setMinDk(Math.max(1, Number(e.target.value) || 1))} /></Field></div>
                  <div className="w-28"><Field label="En çok (dk)"><Input type="number" value={maxDk} min={1} onChange={(e) => setMaxDk(Math.max(1, Number(e.target.value) || 1))} /></Field></div>
                  <Button onClick={motorBaslat} disabled={seciliTel.length === 0 || (!mesaj.trim() && gorseller.length === 0)}><Send size={15} /> {seciliTel.length} firmaya göndermeyi başlat</Button>
                </div>
                <p className="text-xs text-metin-yum">⚠️ Numaran yeniyse aralığı geniş tut (örn. 5-15 dk) ve günde az sayıda gönder.</p>
              </>
            )}
          </CardBody></Card>
        </>
      )}

      {/* Gelen mesajlar */}
      <Card><CardBody>
        <div className="flex items-center justify-between mb-3"><p className="font-semibold text-metin flex items-center gap-2"><Inbox size={16} /> Gelen Mesajlar</p><Button variant="ghost" size="sm" onClick={gelenGetir}><RefreshCw size={14} /></Button></div>
        {gelenler.length === 0 ? <p className="text-sm text-metin-yum">Henüz mesaj yok. Firmalar yazınca burada görünür.</p> : (
          <div className="space-y-2 max-h-[440px] overflow-y-auto">
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

      <p className="mt-5 text-xs text-metin-yum flex items-center gap-1.5"><Sparkles size={13} className="text-marka-500" /> Mesajlar kendi hattından gider; gelen/giden telefonundaki WhatsApp ile aynıdır.</p>
    </>
  );
}
