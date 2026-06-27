import { useEffect, useState } from 'react';
import { FileText, CalendarCheck, CalendarClock, AlertTriangle, Wallet, Loader2, Printer, Copy, KeyRound, RefreshCw, Sparkles, Users } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button } from '../components/ui';
import { tl, tarih, bugun, sayi } from '../lib/format';
import { BIRIM_ETIKET } from '../types';
import { projeBaglami } from '../lib/aiBaglam';

type RaporTur = 'gunluk' | 'haftalik' | 'geciken' | 'maliyet' | 'performans';

const RAPORLAR: { tur: RaporTur; ad: string; ikon: React.ReactNode; aciklama: string; talimat: string }[] = [
  { tur: 'gunluk', ad: 'Günlük Rapor', ikon: <CalendarCheck size={18} />, aciklama: 'Bugünün durumu, yapılanlar, dikkat', talimat: 'Bugünün GÜNLÜK ŞANTİYE RAPORUNU yaz: panelin ve saha kayıtlarının anlık durumuna göre bugün/son durumda ne yapıldı, ne yapılmalı, hangi riske dikkat. Kısa başlıklar + maddeler.' },
  { tur: 'haftalik', ad: 'Haftalık Plan', ikon: <CalendarClock size={18} />, aciklama: 'Önümüzdeki hafta yapılacaklar', talimat: 'HAFTALIK YAPILACAKLAR planını yaz: önümüzdeki 7 gün hangi işlere odaklanmalı, hangi teklifler/siparişler verilmeli, hangi kontroller yapılmalı. Öncelik sırasıyla, maddeler halinde.' },
  { tur: 'geciken', ad: 'Geciken İşler', ikon: <AlertTriangle size={18} />, aciklama: 'Gecikenler ve telafi planı', talimat: 'GECİKEN İŞLER raporunu yaz: hangi işler gecikmiş, neden risk, nasıl telafi edilir. Gecikme yoksa olası darboğazları ve önleyici adımları yaz.' },
  { tur: 'maliyet', ad: 'Maliyet Raporu', ikon: <Wallet size={18} />, aciklama: 'Sarfiyat + bütçe + maliyet analizi', talimat: 'Detaylı MALİYET RAPORU yaz: girilen malzeme sarfiyatı ve birim fiyatlara göre harcama analizi, planlanan vs gerçekleşen, hangi kalemde sapma/risk var, maliyet düşürme önerileri. Rakamları kullan, sade yorumla.' },
  { tur: 'performans', ad: 'Ekip Performansı', ikon: <Users size={18} />, aciklama: 'Hangi ekip verimli, kime güven', talimat: 'EKİP / TAŞERON PERFORMANS değerlendirmesi yaz: aşağıdaki taşeron verilerine göre hangi ekip işini zamanında ve bütçesinde yapıyor, hangisi geciktiriyor/aşıyor; işçi-gün ve sarfiyata göre verimlilik yorumu. Her ekibe kısa not + yıldız/puan (1-5) + bir sonraki kararda kime öncelik, kime dikkat. SADECE verilen veriye dayan; veri azsa hangi veriyi (örn. taşeron ataması, saha kaydı) girmem gerektiğini söyle. Tahmin yürütme.' },
];

function Bicimli({ metin }: { metin: string }) {
  return (
    <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
      {metin.split('\n').map((satir, i) => {
        const p = satir.split(/(\*\*[^*]+\*\*)/g);
        return <div key={i}>{p.map((x, j) => x.startsWith('**') && x.endsWith('**') ? <strong key={j}>{x.slice(2, -2)}</strong> : <span key={j}>{x}</span>)}</div>;
      })}
    </div>
  );
}

