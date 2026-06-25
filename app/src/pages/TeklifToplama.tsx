import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2, KeyRound, CheckCircle2, UserCog, Inbox, ChevronDown, ChevronUp, Printer, Image as ImageIcon, Building, Mail, Phone, Wand2, Search, Send, Square, CheckSquare } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, Badge, Field, Input, Select, Textarea } from '../components/ui';
import { blobGetir } from '../lib/idb';
import { tarih, bugun } from '../lib/format';
import { TASERON_KATEGORILERI } from '../types';

function blobToB64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); });
}

interface Firma { ad: string; email?: string; telefon?: string; web?: string; sehir?: string; }

export default function TeklifToplama() {
  const { belgeler, proje, gonderenProfil, gonderenProfilGuncelle, firmaEkle, rfqEkle, rfqKayitlari } = useStore();
  const [mailHazir, setMailHazir] = useState<boolean | null>(null);
  const [mailAdres, setMailAdres] = useState('');
  const [profilAcik, setProfilAcik] = useState(false);
  const [teknikDetay, setTeknikDetay] = useState(true);

  // 1) Mesaj hazırlama
  const [kategori, setKategori] = useState('Hafriyat / Kazı');
  const [kabaNot, setKabaNot] = useState('');
  const [sorular, setSorular] = useState('');
  const [konu, setKonu] = useState('');
  const [govde, setGovde] = useState('');
  const [mailYaziyor, setMailYaziyor] = useState(false);
  const [secilenEkler, setSecilenEkler] = useState<Record<string, boolean>>({});
  const [thumb, setThumb] = useState<Record<string, string>>({});

  // 2) Firma arama + seçim
  const [bolge, setBolge] = useState('İstanbul Avrupa Yakası / Arnavutköy');
  const [ariyor, setAriyor] = useState(false);
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [secili, setSecili] = useState<Record<string, boolean>>({});

  // 3) Gönderim
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [sonGonderim, setSonGonderim] = useState<number | null>(null);

  // Gelen kutusu
  const [gelenler, setGelenler] = useState<{ from: string; subject: string; date: string; text: string; ozet: string }[]>([]);
  const [gelenYukleniyor, setGelenYukleniyor] = useState(false);
  const [acikMail, setAcikMail] = useState<Record<number, boolean>>({});

  const fotolar = useMemo(() => belgeler.filter((b) => b.tur === 'foto' && b.blobId), [belgeler]);
  const specliSayi = useMemo(() => belgeler.filter((b) => b.spec).length, [belgeler]);
  const emailliFirmalar = firmalar.filter((f) => f.email);
  const seciliEmailler = emailliFirmalar.filter((f) => secili[f.email!]).map((f) => f.email!);

  useEffect(() => {
    fetch('/api/mail/health').then((r) => r.json()).then((d) => { setMailHazir(!!d.yapilandirilmis); setMailAdres(d.adres || ''); }).catch(() => setMailHazir(false));
  }, []);

  useEffect(() => {
    let iptal = false; const olusan: string[] = [];
    (async () => {
      const map: Record<string, string> = {};
      for (const b of fotolar) {
        if (thumb[b.id]) { map[b.id] = thumb[b.id]; continue; }
        try { const blob = await blobGetir(b.blobId!); if (blob) { const u = URL.createObjectURL(blob); map[b.id] = u; olusan.push(u); } } catch { /**/ }
      }
      if (!iptal) setThumb((t) => ({ ...t, ...map }));
    })();
    return () => { iptal = true; olusan.forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line
  }, [fotolar.length]);

  const imzaMetni = () => `${gonderenProfil.ad}\n${gonderenProfil.unvan}${gonderenProfil.telefon ? '\nTel: ' + gonderenProfil.telefon : ''}\ninsaat@pokkop.com`;
  const speclerTopla = () => belgeler.filter((b) => b.spec).map((b) => `### ${b.ad}\n${b.spec}`).join('\n\n');

  // 1) AI ile profesyonel mail yaz
  const mailYaz = async () => {
    setMailYaziyor(true);
    try {
      const r = await fetch('/api/teklif-mail-yaz', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kategori, bolge, sorular, imza: imzaMetni(), kabaNot, proje: JSON.stringify(proje), specler: speclerTopla(), teknikDetay }),
      });
      const d = await r.json();
      if (r.ok) { setGovde(d.govde || ''); setKonu(d.konu || `Teklif Talebi — ${kategori}`); }
      else alert('Yazılamadı: ' + (d.hata || ''));
    } catch { alert('Bağlantı hatası'); }
    setMailYaziyor(false);
  };

  // 2) Firma ara
  const firmaAra = async () => {
    setAriyor(true); setFirmalar([]); setSecili({});
    try {
      const r = await fetch('/api/firma-bul', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kategori, bolge, kanal: 'email' }) });
      const d = await r.json();
      if (r.ok) setFirmalar(d.firmalar || []);
      else alert('Hata: ' + (d.hata || ''));
    } catch { alert('Bağlantı hatası'); }
    setAriyor(false);
  };

  const tumunuSec = () => { const hepsi = emailliFirmalar.every((f) => secili[f.email!]); const yeni: Record<string, boolean> = {}; emailliFirmalar.forEach((f) => { yeni[f.email!] = !hepsi; }); setSecili(yeni); };

  // 3) Seçili firmalara gönder
  const gonder = async () => {
    if (!mailHazir) { alert('Mail hesabı bağlı değil.'); return; }
    if (!govde.trim()) { alert('Önce yukarıdan mesajı hazırla (AI ile yaz).'); return; }
    if (seciliEmailler.length === 0) { alert('Listeden en az bir firma seç.'); return; }
    if (!confirm(`Seçili ${seciliEmailler.length} firmaya teklif maili gönderilecek. Onaylıyor musun?`)) return;
    setGonderiliyor(true); setSonGonderim(null);
    try {
      const ekler: { ad: string; base64: string }[] = [];
      for (const b of fotolar.filter((x) => secilenEkler[x.id])) {
        const blob = await blobGetir(b.blobId!);
        if (blob) ekler.push({ ad: b.ad, base64: await blobToB64(blob) });
      }
      const r = await fetch('/api/mail/gonder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alicilar: seciliEmailler, konu, govde, ekler }) });
      const d = await r.json();
      if (!r.ok) { alert('Gönderilemedi: ' + (d.hata || '')); setGonderiliyor(false); return; }
      setSonGonderim(seciliEmailler.length);
      emailliFirmalar.filter((f) => secili[f.email!]).forEach((f) => firmaEkle({ ad: f.ad, email: f.email!, kategori, telefon: f.telefon, sehir: f.sehir, kaynak: 'ai' }));
      rfqEkle({ tarih: bugun(), konu, govde, kategori, alicilar: seciliEmailler, ekSayisi: ekler.length, durum: 'gonderildi' });
    } catch { alert('Bağlantı hatası.'); }
    setGonderiliyor(false);
  };

  const yazdir = () => {
    if (!govde) return;
    const w = window.open('', '_blank'); if (!w) return;
    const html = govde.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
    w.document.write(`<html><head><title>${konu}</title><meta charset="utf-8"><style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#1f2430;line-height:1.7}h1{font-size:18px;color:#92400e;border-bottom:3px solid #d97706;padding-bottom:8px}</style></head><body><h1>${konu}</h1><div>${html}</div><script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  const gelenleriTara = async () => {
    setGelenYukleniyor(true);
    try { const r = await fetch('/api/mail/gelenler?limit=8'); const d = await r.json(); setGelenler(Array.isArray(d.emails) ? d.emails : []); } catch { /**/ }
    setGelenYukleniyor(false);
  };

  return (
    <>
      <PageHeader
        baslik="Teklif Toplama"
        aciklama="1) Mesajı hazırla → 2) Firma ara → 3) Seçtiklerine gönder. Otomatik gönderim yok, kontrol sende."
        sag={<Button variant="ghost" size="sm" onClick={() => setProfilAcik((v) => !v)}><UserCog size={15} /> İmza</Button>}
      />

      {profilAcik && (
        <Card className="mb-5"><CardBody>
          <p className="font-semibold text-metin mb-3 flex items-center gap-2"><UserCog size={16} /> Gönderen / İmza</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Ad Soyad"><Input value={gonderenProfil.ad} onChange={(e) => gonderenProfilGuncelle({ ad: e.target.value })} /></Field>
            <Field label="Ünvan"><Input value={gonderenProfil.unvan} onChange={(e) => gonderenProfilGuncelle({ unvan: e.target.value })} /></Field>
            <Field label="Telefon"><Input value={gonderenProfil.telefon || ''} onChange={(e) => gonderenProfilGuncelle({ telefon: e.target.value })} /></Field>
          </div>
        </CardBody></Card>
      )}

      {mailHazir && <p className="mb-4 text-sm text-emerald-700 flex items-center gap-1.5"><CheckCircle2 size={15} /> Gönderim bağlı: <b>{mailAdres}</b></p>}
      {mailHazir === false && (
        <Card className="mb-5"><CardBody className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-marka-50 text-marka-600"><KeyRound size={22} /></div>
          <div><h3 className="font-semibold text-metin">Mail hesabı bağlı değil</h3><p className="text-sm text-metin-yum">Gönderim için mailbox şifresi gerekli.</p></div>
        </CardBody></Card>
      )}

      {/* ADIM 1 — Mesajı hazırla */}
      <Card className="mb-6"><CardBody className="space-y-4">
        <p className="font-semibold text-metin flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-marka-500 text-white text-xs flex items-center justify-center font-bold">1</span> Mesajı hazırla</p>

        <Field label="Hangi konuda teklif?"><Select value={kategori} onChange={(e) => setKategori(e.target.value)}>{TASERON_KATEGORILERI.map((k) => <option key={k} value={k}>{k}</option>)}</Select></Field>

        <div className="rounded-xl bg-marka-50/60 border border-marka-100 p-3 space-y-1.5">
          <p className="text-sm font-medium text-metin flex items-center gap-1.5"><Wand2 size={15} className="text-marka-500" /> İşi kısaca anlat — AI profesyonel yazıya döker</p>
          <Textarea value={kabaNot} onChange={(e) => setKabaNot(e.target.value)} placeholder="Ne istediğini kendi cümlelerinle yaz. Örn: alüminyum doğrama lazım, ısıcam istiyorum, fiyat ve süre öğrenmek istiyorum…" className="min-h-[90px] text-sm bg-white" />
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="soft" onClick={mailYaz} disabled={mailYaziyor}>{mailYaziyor ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} AI ile profesyonel yazıya dök</Button>
            <button type="button" onClick={() => setTeknikDetay((v) => !v)} className="inline-flex items-center gap-1.5 text-xs text-metin cursor-pointer">
              {teknikDetay ? <CheckSquare size={15} className="text-marka-500" /> : <Square size={15} className="text-metin-yum" />} Teknik detay ekle (m² / malzeme / süre)
            </button>
          </div>
          <span className="text-xs text-metin-yum">{specliSayi > 0 ? `${specliSayi} belgeden teknik ölçü/m²/malzeme bilgisi de eklenir.` : 'Proje künyesi otomatik eklenir.'} Bütçe/fiyat yazılmaz — onu firma verir.</span>
        </div>

        <Field label="Eklemek istediğin özel sorular (opsiyonel)"><Textarea value={sorular} onChange={(e) => setSorular(e.target.value)} placeholder="Boş bırak — AI zaten fiyat, malzeme, süre, referans, ödeme, garanti gibi soruları sorar." className="min-h-[60px] text-xs" /></Field>

        {(govde || mailYaziyor) && (
          <div className="space-y-2">
            <Field label="Konu"><Input value={konu} onChange={(e) => setKonu(e.target.value)} /></Field>
            <Field label="Mail metni (düzenleyebilirsin)"><Textarea value={govde} onChange={(e) => setGovde(e.target.value)} className="min-h-[260px] text-sm" /></Field>
          </div>
        )}

        {/* Görseller */}
        <div>
          <p className="text-sm font-medium text-metin mb-2 flex items-center gap-1.5"><ImageIcon size={15} /> Eklenecek görseller (tıkla-seç)</p>
          {fotolar.length === 0 ? (
            <p className="text-xs text-metin-yum">Foto & Belge arşivinde görsel yok.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
              {fotolar.map((b) => {
                const sec = !!secilenEkler[b.id];
                return (
                  <button key={b.id} onClick={() => setSecilenEkler((s) => ({ ...s, [b.id]: !sec }))}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition cursor-pointer ${sec ? 'border-marka-500 ring-2 ring-marka-200' : 'border-cizgi hover:border-marka-300'}`}>
                    {thumb[b.id] ? <img src={thumb[b.id]} alt={b.ad} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zemin flex items-center justify-center"><ImageIcon size={18} className="text-metin-yum" /></div>}
                    {sec && <div className="absolute top-1 right-1 bg-marka-500 text-white rounded-full p-0.5"><CheckCircle2 size={14} /></div>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </CardBody></Card>

      {/* ADIM 2 — Firma ara */}
      <Card className="mb-6"><CardBody className="space-y-4">
        <p className="font-semibold text-metin flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-marka-500 text-white text-xs flex items-center justify-center font-bold">2</span> Firma ara</p>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]"><Field label="Bölge"><Input value={bolge} onChange={(e) => setBolge(e.target.value)} /></Field></div>
          <Button onClick={firmaAra} disabled={ariyor}>{ariyor ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} "{kategori}" için ara</Button>
        </div>
        {ariyor && <p className="text-sm text-metin-yum flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Profesyonel firmalar araştırılıyor (e-postalılar öne çıkar)… (1-2 dk)</p>}

        {firmalar.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-2 flex-wrap"><Badge tone="amber">{emailliFirmalar.length} e-postalı</Badge><Badge tone="gri">{firmalar.length - emailliFirmalar.length} yalnız telefon</Badge><Badge tone="yesil">{seciliEmailler.length} seçili</Badge></div>
              <Button size="sm" variant="ghost" onClick={tumunuSec} disabled={emailliFirmalar.length === 0}>{emailliFirmalar.every((f) => secili[f.email!]) && emailliFirmalar.length > 0 ? 'Seçimi kaldır' : 'Tümünü seç (e-postalı)'}</Button>
            </div>
            <div className="space-y-1">
              {firmalar.map((f, i) => {
                const sec = f.email ? !!secili[f.email] : false;
                return (
                  <button key={i} disabled={!f.email} onClick={() => f.email && setSecili((s) => ({ ...s, [f.email!]: !sec }))}
                    className={`w-full text-left flex items-center gap-2.5 border-b border-cizgi/60 py-2 px-1 rounded-lg transition ${f.email ? 'cursor-pointer hover:bg-zemin' : 'opacity-60 cursor-default'}`}>
                    {f.email ? (sec ? <CheckSquare size={17} className="text-marka-500 shrink-0" /> : <Square size={17} className="text-metin-yum shrink-0" />) : <Square size={17} className="text-cizgi shrink-0" />}
                    <div className="text-sm min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1"><Building size={13} className="text-metin-yum" /> <b>{f.ad}</b></span>
                      {f.email ? <span className="text-marka-700"> · <Mail size={12} className="inline" /> {f.email}</span>
                        : f.telefon ? <span className="text-metin-yum"> · <Phone size={12} className="inline" /> {f.telefon} <Badge tone="gri">e-posta yok</Badge></span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-metin-yum">Yalnız telefonu olan firmalar maile uygun değil; onlara <b>WhatsApp</b> sayfasından ulaşabilirsin.</p>
          </>
        )}
      </CardBody></Card>

      {/* ADIM 3 — Gönder */}
      <Card className="mb-6"><CardBody className="space-y-3">
        <p className="font-semibold text-metin flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-marka-500 text-white text-xs flex items-center justify-center font-bold">3</span> Seçtiklerine gönder</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={gonder} disabled={gonderiliyor || !mailHazir || !govde.trim() || seciliEmailler.length === 0}>
            {gonderiliyor ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Seçili {seciliEmailler.length} firmaya gönder
          </Button>
          {govde && <Button variant="soft" size="sm" onClick={yazdir}><Printer size={15} /> PDF / Yazdır</Button>}
        </div>
        {!govde.trim() && <p className="text-xs text-metin-yum">Önce Adım 1'de mesajı hazırla.</p>}
        {seciliEmailler.length === 0 && govde.trim() && <p className="text-xs text-metin-yum">Adım 2'de listeden firma seç.</p>}
        {sonGonderim != null && <p className="text-sm text-emerald-700 flex items-center gap-1.5"><CheckCircle2 size={15} /> {sonGonderim} firmaya gönderildi.</p>}
      </CardBody></Card>

      {/* Gelen Teklifler */}
      <Card className="mb-6"><CardBody>
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="font-semibold text-metin flex items-center gap-2"><Inbox size={16} /> Gelen Teklifler <span className="text-xs font-normal text-metin-yum">(AI özetli)</span></p>
          <Button variant="soft" size="sm" onClick={gelenleriTara} disabled={gelenYukleniyor || !mailHazir}>{gelenYukleniyor ? <Loader2 size={15} className="animate-spin" /> : <Inbox size={15} />} Gelen kutusunu tara</Button>
        </div>
        {!mailHazir ? <p className="text-sm text-metin-yum">Mail bağlanınca taranabilir.</p>
          : gelenYukleniyor ? <p className="text-sm text-metin-yum flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Mailler okunuyor ve AI özetliyor…</p>
            : gelenler.length === 0 ? <p className="text-sm text-metin-yum">Henüz taranmadı / mail yok.</p>
              : (
                <div className="space-y-3">
                  {gelenler.map((m, i) => {
                    const acik = !!acikMail[i];
                    return (
                      <div key={i} className="rounded-xl border border-cizgi p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0"><p className="font-medium text-metin text-sm truncate">{m.subject}</p><p className="text-xs text-metin-yum truncate">{m.from} · {tarih(m.date)}</p></div>
                          <button onClick={() => setAcikMail((s) => ({ ...s, [i]: !acik }))} className="text-marka-500 shrink-0 p-1 cursor-pointer">{acik ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                        </div>
                        {m.ozet && <div className="mt-2 rounded-lg bg-marka-50 border border-marka-100 p-2.5"><p className="text-xs font-semibold text-marka-700 mb-1 flex items-center gap-1"><Sparkles size={12} /> AI Özeti</p><div className="text-sm text-marka-900 whitespace-pre-wrap">{m.ozet}</div></div>}
                        {acik && <div className="mt-2 text-sm text-metin whitespace-pre-wrap border-t border-cizgi pt-2 max-h-64 overflow-y-auto">{m.text || '(metin yok)'}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
      </CardBody></Card>

      {rfqKayitlari.length > 0 && (
        <Card><CardBody>
          <p className="font-semibold text-metin mb-3">Gönderim Geçmişi</p>
          <div className="divide-y divide-cizgi">
            {[...rfqKayitlari].reverse().map((r) => (
              <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                <div><p className="font-medium text-metin text-sm">{r.konu}</p><p className="text-xs text-metin-yum">{tarih(r.tarih)} · {r.alicilar.length} firma · {r.ekSayisi || 0} ek</p></div>
                <Badge tone={r.durum === 'gonderildi' ? 'yesil' : 'kirmizi'}>{r.durum === 'gonderildi' ? 'Gönderildi' : 'Hata'}</Badge>
              </div>
            ))}
          </div>
        </CardBody></Card>
      )}
    </>
  );
}
