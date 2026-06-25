import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Loader2, RefreshCw, CheckCircle2, Circle, MinusCircle, Upload, KeyRound, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, Badge, ProgressBar, Field, Input, Select, Textarea, Modal } from '../components/ui';
import { ISTEK_KATEGORILERI, type IstekDurum } from '../types';

const ISTEK_PROMPT =
`Sen bu villanın yapay zekâ proje yöneticisisin. ÇOK ÖNEMLİ: TAHMİN YÜRÜTME. Tam ve kesin (tahminsiz) çalışabilmen için EN BAŞTA ihtiyaç duyduğun HER ŞEYİ bir "İSTEK DOSYASI" olarak yaz.

Şu başlıkları kapsa, her madde NUMARALI ve "neden gerekli + hangi TAM rakamı/işlemi açar" notuyla:
1) Eksik resmi belgeler + belediyeden alınması gereken kağıtlar
2) Yapılması gereken resmi işlemler (yapı denetim, işe başlama, vb.)
3) Hangi projeden hangi TAM rakam çıkar (statik → çelik/demir tonajı çap çap + beton m³; elektrik → kablo metrajı kesit kesit; mekanik → boru metrajı)
4) Malzeme seçimleri (benim karar vermem gerekenler)
5) Kişi ve makine bilgileri + masrafları için gerekenler
6) Fiyat almak için tedarikçi listesi / e-posta ihtiyacı
7) Benim aklıma gelmeyecek ama gerekli olan her şey

İstanbul piyasası ve Türkiye mevzuatına göre yaz. Türkçe, net, kategori başlıkları altında. Sonunda: "Bu dosyalar gelmeden tahmini değil, yalnızca kesin rakam üreteceğim" notunu ekle.`;

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

const DURUM_SECENEK: { d: IstekDurum; ad: string; ikon: React.ReactNode; cls: string }[] = [
  { d: 'bekliyor', ad: 'Bekliyor', ikon: <Circle size={14} />, cls: 'text-slate-500' },
  { d: 'saglandi', ad: 'Sağlandı', ikon: <CheckCircle2 size={14} />, cls: 'text-emerald-600' },
  { d: 'gereksiz', ad: 'Gereksiz', ikon: <MinusCircle size={14} />, cls: 'text-slate-400' },
];

