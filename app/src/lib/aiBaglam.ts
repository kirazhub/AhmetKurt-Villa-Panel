// ============================================================================
// ORTAK AKILLI BAĞLAM MOTORU
// ----------------------------------------------------------------------------
// Tüm sekmeler (AI Asistan, Hakediş, İlerleme, Nakit, Raporlar, Rehber, İstek,
// Öğrenme...) AI ile konuşurken BU motoru kullanır. Böylece her sekme aynı
// güncel kaynaktan beslenir: proje künyesi + ilerleme/bütçe + faz + taşeron +
// öğrenilen dersler + YÜKLÜ TÜM PAFTALARIN teknik analizi + bütünleşik proje
// analizi. Soruya/konuya göre ilgili paftaların TAM spec'i otomatik eklenir.
//
// Yeni bir görsel/pafta yüklendiği an sunucu deposunda analiz edilir; bu motor
// her çağrıda güncel listeyi okuduğu için "yüklenen her şey her sekmede" olur.
// ============================================================================
import type { useStore } from '../store/useStore';
import { tl, tarih } from './format';
import { toplamPlanlanan, toplamGerceklesen, genelIlerleme, fazOzet, gecikenler, kalemPlanlanan, taseronOdemeToplam } from './calc';

type S = ReturnType<typeof useStore.getState>;

export interface BaglamSecenek {
  soru?: string;        // akıllı pafta seçimi (sorudaki kelimelere uyan paftaların tam spec'i)
  konu?: string;        // sabit konu (Rehber bölümü gibi) — soru gibi davranır
  ek?: string;          // sekmeye özel ek veri (hakediş tablosu, nakit dökümü vb.)
  maxPafta?: number;    // ilgili pafta üst sınırı (varsayılan 30)
  paftaUzunluk?: number;// her paftadan alınacak karakter (varsayılan 2800)
  analizUzunluk?: number;// bütünleşik analizden alınacak karakter (varsayılan 8000)
}

// Tüm spec'li paftaların tek satırlık başlık listesi
function paftaBasliklari(s: S): { specli: S['sunucuDosyalar']; metin: string } {
  const specli = s.sunucuDosyalar.filter((d) => d.spec);
  const metin = specli.length
    ? specli.map((d) => `  - ${d.ad}: ${(d.spec || '').split('\n')[0].replace(/^Belge türü:\s*/i, '').slice(0, 80)}`).join('\n')
    : '  (henüz analiz edilmiş pafta yok)';
  return { specli, metin };
}

// Bütünleşik proje analizinin güncellik durumu (otomatik uyarı)
function analizGuncellik(s: S, specliSayi: number): string {
  const pa = s.projeAnaliz;
  if (!pa) {
    return specliSayi
      ? `\n⚠ Henüz bütünleşik "Proje Geneli Analiz" üretilmemiş (${specliSayi} pafta hazır). Teknik Specler > "Tüm planları karşılaştır" ile üretilebilir.`
      : '';
  }
  let u = `\nPROJE GENELİ ANALİZ ${tarih(pa.tarih)} tarihinde üretildi.`;
  if (typeof pa.belgeSayisi === 'number' && specliSayi > pa.belgeSayisi) {
    u += ` ⚠ O tarihten sonra ${specliSayi - pa.belgeSayisi} yeni pafta daha analiz edildi — bütünleşik analiz güncel DEĞİL; "Teknik Specler > Tüm planları karşılaştır" ile yenilenmeli.`;
  }
  return u;
}

// Soruya/konuya göre ilgili paftaların TAM teknik analizi
function ilgiliPaftalar(specli: S['sunucuDosyalar'], anahtar: string, maxPafta: number, paftaUzunluk: number): string {
  const kelimeler = anahtar.toLowerCase().split(/[^a-zçğıöşü0-9]+/).filter((k) => k.length >= 4);
  if (!kelimeler.length) return '';
  const eslesen = specli.filter((d) => {
    const metin = ((d.spec || '') + ' ' + (d.ad || '')).toLowerCase();
    return kelimeler.some((k) => metin.includes(k));
  }).slice(0, maxPafta);
  if (!eslesen.length) return '';
  return `\n\nKONUYLA İLGİLİ PAFTALARIN TAM TEKNİK ANALİZİ — cevabını KESİNLİKLE bunlardan ver, uydurma; rakam/ölçü/adet bunlarda yoksa "ilgili paftada bu bilgi yok" de:\n` +
    eslesen.map((d) => `### ${d.ad}\n${(d.spec || '').slice(0, paftaUzunluk)}`).join('\n\n');
}

