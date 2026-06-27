import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import * as wa from './wa.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { execFile } from 'child_process';
import { tmpdir } from 'os';

dotenv.config();

// Panel asla komple çökmesin — beklenmedik hataları logla, süreci öldürme.
process.on('uncaughtException', (e) => console.error('uncaughtException:', e?.message || e));
process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e?.message || e));

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const KEY = process.env.OPENROUTER_API_KEY;
const API = 'https://openrouter.ai/api/v1';
const HEADERS = () => ({
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'X-Title': 'Ahmet Kurt Villa Paneli',
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '60mb' }));

// --- Basit şifre koruması (uygulama seviyesi; tarayıcı fetch ile sorunsuz) ---
const VILLA_SIFRE = process.env.VILLA_SIFRE || '123456';
app.use('/api', (req, res, next) => {
  if ((req.headers['x-villa-sifre'] || '') === VILLA_SIFRE) return next();
  return res.status(401).json({ hata: 'Yetkisiz — şifre gerekli' });
});

const yapilandirilmis = () => Boolean(KEY);

// --- En güncel Opus modelini otomatik seç (env ile sabitlenebilir) ---
let _model = null;
async function modelSec() {
  if (process.env.OPENROUTER_MODEL && process.env.OPENROUTER_MODEL.trim()) return process.env.OPENROUTER_MODEL.trim();
  if (_model) return _model;
  try {
    const r = await fetch(`${API}/models`, { headers: HEADERS() });
    const d = await r.json();
    const ids = (d.data || []).map((m) => m.id);
    const opus = ids.filter((id) => id.includes('opus')).sort().reverse();
    const sonnet = ids.filter((id) => id.includes('anthropic') && id.includes('sonnet')).sort().reverse();
    _model = opus[0] || sonnet[0] || 'anthropic/claude-3.7-sonnet';
  } catch {
    _model = 'anthropic/claude-opus-4.8';
  }
  return _model;
}

// --- İnşaat uzmanı sistem promptu (proje bağlamı dinamik eklenir) ---
function sistemPromptu(baglam) {
  return `Sen "Ahmet Kurt Villa Projesi"nin kıdemli inşaat proje yöneticisi ve maliyet uzmanı yapay zekâ asistanısın. Türkiye'de villa/konut inşaatını baştan sona bilirsin: imar, ruhsat, yapı denetim, betonarme, tesisat, ince işler, maliyet, hakediş, taşeron yönetimi, malzeme tedariki.

KULLANICI: İnşaat bilmeyen, kendi villasını yaptıran mal sahibi (aynı zamanda yönetici). Ona ASLA üstten bakma; teknik terimleri parantezle Türkçe açıkla, sabırlı ve net ol.

GÖREVİN:
- Sorularını yanıtla VE proaktif ol: riskleri, sıradaki adımları, dikkat noktalarını, MALİYET DÜŞÜRME fırsatlarını kendiliğinden hatırlat.
- Cevabın KISA, somut ve eyleme dönük olsun (madde madde). Gereksiz uzatma.
- Para konusunda dürüst ol: uydurma rakam verme; "en az 3-5 firmadan teklif al" de. Resmi ruhsat maliyeti (≈19,87M TL) sadece harç hesabıdır, gerçek maliyet değildir.
- Günlük rapor, haftalık yapılacaklar listesi ve geciken işler istendiğinde panel verisine göre net çıkar.
- Güvenliği ve kaliteyi her zaman öne koy (su yalıtımı, temel, istinat, iş güvenliği).
- Tüm cevaplar TÜRKÇE.

PROJE GERÇEKLERİ:
- İstanbul/Arnavutköy/Boyalık, 8.749 m² eğimli arsa (%27 şev, ~10m kot farkı → hafriyat+istinat kritik).
- Lüks villa, betonarme karkas, asmolen döşeme, 3 kat (bodrum otopark + zemin + 1.kat), toplam 1.142 m² + havuz + müştemilat.
- Ruhsat ALINDI (24.01.2025, No 127). Yapı denetim: Mimart. Şantiye şefi: İnş.Müh. Fatih Bozdemir.
- Radye temel 60cm, tuğla+mantolama cephe, taş kaplama, alüminyum doğrama, kavisli merdiven, kiremit çatı, 270 ağaç dikim zorunlu, zemin etüdü yapılmış.
- 16 faz: 0 Hazırlık, 1 Hafriyat/İstinat, 2 Temel/Bodrum, 3 Kaba Yapı, 4 Çatı, 5 Duvarlar, 6 Kaba Tesisat, 7 Sıva/Şap/Mantolama, 8 Doğrama, 9 İnce İşler, 10 Cephe/Taş, 11 Mekanik/Elektrik Bitiş, 12 Mutfak/Banyo, 13 Havuz, 14 Peyzaj, 15 İskan/Teslim.

PANELİN ANLIK DURUMU (kullanıcının verisi):
${baglam || '(panel verisi gönderilmedi)'}

Yukarıdaki anlık duruma göre, ilgili olduğunda somut atıf yap (örn. geciken iş, bütçe aşımı, sıradaki faz).`;
}

// OpenAI-uyumlu çağrı (OpenRouter)
async function claude(systemMetin, mesajlar, maxTokens) {
  const model = await modelSec();
  const r = await fetch(`${API}/chat/completions`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemMetin },
        ...mesajlar.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.icerik ?? m.content ?? '') })),
      ],
    }),
  });
  const d = await r.json();
  if (!r.ok) throw { status: r.status, detay: d };
  const metin = d.choices?.[0]?.message?.content?.trim() || '';
  return { metin, model };
}

app.get('/api/ai/health', (_req, res) => {
  res.json({ ok: true, yapilandirilmis: yapilandirilmis(), saglayici: 'openrouter' });
});

// Görsel (vision) destekli çağrı — belge/plan/fotoğraf okuma
// Belge OCR + düzgün Türkçe için güçlü vision modeli (env ile değiştirilebilir)
const VISION_MODEL = (process.env.OPENROUTER_VISION_MODEL || 'google/gemini-2.5-pro').trim();
async function claudeVision(systemMetin, metin, gorselUrl, maxTokens) {
  const model = VISION_MODEL;
  const r = await fetch(`${API}/chat/completions`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      model, max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemMetin },
        { role: 'user', content: [
          { type: 'text', text: metin },
          { type: 'image_url', image_url: { url: gorselUrl } },
        ] },
      ],
    }),
  });
  const d = await r.json();
  if (!r.ok) throw { status: r.status, detay: d };
  return { metin: d.choices?.[0]?.message?.content?.trim() || '', model };
}

