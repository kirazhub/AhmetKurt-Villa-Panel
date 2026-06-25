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
app.use(express.json({ limit: '2mb' }));

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
    const { numara, mesaj } = req.body || {};
    if (!numara || !mesaj) return res.status(400).json({ hata: 'numara ve mesaj gerekli' });
    const jid = await wa.gonder(numara, mesaj);
    res.json({ ok: true, jid });
  } catch (e) {
    res.status(503).json({ hata: 'Gönderilemedi', detay: String(e?.message || e) });
  }
});
app.post('/api/wa/cikis', async (_req, res) => { await wa.cikis(); res.json({ ok: true }); });
const oku = (dosya, varsayilan) => { try { return JSON.parse(readFileSync(join(VERI, dosya), 'utf8')); } catch { return varsayilan; } };
const yaz = (dosya, veri) => { try { writeFileSync(join(VERI, dosya), JSON.stringify(veri, null, 2)); } catch (e) { console.error('yaz hata', e); } };

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
    const { kategori = 'hafriyat', bolge = 'İstanbul Avrupa Yakası / Arnavutköy' } = req.body || {};
    const sys = 'Sen bir tedarikçi/firma araştırma asistanısın. Web aramasıyla GERÇEK firmalar bulursun. Yanıtın SADECE geçerli JSON dizisi olmalı; öncesinde/sonrasında hiçbir açıklama yazma.';
    const soru = `"${bolge}" bölgesinde "${kategori}" işi yapan firmaları web'de araştır. Her firma için yalnızca kaynakta GERÇEKTEN gördüğün bilgileri yaz. Çıktı KESİNLİKLE şu formatta saf JSON olsun: [{"ad":"","email":"","telefon":"","web":"","sehir":""}] . E-posta bulamazsan "email" alanını boş bırak — UYDURMA. 10-15 firma hedefle.`;
    const { metin } = await claudeWeb(sys, soru, 2500);
    let arr = [];
    const m = metin.match(/\[[\s\S]*\]/);
    try { arr = JSON.parse(m ? m[0] : metin); } catch { arr = []; }
    res.json({ firmalar: Array.isArray(arr) ? arr : [], ham: Array.isArray(arr) && arr.length ? undefined : metin.slice(0, 1500) });
  } catch (e) {
    res.status(500).json({ hata: 'Firma araştırması başarısız', detay: String(e?.message || e) });
  }
});

// --- TEK TIKLA OTOMATİK TEKLİF: firma bul + mail yaz + gönder ---
app.post('/api/teklif-otomatik', async (req, res) => {
  if (!yapilandirilmis()) return res.status(503).json({ hata: 'OpenRouter anahtarı yok' });
  try {
    const { kategori = 'Hafriyat / Kazı', bolge = 'İstanbul Avrupa Yakası / Arnavutköy', sorular = '', imza = '', ekler = [], projeNot = '', autoMail = true } = req.body || {};

    // 1) Firmaları web'de bul (JSON)
    const bulSys = 'Sen tedarikçi/firma araştırma asistanısın. Web aramasıyla GERÇEK firmalar bulursun. Yanıtın SADECE geçerli JSON dizisi olmalı, başka metin yok.';
    const bulSoru = `"${bolge}" bölgesinde "${kategori}" işi yapan firmaları web'de KAPSAMLI araştır (gerekirse 50-100 firma tara). Bu sektörde çoğu firma TELEFON/WhatsApp ile çalışır. Bana e-posta VEYA telefon numarası olan firmaları getir; telefonu olanları MUTLAKA ekle. Hedef: 20-30 firma. Çıktı KESİN saf JSON: [{"ad":"","email":"","telefon":"","web":"","sehir":""}] . Bilgiyi UYDURMA; kaynakta gerçekten gördüğünü yaz.`;
    const { metin: firmaMetin } = await claudeWeb(bulSys, bulSoru, 3500);
    let firmalar = [];
    const mm = firmaMetin.match(/\[[\s\S]*\]/);
    try { firmalar = JSON.parse(mm ? mm[0] : firmaMetin); } catch { firmalar = []; }
    if (!Array.isArray(firmalar)) firmalar = [];
    const gecerli = (e) => typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && !/example\.com$/i.test(e);
    const telefonVar = (t) => typeof t === 'string' && t.replace(/\D/g, '').length >= 10;
    const kullanilabilir = firmalar.filter((f) => gecerli(f.email) || telefonVar(f.telefon));
    const emailli = kullanilabilir.filter((f) => gecerli(f.email));
    const telefonlu = kullanilabilir.filter((f) => telefonVar(f.telefon));

    // 2) Teklif mailini yaz (AI) — e-posta gönderimi için uzun gövde
    const { metin: govde } = await claude(
      'Sen kıdemli bir satın alma uzmanısın; firmalara gönderilecek profesyonel teklif maili yazarsın. Sadece e-posta gövdesini yaz.',
      [{ role: 'user', icerik: `"${kategori}" işi için İstanbul'daki firmalara gönderilecek profesyonel, kısa-net TEKLİF İSTEME e-postası yaz. Proje: Ahmet Kurt Villa, İstanbul/Arnavutköy/Boyalık, arsa HAFİF EĞİMLİ. ${projeNot}. "Öncelikle fiyat ve süre öğrenmek istiyoruz" vurgusu olsun. Şu soruları madde madde sor:\n${sorular}\nSonunda şu imzayla bitir:\n${imza}\nTürkçe, resmi ama sıcak. Sadece gövde, konu satırı yazma.` }],
      1200,
    );

    // 2b) WhatsApp için KISA, öz, fiyat odaklı mesaj
    const { metin: waMesaj } = await claude(
      'Firmalara WhatsApp\'tan atılacak kısa mesajlar yazarsın. Sadece mesajı yaz.',
      [{ role: 'user', icerik: `"${kategori}" işi için WhatsApp'tan atılacak KISA, net, bilgilendirici ve FİYAT ODAKLI bir mesaj yaz (en fazla 4-5 cümle). Proje: Arnavutköy'de hafif eğimli arsada villa. ${projeNot} Mesaj: selam + ne iş yaptıracağımız + en kritik sorular (yaklaşık fiyat, ne zaman başlar, ne kadar sürer) + kısa imza. İmza: ${imza.split('\n')[0]} (${imza.split('\n')[1] || ''}). Türkçe, samimi-profesyonel. Sadece mesaj metni.` }],
      400,
    );
    const konu = `Teklif Talebi — ${kategori} — Ahmet Kurt Villa Projesi`;

    // 3) E-postası olanlara gönder
    let gonderilen = 0;
    if (autoMail && mailHazir() && emailli.length > 0) {
      const attachments = (ekler || []).map((e) => ({ filename: e.ad, content: Buffer.from(String(e.base64 || ''), 'base64') }));
      await transport().sendMail({ from: `Ahmet Kurt Villa Projesi <${MAIL_USER}>`, to: MAIL_USER, bcc: emailli.map((f) => f.email), subject: konu, text: govde, attachments });
      gonderilen = emailli.length;
    }

    res.json({ bulunan: kullanilabilir, toplamTaranan: firmalar.length, emailliSayi: emailli.length, telefonluSayi: telefonlu.length, gonderilen, konu, govde, waMesaj, mailHazir: mailHazir() });
  } catch (e) {
    res.status(500).json({ hata: 'Otomatik teklif başarısız', detay: String(e?.message || e) });
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