// Taşeron / ekip özeti
function taseronOzet(s: S): string {
  if (!s.taseronlar.length) return '  (taşeron atanmamış)';
  return s.taseronlar.map((t) => {
    const isler = s.isKalemleri.filter((k) => k.taseronId === t.id);
    const tamam = isler.filter((k) => k.durum === 'tamamlandi').length;
    const planT = isler.reduce((x, k) => x + kalemPlanlanan(k), 0);
    const odenen = taseronOdemeToplam(s.odemeler, t.id);
    return `  - ${t.ad}${t.firma ? ' (' + t.firma + ')' : ''}${t.uzmanlik ? ' [' + t.uzmanlik + ']' : ''}: ${isler.length} iş, ${tamam} bitti, planlanan ${tl(planT)}, ödenen ${tl(odenen)}${t.performans ? ', not ' + t.performans + '/5' : ''}`;
  }).join('\n');
}

/**
 * Projenin tüm sekmelerce paylaşılan AKILLI bağlamını üretir.
 * Her sekme bunu çağırır; kendi özel verisini `ek` ile ekler.
 */
export function projeBaglami(s: S, opt: BaglamSecenek = {}): string {
  const { proje, fazlar, isKalemleri, taseronlar, odemeler, dersler } = s;
  const plan = toplamPlanlanan(isKalemleri);
  const ger = toplamGerceklesen(isKalemleri);
  const ilerleme = Math.round(genelIlerleme(isKalemleri));
  const bugunStr = new Date().toISOString().slice(0, 10);
  const geciken = gecikenler(isKalemleri, bugunStr);
  const fazSatir = fazlar.map((f) => {
    const oz = fazOzet(isKalemleri.filter((k) => k.fazId === f.id));
    return `  - ${f.ad}: %${Math.round(oz.ilerleme)} (${oz.tamamlanan}/${oz.toplam} iş bitti)`;
  }).join('\n');
  const dersSatir = dersler.length
    ? dersler.slice(-15).map((d) => `  - [${d.tur}] ${d.baslik}: ${d.icerik}`).join('\n')
    : '  (henüz ders yok)';

  const { specli, metin: belgeBaslik } = paftaBasliklari(s);
  const analizMetni = s.projeAnaliz?.metin ? `\nPROJE GENELİ ANALİZ (bütünleşik):\n${s.projeAnaliz.metin.slice(0, opt.analizUzunluk ?? 8000)}` : '';
  const guncellik = analizGuncellik(s, specli.length);

  const anahtar = (opt.soru || opt.konu || '').trim();
  const ilgili = anahtar ? ilgiliPaftalar(specli, anahtar, opt.maxPafta ?? 30, opt.paftaUzunluk ?? 2800) : '';
  const ekBolum = opt.ek?.trim() ? `\n\nBU SEKMENİN ÖZEL VERİSİ:\n${opt.ek.trim()}` : '';

  return `PROJE: ${proje.ad} — ${proje.konum}
GENEL İLERLEME: %${ilerleme}
BÜTÇE: planlanan ${tl(plan)}, gerçekleşen ${tl(ger)}, fark ${tl(plan - ger)}
TAŞERON SAYISI: ${taseronlar.length}
TOPLAM ÖDENEN: ${tl(odemeler.reduce((t, o) => t + o.tutar, 0))}
GECİKEN İŞ: ${geciken.length ? geciken.map((g) => g.ad).join(', ') : 'yok'}
FAZ DURUMLARI:
${fazSatir}
TAŞERON / EKİP:
${taseronOzet(s)}
ÖĞRENİLEN DERSLER (hatırla ve kararlarında kullan):
${dersSatir}

YÜKLÜ VE ANALİZ EDİLMİŞ PAFTALAR (${specli.length} adet — mimari, statik, tesisat, elektrik):
${belgeBaslik}${guncellik}${analizMetni}${ilgili}${ekBolum}`;
}
