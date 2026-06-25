import { useEffect, useMemo, useState } from 'react';
import { Mailbox, Plus, Trash2, Sparkles, Loader2, Send, Paperclip, KeyRound, Building, CheckCircle2, UserCog, Search, Printer } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, Badge, Field, Input, Select, Textarea, Modal, EmptyState, TableWrap } from '../components/ui';
import { blobGetir } from '../lib/idb';
import { tarih, bugun } from '../lib/format';
import { TASERON_KATEGORILERI, type Belge } from '../types';

function blobToB64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); });
}

// Firmanın nasıl çalıştığını öğrenen standart sorular
const STANDART_SORULAR = `1. Fiyatı nasıl veriyorsunuz (m³ / saat / götürü)? Birim fiyatınız nedir, KDV dahil mi?
2. Kepçe/ekskavatör saat ücreti ve kepçe başına fiyatınız nedir?
3. Kaç kişilik ekiple ve aynı anda kaç makine ile çalışırsınız?
4. Bu işi en hızlı ne kadar sürede bitirirsiniz?
5. Hafriyat dışında temel betonu, demir/çelik ve izolasyon işlerini de siz mi yaparsınız, yoksa ayrı firmalarla mı çalışmamız gerekir?
6. Daha önce benzer (eğimli arazi / villa temeli) işleriniz oldu mu, referans verebilir misiniz?
7. Ne zaman başlayabilirsiniz?
8. Ödeme koşullarınız ve iş güvenliği / sigorta durumunuz nedir?`;

interface BulunanFirma { ad: string; email?: string; telefon?: string; web?: string; sehir?: string; }

