import { useState, useEffect } from 'react';
import { Loader2, Sparkles, Wand2, CheckSquare, Square, Mail, Send, ListPlus, CheckCircle2, Info, Search, Building, Phone } from 'lucide-react';
import { PageHeader, Card, CardBody, Button, Badge, Field, Input, Select, Textarea } from '../components/ui';
import { useStore } from '../store/useStore';
import { TASERON_KATEGORILERI } from '../types';

interface Firma { ad: string; email?: string; telefon?: string; web?: string; sehir?: string; }

export default function Whatsapp() {
  const gonderenProfil = useStore((s) => s.gonderenProfil);
  const belgeler = useStore((s) => s.sunucuDosyalar);
  const dosyalariYenile = useStore((s) => s.dosyalariYenile);
  useEffect(() => { dosyalariYenile(); }, [dosyalariYenile]);
  const proje = useStore((s) => s.proje);

  const [kategori, setKategori] = useState('Hafriyat / Kazı');
  const [kabaNot, setKabaNot] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [aiYaziyor, setAiYaziyor] = useState(false);
  const [teknikDetay, setTeknikDetay] = useState(true);

  const [bolge, setBolge] = useState('İstanbul Avrupa Yakası / Arnavutköy');
  const [ariyor, setAriyor] = useState(false);
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [secili, setSecili] = useState<Record<string, boolean>>({});
  const [manuel, setManuel] = useState('');

  const [hedefMail, setHedefMail] = useState('raifkurt@gmail.com');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [sonuc, setSonuc] = useState<string | null>(null);

  const imza = `${gonderenProfil.ad}\n${gonderenProfil.unvan} · Kurt GMG İnşaat`;
  const speclerTopla = () => belgeler.filter((b) => b.spec).map((b) => `### ${b.ad}\n${b.spec}`).join('\n\n');
  const specliSayi = belgeler.filter((b) => b.spec).length;
  const telefonlu = firmalar.filter((f) => f.telefon);
  const seciliFirmalar = telefonlu.filter((f) => secili[f.telefon!]);
  const manuelSayi = [...new Set((manuel.match(/\d[\d\s]{8,}/g) || []).map((n) => n.replace(/\D/g, '')).filter((n) => n.length >= 10))].length;
  const toplamHedef = seciliFirmalar.length + manuelSayi;

  const aiYaz = async () => {
    setAiYaziyor(true);
    try {
      const r = await fetch('/api/ai/mesaj-yaz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kabaTarif: kabaNot || mesaj, baslik: kategori, profil: imza, kanal: 'whatsapp', teknikDetay, proje: teknikDetay ? JSON.stringify(proje) : '', specler: teknikDetay ? speclerTopla() : '' }) });
      const d = await r.json();
      if (r.ok && d.mesaj) setMesaj(d.mesaj); else alert('Yazılamadı: ' + (d.hata || ''));
    } catch { alert('Bağlantı hatası'); }
    setAiYaziyor(false);
  };

  const firmaAra = async () => {
    setAriyor(true); setFirmalar([]); setSecili({});
    try {
      const r = await fetch('/api/firma-bul', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kategori, bolge, kanal: 'telefon' }) });
      const d = await r.json();
      if (r.ok) {
        const list: Firma[] = d.firmalar || [];
        setFirmalar(list);
        const hepsi: Record<string, boolean> = {};
        list.filter((f) => f.telefon).forEach((f) => { hepsi[f.telefon!] = true; }); // varsayılan hepsi seçili
        setSecili(hepsi);
      } else alert('Hata: ' + (d.hata || ''));
    } catch { alert('Bağlantı hatası'); }
    setAriyor(false);
  };

  const tumunuSec = () => { const hepsi = telefonlu.every((f) => secili[f.telefon!]); const y: Record<string, boolean> = {}; telefonlu.forEach((f) => { y[f.telefon!] = !hepsi; }); setSecili(y); };

  const listeyiGonder = async () => {
    if (!mesaj.trim()) { alert('Önce mesajı hazırla.'); return; }
    if (toplamHedef === 0) { alert('AI ile firma bul veya manuel numara gir.'); return; }
    if (!hedefMail.trim()) { alert('E-posta adresi gir.'); return; }
    setGonderiliyor(true); setSonuc(null);
    try {
      const body = { mesaj, hedefMail, firmalar: seciliFirmalar.map((f) => ({ ad: f.ad, telefon: f.telefon })), numaralar: manuel };
      const r = await fetch('/api/wa/liste-mail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (r.ok) setSonuc(`✓ ${d.adet} firma ${d.hedef} adresine gönderildi. E-postanı (telefonundan) aç, her firmanın yanındaki yeşil butona tıkla → WhatsApp mesaj hazır açılır → gönder'e bas.`);
      else alert('Hata: ' + (d.hata || ''));
    } catch { alert('Bağlantı hatası'); }
    setGonderiliyor(false);
  };

  const adimNo = (n: string) => <span className="w-6 h-6 rounded-full bg-marka-500 text-white text-xs flex items-center justify-center font-bold">{n}</span>;

  return (
    <>
      <PageHeader baslik="WhatsApp Gönderim Listesi" aciklama="AI mesajı + AI'nın bulduğu taşeron numaraları tek e-postada — telefonundan tek tıkla gönder (ban riski yok)" />

      <Card className="mb-6"><CardBody className="flex gap-3">
        <Info size={18} className="text-marka-500 shrink-0 mt-0.5" />
        <p className="text-sm text-metin-yum">Otomatik toplu gönderim numarayı kısıtlattığı için kapalı. Bunun yerine panel sana <b>AI mesajı + bulunan taşeron numaralarını</b> e-posta atar; e-postadaki yeşil butona tıklayınca WhatsApp <b>mesaj hazır</b> açılır, sen <b>gönder</b>'e basarsın. Elle gönderdiğin için güvenlidir.</p>
      </CardBody></Card>

      {/* ADIM 1 — Mesaj */}
      <Card className="mb-6"><CardBody className="space-y-4">
        <p className="font-semibold text-metin flex items-center gap-2">{adimNo('1')} Mesajı hazırla</p>
        <Field label="Hangi konuda?"><Select value={kategori} onChange={(e) => setKategori(e.target.value)}>{TASERON_KATEGORILERI.map((k) => <option key={k} value={k}>{k}</option>)}</Select></Field>
        <div className="rounded-xl bg-marka-50/60 border border-marka-100 p-3 space-y-1.5">
          <p className="text-sm font-medium text-metin flex items-center gap-1.5"><Wand2 size={15} className="text-marka-500" /> İşi kısaca anlat — AI WhatsApp mesajına çevirir</p>
          <Textarea value={kabaNot} onChange={(e) => setKabaNot(e.target.value)} placeholder="Örn: hafriyat lazım, ~350 m² yarım metre kazı, toprak arsada kalır nakliye yok, fiyat ve ne zaman başlanır öğrenmek istiyorum…" className="min-h-[80px] text-sm bg-white" />
          <div className="flex items-center gap-3 flex-wrap">
            <Button size="sm" variant="soft" onClick={aiYaz} disabled={aiYaziyor}>{aiYaziyor ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} AI ile yaz / düzelt</Button>
            <button type="button" onClick={() => setTeknikDetay((v) => !v)} className="inline-flex items-center gap-1.5 text-xs text-metin cursor-pointer">
              {teknikDetay ? <CheckSquare size={15} className="text-marka-500" /> : <Square size={15} className="text-metin-yum" />} Teknik detay ekle (m² / malzeme / süre){specliSayi > 0 ? ` · ${specliSayi} belge` : ''}
            </button>
          </div>
        </div>
        <Field label="Gönderilecek WhatsApp mesajı (düzenleyebilirsin)"><Textarea value={mesaj} onChange={(e) => setMesaj(e.target.value)} className="min-h-[140px] text-sm" placeholder="Buraya kendi mesajını da yazabilirsin." /></Field>
      </CardBody></Card>

      {/* ADIM 2 — AI ile taşeron bul */}
      <Card className="mb-6"><CardBody className="space-y-4">
        <p className="font-semibold text-metin flex items-center gap-2">{adimNo('2')} AI ile taşeron bul</p>
        <div className="flex flex-wrap gap-1.5">
          {['İstanbul Avrupa Yakası / Arnavutköy', 'İstanbul Avrupa Yakası', 'İstanbul Anadolu Yakası', 'İstanbul (geneli)', 'Türkiye geneli'].map((b) => (
            <button key={b} type="button" onClick={() => setBolge(b)} className={`px-2.5 py-1 rounded-lg text-xs border transition cursor-pointer ${bolge === b ? 'bg-marka-500 text-white border-marka-500' : 'bg-white border-cizgi text-metin-yum hover:border-marka-300'}`}>{b}</button>
          ))}
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]"><Field label="Bölge"><Input value={bolge} onChange={(e) => setBolge(e.target.value)} /></Field></div>
          <Button onClick={firmaAra} disabled={ariyor}>{ariyor ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} "{kategori}" için taşeron bul</Button>
        </div>
        {ariyor && <p className="text-sm text-metin-yum flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Telefonlu taşeronlar araştırılıyor… (1-2 dk)</p>}

        {firmalar.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-2 flex-wrap"><Badge tone="mavi">{telefonlu.length} telefonlu firma</Badge><Badge tone="yesil">{seciliFirmalar.length} seçili</Badge></div>
              <Button size="sm" variant="ghost" onClick={tumunuSec} disabled={telefonlu.length === 0}>{telefonlu.every((f) => secili[f.telefon!]) && telefonlu.length > 0 ? 'Seçimi kaldır' : 'Tümünü seç'}</Button>
            </div>
            <div className="space-y-1">
              {telefonlu.map((f, i) => {
                const sec = !!secili[f.telefon!];
                return (
                  <button key={i} onClick={() => setSecili((s) => ({ ...s, [f.telefon!]: !sec }))} className="w-full text-left flex items-center gap-2.5 border-b border-cizgi/60 py-2 px-1 rounded-lg hover:bg-zemin cursor-pointer">
                    {sec ? <CheckSquare size={17} className="text-marka-500 shrink-0" /> : <Square size={17} className="text-metin-yum shrink-0" />}
                    <div className="text-sm min-w-0 flex-1"><span className="inline-flex items-center gap-1"><Building size={13} className="text-metin-yum" /> <b>{f.ad}</b></span> <span className="text-metin-yum"> · <Phone size={12} className="inline" /> {f.telefon}</span></div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer text-metin-yum">Elle numara da eklemek istersen (opsiyonel)</summary>
          <Textarea value={manuel} onChange={(e) => setManuel(e.target.value)} className="min-h-[90px] text-sm font-mono mt-2" placeholder={"0532 123 45 67\n0541 234 56 78"} />
          {manuelSayi > 0 && <p className="text-xs text-metin-yum mt-1"><ListPlus size={13} className="inline" /> {manuelSayi} manuel numara</p>}
        </details>
      </CardBody></Card>

      {/* ADIM 3 — Gönder */}
      <Card className="mb-6"><CardBody className="space-y-3">
        <p className="font-semibold text-metin flex items-center gap-2">{adimNo('3')} Listeyi e-posta olarak al</p>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[220px]"><Field label="E-posta adresi"><Input value={hedefMail} onChange={(e) => setHedefMail(e.target.value)} /></Field></div>
          <Button onClick={listeyiGonder} disabled={gonderiliyor || !mesaj.trim() || toplamHedef === 0}>{gonderiliyor ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} {toplamHedef} firmayı e-postama gönder</Button>
        </div>
        {sonuc && <p className="text-sm text-emerald-700 flex items-start gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl p-3"><CheckCircle2 size={16} className="shrink-0 mt-0.5" /> {sonuc}</p>}
        <p className="text-xs text-metin-yum flex items-center gap-1.5"><Send size={12} /> E-postayı <b>telefonundan</b> aç → yeşil butona tıkla → WhatsApp mesaj hazır açılır. Numaralar arasında biraz bekleyerek gönder.</p>
      </CardBody></Card>
    </>
  );
}
