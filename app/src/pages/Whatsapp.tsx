import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Loader2, Send, QrCode, CheckCircle2, RefreshCw, Inbox, LogOut } from 'lucide-react';
import { PageHeader, Card, CardBody, Button, Field, Input, Textarea } from '../components/ui';
import { tarih } from '../lib/format';

interface Gelen { from: string; isim?: string; text: string; tarih: string; }

export default function Whatsapp() {
  const [durum, setDurum] = useState<{ baglandi: boolean; qr: string | null } | null>(null);
  const [numara, setNumara] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [gelenler, setGelenler] = useState<Gelen[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const durumGetir = () => fetch('/api/wa/durum').then((r) => r.json()).then(setDurum).catch(() => setDurum({ baglandi: false, qr: null }));
  const gelenGetir = () => fetch('/api/wa/gelenler').then((r) => r.json()).then((d) => setGelenler(d.mesajlar || [])).catch(() => {});

  useEffect(() => {
    durumGetir(); gelenGetir();
    timer.current = setInterval(() => { durumGetir(); gelenGetir(); }, 4000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const gonder = async () => {
    if (!numara || !mesaj) return;
    setGonderiliyor(true);
    try {
      const r = await fetch('/api/wa/gonder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numara, mesaj }) });
      const d = await r.json();
      if (r.ok) { alert('✓ Gönderildi'); setMesaj(''); }
      else alert('Gönderilemedi: ' + (d.hata || d.detay || ''));
    } catch { alert('Bağlantı hatası'); }
    setGonderiliyor(false);
  };

  const cikis = async () => { if (!confirm('WhatsApp bağlantısı kesilsin mi? Tekrar QR okutman gerekir.')) return; await fetch('/api/wa/cikis', { method: 'POST' }); durumGetir(); };

  const bagli = durum?.baglandi;

  return (
    <>
      <PageHeader
        baslik="WhatsApp"
        aciklama="Kendi WhatsApp hattını panele bağla; firmalara yaz, gelen cevapları gör"
        sag={bagli ? <Button variant="ghost" size="sm" onClick={cikis}><LogOut size={15} /> Bağlantıyı kes</Button> : undefined}
      />

      {/* Bağlantı durumu */}
      {!durum ? (
        <Card className="mb-6"><CardBody className="flex items-center gap-2 text-metin-yum"><Loader2 size={16} className="animate-spin" /> Durum kontrol ediliyor…</CardBody></Card>
      ) : bagli ? (
        <p className="mb-5 text-sm text-emerald-700 flex items-center gap-1.5"><CheckCircle2 size={16} /> WhatsApp <b>bağlı</b> — mesaj gönderebilir, gelenleri görebilirsin.</p>
      ) : (
        <Card className="mb-6"><CardBody>
          <div className="flex items-center gap-2 font-semibold text-metin mb-3"><QrCode size={18} /> Telefonunu bağla (tek seferlik)</div>
          {durum.qr ? (
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <img src={durum.qr} alt="WhatsApp QR" className="w-56 h-56 border border-cizgi rounded-xl bg-white" />
              <ol className="list-decimal pl-5 text-sm text-metin space-y-1.5">
                <li>Bağlamak istediğin (kullanmadığın) hattın olduğu telefonda <b>WhatsApp</b>'ı aç.</li>
                <li><b>Ayarlar → Bağlı Cihazlar → Cihaz Bağla</b>'ya gir.</li>
                <li>Bu <b>QR kodu</b> okut.</li>
                <li>Bağlanınca bu ekran otomatik "bağlı" olacak.</li>
              </ol>
            </div>
          ) : (
            <p className="text-sm text-metin-yum flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> QR hazırlanıyor… (birkaç saniye). Gelmezse <button onClick={durumGetir} className="underline">yenile</button>.</p>
          )}
        </CardBody></Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Gönder */}
        <Card><CardBody className="space-y-3">
          <p className="font-semibold text-metin flex items-center gap-2"><Send size={16} /> Mesaj Gönder</p>
          <Field label="Numara" hint="Örn. 05XX XXX XX XX veya 90XXXXXXXXXX"><Input value={numara} onChange={(e) => setNumara(e.target.value)} placeholder="05XX..." /></Field>
          <Field label="Mesaj"><Textarea value={mesaj} onChange={(e) => setMesaj(e.target.value)} className="min-h-[140px]" placeholder="Firmaya gönderilecek mesaj…" /></Field>
          <div className="flex justify-end"><Button onClick={gonder} disabled={!bagli || gonderiliyor || !numara || !mesaj}>{gonderiliyor ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Gönder</Button></div>
          {!bagli && <p className="text-xs text-metin-yum text-right">Önce telefonu bağla.</p>}
          <p className="text-xs text-metin-yum">⚠️ Çok sayıda mesajı art arda atma; numaranın banlanmaması için ölçülü gönder.</p>
        </CardBody></Card>

        {/* Gelen mesajlar */}
        <Card><CardBody>
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-metin flex items-center gap-2"><Inbox size={16} /> Gelen Mesajlar</p>
            <Button variant="ghost" size="sm" onClick={gelenGetir}><RefreshCw size={14} /></Button>
          </div>
          {gelenler.length === 0 ? (
            <p className="text-sm text-metin-yum">Henüz mesaj yok. Firmalar yazınca burada görünür.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {gelenler.map((m, i) => (
                <div key={i} className="rounded-xl border border-cizgi p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-metin text-sm">{m.isim || m.from}</span>
                    <span className="text-xs text-metin-yum">{tarih(m.tarih)}</span>
                  </div>
                  <p className="text-xs text-metin-yum mb-1">{m.from}</p>
                  <p className="text-sm text-metin whitespace-pre-wrap">{m.text}</p>
                  <a href={`https://wa.me/${m.from.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 hover:underline mt-1 inline-block">WhatsApp'ta aç →</a>
                </div>
              ))}
            </div>
          )}
        </CardBody></Card>
      </div>

      <p className="mt-5 text-xs text-metin-yum flex items-center gap-1.5"><MessageCircle size={13} /> Bu, kendi numaranla WhatsApp Web bağlantısıdır; gönderdiğin/aldığın mesajlar telefonundaki WhatsApp'la aynıdır.</p>
    </>
  );
}