// --- Belgeden teknik spec çıkar (m², ölçü, kot, malzeme...) ---
app.post('/api/ai/belge-spec', async (req, res) => {
  if (!yapilandirilmis()) return res.status(503).json({ hata: 'OpenRouter API anahtarı tanımlı değil (.env).' });
  try {
    const { ad = '', gorsel = '' } = req.body || {};
    if (!gorsel || !/^(data:image|https?:\/\/)/.test(String(gorsel))) return res.status(400).json({ hata: 'Geçerli bir görsel (dataURL veya http URL) gerekli' });
    const sys = `Sen kıdemli bir mimar + inşaat (statik) + tesisat mühendisi gözüyle çalışan bir PROJE ANALİZ uzmanısın. Sana verilen görsel; vaziyet planı, mimari kat planı, görünüş, kesit, statik/kalıp planı, tesisat (sıhhi/ısıtma/elektrik) projesi, ölçü kağıdı, teknik çizim, fatura veya şantiye fotoğrafı olabilir. Önce belgenin TÜRÜNÜ tanı, sonra o türe uygun TÜM bilgiyi profesyonelce, derinlemesine çıkar. SADECE görselde GERÇEKTEN çizili/yazılı olanı yaz; tahmin/uydurma YAPMA. Okunamayan/görselde olmayan şeyi "okunamadı" ya da "bu paftada yok" diye belirt.

YAZIM KURALLARI:
- Kusursuz, akıcı, dilbilgisi DOĞRU Türkçe. Bozuk kelime/harf hatası/yarım cümle OLMASIN. Türkçe karakterleri (ç,ğ,ı,ö,ş,ü) doğru kullan.
- Rakamları görselden dikkatle oku; emin olmadığını "okunamadı" yaz.
- Net başlıklarla, madde madde yaz. Tümü Türkçe.`;
    const istem = `Belge: "${ad}"

ÖNCE: Belgenin türünü tek satırda yaz (örn. "Belge türü: 1. Normal Kat Planı, Ö:1/50").

Sonra AŞAĞIDAKİ başlıklardan SADECE bu belgede karşılığı olanları, derinlemesine doldur:

**Genel / Antet**: proje adı, pafta adı-no, ölçek, çizen, ada/parsel, onay bilgileri.
**Ölçüler & Akslar**: aks isimleri (1-2-3 / A-B-C), aks aralıkları, dış/iç ölçü zincirleri (cm), bina dış ölçüleri.
**Alanlar (m²)**: her mahal/oda/kat ayrı; varsa toplam, taban oturumu, parsel.
**Kotlar / Seviyeler / Eğim**: kat kotları, ±0.00, bodrum/zemin/kat kotları, arsa eğimi, istinat/şev.
**Taşıyıcı Sistem (statik)**: KOLON konumları ve ölçüleri (örn. 30x60), perde/perde duvar yerleri, kiriş aksları, döşeme tipi (asmolen/plak/kirişsiz), radye/temel bilgisi, donatı notları — planda görünüyorsa.
**Mahaller & Sirkülasyon**: oda/mekân isimleri-numaraları, ıslak hacimler (banyo/wc/mutfak), merdiven, asansör, hol/koridor, kapı geçişleri.
**Kapı / Pencere**: tip, ölçü, adet, yön.
**Tesisat (varsa)**: sıhhi tesisat boru güzergahları, gider/pis su hatları, ısıtma (radyatör/yerden), tesisat şaftları, elektrik panoları/hatları, kolon şaftları — YALNIZCA tesisat/mekanik/elektrik projesi paftasındaysa. Mimari planda yoksa "Tesisat detayı bu paftada yok (tesisat/mekanik projesi gerekir)" yaz.
**Cephe / Çatı / Kaplama**: malzeme, kaplama, çatı tipi/eğimi — görünüş/kesitse.
**Önemli Notlar & Riskler**: çizimde dikkat çeken her teknik not, uyarı, lejant açıklaması.

Görselde olmayan başlığı ATLAMA — ama olmayan için kısaca "bu paftada yok" de. Kısa girizgâh yazma, doğrudan "Belge türü:" ile başla.`;
    const { metin } = await claudeVision(sys, istem, gorsel, 3500);
    res.json({ spec: metin });
  } catch (e) {
    res.status(e.status || 500).json({ hata: 'Belge analizi başarısız', detay: e.detay || String(e?.message || e) });
  }
});

// --- Tüm planlardan BÜTÜNLEŞİK proje analiz raporu ---
app.post('/api/ai/proje-analiz', async (req, res) => {
  if (!yapilandirilmis()) return res.status(503).json({ hata: 'OpenRouter API anahtarı tanımlı değil (.env).' });
  try {
    const { specler = '', proje = '' } = req.body || {};
    if (!specler.trim()) return res.status(400).json({ hata: 'Önce belgelerin teknik analizi (spec) çıkarılmalı.' });
    const sys = `Sen kıdemli bir mimar + inşaat (statik) + tesisat mühendisi ekibinin koordinatörüsün. Sana bir villa projesinin paftalarından (her biri ayrı görselden) çıkarılmış teknik analizler veriliyor. Görevin: bunları BİRLEŞTİREREK projenin BÜTÜNLEŞİK bir analiz raporunu yazmak — sanki tüm projeyi masaya yatırıp inceleyen bir teknik ofis gibi. Sadece verilen analizlere dayan; uydurma. Bilgi eksikse "ilgili pafta yüklenmemiş" diye dürüstçe belirt. Kusursuz, profesyonel, akıcı Türkçe yaz.`;
    const istem = `PROJE KÜNYESİ:
${proje || '(verilmedi)'}

PAFTALARDAN ÇIKARILMIŞ TEKNİK ANALİZLER:
${String(specler).slice(0, 30000)}

Yukarıdaki verilere dayanarak BÜTÜNLEŞİK PROJE ANALİZ RAPORU yaz. Başlıklar:

## 1. Projenin Genel Tanımı
Ne tür yapı, kaç kat, toplam/parsel alanı, genel kurgu.

## 2. Mimari Analiz
Kat kat şema (bodrum/zemin/1.kat), mahal listesi ve işlevleri, m² dağılımı, sirkülasyon (merdiven/hol/giriş), ıslak hacimlerin konumu, kapı-pencere düzeni.

## 3. Taşıyıcı Sistem (Statik)
Temel tipi, kolon/perde yerleşimi ve ölçüleri, aks sistemi, döşeme tipi, kiriş kurgusu — paftalardan okunabilen kadarıyla. Okunamayan/eksik statik bilgi varsa belirt.

## 4. Tesisat & Altyapı
Sıhhi/ısıtma/elektrik tesisatına dair paftalarda görünen bilgi. Görünmüyorsa: "Tesisat/mekanik/elektrik projesi paftaları yüklenmemiş" de ve hangi paftaların gerektiğini söyle.

## 5. Kot, Eğim ve Zemin
Kat kotları, arsa eğimi, bodrum-toprak ilişkisi, su/drenaj açısından dikkat noktaları.

## 6. Tespit Edilen Eksikler & Çelişkiler
Paftalar arası tutarsızlık, eksik ölçü, yüklenmemiş pafta türleri (statik, tesisat, elektrik, detay).

## 7. Öneriler & Dikkat Noktaları
İnşaat aşamasında kritik konular, hangi ek paftalar/projeler temin edilmeli, riskler.

Her başlığı somut verilerle (rakam, m², kot, mahal adı) doldur. Veri yoksa dürüstçe eksikliği yaz.`;
    const { metin, model } = await claude(sys, [{ role: 'user', icerik: istem }], 6000);
    res.json({ analiz: metin, model });
  } catch (e) {
    res.status(e.status || 500).json({ hata: 'Proje analizi başarısız', detay: e.detay || String(e?.message || e) });
  }
});