export default function TeklifToplama() {
  const { firmalar, firmaEkle, firmaSil, rfqKayitlari, rfqEkle, belgeler, proje, gonderenProfil, gonderenProfilGuncelle } = useStore();
  const [mailHazir, setMailHazir] = useState<boolean | null>(null);
  const [mailAdres, setMailAdres] = useState('');
  const [firmaModal, setFirmaModal] = useState(false);
  const [profilAcik, setProfilAcik] = useState(false);
  const [yeni, setYeni] = useState({ ad: '', email: '', kategori: TASERON_KATEGORILERI[0] as string, telefon: '', sehir: 'İstanbul' });

  const [kategori, setKategori] = useState('Hafriyat / Kazı');
  const [sorular, setSorular] = useState(STANDART_SORULAR);
  const [konu, setKonu] = useState('');
  const [govde, setGovde] = useState('');
  const [secilenFirmalar, setSecilenFirmalar] = useState<Record<string, boolean>>({});
  const [secilenEkler, setSecilenEkler] = useState<Record<string, boolean>>({});
  const [taslakYukleniyor, setTaslakYukleniyor] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  // AI ile firma bul
  const [bolge, setBolge] = useState('İstanbul Avrupa Yakası / Arnavutköy');
  const [buluyor, setBuluyor] = useState(false);
  const [bulunan, setBulunan] = useState<BulunanFirma[]>([]);
  const [bulunanSecili, setBulunanSecili] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch('/api/mail/health').then((r) => r.json()).then((d) => { setMailHazir(!!d.yapilandirilmis); setMailAdres(d.adres || ''); }).catch(() => setMailHazir(false));
  }, []);

  const firmaKaydet = () => {
    if (!yeni.ad || !yeni.email) return;
    firmaEkle({ ...yeni, kaynak: 'kullanici' });
    setYeni({ ad: '', email: '', kategori: TASERON_KATEGORILERI[0], telefon: '', sehir: 'İstanbul' });
    setFirmaModal(false);
  };

  const firmaBul = async () => {
    setBuluyor(true); setBulunan([]); setBulunanSecili({});
    try {
      const r = await fetch('/api/firma-bul', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kategori, bolge }) });
      const d = await r.json();
      setBulunan(Array.isArray(d.firmalar) ? d.firmalar : []);
    } catch { /* yoksay */ }
    setBuluyor(false);
  };
  const bulunanlariEkle = () => {
    bulunan.forEach((f, i) => { if (bulunanSecili[i] && f.ad) firmaEkle({ ad: f.ad, email: f.email || '', kategori, telefon: f.telefon, sehir: f.sehir, kaynak: 'ai' }); });
    setBulunan([]); setBulunanSecili({});
  };

  const taslakOlustur = async () => {
    setTaslakYukleniyor(true);
    try {
      const imza = `${gonderenProfil.ad}\n${gonderenProfil.unvan}${gonderenProfil.telefon ? '\nTel: ' + gonderenProfil.telefon : ''}\ninsaat@pokkop.com`;
      const icerik = `İstanbul'daki firmalara göndereceğim profesyonel bir TEKLİF İSTEME (RFQ) e-postası yaz. İş kategorisi: "${kategori}". 
Proje: ${proje.ad}, ${proje.konum}. Arsa HAFİF EĞİMLİDİR.
${kategori.includes('Hafriyat') ? 'İş: ~350-360 m² tabanda ~50 cm derinlikte temel hafriyatı; üzerine grobeton+hasır çelik+izolasyon gelecek, kolon filizleri bırakılacak. ÖNEMLİ: çıkan hafriyat ARSA İÇİNDE kalacak, kamyonla taşınmayacak (nakliye yok).' : ''}
Mail; kısa proje tanıtımı + işin kapsamı + "öncelikle fiyat ve süre öğrenmek istiyoruz" vurgusu içersin ve MUTLAKA şu soruları madde madde sorsun (firmanın nasıl çalıştığını öğrenmek istiyoruz):
${sorular}
Sonunda şu imzayla bitir:
${imza}
Resmi ama sıcak, Türkçe. SADECE e-posta gövdesini yaz (konu satırı hariç), başına/sonuna açıklama ekleme.`;
      const r = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baglam: `Proje: ${proje.ad}`, mesajlar: [{ role: 'user', icerik }] }) });
      const d = await r.json();
      if (r.ok && d.cevap) { setGovde(d.cevap); if (!konu) setKonu(`Teklif Talebi — ${kategori} — ${proje.ad}`); }
    } catch { /* yoksay */ }
    setTaslakYukleniyor(false);
  };

  const seciliFirmaListesi = firmalar.filter((f) => secilenFirmalar[f.id] && f.email);

  const yazdir = () => {
    const w = window.open('', '_blank'); if (!w) return;
    const html = (govde || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
    w.document.write(`<html><head><title>${konu || 'Teklif Talebi'}</title><meta charset="utf-8"><style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#1f2430;line-height:1.7}h1{font-size:18px;color:#92400e;border-bottom:3px solid #d97706;padding-bottom:8px}.alt{color:#5b6472;font-size:12px;margin-bottom:20px}</style></head><body><h1>AHMET KURT VİLLA PROJESİ</h1><div class="alt">${konu || 'Teklif Talebi'} · insaat@pokkop.com</div><div>${html}</div><script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  const gonder = async () => {
    const alicilar = seciliFirmaListesi.map((f) => f.email);
    if (alicilar.length === 0) { alert('E-postası olan en az bir firma seç.'); return; }
    if (!govde.trim()) { alert('Önce mail metnini oluştur/yaz.'); return; }
    setGonderiliyor(true);
    try {
      const ekler: { ad: string; base64: string }[] = [];
      for (const b of belgeler.filter((x: Belge) => secilenEkler[x.id] && x.blobId)) {
        const blob = await blobGetir(b.blobId!);
        if (blob) ekler.push({ ad: b.ad, base64: await blobToB64(blob) });
      }
      const r = await fetch('/api/mail/gonder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alicilar, konu: konu || 'Teklif Talebi', govde, ekler }) });
      const d = await r.json();
      if (r.ok) {
        rfqEkle({ tarih: bugun(), konu: konu || 'Teklif Talebi', govde, kategori, alicilar, ekSayisi: ekler.length, durum: 'gonderildi' });
        alert(`✓ ${d.gonderilen} firmaya gönderildi.`);
        setSecilenFirmalar({}); setSecilenEkler({});
      } else { alert('Gönderilemedi: ' + (d.hata || '')); }
    } catch { alert('Bağlantı hatası.'); }
    setGonderiliyor(false);
  };

  const emailsizSayi = useMemo(() => firmalar.filter((f) => !f.email).length, [firmalar]);

  return (
    <>
      <PageHeader
        baslik="Teklif Toplama"
        aciklama="AI ile firma bul, profesyonel teklif maili yaz, 5-15 firmaya gönder"
        sag={<>
          <Button variant="ghost" size="sm" onClick={() => setProfilAcik((v) => !v)}><UserCog size={15} /> İmza</Button>
          <Button variant="soft" size="sm" onClick={() => setFirmaModal(true)}><Plus size={15} /> Firma</Button>
        </>}
      />

      {/* Gönderen profili / imza */}
      {profilAcik && (
        <Card className="mb-5"><CardBody>
          <p className="font-semibold text-metin mb-3 flex items-center gap-2"><UserCog size={16} /> Gönderen / İmza</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Ad Soyad"><Input value={gonderenProfil.ad} onChange={(e) => gonderenProfilGuncelle({ ad: e.target.value })} /></Field>
            <Field label="Ünvan"><Input value={gonderenProfil.unvan} onChange={(e) => gonderenProfilGuncelle({ unvan: e.target.value })} /></Field>
            <Field label="Telefon"><Input value={gonderenProfil.telefon || ''} onChange={(e) => gonderenProfilGuncelle({ telefon: e.target.value })} /></Field>
          </div>
          <p className="text-xs text-metin-yum mt-2">Bu bilgiler mailin imzasında otomatik kullanılır.</p>
        </CardBody></Card>
      )}

      {mailHazir === false && (
        <Card className="mb-5"><CardBody className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-marka-50 text-marka-600"><KeyRound size={22} /></div>
          <div><h3 className="font-semibold text-metin">Mail hesabı bağlı değil</h3><p className="text-sm text-metin-yum">Mailbox şifresi eklenince gönderim aktif olur. Firma bulma ve taslak hazırlama yine de çalışır.</p></div>
        </CardBody></Card>
      )}
      {mailHazir && <p className="mb-4 text-sm text-emerald-700 flex items-center gap-1.5"><CheckCircle2 size={15} /> Gönderim bağlı: <b>{mailAdres}</b></p>}

      {/* AI ile firma bul */}
      <Card className="mb-6"><CardBody>
        <p className="font-semibold text-metin mb-3 flex items-center gap-2"><Search size={16} /> AI ile Firma Bul (web araştırması)</p>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[150px]"><Field label="Kategori"><Select value={kategori} onChange={(e) => setKategori(e.target.value)}>{TASERON_KATEGORILERI.map((k) => <option key={k} value={k}>{k}</option>)}</Select></Field></div>
          <div className="flex-1 min-w-[180px]"><Field label="Bölge"><Input value={bolge} onChange={(e) => setBolge(e.target.value)} /></Field></div>
          <Button onClick={firmaBul} disabled={buluyor}>{buluyor ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Bul</Button>
        </div>
        {buluyor && <p className="text-sm text-metin-yum mt-3 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> İnternette firma araştırılıyor (30-60 sn)…</p>}
        {bulunan.length > 0 && (
          <div className="mt-3">
            <div className="space-y-1.5 max-h-56 overflow-y-auto border border-cizgi rounded-xl p-2">
              {bulunan.map((f, i) => (
                <label key={i} className="flex items-start gap-2 text-sm cursor-pointer py-1 px-1 hover:bg-zemin rounded">
                  <input type="checkbox" className="mt-1" checked={!!bulunanSecili[i]} onChange={(e) => setBulunanSecili((s) => ({ ...s, [i]: e.target.checked }))} />
                  <span><b>{f.ad}</b>{f.email ? ` · ${f.email}` : ' · (e-posta yok)'}{f.telefon ? ` · ${f.telefon}` : ''}{f.web ? ` · ${f.web}` : ''}</span>
                </label>
              ))}
            </div>
            <Button size="sm" className="mt-2" onClick={bulunanlariEkle}><Plus size={14} /> Seçilenleri firma listesine ekle</Button>
            <p className="text-xs text-metin-yum mt-1">Not: AI bazı firmaların e-postasını bulamayabilir; e-postasız firmaları telefonla ararsın.</p>
          </div>
        )}
      </CardBody></Card>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Firmalar */}
        <Card><CardBody>
          <p className="font-semibold text-metin mb-3 flex items-center gap-2"><Building size={16} /> Firmalar ({firmalar.length}){emailsizSayi > 0 && <Badge tone="gri">{emailsizSayi} e-postasız</Badge>}</p>
          {firmalar.length === 0 ? (
            <EmptyState ikon={<Building size={24} />} baslik="Firma yok" aciklama="AI ile bul ya da elle ekle." aksiyon={<Button size="sm" onClick={() => setFirmaModal(true)}><Plus size={14} /> Firma ekle</Button>} />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-metin-yum border-b border-cizgi"><th className="py-2 pr-2"></th><th className="pr-2">Firma</th><th className="pr-2">Kategori</th><th></th></tr></thead>
                <tbody>
                  {firmalar.map((f) => (
                    <tr key={f.id} className="border-b border-cizgi/60">
                      <td className="py-2 pr-2"><input type="checkbox" disabled={!f.email} checked={!!secilenFirmalar[f.id]} onChange={(e) => setSecilenFirmalar((s) => ({ ...s, [f.id]: e.target.checked }))} /></td>
                      <td className="pr-2"><div className="font-medium text-metin">{f.ad} {f.kaynak === 'ai' && <Badge tone="amber">AI</Badge>}</div><div className="text-xs text-metin-yum">{f.email || (f.telefon ? '📞 ' + f.telefon : 'e-posta yok')}</div></td>
                      <td className="pr-2"><Badge tone="gri">{f.kategori || '—'}</Badge></td>
                      <td className="text-right"><button onClick={() => firmaSil(f.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </CardBody></Card>

        {/* Teklif maili */}
        <Card><CardBody className="space-y-3">
          <p className="font-semibold text-metin flex items-center gap-2"><Mailbox size={16} /> Teklif Maili</p>
          <Field label="Sorulacak sorular (AI maile ekler)"><Textarea value={sorular} onChange={(e) => setSorular(e.target.value)} className="min-h-[120px] text-xs" /></Field>
          <Button variant="soft" size="sm" onClick={taslakOlustur} disabled={taslakYukleniyor}>{taslakYukleniyor ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} AI ile mail metni oluştur</Button>
          <Field label="Konu"><Input value={konu} onChange={(e) => setKonu(e.target.value)} placeholder="Teklif Talebi — ..." /></Field>
          <Field label="Mail metni"><Textarea value={govde} onChange={(e) => setGovde(e.target.value)} className="min-h-[200px]" placeholder="AI ile oluştur ya da kendin yaz…" /></Field>

          {belgeler.length > 0 && (
            <div>
              <p className="text-sm font-medium text-metin mb-1.5 flex items-center gap-1.5"><Paperclip size={14} /> Ekler</p>
              <div className="max-h-28 overflow-y-auto space-y-1 border border-cizgi rounded-xl p-2">
                {belgeler.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5"><input type="checkbox" checked={!!secilenEkler[b.id]} onChange={(e) => setSecilenEkler((s) => ({ ...s, [b.id]: e.target.checked }))} /><span className="truncate">{b.ad}</span></label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 gap-2">
            <span className="text-xs text-metin-yum">{seciliFirmaListesi.length} firma seçili</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={yazdir} disabled={!govde}><Printer size={15} /> PDF / Yazdır</Button>
              <Button onClick={gonder} disabled={gonderiliyor || !mailHazir}>{gonderiliyor ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Gönder</Button>
            </div>
          </div>
        </CardBody></Card>
      </div>

      {rfqKayitlari.length > 0 && (
        <Card className="mt-6"><CardBody>
          <p className="font-semibold text-metin mb-3">Gönderilen Teklif İstekleri</p>
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

      <Modal acik={firmaModal} kapat={() => setFirmaModal(false)} baslik="Yeni Firma">
        <div className="space-y-4">
          <Field label="Firma adı"><Input value={yeni.ad} onChange={(e) => setYeni({ ...yeni, ad: e.target.value })} /></Field>
          <Field label="E-posta"><Input type="email" value={yeni.email} onChange={(e) => setYeni({ ...yeni, email: e.target.value })} placeholder="firma@ornek.com" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kategori"><Select value={yeni.kategori} onChange={(e) => setYeni({ ...yeni, kategori: e.target.value })}>{TASERON_KATEGORILERI.map((k) => <option key={k} value={k}>{k}</option>)}</Select></Field>
            <Field label="Telefon"><Input value={yeni.telefon} onChange={(e) => setYeni({ ...yeni, telefon: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setFirmaModal(false)}>Vazgeç</Button><Button onClick={firmaKaydet}>Ekle</Button></div>
        </div>
      </Modal>
    </>
  );
}
