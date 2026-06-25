import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2, KeyRound, CheckCircle2, UserCog, Inbox, ChevronDown, ChevronUp, Printer, Image as ImageIcon, Building } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, Badge, Field, Input, Select, Textarea } from '../components/ui';
import { blobGetir } from '../lib/idb';
import { tarih, bugun } from '../lib/format';
import { TASERON_KATEGORILERI } from '../types';

function blobToB64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); });
}

const STANDART_SORULAR = `1. Fiyatı nasıl veriyorsunuz (m³ / saat / götürü)? Birim fiyatınız, KDV dahil mi?
2. Makine (kepçe/ekskavatör) saat ücreti ve kepçe başına fiyatınız nedir?
3. Kaç kişilik ekiple ve aynı anda kaç makineyle çalışırsınız?
4. Bu işi en hızlı ne kadar sürede bitirirsiniz?
5. Hafriyat dışında temel betonu, demir/çelik ve izolasyon işlerini de siz mi yaparsınız, yoksa ayrı firmalarla mı çalışmamız gerekir?
6. Benzer (eğimli arazi / villa temeli) referans işiniz var mı?
7. Ne zaman başlayabilirsiniz?
8. Ödeme koşullarınız ve iş güvenliği / sigorta durumunuz nedir?`;

interface Bulunan { ad: string; email?: string; telefon?: string; web?: string; sehir?: string; }
interface Sonuc { bulunan: Bulunan[]; toplamTaranan: number; emailliSayi: number; gonderilen: number; konu: string; govde: string; mailHazir: boolean; }