// JSON ayıkla (model bazen ```json sarmalı ekler; uzun çıktı yarıda kesilirse onarmayı dener)
function jsonAyikla(metin) {
  if (!metin) return null;
  let t = String(metin).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const ilk = t.indexOf('{');
  if (ilk === -1) return null;
  t = t.slice(ilk);
  // 1) Düz dene
  const son = t.lastIndexOf('}');
  if (son !== -1) { try { return JSON.parse(t.slice(0, son + 1)); } catch { /* onarmaya geç */ } }
  // 2) Yarıda kesilmişse: parantezleri dengeleyerek onar (son eksik kalemi düşürür)
  try {
    let s = t; const sonKapali = s.lastIndexOf('}');
    if (sonKapali !== -1) s = s.slice(0, sonKapali + 1);
    let kupe = 0, kose = 0, str = false, esc = false;
    for (const c of s) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { str = !str; continue; }
      if (str) continue;
      if (c === '{') kupe++; else if (c === '}') kupe--;
      else if (c === '[') kose++; else if (c === ']') kose--;
    }
    s += ']'.repeat(Math.max(0, kose)) + '}'.repeat(Math.max(0, kupe));
    return JSON.parse(s);
  } catch { return null; }
}

// --- Maliyet / bütçe raporu (3 senaryolu malzeme + fiyat tahmini) ---
app.post('/api/ai/maliyet-raporu', async (req, res) => {
  if (!yapilandirilmis()) return res.status(503).json({ hata: 'OpenRouter API anahtarı tanımlı değil (.env).' });
  try {
    const { specler = '', proje = '', baglam = '' } = req.body || {};
    const sys = `Sen Türkiye'de (özellikle İstanbul) çalışan, lüks villa/konut maliyetlerini ezbere bilen kıdemli bir inşaat keşif-metraj ve satın alma maliyet uzmanısın. Görevin: verilen proje bilgilerinden ve belgelerden çıkarılmış teknik spec'lerden, kapsamlı bir MALZEME + MALİYET raporu üretmek.

KURALLAR:
- Her malzeme kalemi için ÜÇ fiyat varyasyonu ver: "ekonomik", "orta", "premium". Her biri için örnek ürün/marka (Vitra, Artema, Eca, Reca, Bosch, Schneider, Legrand, Türk yapı marketleri, Trendyol vb. piyasadan), tahmini BİRİM fiyat ve TOPLAM (= birim × miktar).
- Fiyatlar GÜNCEL TÜRKİYE PİYASASI tahmini (TL). Dürüst ol: bunlar tahmindir, kesin teklif firmadan alınır. Abartma, uçuk rakam verme.
- Elektrik (kablo metresi, priz/anahtar adedi, pano, aydınlatma), mekanik/tesisat (boru, batarya/musluk, klozet/lavabo, kombi/kazan, radyatör/yerden ısıtma), kaba yapı (beton m³, donatı ton, tuğla), ince işler (şap, sıva, boya, seramik/parke m²), cephe, doğrama (kapı/pencere), mutfak/banyo, havuz, peyzaj gibi MANTIKLI kategorilere ayır. Sadece veri/proje destekliyorsa kategori aç; eksik veriyi proje büyüklüğünden makul tahminle, "not" alanında belirterek doldur.
- Miktarları spec'lerdeki m², ölçü ve kotlardan türet; yoksa villa büyüklüğüne (1.142 m²) göre tahmin et ve "not"a "tahmini" yaz.
- ÇIKTI SADECE GEÇERLİ JSON. Markdown yok, açıklama yok. Sayılar SADE sayı olsun (TL, ondalıksız, binlik ayraç YOK).

JSON ŞEMASI:
{"ozet":"2-3 cümle genel değerlendirme","paraBirimi":"TL","senaryolar":{"ekonomik":<toplamTL>,"orta":<toplamTL>,"premium":<toplamTL>},"kategoriler":[{"ad":"Elektrik Tesisatı","kalemler":[{"malzeme":"NYA Kablo 3x2.5mm²","miktar":"1200 m","not":"tahmini","ekonomik":{"urun":"...","marka":"...","birim":35,"toplam":42000},"orta":{...},"premium":{...}}],"altToplam":{"ekonomik":0,"orta":0,"premium":0}}],"uyarilar":["..."]}

Kapsamlı ol: 6-10 kategori, her kategoride 5-12 önemli kalem. Toplamlar tutarlı olsun (kalemlerin toplamı = altToplam, altToplamların toplamı = senaryolar).`;
    const istem = `PROJE KÜNYESİ:
${proje || '(verilmedi)'}

PANEL DURUMU / EK BAĞLAM:
${baglam || '(yok)'}

BELGELERDEN ÇIKARILMIŞ TEKNİK SPEC'LER:
${specler || '(henüz teknik spec yok — proje büyüklüğüne göre tahmin et ve uyarılarda belirt)'}

Yukarıdaki verilere dayanarak şemaya UYGUN, kapsamlı, 3 senaryolu maliyet raporunu SADECE JSON olarak üret.`;
    const { metin, model } = await claude(sys, [{ role: 'user', icerik: istem }], 16000);
    const rapor = jsonAyikla(metin);
    if (!rapor || !Array.isArray(rapor.kategoriler)) return res.status(502).json({ hata: 'AI geçerli rapor üretemedi, tekrar dene', ham: String(metin).slice(0, 400) });
    res.json({ rapor, model });
  } catch (e) {
    res.status(e.status || 500).json({ hata: 'Rapor üretilemedi', detay: e.detay || String(e?.message || e) });
  }
});

// --- Sohbet ---
app.post('/api/ai/chat', async (req, res) => {
  if (!yapilandirilmis()) return res.status(503).json({ hata: 'OpenRouter API anahtarı tanımlı değil (.env).' });
  try {
    const { mesajlar = [], baglam = '' } = req.body || {};
    const { metin, model } = await claude(sistemPromptu(baglam), mesajlar, 1500);
    res.json({ cevap: metin, model });
  } catch (e) {
    res.status(e.status || 500).json({ hata: 'AI isteği başarısız', detay: e.detay || String(e) });
  }
});

// --- Proaktif analiz ---
app.post('/api/ai/analiz', async (req, res) => {
  if (!yapilandirilmis()) return res.status(503).json({ hata: 'OpenRouter API anahtarı tanımlı değil (.env).' });
  try {
    const { baglam = '' } = req.body || {};
    const { metin, model } = await claude(
      sistemPromptu(baglam),
      [{ role: 'user', icerik: 'Panelin anlık durumuna bak ve bana EN ÖNEMLİ 3-5 gözlemini/uyarını madde madde, çok kısa söyle: neye dikkat etmeliyim, sıradaki adım ne, risk/gecikme/bütçe/maliyet-düşürme durumu. Sadece maddeler, giriş cümlesi yazma.' }],
      900,
    );
    res.json({ analiz: metin, model });
  } catch (e) {
    res.status(e.status || 500).json({ hata: 'AI analizi başarısız', detay: e.detay || String(e) });
  }
});

// ============================================================================
// KALICI KAYIT (dosya tabanlı — hiçbir bilgi kaybı olmasın; ileride VPS/DB'ye taşınır)
// ============================================================================
const VERI = join(__dirname, 'veri');
if (!existsSync(VERI)) mkdirSync(VERI, { recursive: true });

// WhatsApp Web'i başlat (QR ile bağlanır)
wa.baslat(VERI);

