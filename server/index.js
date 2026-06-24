import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const KEY = process.env.ANTHROPIC_API_KEY;
const API = 'https://api.anthropic.com/v1';
const HEADERS = () => ({
  'x-api-key': KEY,
  'anthropic-version': '2023-06-01',
  'content-type': 'application/json',
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const yapilandirilmis = () => Boolean(KEY);

// --- En güncel Opus modelini otomatik seç (env ile sabitlenebilir) ---
let _model = null;
async function modelSec() {
  if (process.env.ANTHROPIC_MODEL && process.env.ANTHROPIC_MODEL.trim()) return process.env.ANTHROPIC_MODEL.trim();
  if (_model) return _model;
  try {
    const r = await fetch(`${API}/models?limit=100`, { headers: HEADERS() });
    const d = await r.json();
    const liste = (d.data || []).map((m) => m.id);
    const opus = liste.filter((id) => id.includes('opus')).sort().reverse();
    const sonnet = liste.filter((id) => id.includes('sonnet')).sort().reverse();
    _model = opus[0] || sonnet[0] || liste[0] || 'claude-3-5-sonnet-latest';
  } catch {
    _model = 'claude-3-5-sonnet-latest';
  }
  return _model;
}

// --- İnşaat uzmanı sistem promptu (proje bağlamı dinamik eklenir) ---
function sistemPromptu(baglam) {
  return `Sen "Ahmet Kurt Villa Projesi"nin kıdemli inşaat proje yöneticisi ve maliyet uzmanı yapay zekâ asistanısın. Türkiye'de villa/konut inşaatını baştan sona bilirsin: imar, ruhsat, yapı denetim, betonarme, tesisat, ince işler, maliyet, hakediş, taşeron yönetimi.

KULLANICI: İnşaat bilmeyen, kendi villasını yaptıran mal sahibi (aynı zamanda yönetici). Ona ASLA üstten bakma; teknik terimleri parantezle Türkçe açıkla, sabırlı ve net ol.

GÖREVİN:
- Sorularını yanıtla VE proaktif ol: riskleri, sıradaki adımları, dikkat noktalarını kendiliğinden hatırlat.
- Cevabın KISA, somut ve eyleme dönük olsun (madde madde). Gereksiz uzatma.
- Para konusunda dürüst ol: uydurma rakam verme; "en az 3 taşerondan teklif al, panele gir" de. Resmi ruhsat maliyeti (≈19,87M TL) sadece harç hesabıdır, gerçek maliyet değildir.
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

app.get('/api/ai/health', (_req, res) => {
  res.json({ ok: true, yapilandirilmis: yapilandirilmis() });
});

// --- Sohbet ---
app.post('/api/ai/chat', async (req, res) => {
  if (!yapilandirilmis()) return res.status(503).json({ hata: 'Anthropic API anahtarı tanımlı değil (.env).' });
  try {
    const { mesajlar = [], baglam = '' } = req.body || {};
    const model = await modelSec();
    const r = await fetch(`${API}/messages`, {
      method: 'POST',
      headers: HEADERS(),
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        system: sistemPromptu(baglam),
        messages: mesajlar.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.icerik ?? m.content ?? '') })),
      }),
    });
    const d = await r.json();
    if (!r.ok) return res.status(r.status).json({ hata: 'Claude hatası', detay: d });
    const metin = (d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
    res.json({ cevap: metin, model });
  } catch (e) {
    res.status(500).json({ hata: 'AI isteği başarısız', detay: String(e) });
  }
});

// --- Proaktif analiz (panel açılınca AI'nın gözlemleri) ---
app.post('/api/ai/analiz', async (req, res) => {
  if (!yapilandirilmis()) return res.status(503).json({ hata: 'Anthropic API anahtarı tanımlı değil (.env).' });
  try {
    const { baglam = '' } = req.body || {};
    const model = await modelSec();
    const r = await fetch(`${API}/messages`, {
      method: 'POST',
      headers: HEADERS(),
      body: JSON.stringify({
        model,
        max_tokens: 900,
        system: sistemPromptu(baglam),
        messages: [{
          role: 'user',
          content: 'Panelin anlık durumuna bak ve bana EN ÖNEMLİ 3-5 gözlemini/uyarını madde madde, çok kısa söyle: neye dikkat etmeliyim, sıradaki adım ne, risk/gecikme/bütçe durumu. Sadece maddeler, giriş cümlesi yazma.',
        }],
      }),
    });
    const d = await r.json();
    if (!r.ok) return res.status(r.status).json({ hata: 'Claude hatası', detay: d });
    const metin = (d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
    res.json({ analiz: metin, model });
  } catch (e) {
    res.status(500).json({ hata: 'AI analizi başarısız', detay: String(e) });
  }
});

// Üretimde derlenmiş paneli de servis et (varsa)
app.use(express.static(join(__dirname, '..', 'app', 'dist')));

app.listen(PORT, () => {
  console.log(`AI arka uç çalışıyor → http://localhost:${PORT}`);
  console.log(`Anthropic anahtarı: ${yapilandirilmis() ? 'TANIMLI ✓' : 'EKSİK (.env doldur) ✗'}`);
});
