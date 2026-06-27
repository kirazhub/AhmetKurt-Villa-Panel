import { useMemo } from 'react';
import { ClipboardCheck, CheckCircle2, Circle, ShieldAlert } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody } from '../components/ui';

// Faz bazlı kritik kalite/kontrol maddeleri (Türkiye yapı denetimi pratiği)
const KONTROL: { faz: string; maddeler: string[] }[] = [
  { faz: 'Hafriyat & Zemin', maddeler: ['Kazı kotu ve eğim aplikasyona uygun mu?', 'Zemin etüt raporundaki taşıma gücü teyit edildi mi?', 'Su/kaçak zemin var mı, drenaj gerekli mi?', 'Çıkan toprağın istif/serme alanı belirlendi mi?'] },
  { faz: 'Temel (Radye)', maddeler: ['Grobeton düzgün ve temiz mi?', 'Temel altı su yalıtımı eksiksiz + koruma şapı yapıldı mı?', 'Radye donatısı projeye uygun (çap/aralık/paspayı)?', 'Beton sınıfı C30/C35 ve slump kontrolü yapıldı mı?', 'Beton tek seferde, vibratörle yerleştirildi mi (soğuk derz yok)?', 'Kür (sulama/örtü) en az 7 gün uygulandı mı?'] },
  { faz: 'Bodrum & Perde', maddeler: ['Perde donatısı ve paspayı projeye uygun mu?', 'Perde dış yüzü su yalıtımı + koruma yapıldı mı?', 'Çevre drenaj borusu + çakıl + filtre yerleştirildi mi?', 'Geri dolgu kontrollü ve sıkıştırılarak mı yapıldı?'] },
  { faz: 'Kolon & Döşeme', maddeler: ['Kolon donatısı, etriye sıklaştırması projeye uygun mu?', 'Üst kat filiz demirleri doğru yerde ve boyda bırakıldı mı?', 'Döşeme/kiriş donatısı ve paspayı kontrol edildi mi?', 'Kalıp ölçü, terazi ve desteklemesi sağlam mı?', 'Beton dökümü öncesi yapı denetim onayı alındı mı?'] },
  { faz: 'Tesisat (Kaba)', maddeler: ['Sıhhi tesisat boruları döşeme/duvara doğru güzergahta mı?', 'Pis su eğimleri (%2) doğru mu?', 'Elektrik boruları/kutuları yerleşti mi?', 'Tesisat basınç/sızdırmazlık testi yapıldı mı?'] },
  { faz: 'İnce İşler', maddeler: ['Şap kotu ve eğimleri doğru mu?', 'Islak hacim su yalıtımı yapıldı mı?', 'Sıva/alçı yüzeyleri düzgün mü?', 'Seramik/parke ek yerleri ve fugalar düzgün mü?'] },
  { faz: 'Genel / Güvenlik', maddeler: ['İş güvenliği ekipmanı (baret, korkuluk, ağ) tam mı?', 'Yapı denetim her aşamada tutanak tuttu mu?', 'Beton/demir irsaliye ve belgeleri arşivlendi mi?', 'Şantiye temiz ve düzenli mi?'] },
];

export default function KaliteKontrol() {
  const kaliteDurum = useStore((s) => s.kaliteDurum);
  const kaliteToggle = useStore((s) => s.kaliteToggle);

  const ozet = useMemo(() => {
    let toplam = 0, isaretli = 0;
    KONTROL.forEach((g) => g.maddeler.forEach((m) => { toplam++; if (kaliteDurum[`${g.faz}::${m}`]) isaretli++; }));
    return { toplam, isaretli, yuzde: toplam ? Math.round((isaretli / toplam) * 100) : 0 };
  }, [kaliteDurum]);

  return (
    <>
      <PageHeader baslik="Kalite Kontrol Listeleri" aciklama="Her faz için kritik kontrol maddeleri — denetim ve kalite güvencesi" />

      <Card className="mb-5"><CardBody className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2"><ShieldAlert size={20} className="text-marka-500" /><div><p className="font-semibold text-metin">Genel Kontrol Durumu</p><p className="text-xs text-metin-yum">{ozet.isaretli}/{ozet.toplam} madde tamam</p></div></div>
        <div className="flex items-center gap-3"><div className="w-40 h-2.5 rounded-full bg-zemin overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${ozet.yuzde}%` }} /></div><span className="font-bold text-metin">%{ozet.yuzde}</span></div>
      </CardBody></Card>

      <div className="space-y-4">
        {KONTROL.map((g) => {
          const top = g.maddeler.length;
          const isa = g.maddeler.filter((m) => kaliteDurum[`${g.faz}::${m}`]).length;
          return (
            <Card key={g.faz}><CardBody>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-metin flex items-center gap-2"><ClipboardCheck size={16} className="text-marka-500" /> {g.faz}</p>
                <span className="text-xs text-metin-yum">{isa}/{top}</span>
              </div>
              <div className="space-y-1">
                {g.maddeler.map((m) => {
                  const anahtar = `${g.faz}::${m}`;
                  const ok = !!kaliteDurum[anahtar];
                  return (
                    <button key={m} onClick={() => kaliteToggle(anahtar)} className="w-full text-left flex items-start gap-2.5 py-1.5 px-1 rounded-lg hover:bg-zemin cursor-pointer">
                      {ok ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" /> : <Circle size={18} className="text-metin-yum shrink-0 mt-0.5" />}
                      <span className={`text-sm ${ok ? 'text-metin-yum line-through' : 'text-metin'}`}>{m}</span>
                    </button>
                  );
                })}
              </div>
            </CardBody></Card>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-metin-yum">Bu liste genel inşaat pratiğine göre hazırlanmıştır; projenin yapı denetim firması (Mimart) ve şantiye şefinin talimatları esastır.</p>
    </>
  );
}