// --- WhatsApp uçları ---
app.get('/api/wa/durum', (_req, res) => res.json(wa.durum()));
app.get('/api/wa/gelenler', (_req, res) => res.json({ mesajlar: wa.gelenler() }));
app.post('/api/wa/gonder', async (req, res) => {
  try {
    const { numara, mesaj, gorseller } = req.body || {};
    const imgVar = Array.isArray(gorseller) && gorseller.length > 0;
    if (!numara || (!mesaj && !imgVar)) return res.status(400).json({ hata: 'numara ve (mesaj veya görsel) gerekli' });
    const jid = await wa.gonder(numara, mesaj || '', gorseller);
    res.json({ ok: true, jid });
  } catch (e) {
    res.status(503).json({ hata: 'Gönderilemedi', detay: String(e?.message || e) });
  }
});
// --- Kaba notu profesyonel WhatsApp/teklif mesajına çevir ---
app.post('/api/ai/mesaj-yaz', async (req, res) => {
  if (!yapilandirilmis()) return res.status(503).json({ hata: 'OpenRouter API anahtarı tanımlı değil (.env).' });
  try {
    const { kabaTarif = '', baslik = '', profil = '', kanal = 'whatsapp', specler = '', proje = '', teknikDetay = false } = req.body || {};
    const sys = `Sen "Ahmet Kurt Villa Projesi"nin satın alma ve koordinasyon yöneticisi adına yazan, çok iyi Türkçe yazan profesyonel bir asistansın. Görevin: kullanıcının dağınık/eksik notlarını, firmaya gönderilecek DÜZGÜN, KISA ve NET bir ${kanal === 'whatsapp' ? 'WhatsApp' : 'e-posta'} mesajına dönüştürmek.

KURALLAR:
- Selamla, kısaca kendini/projeyi tanıt, ne istediğini net yaz, fiyat + termin (ne zaman başlanır/biter) iste, iletişim için teşekkür et.
- Kullanıcının AKLINA GELMEYEN ama firmanın doğru teklif vermesi için GEREKEN detayları kibarca SOR veya belirt (örn. işin bölgesi/adresi, yaklaşık ölçü/miktar, malzeme dahil mi, keşif için saha daveti, son teklif tarihi).
- Proje bağlamı: İstanbul/Arnavutköy/Boyalık'ta lüks villa şantiyesi. İlgiliyse kullan, zorlama.
${teknikDetay ? `- TEKNİK DESTEK: Aşağıdaki teknik verilerden işin KAPSAMINI somutlaştır — yaklaşık METRAJ (m²/m³), ana MALZEME kalemleri ve tahmini miktar, öngörülen SÜRE. Bunları kısaca mesaja kat ki firma daha doğru teklif versin. Emin olmadığın değeri "yaklaşık/tahmini" diye belirt, uydurma.` : ''}
- Kendi bütçe/maliyet rakamımızı firmaya KESİNLİKLE YAZMA; fiyatı firma versin — bizden detaylı fiyat teklifi istemesini sağla.
- Kısa tut (WhatsApp için 6-12 satır; teknik detay varsa biraz daha uzun olabilir ama özlü). Resmi ama samimi. Abartı/emoji YOK ya da en fazla 1 tane.
- SADECE mesaj metnini döndür. Başlık, açıklama, "işte mesajınız" gibi ekleme yapma.`;
    const kullanici = `Konu/iş başlığı: ${baslik || '(belirtilmedi)'}
Gönderen kişi: ${profil || '(belirtilmedi)'}

Kullanıcının kaba notları / yapılacak iş:
${kabaTarif || '(not girilmedi — konu başlığına göre mantıklı bir teklif isteği yaz)'}
${teknikDetay && proje ? `\nPROJE KÜNYESİ:\n${String(proje).slice(0, 2500)}` : ''}
${teknikDetay && specler ? `\nBELGELERDEN ÇIKARILMIŞ TEKNİK VERİLER (ölçü/m²/kot/malzeme):\n${String(specler).slice(0, 6000)}` : ''}`;
    const { metin } = await claude(sys, [{ role: 'user', icerik: kullanici }], teknikDetay ? 1300 : 900);
    res.json({ mesaj: metin });
  } catch (e) {
    res.status(e.status || 500).json({ hata: 'Mesaj yazılamadı', detay: e.detay || String(e?.message || e) });
  }
});

app.post('/api/wa/cikis', async (_req, res) => { await wa.cikis(); res.json({ ok: true }); });
app.post('/api/wa/yenile', async (_req, res) => {
  try { await wa.yenidenBagla(VERI); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ hata: String(e?.message || e) }); }
});
const oku = (dosya, varsayilan) => { try { return JSON.parse(readFileSync(join(VERI, dosya), 'utf8')); } catch { return varsayilan; } };
const yaz = (dosya, veri) => { try { writeFileSync(join(VERI, dosya), JSON.stringify(veri, null, 2)); } catch (e) { console.error('yaz hata', e); } };

// ============================================================================
// WhatsApp TOPLU GÖNDERİM KUYRUĞU (arka planda, banlanmamak için aralıklı)
// Kullanıcı 1 kez başlatır; sunucu sıradakini kendi gönderir (tarayıcı kapansa da).
// Aralık + her seferinde RASTGELE sapma (sabit aralık da ban sebebidir).
// ============================================================================
let kuyruk = oku('wa-kuyruk.json', null); // {aktif, mesaj, gorseller, minDk, maxDk, items, sonGonderimMs, sonrakiMs, sonrakiDk}
let kuyrukTimer = null;

function kuyrukKaydet() { yaz('wa-kuyruk.json', kuyruk); }
function kuyrukSiradaki() { return kuyruk?.items?.find((i) => i.durum === 'bekliyor'); }

// min-max arası TAMAMEN rastgele (alakasız) dakika seç → ms; planı kaydet
function kuyrukPlanla() {
  const min = Math.max(0.5, Number(kuyruk.minDk) || 2);
  const max = Math.max(min, Number(kuyruk.maxDk) || 9);
  const dk = min + Math.random() * (max - min);
  kuyruk.sonrakiDk = Math.round(dk * 10) / 10;
  const ms = Math.round(dk * 60000);
  kuyruk.sonrakiMs = Date.now() + ms;
  kuyrukKaydet();
  return ms;
}

async function kuyrukAdim() {
  kuyrukTimer = null;
  if (!kuyruk || !kuyruk.aktif) return;
  const it = kuyrukSiradaki();
  if (!it) { kuyruk.aktif = false; kuyruk.sonrakiMs = 0; kuyrukKaydet(); return; }
  if (!wa.durum().baglandi) { kuyrukTimer = setTimeout(kuyrukAdim, 60 * 1000); return; } // bağlı değil → 1 dk sonra
  try { await wa.gonder(it.numara, kuyruk.mesaj || '', kuyruk.gorseller); it.durum = 'gonderildi'; }
  catch (e) { it.durum = 'hata'; it.hata = String(e?.message || e); }
  it.zaman = new Date().toISOString();
  kuyruk.sonGonderimMs = Date.now();
  if (kuyrukSiradaki()) { const ms = kuyrukPlanla(); kuyrukTimer = setTimeout(kuyrukAdim, ms); }
  else { kuyruk.aktif = false; kuyruk.sonrakiMs = 0; kuyrukKaydet(); }
}

