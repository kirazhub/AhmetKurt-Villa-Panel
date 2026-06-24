import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

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

// Üretimde derlenmiş paneli de servis et (varsa)
app.use(express.static(join(__dirname, '..', 'app', 'dist')));

app.listen(PORT, () => {
  console.log(`AI arka uç (OpenRouter) çalışıyor → http://localhost:${PORT}`);
  console.log(`OpenRouter anahtarı: ${yapilandirilmis() ? 'TANIMLI ✓' : 'EKSİK (.env doldur) ✗'}`);
});
