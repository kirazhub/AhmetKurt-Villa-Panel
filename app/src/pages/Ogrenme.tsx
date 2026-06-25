import { useEffect, useMemo, useState } from 'react';
import { Brain, GraduationCap, Sparkles, Loader2, Plus, Trash2, AlertTriangle, CheckCircle2, Info, KeyRound, Save } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, Badge, Field, Input, Select, Textarea, Modal, EmptyState } from '../components/ui';
import { tarih, bugun } from '../lib/format';
import { fazOzet } from '../lib/calc';
import { DERS_ETIKET, type DersTur } from '../types';

function MetinGoster({ metin }: { metin: string }) {
  return (
    <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-metin">
      {metin.split('\n').map((satir, i) => {
        const p = satir.split(/(\*\*[^*]+\*\*)/g);
        return <div key={i}>{p.map((x, j) => x.startsWith('**') && x.endsWith('**') ? <strong key={j}>{x.slice(2, -2)}</strong> : <span key={j}>{x}</span>)}</div>;
      })}
    </div>
  );
}

const TUR_STIL: Record<DersTur, { tone: 'kirmizi' | 'yesil' | 'mavi'; ikon: React.ReactNode }> = {
  hata: { tone: 'kirmizi', ikon: <AlertTriangle size={14} /> },
  dogru: { tone: 'yesil', ikon: <CheckCircle2 size={14} /> },
  genel: { tone: 'mavi', ikon: <Info size={14} /> },
};