export default function Raporlar() {
  const s = useStore();
  const [aktif, setAktif] = useState<RaporTur | null>(null);
  const [metin, setMetin] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hazir, setHazir] = useState<boolean | null>(null);
  const [baslik, setBaslik] = useState('');

  useEffect(() => { fetch('/api/ai/health').then((r) => r.json()).then((d) => setHazir(!!d.yapilandirilmis)).catch(() => setHazir(false)); s.dosyalariYenile(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Motor: proje künyesi + ilerleme + faz + taşeron + dersler + tüm paftalar + analiz.
  // Ek: rapora özel saha kayıtları + malzeme sarfiyatı.
  const baglamKur = (konu?: string) => {
    const sahaSon = [...s.sahaGunlukleri].sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 10)
      .map((g) => `  - ${tarih(g.tarih)}: ${g.kamyon ?? 0} kamyon, ${g.isci ?? 0} işçi, ${g.calismaSaati ?? '?'} saat, ${g.hava ?? ''}`).join('\n') || '  (kayıt yok)';
    const sarfToplam = s.sarfiyatlar.reduce((t, x) => t + (x.tutar || 0), 0);
    const malzemeOzet = (() => {
      const m = new Map<string, { miktar: number; tutar: number; birim: string }>();
      s.sarfiyatlar.forEach((x) => { const e = m.get(x.malzeme) || { miktar: 0, tutar: 0, birim: BIRIM_ETIKET[x.birim] }; e.miktar += x.miktar; e.tutar += x.tutar || 0; m.set(x.malzeme, e); });
      return [...m.entries()].map(([ad, e]) => `  - ${ad}: ${sayi(e.miktar, 1)} ${e.birim}, ${tl(e.tutar)}`).join('\n') || '  (kayıt yok)';
    })();
    const ek = `SON SAHA KAYITLARI:\n${sahaSon}\nMALZEME SARFİYATI (toplam ${tl(sarfToplam)}):\n${malzemeOzet}`;
    return projeBaglami(s, { konu, ek });
  };

  const uret = async (r: typeof RAPORLAR[number]) => {
    setAktif(r.tur); setBaslik(r.ad); setMetin(''); setYukleniyor(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baglam: baglamKur(r.ad), mesajlar: [{ role: 'user', icerik: r.talimat + ' Tüm rapor Türkçe, net ve maddeler halinde olsun. Başına kısa bir özet cümlesi koy.' }] }),
      });
      const d = await res.json();
      setMetin(res.ok ? d.cevap : `Rapor alınamadı: ${d.hata || ''}`);
    } catch { setMetin('Bağlanılamadı. AI sunucusu çalışıyor mu?'); }
    setYukleniyor(false);
  };

  const yazdir = () => {
    const w = window.open('', '_blank'); if (!w) return;
    const html = metin.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    w.document.write(`<html><head><title>${baslik} — ${tarih(bugun())}</title><meta charset="utf-8"><style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#1f2430;line-height:1.6}h1{font-size:20px;border-bottom:2px solid #f59e0b;padding-bottom:8px}.alt{color:#5b6472;font-size:13px;margin-bottom:24px}</style></head><body><h1>${baslik}</h1><div class="alt">Ahmet Kurt Villa Projesi · ${tarih(bugun())} · AI raporu</div><div>${html}</div><script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  if (hazir === false) {
    return (
      <>
        <PageHeader baslik="AI Raporlar" aciklama="Günlük/haftalık/maliyet raporlarını yapay zekâ yazsın" sag={<Sparkles size={16} className="text-marka-500" />} />
        <Card><CardBody className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-marka-50 text-marka-600"><KeyRound size={22} /></div>
          <div><h3 className="font-semibold text-metin">AI bağlantısı gerekli</h3><p className="text-sm text-metin-yum">AI Asistan sayfasındaki anahtar kurulumunu tamamla, sonra buraya dön.</p></div>
        </CardBody></Card>
      </>
    );
  }

  return (
    <>
      <PageHeader baslik="AI Raporlar" aciklama="Tek tıkla; yapay zekâ panelini ve saha verini okuyup rapor yazsın" sag={<span className="text-xs text-metin-yum flex items-center gap-1"><Sparkles size={13} className="text-marka-500" /> Opus 4.8</span>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {RAPORLAR.map((r) => (
          <button key={r.tur} onClick={() => uret(r)} disabled={yukleniyor}
            className={`text-left p-4 rounded-2xl border transition cursor-pointer disabled:opacity-60 ${aktif === r.tur ? 'border-marka-400 bg-marka-50' : 'border-cizgi bg-white hover:border-marka-200 hover:bg-zemin'}`}>
            <div className="flex items-center gap-2 text-marka-600 mb-2">{r.ikon}<span className="font-semibold text-metin text-sm">{r.ad}</span></div>
            <p className="text-xs text-metin-yum">{r.aciklama}</p>
          </button>
        ))}
      </div>

      <Card>
        <CardBody>
          {!aktif && !yukleniyor && (
            <div className="text-center py-14 text-metin-yum">
              <FileText size={30} className="mx-auto mb-3 opacity-50" />
              <p className="font-medium text-metin">Yukarıdan bir rapor türü seç</p>
              <p className="text-sm mt-1">AI, panelindeki ve saha kayıtlarındaki verilerle raporu hazırlar.</p>
            </div>
          )}
          {yukleniyor && <p className="py-10 text-center text-metin-yum flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={16} /> {baslik} hazırlanıyor…</p>}
          {metin && !yukleniyor && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-metin">{baslik}</h2>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(metin)}><Copy size={15} /> Kopyala</Button>
                  <Button variant="soft" size="sm" onClick={yazdir}><Printer size={15} /> PDF / Yazdır</Button>
                  <Button variant="ghost" size="sm" onClick={() => { const r = RAPORLAR.find((x) => x.tur === aktif); if (r) uret(r); }}><RefreshCw size={15} /></Button>
                </div>
              </div>
              <div className="rounded-xl bg-zemin border border-cizgi p-5"><Bicimli metin={metin} /></div>
            </>
          )}
        </CardBody>
      </Card>
    </>
  );
}
