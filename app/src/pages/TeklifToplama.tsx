import { useEffect, useMemo, useState } from 'react';
import { Mailbox, Plus, Trash2, Sparkles, Loader2, Send, Paperclip, KeyRound, Building, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, Badge, Field, Input, Select, Textarea, Modal, EmptyState, TableWrap } from '../components/ui';
import { blobGetir } from '../lib/idb';
import { tarih, bugun } from '../lib/format';
import { TASERON_KATEGORILERI, type Belge } from '../types';

function blobToB64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); });
}

export default function TeklifToplama() {
  const { firmalar, firmaEkle, firmaSil, rfqKayitlari, rfqEkle, belgeler, proje } = useStore();
  const [mailHazir, setMailHazir] = useState<boolean | null>(null);
  const [mailAdres, setMailAdres] = useState('');
  const [firmaModal, setFirmaModal] = useState(false);
  const [yeni, setYeni] = useState({ ad: '', email: '', kategori: TASERON_KATEGORILERI[0] as string, telefon: '', sehir: 'İstanbul' });

  const [kategori, setKategori] = useState('');
  const [konu, setKonu] = useState('');
  const [govde, setGovde] = useState('');
  const [secilenFirmalar, setSecilenFirmalar] = useState<Record<string, boolean>>({});
  const [secilenEkler, setSecilenEkler] = useState<Record<string, boolean>>({});
  const [taslakYukleniyor, setTaslakYukleniyor] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useEffect(() => {
    fetch('/api/mail/health').then((r) => r.json()).then((d) => { setMailHazir(!!d.yapilandirilmis); setMailAdres(d.adres || ''); }).catch(() => setMailHazir(false));
  }, []);

  const firmaKaydet = () => {
    if (!yeni.ad || !yeni.email) return;
    firmaEkle({ ...yeni, kaynak: 'kullanici' });
    setYeni({ ad: '', email: '', kategori: TASERON_KATEGORILERI[0], telefon: '', sehir: 'İstanbul' });
    setFirmaModal(false);
  };

  const taslakOlustur = async () => {
    setTaslakYukleniyor(true);
    try {
      const icerik = `İstanbul'daki firmalara göndereceğim profesyonel bir TEKLİF İSTEME (RFQ) e-postası yaz. İş kategorisi: "${kategori || 'genel inşaat'}". Şunları içersin: kısa proje tanıtımı (lüks villa, Arnavutköy), bu kategori için ne teklif istediğim, firmadan beklediklerim (birim fiyat, kapsam, termin, ödeme koşulu), eklerde çizim/fotoğraf olduğu notu, en az 3-5 firmadan kıyas için topladığım bilgisi, iletişim (e-posta ile dönüş). Resmi ama sıcak, Türkçe, kısa-net. SADECE e-posta gövdesini yaz, başına/sonuna açıklama ekleme.`;
      const r = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baglam: `Proje: ${proje.ad}, ${proje.konum}`, mesajlar: [{ role: 'user', icerik }] }) });
      const d = await r.json();
      if (r.ok && d.cevap) { setGovde(d.cevap); if (!konu) setKonu(`Teklif Talebi — ${kategori || 'İnşaat'} — ${proje.ad}`); }
    } catch { /* yoksay */ }
    setTaslakYukleniyor(false);
  };

  const seciliFirmaListesi = firmalar.filter((f) => secilenFirmalar[f.id]);
  const fotolarVeBelgeler = belgeler;

  const gonder = async () => {
    const alicilar = seciliFirmaListesi.map((f) => f.email);
    if (alicilar.length === 0) { alert('En az bir firma seç.'); return; }
    if (!govde.trim()) { alert('Önce mail metnini oluştur/yaz.'); return; }
    setGonderiliyor(true);
    try {
      // ekleri arşivden topla (base64)
      const ekler: { ad: string; base64: string }[] = [];
      for (const b of belgeler.filter((x: Belge) => secilenEkler[x.id] && x.blobId)) {
        const blob = await blobGetir(b.blobId!);
        if (blob) ekler.push({ ad: b.ad, base64: await blobToB64(blob) });
      }
      const r = await fetch('/api/mail/gonder', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alicilar, konu: konu || 'Teklif Talebi', govde, ekler }),
      });
      const d = await r.json();
      if (r.ok) {
        rfqEkle({ tarih: bugun(), konu: konu || 'Teklif Talebi', govde, kategori, alicilar, ekSayisi: ekler.length, durum: 'gonderildi' });
        alert(`✓ ${d.gonderilen} firmaya gönderildi.`);
        setSecilenFirmalar({}); setSecilenEkler({});
      } else { alert('Gönderilemedi: ' + (d.hata || '')); }
    } catch { alert('Bağlantı hatası.'); }
    setGonderiliyor(false);
  };

  const katFirmalari = useMemo(() => kategori ? firmalar.filter((f) => f.kategori === kategori) : firmalar, [firmalar, kategori]);

  return (
    <>
      <PageHeader
        baslik="Teklif Toplama"
        aciklama="Firmalara AI ile teklif maili gönder, 5-10 firmadan fiyat al"
        sag={<Button variant="soft" size="sm" onClick={() => setFirmaModal(true)}><Plus size={15} /> Firma ekle</Button>}
      />

      {mailHazir === false && (
        <Card className="mb-5"><CardBody className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-marka-50 text-marka-600"><KeyRound size={22} /></div>
          <div><h3 className="font-semibold text-metin">Mail hesabı henüz bağlı değil</h3><p className="text-sm text-metin-yum">insaat@pokkop.com mailbox şifresi sunucuya eklenince gönderim aktif olur. (Firmaları ve taslağı şimdiden hazırlayabilirsin.)</p></div>
        </CardBody></Card>
      )}
      {mailHazir && <p className="mb-4 text-sm text-emerald-700 flex items-center gap-1.5"><CheckCircle2 size={15} /> Gönderim hesabı bağlı: <b>{mailAdres}</b></p>}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Sol: Firmalar */}
        <Card>
          <CardBody>
            <p className="font-semibold text-metin mb-3 flex items-center gap-2"><Building size={16} /> Firmalar ({firmalar.length})</p>
            {firmalar.length === 0 ? (
              <EmptyState ikon={<Building size={24} />} baslik="Firma yok" aciklama="Teklif isteyeceğin firmaları ekle (ad + e-posta + kategori)." aksiyon={<Button size="sm" onClick={() => setFirmaModal(true)}><Plus size={14} /> Firma ekle</Button>} />
            ) : (
              <TableWrap>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-metin-yum border-b border-cizgi"><th className="py-2 pr-2"></th><th className="pr-2">Firma</th><th className="pr-2">Kategori</th><th></th></tr></thead>
                  <tbody>
                    {firmalar.map((f) => (
                      <tr key={f.id} className="border-b border-cizgi/60">
                        <td className="py-2 pr-2"><input type="checkbox" checked={!!secilenFirmalar[f.id]} onChange={(e) => setSecilenFirmalar((s) => ({ ...s, [f.id]: e.target.checked }))} /></td>
                        <td className="pr-2"><div className="font-medium text-metin">{f.ad}</div><div className="text-xs text-metin-yum">{f.email}</div></td>
                        <td className="pr-2"><Badge tone="gri">{f.kategori || '—'}</Badge></td>
                        <td className="text-right"><button onClick={() => firmaSil(f.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </CardBody>
        </Card>

        {/* Sağ: Teklif maili oluştur */}
        <Card>
          <CardBody className="space-y-3">
            <p className="font-semibold text-metin flex items-center gap-2"><Mailbox size={16} /> Teklif Maili Oluştur</p>
            <Field label="İş kategorisi">
              <Select value={kategori} onChange={(e) => setKategori(e.target.value)}>
                <option value="">— seç —</option>
                {TASERON_KATEGORILERI.map((k) => <option key={k} value={k}>{k}</option>)}
              </Select>
            </Field>
            <Button variant="soft" size="sm" onClick={taslakOlustur} disabled={taslakYukleniyor}>{taslakYukleniyor ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} AI ile mail metni oluştur</Button>
            <Field label="Konu"><Input value={konu} onChange={(e) => setKonu(e.target.value)} placeholder="Teklif Talebi — ..." /></Field>
            <Field label="Mail metni"><Textarea value={govde} onChange={(e) => setGovde(e.target.value)} className="min-h-[160px]" placeholder="AI ile oluştur ya da kendin yaz…" /></Field>

            {/* Ekler */}
            {fotolarVeBelgeler.length > 0 && (
              <div>
                <p className="text-sm font-medium text-metin mb-1.5 flex items-center gap-1.5"><Paperclip size={14} /> Ekler (arşivden)</p>
                <div className="max-h-32 overflow-y-auto space-y-1 border border-cizgi rounded-xl p-2">
                  {fotolarVeBelgeler.map((b) => (
                    <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                      <input type="checkbox" checked={!!secilenEkler[b.id]} onChange={(e) => setSecilenEkler((s) => ({ ...s, [b.id]: e.target.checked }))} />
                      <span className="truncate">{b.ad}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-metin-yum">{seciliFirmaListesi.length} firma seçili</span>
              <Button onClick={gonder} disabled={gonderiliyor || !mailHazir}>{gonderiliyor ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Gönder</Button>
            </div>
            {!mailHazir && <p className="text-xs text-metin-yum text-right">Gönderim için mailbox şifresi gerekli.</p>}
            {kategori && <p className="text-xs text-metin-yum">Bu kategoride {katFirmalari.length} firma var.</p>}
          </CardBody>
        </Card>
      </div>

      {/* Gönderim geçmişi */}
      {rfqKayitlari.length > 0 && (
        <Card className="mt-6">
          <CardBody>
            <p className="font-semibold text-metin mb-3">Gönderilen Teklif İstekleri</p>
            <div className="divide-y divide-cizgi">
              {[...rfqKayitlari].reverse().map((r) => (
                <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div><p className="font-medium text-metin text-sm">{r.konu}</p><p className="text-xs text-metin-yum">{tarih(r.tarih)} · {r.alicilar.length} firma · {r.ekSayisi || 0} ek</p></div>
                  <Badge tone={r.durum === 'gonderildi' ? 'yesil' : 'kirmizi'}>{r.durum === 'gonderildi' ? 'Gönderildi' : 'Hata'}</Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
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