export default function Ogrenme() {
  const { dersler, dersEkle, dersSil, fazlar, isKalemleri } = useStore();
  const [hazir, setHazir] = useState<boolean | null>(null);
  const [ekleModal, setEkleModal] = useState(false);
  const [yeni, setYeni] = useState({ tur: 'genel' as DersTur, baslik: '', icerik: '', fazId: '' });
  const [ogret, setOgret] = useState('');
  const [ogretYukleniyor, setOgretYukleniyor] = useState(false);
  const [dersOneri, setDersOneri] = useState('');
  const [dersYukleniyor, setDersYukleniyor] = useState(false);

  useEffect(() => { fetch('/api/ai/health').then((r) => r.json()).then((d) => setHazir(!!d.yapilandirilmis)).catch(() => setHazir(false)); }, []);

  const aktifFaz = useMemo(() => {
    for (const f of fazlar) {
      const oz = fazOzet(isKalemleri.filter((k) => k.fazId === f.id));
      if (oz.toplam > 0 && oz.ilerleme < 100) return f;
    }
    return fazlar[0];
  }, [fazlar, isKalemleri]);

  const derslerBaglam = () =>
    dersler.length ? dersler.map((d) => `- [${DERS_ETIKET[d.tur]}] ${d.baslik}: ${d.icerik}`).join('\n') : '(henüz ders yok)';

  const ogretIste = async () => {
    setOgretYukleniyor(true);
    try {
      const icerik = `Bana bu inşaatla ilgili BİLMEDİĞİM ama BİLMEM GEREKEN şeyleri öğret. Şu an odak: "${aktifFaz?.ad ?? 'genel'}". 2 bölüm yaz: (1) Bu aşamada çoğu mal sahibinin bilmediği 3-4 kritik bilgi/ipucu. (2) Genel olarak bu işi daha kaliteli ve daha düşük maliyetle yapmam için bilmem gereken, aklıma gelmeyecek 3-4 nokta. Kısa, madde madde, Türkçe, acemiye uygun. Daha önce öğrendiğim dersleri tekrar etme:\n${derslerBaglam()}`;
      const r = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baglam: `Aktif faz: ${aktifFaz?.ad}`, mesajlar: [{ role: 'user', icerik }] }) });
      const d = await r.json();
      setOgret(r.ok ? d.cevap : `Alınamadı: ${d.hata || ''}`);
    } catch { setOgret('Bağlanılamadı.'); }
    setOgretYukleniyor(false);
  };

  const dersCikar = async () => {
    setDersYukleniyor(true);
    try {
      const icerik = `Panelin durumuna ve aşağıdaki mevcut derslere bakarak, kaydetmem gereken YENİ ve önemli 1 dersi ver. Format: ilk satır kısa BAŞLIK, sonraki satırlar 2-3 cümle açıklama. Türkçe. Mevcut dersler:\n${derslerBaglam()}`;
      const r = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baglam: `Aktif faz: ${aktifFaz?.ad}`, mesajlar: [{ role: 'user', icerik }] }) });
      const d = await r.json();
      setDersOneri(r.ok ? d.cevap : '');
    } catch { setDersOneri(''); }
    setDersYukleniyor(false);
  };

  const oneriKaydet = () => {
    if (!dersOneri.trim()) return;
    const satirlar = dersOneri.trim().split('\n').filter(Boolean);
    const baslik = satirlar[0].replace(/\*\*/g, '').slice(0, 80);
    const icerik = satirlar.slice(1).join('\n').trim() || satirlar[0];
    dersEkle({ tarih: bugun(), tur: 'genel', baslik, icerik, kaynak: 'ai' });
    setDersOneri('');
  };

  const elleEkle = () => {
    if (!yeni.baslik) return;
    dersEkle({ tarih: bugun(), tur: yeni.tur, baslik: yeni.baslik, icerik: yeni.icerik, fazId: yeni.fazId || undefined, kaynak: 'kullanici' });
    setYeni({ tur: 'genel', baslik: '', icerik: '', fazId: '' });
    setEkleModal(false);
  };

  return (
    <>
      <PageHeader
        baslik="Öğrenme & Hafıza"
        aciklama="AI yapılanlardan ders çıkarır, hatırlar; sana bilmediklerini öğretir"
        sag={<Button variant="soft" size="sm" onClick={() => setEkleModal(true)}><Plus size={15} /> Ders ekle</Button>}
      />

      {/* Proaktif öğretme */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="flex items-center gap-2 font-semibold text-metin"><GraduationCap size={18} className="text-marka-500" /> Sana Öğreteceklerim {aktifFaz && <Badge tone="amber">{aktifFaz.ad}</Badge>}</p>
            {hazir !== false && <Button size="sm" onClick={ogretIste} disabled={ogretYukleniyor}>{ogretYukleniyor ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Bana öğret</Button>}
          </div>
          {hazir === false ? (
            <p className="text-sm text-metin-yum flex items-center gap-2"><KeyRound size={15} /> AI bağlantısı için AI Asistan sayfasındaki kurulumu tamamla.</p>
          ) : ogretYukleniyor && !ogret ? (
            <p className="text-sm text-metin-yum flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Hazırlanıyor…</p>
          ) : ogret ? (
            <div className="rounded-xl bg-marka-50/50 border border-marka-100 p-4"><MetinGoster metin={ogret} /></div>
          ) : (
            <p className="text-sm text-metin-yum">"Bana öğret" ile AI, bu aşamada bilmen gereken ve aklına gelmeyecek noktaları anlatır.</p>
          )}
        </CardBody>
      </Card>

      {/* AI'dan ders çıkar */}
      {hazir !== false && (
        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="flex items-center gap-2 font-semibold text-metin"><Brain size={18} className="text-marka-500" /> AI'dan Ders Çıkar</p>
              <Button variant="ghost" size="sm" onClick={dersCikar} disabled={dersYukleniyor}>{dersYukleniyor ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Öneri al</Button>
            </div>
            {dersOneri ? (
              <div className="rounded-xl bg-zemin border border-cizgi p-4">
                <MetinGoster metin={dersOneri} />
                <div className="mt-3 flex gap-2"><Button size="sm" onClick={oneriKaydet}><Save size={14} /> Hafızaya kaydet</Button><Button variant="ghost" size="sm" onClick={() => setDersOneri('')}>Vazgeç</Button></div>
              </div>
            ) : (
              <p className="text-sm text-metin-yum">Panelin durumuna göre AI, kaydetmen gereken bir ders önerir; beğenirsen hafızaya eklersin.</p>
            )}
          </CardBody>
        </Card>
      )}

      {/* Hafıza listesi */}
      <h3 className="font-semibold text-metin mb-3 flex items-center gap-2"><Brain size={16} /> Öğrenme Hafızası ({dersler.length})</h3>
      {dersler.length === 0 ? (
        <Card><EmptyState ikon={<Brain size={26} />} baslik="Hafıza boş" aciklama="Yapılan hataları, doğru işleri ve önemli bilgileri buraya kaydet. AI bunları sonraki kararlarında hatırlar." /></Card>
      ) : (
        <div className="space-y-3">
          {[...dersler].reverse().map((d) => {
            const st = TUR_STIL[d.tur];
            return (
              <Card key={d.id}>
                <CardBody className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-metin flex items-center gap-2 flex-wrap">
                      <Badge tone={st.tone}>{st.ikon}&nbsp;{DERS_ETIKET[d.tur]}</Badge>
                      {d.baslik}
                      {d.kaynak === 'ai' && <Badge tone="amber"><Sparkles size={11} />&nbsp;AI</Badge>}
                    </p>
                    {d.icerik && <p className="text-sm text-metin-yum mt-1 whitespace-pre-wrap">{d.icerik}</p>}
                    <p className="text-xs text-metin-yum mt-1">{tarih(d.tarih)}</p>
                  </div>
                  <button onClick={() => dersSil(d.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer shrink-0"><Trash2 size={15} /></button>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-5 text-xs text-metin-yum flex items-center gap-1.5"><Brain size={13} /> Buraya kaydettiğin dersler, AI Asistan ve Raporlar'da otomatik hatırlanır.</p>

      <Modal acik={ekleModal} kapat={() => setEkleModal(false)} baslik="Yeni Ders / Not">
        <div className="space-y-4">
          <Field label="Tür"><Select value={yeni.tur} onChange={(e) => setYeni({ ...yeni, tur: e.target.value as DersTur })}><option value="hata">Hatadan Ders</option><option value="dogru">Doğru İş</option><option value="genel">Genel Bilgi</option></Select></Field>
          <Field label="Başlık"><Input value={yeni.baslik} onChange={(e) => setYeni({ ...yeni, baslik: e.target.value })} placeholder="örn. Beton dökümünde numune unutuldu" /></Field>
          <Field label="Açıklama"><Textarea value={yeni.icerik} onChange={(e) => setYeni({ ...yeni, icerik: e.target.value })} placeholder="Ne oldu, ne öğrendik, bir daha nasıl önleriz?" /></Field>
          <Field label="İlgili faz (ops.)"><Select value={yeni.fazId} onChange={(e) => setYeni({ ...yeni, fazId: e.target.value })}><option value="">—</option>{fazlar.map((f) => <option key={f.id} value={f.id}>{f.ad}</option>)}</Select></Field>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEkleModal(false)}>Vazgeç</Button><Button onClick={elleEkle}>Kaydet</Button></div>
        </div>
      </Modal>
    </>
  );
}