function kuyrukDurumu() {
  if (!kuyruk) return { aktif: false, items: [] };
  const bekleyen = (kuyruk.items || []).filter((i) => i.durum === 'bekliyor').length;
  let sonrakiSn = null;
  if (kuyruk.aktif && bekleyen > 0 && kuyruk.sonrakiMs) sonrakiSn = Math.max(0, Math.round((kuyruk.sonrakiMs - Date.now()) / 1000));
  return { aktif: !!kuyruk.aktif, minDk: kuyruk.minDk, maxDk: kuyruk.maxDk, sonrakiDk: kuyruk.sonrakiDk, gorselSayi: (kuyruk.gorseller || []).length, items: (kuyruk.items || []).map(({ numara, ad, durum, zaman, hata }) => ({ numara, ad, durum, zaman, hata })), bekleyen, sonrakiSn };
}

// Sunucu açılışında yarım kalan kuyruğu devam ettir
if (kuyruk?.aktif && kuyrukSiradaki()) {
  const kalan = kuyruk.sonrakiMs ? Math.max(3000, kuyruk.sonrakiMs - Date.now()) : 5000;
  kuyrukTimer = setTimeout(kuyrukAdim, kalan);
}

app.post('/api/wa/kuyruk-baslat', (req, res) => {
  try {
    const { hedefler = [], mesaj = '', gorseller = [], minDk = 2, maxDk = 9 } = req.body || {};
    const temiz = hedefler.filter((h) => h && h.numara);
    if (temiz.length === 0) return res.status(400).json({ hata: 'Gönderilecek firma yok' });
    if (!mesaj.trim() && (!Array.isArray(gorseller) || gorseller.length === 0)) return res.status(400).json({ hata: 'Mesaj veya görsel gerekli' });
    if (kuyruk?.aktif && kuyrukSiradaki()) return res.status(409).json({ hata: 'Zaten aktif bir gönderim var. Önce durdur.' });
    if (kuyrukTimer) { clearTimeout(kuyrukTimer); kuyrukTimer = null; }
    const mn = Math.max(0.5, Number(minDk) || 2);
    const mx = Math.max(mn, Number(maxDk) || 9);
    kuyruk = {
      aktif: true, mesaj, gorseller: Array.isArray(gorseller) ? gorseller : [], minDk: mn, maxDk: mx,
      items: temiz.map((h) => ({ numara: h.numara, ad: h.ad || h.numara, durum: 'bekliyor', zaman: null, hata: null })),
      sonGonderimMs: 0, sonrakiMs: 0, sonrakiDk: null, baslangic: new Date().toISOString(),
    };
    kuyrukKaydet();
    kuyrukAdim(); // ilkini hemen gönder, gerisi rastgele aralıklarla
    res.json({ ok: true, toplam: temiz.length, minDk: mn, maxDk: mx });
  } catch (e) { res.status(500).json({ hata: String(e?.message || e) }); }
});

app.get('/api/wa/kuyruk', (_req, res) => res.json(kuyrukDurumu()));

app.post('/api/wa/kuyruk-durdur', (_req, res) => {
  if (kuyrukTimer) { clearTimeout(kuyrukTimer); kuyrukTimer = null; }
  if (kuyruk) { kuyruk.aktif = false; kuyrukKaydet(); }
  res.json({ ok: true });
});

// Sıradaki ilk bekleyeni HEMEN gönder; kalanları aynı rastgele aralıkla sırada bırak
app.post('/api/wa/kuyruk-simdi', (_req, res) => {
  if (!kuyruk || !kuyruk.aktif || !kuyrukSiradaki()) return res.status(400).json({ hata: 'Sırada bekleyen mesaj yok' });
  if (kuyrukTimer) { clearTimeout(kuyrukTimer); kuyrukTimer = null; }
  kuyrukAdim(); // ilkini gönderir, kalanları min-max rastgele aralıkla planlar
  res.json({ ok: true });
});

// Bekleyenleri ÖZEL/MANUEL gecikmelerle gönder (şimdiden itibaren, dakika). Örn [0,3,5,7]
let zamanliTimerlar = [];
app.post('/api/wa/kuyruk-zamanli', (req, res) => {
  try {
    const { araliklarDk = [] } = req.body || {};
    if (!kuyruk || !kuyruk.aktif || !kuyrukSiradaki()) return res.status(400).json({ hata: 'Sırada bekleyen mesaj yok' });
    if (kuyrukTimer) { clearTimeout(kuyrukTimer); kuyrukTimer = null; }
    zamanliTimerlar.forEach((t) => clearTimeout(t)); zamanliTimerlar = [];
    const bekleyenler = (kuyruk.items || []).filter((i) => i.durum === 'bekliyor');
    const plan = [];
    bekleyenler.forEach((it, idx) => {
      const dk = araliklarDk[idx] != null ? Number(araliklarDk[idx]) : Number(araliklarDk[araliklarDk.length - 1] ?? 7);
      const ms = Math.max(0, dk) * 60000;
      const t = setTimeout(async () => {
        if (!kuyruk || !kuyruk.aktif) return;
        const cur = (kuyruk.items || []).find((x) => x.numara === it.numara && x.durum === 'bekliyor');
        if (!cur) return;
        if (!wa.durum().baglandi) { cur.durum = 'hata'; cur.hata = 'WhatsApp bağlı değil'; kuyrukKaydet(); return; }
        try { await wa.gonder(cur.numara, kuyruk.mesaj || '', kuyruk.gorseller); cur.durum = 'gonderildi'; }
        catch (e) { cur.durum = 'hata'; cur.hata = String(e?.message || e); }
        cur.zaman = new Date().toISOString(); kuyruk.sonGonderimMs = Date.now();
        if (!kuyrukSiradaki()) { kuyruk.aktif = false; kuyruk.sonrakiMs = 0; }
        kuyrukKaydet();
      }, ms);
      zamanliTimerlar.push(t);
      plan.push({ numara: it.numara, dakikaSonra: Math.max(0, dk) });
    });
    kuyruk.sonrakiMs = Date.now() + (plan.length ? Math.max(0, plan[0].dakikaSonra) * 60000 : 0);
    kuyrukKaydet();
    res.json({ ok: true, plan });
  } catch (e) { res.status(500).json({ hata: String(e?.message || e) }); }
});

// --- Güncel USD/TRY kuru (günlük, 6 saat önbellekli, yedekli) ---
let _kur = oku('kur.json', null); // { usd, tarih, kaynak, cekildiMs }
async function kurCek() {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    const d = await r.json();
    const t = d?.rates?.TRY;
    if (t) return { usd: t, tarih: (d.time_last_update_utc || '').slice(0, 16) || new Date().toISOString(), kaynak: 'er-api' };
  } catch { /* yedeğe geç */ }
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=TRY');
    const d = await r.json();
    if (d?.rates?.TRY) return { usd: d.rates.TRY, tarih: d.date, kaynak: 'frankfurter' };
  } catch { /* yok */ }
  return null;
}
app.get('/api/kur', async (_req, res) => {
  const taze = _kur && _kur.cekildiMs && (Date.now() - _kur.cekildiMs < 6 * 3600 * 1000);
  if (taze) return res.json(_kur);
  const k = await kurCek();
  if (k) { _kur = { ...k, cekildiMs: Date.now() }; yaz('kur.json', _kur); return res.json(_kur); }
  if (_kur) return res.json(_kur); // güncel alınamadıysa son bilinen
  res.status(503).json({ hata: 'Kur alınamadı' });
});

