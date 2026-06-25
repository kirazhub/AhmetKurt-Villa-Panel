import { useState } from 'react';
import { Loader2, Sparkles, Wand2, CheckSquare, Square, Mail, Send, ListPlus, CheckCircle2, Info } from 'lucide-react';
import { PageHeader, Card, CardBody, Button, Field, Input, Select, Textarea } from '../components/ui';
import { useStore } from '../store/useStore';
import { TASERON_KATEGORILERI } from '../types';

export default function Whatsapp() {
  const gonderenProfil = useStore((s) => s.gonderenProfil);
  const belgeler = useStore((s) => s.belgeler);
  const proje = useStore((s) => s.proje);

  const [kategori, setKategori] = useState('Hafriyat / Kazı');
  const [kabaNot, setKabaNot] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [aiYaziyor, setAiYaziyor] = useState(false);
  const [teknikDetay, setTeknikDetay] = useState(true);

  const [numaralar, setNumaralar] = useState('');
  const [hedefMail, setHedefMail] = useState('raifkurt@gmail.com');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [sonuc, setSonuc] = useState<string | null>(null);

  const imza = `${gonderenProfil.ad}\n${gonderenProfil.unvan}`;
  const speclerTopla = () => belgeler.filter((b) => b.spec).map((b) => `### ${b.ad}\n${b.spec}`).join('\n\n');
  const specliSayi = belgeler.filter((b) => b.spec).length;

  const numaraSayisi = [...new Set((numaralar.match(/\d[\d\s]{8,}/g) || []).map((n) => n.replace(/\D/g, '')).filter((n) => n.length >= 10))].length;

  const aiYaz = async () => {
    setAiYaziyor(true);
    try {
      const r = await fetch('/api/ai/mesaj-yaz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kabaTarif: kabaNot || mesaj, baslik: kategori, profil: imza, kanal: 'whatsapp', teknikDetay, proje: teknikDetay ? JSON.stringify(proje) : '', specler: teknikDetay ? speclerTopla() : '' }) });
      const d = await r.json();
      if (r.ok && d.mesaj) setMesaj(d.mesaj); else alert('Yazılamadı: ' + (d.hata || ''));
    } catch { alert('Bağlantı hatası'); }
    setAiYaziyor(false);
  };

  const listeyiGonder = async () => {
    if (!mesaj.trim()) { alert('Önce mesajı hazırla.'); return; }
    if (numaraSayisi === 0) { alert('En az bir geçerli numara gir.'); return; }
    if (!hedefMail.trim()) { alert('E-posta adresi gir.'); return; }
    setGonderiliyor(true); setSonuc(null);
    try {
      const r = await fetch('/api/wa/liste-mail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mesaj, numaralar, hedefMail }) });
      const d = await r.json();
      if (r.ok) setSonuc(`✓ ${d.adet} numara ${d.hedef} adresine gönderildi. E-postanı aç, her numaranın yanındaki yeşil butona tıkla, WhatsApp mesaj hazır açılır — sadece gönder'e bas.`);
      else alert('Hata: ' + (d.hata || ''));
    } catch { alert('Bağlantı hatası'); }
    setGonderiliyor(false);
  };

  const adimNo = (n: string) => <span className="w-6 h-6 rounded-full bg-marka-500 text-white text-xs flex items-center justify-center font-bold">{n}</span>;

  return (
    <>
      <PageHeader baslik="WhatsApp Gönderim Listesi" aciklama="Mesajı hazırla → numaraları yapıştır → tek e-postayla al, telefonundan tek tıkla gönder (ban riski yok)" />

      <Card className="mb-6"><CardBody className="flex gap-3">
        <Info size={18} className="text-marka-500 shrink-0 mt-0.5" />
        <p className="text-sm text-metin-yum">WhatsApp otomatik toplu gönderimi numarayı kısıtlattığı için kapalı. Bunun yerine: panel sana <b>hazır mesaj + numara listesini</b> e-posta atar; e-postadaki yeşil butona tıklayınca WhatsApp <b>mesaj hazır</b> açılır, sen <b>gönder</b>'e basarsın. Elle gönderdiğin için güvenlidir.</p>
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

      {/* ADIM 2 — Numaralar */}
      <Card className="mb-6"><CardBody className="space-y-3">
        <p className="font-semibold text-metin flex items-center gap-2">{adimNo('2')} Numaraları yapıştır</p>
        <p className="text-xs text-metin-yum">Her satıra bir numara (veya virgülle ayır). Örn: 0532 123 45 67</p>
        <Textarea value={numaralar} onChange={(e) => setNumaralar(e.target.value)} className="min-h-[160px] text-sm font-mono" placeholder={"0532 123 45 67\n0541 234 56 78\n0505 345 67 89"} />
        <p className="text-sm text-metin-yum flex items-center gap-1.5"><ListPlus size={15} /> <b>{numaraSayisi}</b> geçerli numara algılandı.</p>
      </CardBody></Card>

      {/* ADIM 3 — Gönder */}
      <Card className="mb-6"><CardBody className="space-y-3">
        <p className="font-semibold text-metin flex items-center gap-2">{adimNo('3')} Listeyi e-posta olarak al</p>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[220px]"><Field label="E-posta adresi"><Input value={hedefMail} onChange={(e) => setHedefMail(e.target.value)} /></Field></div>
          <Button onClick={listeyiGonder} disabled={gonderiliyor || !mesaj.trim() || numaraSayisi === 0}>{gonderiliyor ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} {numaraSayisi} numarayı e-postama gönder</Button>
        </div>
        {sonuc && <p className="text-sm text-emerald-700 flex items-start gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl p-3"><CheckCircle2 size={16} className="shrink-0 mt-0.5" /> {sonuc}</p>}
        <p className="text-xs text-metin-yum flex items-center gap-1.5"><Send size={12} /> E-postayı <b>telefonundan</b> açarsan, yeşil butona tıklayınca WhatsApp doğrudan açılır. Numaralar arasında biraz bekleyerek gönder.</p>
      </CardBody></Card>
    </>
  );
}