export default function TeklifToplama() {
  const { belgeler, gonderenProfil, gonderenProfilGuncelle, firmaEkle, rfqEkle, rfqKayitlari } = useStore();
  const [mailHazir, setMailHazir] = useState<boolean | null>(null);
  const [mailAdres, setMailAdres] = useState('');
  const [profilAcik, setProfilAcik] = useState(false);

  const [kategori, setKategori] = useState('Hafriyat / Kazı');
  const [bolge, setBolge] = useState('İstanbul Avrupa Yakası / Arnavutköy');
  const [sorular, setSorular] = useState(STANDART_SORULAR);
  const [secilenEkler, setSecilenEkler] = useState<Record<string, boolean>>({});
  const [thumb, setThumb] = useState<Record<string, string>>({});

  const [calisiyor, setCalisiyor] = useState(false);
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [mailAcik, setMailAcik] = useState(false);

  // Gelen kutusu
  const [gelenler, setGelenler] = useState<{ from: string; subject: string; date: string; text: string; ozet: string }[]>([]);
  const [gelenYukleniyor, setGelenYukleniyor] = useState(false);
  const [acikMail, setAcikMail] = useState<Record<number, boolean>>({});

  const fotolar = useMemo(() => belgeler.filter((b) => b.tur === 'foto' && b.blobId), [belgeler]);

  useEffect(() => {
    fetch('/api/mail/health').then((r) => r.json()).then((d) => { setMailHazir(!!d.yapilandirilmis); setMailAdres(d.adres || ''); }).catch(() => setMailHazir(false));
  }, []);

  // Foto küçük resimlerini yükle
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

  const otomatikGonder = async () => {
    if (!mailHazir) { alert('Mail hesabı bağlı değil; gönderim yapılamaz.'); return; }
    if (!confirm(`"${kategori}" için ${bolge} bölgesinde e-postası olan firmalar bulunup OTOMATİK teklif maili gönderilecek. Onaylıyor musun?`)) return;
    setCalisiyor(true); setSonuc(null);
    try {
      // seçili görselleri base64 topla
      const ekler: { ad: string; base64: string }[] = [];
      for (const b of fotolar.filter((x) => secilenEkler[x.id])) {
        const blob = await blobGetir(b.blobId!);
        if (blob) ekler.push({ ad: b.ad, base64: await blobToB64(blob) });
      }
      const projeNot = kategori.includes('Hafriyat') ? 'İş: ~350-360 m² tabanda ~50 cm derinlikte temel hafriyatı; üzerine grobeton+hasır çelik+izolasyon gelecek, kolon filizleri bırakılacak. ÇIKAN HAFRİYAT ARSA İÇİNDE KALACAK, kamyonla taşınmayacak (nakliye yok).' : '';
      const r = await fetch('/api/teklif-otomatik', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kategori, bolge, sorular, imza: imzaMetni(), ekler, projeNot }),
      });
      const d = await r.json();
      if (!r.ok) { alert('Hata: ' + (d.hata || '')); setCalisiyor(false); return; }
      setSonuc(d);
      // kayıt: bulunan firmaları + rfq
      (d.bulunan || []).forEach((f: Bulunan) => { if (f.ad && f.email) firmaEkle({ ad: f.ad, email: f.email, kategori, telefon: f.telefon, sehir: f.sehir, kaynak: 'ai' }); });
      if (d.gonderilen > 0) rfqEkle({ tarih: bugun(), konu: d.konu, govde: d.govde, kategori, alicilar: (d.bulunan || []).map((f: Bulunan) => f.email!).filter(Boolean), ekSayisi: ekler.length, durum: 'gonderildi' });
    } catch { alert('Bağlantı hatası.'); }
    setCalisiyor(false);
  };

  const yazdir = () => {
    if (!sonuc) return;
    const w = window.open('', '_blank'); if (!w) return;
    const html = (sonuc.govde || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
    w.document.write(`<html><head><title>${sonuc.konu}</title><meta charset="utf-8"><style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#1f2430;line-height:1.7}h1{font-size:18px;color:#92400e;border-bottom:3px solid #d97706;padding-bottom:8px}</style></head><body><h1>${sonuc.konu}</h1><div>${html}</div><script>window.onload=()=>window.print()</script></body></html>`);
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
        aciklama="Konuyu seç — Opus bölgendeki e-postalı firmaları bulup teklif mailini otomatik gönderir"
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

      {/* Tek ekran: konu + ekler + otomatik gönder */}
      <Card className="mb-6"><CardBody className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Hangi konuda teklif?"><Select value={kategori} onChange={(e) => setKategori(e.target.value)}>{TASERON_KATEGORILERI.map((k) => <option key={k} value={k}>{k}</option>)}</Select></Field>
          <Field label="Bölge"><Input value={bolge} onChange={(e) => setBolge(e.target.value)} /></Field>
        </div>

        <Field label="Sorulacak sorular (AI maile ekler)"><Textarea value={sorular} onChange={(e) => setSorular(e.target.value)} className="min-h-[120px] text-xs" /></Field>

        {/* Görsel ekler — imaj olarak */}
        <div>
          <p className="text-sm font-medium text-metin mb-2 flex items-center gap-1.5"><ImageIcon size={15} /> Eklenecek görseller (tıkla-seç)</p>
          {fotolar.length === 0 ? (
            <p className="text-xs text-metin-yum">Foto & Belge arşivinde görsel yok. HEIC→JPG ya da Foto & Belge'den ekleyebilirsin.</p>
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

        <div className="pt-1">
          <Button onClick={otomatikGonder} disabled={calisiyor || !mailHazir} size="md">
            {calisiyor ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} AI ile firma bul ve otomatik gönder
          </Button>
          {calisiyor && <p className="text-sm text-metin-yum mt-2 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Firmalar araştırılıyor, mail yazılıyor ve gönderiliyor… (1-2 dk sürebilir)</p>}
        </div>
      </CardBody></Card>

      {/* Sonuç */}
      {sonuc && (
        <Card className="mb-6"><CardBody>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge tone="mavi">{sonuc.toplamTaranan} firma tarandı</Badge>
            <Badge tone="amber">{sonuc.emailliSayi} e-postalı firma</Badge>
            <Badge tone={sonuc.gonderilen > 0 ? 'yesil' : 'kirmizi'}>{sonuc.gonderilen} firmaya gönderildi</Badge>
          </div>
          {sonuc.bulunan.length > 0 ? (
            <div className="space-y-1 mb-3">
              {sonuc.bulunan.map((f, i) => (
                <div key={i} className="text-sm flex items-center gap-2 flex-wrap"><Building size={13} className="text-metin-yum" /><b>{f.ad}</b> · <span className="text-marka-700">{f.email}</span>{f.telefon && <span className="text-metin-yum">· {f.telefon}</span>}</div>
              ))}
            </div>
          ) : <p className="text-sm text-metin-yum mb-3">Bu kategoride e-postalı firma bulunamadı (bu iş kolu telefonla çalışıyor olabilir). Farklı kategori/bölge dene.</p>}

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMailAcik((v) => !v)}>{mailAcik ? <ChevronUp size={15} /> : <ChevronDown size={15} />} Gönderilen maili gör</Button>
            <Button variant="soft" size="sm" onClick={yazdir}><Printer size={15} /> PDF / Yazdır</Button>
          </div>
          {mailAcik && <div className="mt-2 rounded-xl bg-zemin border border-cizgi p-4 text-sm whitespace-pre-wrap">{sonuc.govde}</div>}
        </CardBody></Card>
      )}

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