export default function IstekListesi() {
  const { istekListesi, istekBrifing, istekGuncelle, istekEkle, istekSil, istekBrifingKaydet } = useStore();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hazir, setHazir] = useState<boolean | null>(null);
  const [ekleModal, setEkleModal] = useState(false);
  const [yeni, setYeni] = useState({ kategori: ISTEK_KATEGORILERI[0] as string, baslik: '', aciklama: '' });

  useEffect(() => { fetch('/api/ai/health').then((r) => r.json()).then((d) => setHazir(!!d.yapilandirilmis)).catch(() => setHazir(false)); }, []);

  const ozet = useMemo(() => {
    const zorunlu = istekListesi.filter((x) => x.zorunlu);
    const zorunluSaglanan = zorunlu.filter((x) => x.durum === 'saglandi').length;
    const saglanan = istekListesi.filter((x) => x.durum === 'saglandi').length;
    const aktif = istekListesi.filter((x) => x.durum !== 'gereksiz').length;
    return { zorunlu: zorunlu.length, zorunluSaglanan, saglanan, aktif, yuzde: aktif ? (saglanan / aktif) * 100 : 0 };
  }, [istekListesi]);

  const brifingUret = async () => {
    setYukleniyor(true);
    try {
      const r = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baglam: 'İstek dosyası talebi', mesajlar: [{ role: 'user', icerik: ISTEK_PROMPT }] }) });
      const d = await r.json();
      istekBrifingKaydet(r.ok && d.cevap ? d.cevap : `Alınamadı: ${d.hata || 'AI bağlantısı yok'}`);
    } catch { istekBrifingKaydet('Bağlanılamadı. AI sunucusu çalışıyor mu?'); }
    setYukleniyor(false);
  };

  const ekle = () => {
    if (!yeni.baslik) return;
    istekEkle({ kategori: yeni.kategori, baslik: yeni.baslik, aciklama: yeni.aciklama, durum: 'bekliyor' });
    setYeni({ kategori: ISTEK_KATEGORILERI[0], baslik: '', aciklama: '' });
    setEkleModal(false);
  };

  return (
    <>
      <PageHeader
        baslik="Eksik Bilgiler / İstek Listesi"
        aciklama="AI'nın tahminsiz, tam rakamlarla çalışması için gereken belge ve bilgiler"
        sag={<Button variant="soft" size="sm" onClick={() => setEkleModal(true)}><Plus size={15} /> Madde ekle</Button>}
      />

      {/* İlerleme */}
      <Card className="mb-5">
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <p className="font-semibold text-metin">Sağlanma Durumu</p>
            <div className="flex items-center gap-2 text-sm">
              <Badge tone={ozet.zorunluSaglanan === ozet.zorunlu ? 'yesil' : 'kirmizi'}>Zorunlu: {ozet.zorunluSaglanan}/{ozet.zorunlu}</Badge>
              <Badge tone="gri">Toplam: {ozet.saglanan}/{ozet.aktif}</Badge>
            </div>
          </div>
          <ProgressBar value={ozet.yuzde} tone={ozet.zorunluSaglanan === ozet.zorunlu ? 'yesil' : 'amber'} />
          {ozet.zorunluSaglanan < ozet.zorunlu && (
            <p className="text-sm text-red-600 mt-2 flex items-center gap-1.5"><AlertTriangle size={14} /> Zorunlu belgeler tamamlanmadan AI kesin rakam üretemez (tahmin yürütmez).</p>
          )}
        </CardBody>
      </Card>

      {/* AI İstek Dosyası (üst metin) */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="flex items-center gap-2 font-semibold text-marka-800"><Sparkles size={17} className="text-marka-500" /> AI'nın Hazırladığı İstek Dosyası</p>
            {hazir !== false && (istekBrifing
              ? <Button variant="ghost" size="sm" onClick={brifingUret} disabled={yukleniyor}><RefreshCw size={14} /> Yenile</Button>
              : <Button size="sm" onClick={brifingUret} disabled={yukleniyor}>{yukleniyor ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} AI'dan tam liste iste</Button>
            )}
          </div>
          {hazir === false ? (
            <p className="text-sm text-metin-yum flex items-center gap-2"><KeyRound size={15} /> AI bağlantısı için AI Asistan sayfasındaki kurulumu tamamla.</p>
          ) : yukleniyor && !istekBrifing ? (
            <p className="text-sm text-metin-yum flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> AI ihtiyaç listesini hazırlıyor…</p>
          ) : istekBrifing ? (
            <div className="rounded-xl bg-marka-50/50 border border-marka-100 p-4 mt-1"><MetinGoster metin={istekBrifing} /></div>
          ) : (
            <p className="text-sm text-metin-yum">Aşağıdaki hazır liste başlangıç içindir. "AI'dan tam liste iste" ile Opus İstanbul piyasasına göre tam ihtiyaç dosyasını yazar.</p>
          )}
        </CardBody>
      </Card>

      {/* Kategorili kontrol listesi */}
      <div className="space-y-6">
        {ISTEK_KATEGORILERI.map((kat) => {
          const kalemler = istekListesi.filter((x) => x.kategori === kat);
          if (kalemler.length === 0) return null;
          return (
            <div key={kat}>
              <h3 className="font-semibold text-metin mb-2.5">{kat}</h3>
              <Card>
                <div className="divide-y divide-cizgi">
                  {kalemler.map((k) => (
                    <div key={k.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-metin flex items-center gap-2">
                          {k.baslik}
                          {k.zorunlu && <Badge tone="kirmizi">Zorunlu</Badge>}
                        </p>
                        <p className="text-sm text-metin-yum mt-0.5">{k.aciklama}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {DURUM_SECENEK.map((o) => (
                          <button key={o.d} onClick={() => istekGuncelle(k.id, { durum: o.d })}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${k.durum === o.d ? 'bg-zemin ring-1 ring-cizgi ' + o.cls : 'text-metin-yum hover:bg-zemin'}`}>
                            {o.ikon} {o.ad}
                          </button>
                        ))}
                        <Link to="/belgeler" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-marka-700 bg-marka-50 hover:bg-marka-100 transition" title="Belge yükle">
                          <Upload size={13} /> Yükle
                        </Link>
                        {k.id.startsWith('ist-') === false && (
                          <button onClick={() => istekSil(k.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      <Modal acik={ekleModal} kapat={() => setEkleModal(false)} baslik="Yeni İstek Maddesi">
        <div className="space-y-4">
          <Field label="Kategori"><Select value={yeni.kategori} onChange={(e) => setYeni({ ...yeni, kategori: e.target.value })}>{ISTEK_KATEGORILERI.map((k) => <option key={k} value={k}>{k}</option>)}</Select></Field>
          <Field label="Başlık"><Input value={yeni.baslik} onChange={(e) => setYeni({ ...yeni, baslik: e.target.value })} placeholder="örn. Komşu muvafakatnamesi" /></Field>
          <Field label="Açıklama / neden gerekli"><Textarea value={yeni.aciklama} onChange={(e) => setYeni({ ...yeni, aciklama: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEkleModal(false)}>Vazgeç</Button><Button onClick={ekle}>Ekle</Button></div>
        </div>
      </Modal>
    </>
  );
}