// --- İstanbul odaklı danışma sistem promptu ---
function danismaPromptu(baglam) {
  return `Sen "Ahmet Kurt Villa Projesi"nin kıdemli inşaat danışmanısın. Kullanıcı sana her konuda soru sorar; sen 3 kaynağı HARMANLAYARAK cevap yazarsın:
1) İÇ VERİ: panelin anlık durumu (aşağıda).
2) CANLI WEB ARAŞTIRMASI: güncel bilgileri ve FİYATLARI internetten araştır.
3) HESAP-KİTAP: metraj × birim fiyat ile somut maliyet çıkar.

ÇOK ÖNEMLİ — PİYASA ODAĞI:
- SADECE İSTANBUL piyasasına göre karar ver. Dünya/Türkiye geneli ortalama KULLANMA.
- Özellikle İSTANBUL AVRUPA YAKASI, ARNAVUTKÖY ve YENİ İSTANBUL HAVALİMANI çevresindeki inşaat firmaları, tedarikçiler ve malzeme fiyatlarını araştır/baz al.
- Fiyatları her zaman 3 KALİTE KATEGORİSİNDE ver: EKONOMİK (alt), ORTA, ÜST (lüks). Her kategoride yaklaşık birim fiyat + ne fark eder, açıkla.
- Mümkünse gerçek firma/ürün örnekleri ve güncel fiyat aralıkları ver; bulamazsan "şu bölgedeki şu tip firmalardan teklif al" diye yönlendir. Uydurma kesin rakam verme; aralık ve kaynak ver.

KULLANICI: İnşaat bilmeyen mal sahibi+yönetici. Türkçe, net, madde madde, teknik terimi parantezle açıkla.

PANELİN ANLIK DURUMU:
${baglam || '(panel verisi gönderilmedi)'}`;
}

// --- Web aramalı çağrı (OpenRouter web plugin) ---
async function claudeWeb(systemMetin, soru, maxTokens) {
  const model = await modelSec();
  const r = await fetch(`${API}/chat/completions`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      plugins: [{ id: 'web', max_results: 6 }],
      messages: [{ role: 'system', content: systemMetin }, { role: 'user', content: soru }],
    }),
  });
  const d = await r.json();
  if (!r.ok) throw { status: r.status, detay: d };
  const msg = d.choices?.[0]?.message || {};
  const metin = (msg.content || '').trim();
  const kaynaklar = [];
  (msg.annotations || []).forEach((a) => {
    const u = a.url_citation || a.urlCitation;
    if (u && u.url) kaynaklar.push({ baslik: u.title || u.url, url: u.url });
  });
  return { metin, model, kaynaklar };
}

// --- Danışma: sor (web araştırmalı) + kalıcı kaydet ---
app.post('/api/danisma/sor', async (req, res) => {
  if (!yapilandirilmis()) return res.status(503).json({ hata: 'OpenRouter API anahtarı tanımlı değil (.env).' });
  try {
    const { soru, baglam = '' } = req.body || {};
    if (!soru || !String(soru).trim()) return res.status(400).json({ hata: 'Soru boş.' });
    const { metin, model, kaynaklar } = await claudeWeb(danismaPromptu(baglam), String(soru), 2200);
    const kayit = { id: 'dn-' + Date.now().toString(36), tarih: new Date().toISOString(), soru: String(soru), cevap: metin, kaynaklar, model };
    const liste = oku('danisma.json', []);
    liste.push(kayit);
    yaz('danisma.json', liste);
    res.json(kayit);
  } catch (e) {
    res.status(e.status || 500).json({ hata: 'Danışma başarısız', detay: e.detay || String(e) });
  }
});

// --- Danışma geçmişi (kalıcı) ---
app.get('/api/danisma/gecmis', (_req, res) => res.json(oku('danisma.json', [])));
app.delete('/api/danisma/:id', (req, res) => {
  const liste = oku('danisma.json', []).filter((x) => x.id !== req.params.id);
  yaz('danisma.json', liste);
  res.json({ ok: true });
});

// --- Tam panel durumu yedeği (hiçbir bilgi kaybı olmasın) ---
app.post('/api/yedek', (req, res) => { yaz('durum.json', { tarih: new Date().toISOString(), durum: req.body?.durum ?? req.body }); res.json({ ok: true, tarih: new Date().toISOString() }); });
app.get('/api/yedek', (_req, res) => res.json(oku('durum.json', null)));

// --- AI ile firma bul (web araştırması → JSON firma listesi) ---
app.post('/api/firma-bul', async (req, res) => {
  if (!yapilandirilmis()) return res.status(503).json({ hata: 'OpenRouter anahtarı yok' });
  try {
    const { kategori = 'hafriyat', bolge = 'İstanbul Avrupa Yakası / Arnavutköy', kanal = 'email' } = req.body || {};
    const oncelik = kanal === 'telefon'
      ? 'Bu işte çoğu firma TELEFON/WhatsApp ile çalışır; TELEFON numarası olan firmaları öncelikle getir, e-postası olanı da ekle.'
      : 'Kurumsal e-POSTA adresi ve web sitesi olan PROFESYONEL firmaları öncelikle getir; e-postası olanları listenin başına koy. Telefonu da ekle.';
    const sys = 'Sen bir tedarikçi/firma araştırma asistanısın. Web aramasıyla GERÇEK firmalar bulursun. Yanıtın SADECE geçerli JSON dizisi olmalı; öncesinde/sonrasında hiçbir açıklama yazma.';
    const soru = `"${bolge}" bölgesinde "${kategori}" işi yapan firmaları web'de ÇOK KAPSAMLI araştır (geniş tara, farklı kaynaklara bak). ${oncelik} Mümkün olduğunca ÇOK firma getir — hedef 40-50 firma. Çıktı KESİN saf JSON: [{"ad":"","email":"","telefon":"","web":"","sehir":""}] . Bilgiyi UYDURMA; kaynakta gerçekten gördüğünü yaz, e-posta yoksa boş bırak. Aynı firmayı tekrarlama.`;
    const { metin } = await claudeWeb(sys, soru, 7000);
    let arr = [];
    const m = metin.match(/\[[\s\S]*\]/);
    try { arr = JSON.parse(m ? m[0] : metin); } catch { arr = []; }
    if (!Array.isArray(arr)) arr = [];
    const gecerli = (e) => typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && !/example\.com$/i.test(e);
    const telVar = (t) => typeof t === 'string' && t.replace(/\D/g, '').length >= 10;
    let firmalar = arr.filter((f) => gecerli(f.email) || telVar(f.telefon)).map((f) => ({ ...f, email: gecerli(f.email) ? f.email : '' }));
    // tekrarları (aynı isim/email/telefon) ele
    const gorulen = new Set();
    firmalar = firmalar.filter((f) => { const k = (f.email || '') + '|' + (f.telefon || '').replace(/\D/g, '') + '|' + (f.ad || '').toLowerCase().trim(); if (gorulen.has(k)) return false; gorulen.add(k); return true; });
    if (kanal === 'telefon') firmalar.sort((a, b) => (telVar(b.telefon) ? 1 : 0) - (telVar(a.telefon) ? 1 : 0));
    else firmalar.sort((a, b) => (gecerli(b.email) ? 1 : 0) - (gecerli(a.email) ? 1 : 0));
    res.json({ firmalar: firmalar.slice(0, 50), ham: firmalar.length ? undefined : metin.slice(0, 1200) });
  } catch (e) {
    res.status(500).json({ hata: 'Firma araştırması başarısız', detay: String(e?.message || e) });
  }
});

// --- TEKLİF MAİLİNİ YAZ (sadece metin üretir; arama/gönderim YOK) ---
app.post('/api/teklif-mail-yaz', async (req, res) => {
  if (!yapilandirilmis()) return res.status(503).json({ hata: 'OpenRouter anahtarı yok' });
  try {
    const { kategori = '', bolge = 'İstanbul', sorular = '', imza = '', kabaNot = '', proje = '', specler = '', teknikDetay = true } = req.body || {};
    const mailSys = `Sen "Ahmet Kurt Villa Projesi"nin satın alma ve teknik koordinasyon yöneticisi adına yazan, çok deneyimli bir inşaat satın alma uzmanısın. Görevin: profesyonel taşeron/tedarikçi firmalara gönderilecek DETAYLI, bilgi verici ve net bilgi isteyici bir teklif e-postası yazmak. Profesyonel firmalar; işin kapsamını, ölçüleri ve beklentileri net anlatan, ciddi hazırlanmış talepleri ciddiye alır. Resmi ama akıcı bir dil kullan. SADECE e-posta gövdesini yaz (konu satırı ekleme, ön/son açıklama yazma).`;
    const mailIstem = `İŞ / KATEGORİ: ${kategori}
BÖLGE: ${bolge}

PROJE KÜNYESİ:
${proje || 'Ahmet Kurt Villa, İstanbul/Arnavutköy/Boyalık; lüks betonarme villa.'}

BELGELERDEN ÇIKARILMIŞ İLGİLİ TEKNİK VERİLER (ölçüler, m², kotlar, malzeme — varsa kullan):
${(specler || '').slice(0, 9000) || '(özel ölçü verisi eklenmedi — genel proje bilgisini kullan)'}

YÖNETİCİNİN KISA İŞ NOTU (bunu profesyonelce genişlet, mailin merkezine al):
${kabaNot || '(serbest not girilmedi — kategoriye uygun standart kapsamı yaz)'}

GÖREV: Yukarıdaki bilgilerle, "${kategori}" işi için PROFESYONEL bir firmaya gönderilecek DETAYLI teklif isteme e-postası yaz:
- Kibar açılış + projeyi kısaca tanıt (ad, konum, ölçek/m², yapı tipi, kat durumu).
- Yapılacak işin KAPSAMINI net ve teknik anlat; elindeki ölçüleri, m²'leri, kotları, malzeme bilgilerini SOMUT olarak belirt. Yoksa firmadan bu detayları netleştirmesini iste.
${teknikDetay ? '- TEKNİK DESTEK: Teknik verilerden işin yaklaşık METRAJINI (m²/m³), ana MALZEME kalemlerini ve tahmini miktarını, öngörülen SÜREYİ kısaca belirt (firmanın doğru teklif vermesi için). Emin olmadığını "yaklaşık/tahmini" diye yaz, uydurma.' : ''}
- Firmadan KAPSAMLI teklif iste: kalem kalem birim fiyatlar, malzeme dahil mi (hangi markalar/kalite seçenekleri), iş süresi, başlangıç tarihi, ekip/ekipman, benzer referans işler, ödeme koşulları, garanti/kalite belgeleri, keşif için saha daveti.
- Kendi bütçe/maliyet rakamımızı firmaya KESİNLİKLE YAZMA; fiyatı tamamen firma versin.
${sorular ? `- Ayrıca şu özel soruları da sor:\n${sorular}` : ''}
- Şu imzayla bitir:\n${imza}

Türkçe, resmi-profesyonel, akıcı ve bilgi yoğun. Gereksiz uzatma. Sadece gövde metni.`;
    const { metin: govde } = await claude(mailSys, [{ role: 'user', icerik: mailIstem }], 2000);
    const konu = `Teklif Talebi — ${kategori} — Ahmet Kurt Villa Projesi`;
    res.json({ govde, konu });
  } catch (e) {
    res.status(e.status || 500).json({ hata: 'Mail yazılamadı', detay: e.detay || String(e?.message || e) });
  }
});

// --- HEIC -> JPG dönüştürme (sunucuda pillow-heif/libheif ile, güvenilir) ---
app.post('/api/heic-jpg', express.raw({ type: '*/*', limit: '80mb' }), (req, res) => {
  if (!req.body || !req.body.length) return res.status(400).json({ hata: 'Dosya gelmedi' });
  const taban = join(tmpdir(), `heic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const inPath = `${taban}.heic`;
  const outPath = `${taban}.jpg`;
  const temizle = () => { try { unlinkSync(inPath); } catch { /**/ } try { unlinkSync(outPath); } catch { /**/ } };
  try { writeFileSync(inPath, req.body); } catch (e) { return res.status(500).json({ hata: 'yazma hatasi', detay: String(e) }); }
  const gonder = () => {
    try { const buf = readFileSync(outPath); res.type('image/jpeg').send(buf); }
    catch (e) { res.status(500).json({ hata: 'cikti okunamadi', detay: String(e) }); }
    finally { temizle(); }
  };
  // Önce pillow-heif (güncel libheif), olmazsa heif-convert
  const PY = join(__dirname, 'heic2jpg.py');
  execFile('python3', [PY, inPath, outPath], (err) => {
    if (!err) return gonder();
    execFile('heif-convert', ['-q', '90', inPath, outPath], (err2) => {
      if (err2) { temizle(); return res.status(500).json({ hata: 'Dönüştürülemedi', detay: String(err) }); }
      gonder();
    });
  });
});

// ============================================================================
// MAIL — Teklif isteme (RFQ) gönderimi (nodemailer / Hostinger SMTP)
// ============================================================================
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const MAIL_HOST = process.env.MAIL_HOST || 'smtp.hostinger.com';
const MAIL_PORT = Number(process.env.MAIL_PORT || 465);
const mailHazir = () => Boolean(MAIL_USER && MAIL_PASS);

function transport() {
  return nodemailer.createTransport({
    host: MAIL_HOST, port: MAIL_PORT, secure: MAIL_PORT === 465,
    auth: { user: MAIL_USER, pass: MAIL_PASS },
  });
}

app.get('/api/mail/health', (_req, res) => res.json({ yapilandirilmis: mailHazir(), adres: mailHazir() ? MAIL_USER : null }));

app.post('/api/mail/gonder', async (req, res) => {
  if (!mailHazir()) return res.status(503).json({ hata: 'Mail hesabı tanımlı değil (.env: MAIL_USER/MAIL_PASS).' });
  try {
    const { alicilar = [], konu = '', govde = '', ekler = [] } = req.body || {};
    if (!Array.isArray(alicilar) || alicilar.length === 0) return res.status(400).json({ hata: 'Alıcı yok.' });
    const attachments = (ekler || []).map((e) => ({ filename: e.ad, content: Buffer.from(String(e.base64 || ''), 'base64') }));
    const info = await transport().sendMail({
      from: `Ahmet Kurt Villa Projesi <${MAIL_USER}>`,
      to: MAIL_USER,                 // kendine
      bcc: alicilar,                 // firmalar birbirini görmesin
      subject: konu || 'Teklif Talebi',
      text: govde,
      attachments,
    });
    res.json({ ok: true, gonderilen: alicilar.length, id: info.messageId });
  } catch (e) {
    res.status(500).json({ hata: 'Gönderilemedi', detay: String(e?.message || e) });
  }
});

// --- WhatsApp gönderim listesini E-POSTA olarak yolla (elle/manuel gönderim için, ban-güvenli) ---
app.post('/api/wa/liste-mail', async (req, res) => {
  if (!mailHazir()) return res.status(503).json({ hata: 'Mail hesabı tanımlı değil (.env: MAIL_USER/MAIL_PASS).' });
  try {
    const { mesaj = '', numaralar = [], firmalar = [], hedefMail = 'raifkurt@gmail.com' } = req.body || {};
    if (!mesaj.trim()) return res.status(400).json({ hata: 'Mesaj boş.' });
    // Hem AI'nın bulduğu firmalar (ad+telefon) hem manuel numaralar birleştirilir
    let kayitlar = [];
    (Array.isArray(firmalar) ? firmalar : []).forEach((f) => { const t = String(f.telefon || '').replace(/\D/g, ''); if (t.length >= 10) kayitlar.push({ ad: f.ad || '', tel: t }); });
    let manuel = Array.isArray(numaralar) ? numaralar : String(numaralar).split(/[\n,;]+/);
    manuel.map((n) => String(n).replace(/\D/g, '')).filter((n) => n.length >= 10).forEach((t) => kayitlar.push({ ad: '', tel: t }));
    // tekrarları (telefona göre) ele
    const gor = new Set();
    kayitlar = kayitlar.filter((k) => { if (gor.has(k.tel)) return false; gor.add(k.tel); return true; });
    if (kayitlar.length === 0) return res.status(400).json({ hata: 'Geçerli numara yok.' });
    const norm = (d) => { if (d.startsWith('0')) d = d.slice(1); if (!d.startsWith('90')) d = '90' + d; return d; };
    const enc = encodeURIComponent(mesaj);
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const satirlar = kayitlar.map((k, i) => {
      const d = norm(k.tel);
      const adHtml = k.ad ? `<b>${esc(k.ad)}</b><br><span style="color:#777">${esc(k.tel)}</span>` : esc(k.tel);
      return `<tr><td style="padding:8px 10px;border-bottom:1px solid #eee">${i + 1}</td><td style="padding:8px 10px;border-bottom:1px solid #eee">${adHtml}</td><td style="padding:8px 10px;border-bottom:1px solid #eee"><a href="https://wa.me/${d}?text=${enc}" style="background:#25D366;color:#fff;text-decoration:none;padding:7px 13px;border-radius:6px;display:inline-block">WhatsApp'ta aç & gönder →</a></td></tr>`;
    }).join('');
    const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:680px;margin:0 auto;color:#1f2430">
      <h2 style="color:#92400e">WhatsApp Gönderim Listesi (${kayitlar.length} firma)</h2>
      <p style="font-size:13px;color:#555">Aşağıdaki yeşil butona tıkla → WhatsApp <b>mesaj hazır</b> açılır → sadece <b>gönder</b>'e bas. Numaraların banlanmaması için aralarında biraz bekle.</p>
      <div style="background:#f6f7f9;border:1px solid #e7e9ee;border-radius:10px;padding:14px;white-space:pre-wrap;font-size:14px;margin:14px 0">${esc(mesaj)}</div>
      <table style="border-collapse:collapse;width:100%;font-size:14px"><thead><tr><th style="text-align:left;padding:8px 10px;border-bottom:2px solid #d97706">#</th><th style="text-align:left;padding:8px 10px;border-bottom:2px solid #d97706">Firma / Numara</th><th style="text-align:left;padding:8px 10px;border-bottom:2px solid #d97706">Gönder</th></tr></thead><tbody>${satirlar}</tbody></table>
    </div>`;
    const text = `WhatsApp Gönderim Listesi (${kayitlar.length} firma)\n\nMESAJ:\n${mesaj}\n\nFİRMALAR:\n` + kayitlar.map((k) => `${k.ad ? k.ad + ' — ' : ''}${k.tel} → https://wa.me/${norm(k.tel)}?text=${enc}`).join('\n');
    await transport().sendMail({ from: `Ahmet Kurt Villa Paneli <${MAIL_USER}>`, to: hedefMail, subject: `WhatsApp Gönderim Listesi — ${kayitlar.length} firma`, text, html });
    res.json({ ok: true, adet: kayitlar.length, hedef: hedefMail });
  } catch (e) {
    res.status(500).json({ hata: 'Gönderilemedi', detay: String(e?.message || e) });
  }
});

// --- Gelen kutusu (IMAP) + her maile AI özeti ---
const MAIL_IMAP = process.env.MAIL_IMAP_HOST || 'imap.hostinger.com';
app.get('/api/mail/gelenler', async (req, res) => {
  if (!mailHazir()) return res.status(503).json({ hata: 'Mail hesabı tanımlı değil.' });
  const limit = Math.min(Number(req.query.limit || 8), 20);
  try {
    const client = new ImapFlow({ host: MAIL_IMAP, port: 993, secure: true, auth: { user: MAIL_USER, pass: MAIL_PASS }, logger: false });
    client.on('error', (e) => console.error('IMAP error:', e?.message || e));
    await client.connect();
    const emails = [];
    const lock = await client.getMailboxLock('INBOX');
    try {
      const total = client.mailbox.exists || 0;
      if (total > 0) {
        const start = Math.max(1, total - limit + 1);
        for await (const msg of client.fetch(`${start}:*`, { source: true })) {
          try {
            const p = await simpleParser(msg.source);
            emails.push({ from: p.from?.text || '', subject: p.subject || '(konu yok)', date: (p.date || new Date()).toISOString(), text: (p.text || '').slice(0, 4000), ozet: '' });
          } catch { /* atla */ }
        }
      }
    } finally { lock.release(); await client.logout(); }
    emails.reverse(); // en yeni üstte
    // Her mail için kısa AI özeti
    for (const e of emails) {
      if (!e.text.trim()) continue;
      try {
        const { metin } = await claude(
          'Sen inşaat teklif maillerini çok kısa özetleyen bir asistansın. Sadece özet yaz, giriş cümlesi kurma.',
          [{ role: 'user', icerik: `Aşağıdaki firma mailini Türkçe ve ÇOK KISA (2-4 madde) özetle: FİYAT, SÜRE, KAÇ KİŞİ, KAÇ MAKİNE, MALZEME/KAPSAM. Bilgi yoksa "belirtilmemiş" yaz. Sadece özet:\n\n${e.text}` }],
          300,
        );
        e.ozet = metin;
      } catch { e.ozet = ''; }
    }
    res.json({ emails });
  } catch (e) {
    res.status(500).json({ hata: 'Gelen kutusu okunamadı', detay: String(e?.message || e) });
  }
});

// Üretimde derlenmiş paneli de servis et (varsa)
app.use(express.static(join(__dirname, '..', 'app', 'dist')));

// SPA fallback: /api dışındaki tüm yollar panele (index.html) gitsin
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(join(__dirname, '..', 'app', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AI arka uç (OpenRouter) çalışıyor → http://localhost:${PORT}`);
  console.log(`OpenRouter anahtarı: ${yapilandirilmis() ? 'TANIMLI ✓' : 'EKSİK (.env doldur) ✗'}`);
  console.log(`Kalıcı kayıt klasörü: ${VERI}`);
});
