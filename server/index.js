import express from 'express';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const CLIENT_ID = process.env.APS_CLIENT_ID;
const CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
const REGION = (process.env.APS_REGION || 'US').toUpperCase();
const APS = 'https://developer.api.autodesk.com';

// Kova adı: verilmemişse client id'den türet (global benzersiz + geçerli karakter)
const BUCKET =
  (process.env.APS_BUCKET && process.env.APS_BUCKET.trim()) ||
  `villa-${(CLIENT_ID || 'demo').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16)}-cizim`;

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

const yapilandirilmis = () => Boolean(CLIENT_ID && CLIENT_SECRET);

// --- APS token al ---
async function token(scope) {
  const body = new URLSearchParams({ grant_type: 'client_credentials', scope });
  const { data } = await axios.post(`${APS}/authentication/v2/token`, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
  });
  return data.access_token;
}

// --- Kova var mı, yoksa oluştur ---
async function kovayiHazirla(tk) {
  try {
    await axios.post(
      `${APS}/oss/v2/buckets`,
      { bucketKey: BUCKET, policyKey: 'persistent' },
      { headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json', 'x-ads-region': REGION } },
    );
  } catch (e) {
    if (e.response?.status !== 409) throw e; // 409 = zaten var, sorun değil
  }
}

const urnYap = (objectId) =>
  Buffer.from(objectId).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

// =====================================================================
// Sağlık / yapılandırma kontrolü
// =====================================================================
app.get('/api/aps/health', (_req, res) => {
  res.json({ ok: true, yapilandirilmis: yapilandirilmis(), bucket: yapilandirilmis() ? BUCKET : null, region: REGION });
});

// =====================================================================
// Görüntüleyici (frontend) için kısa ömürlü bilet
// =====================================================================
app.get('/api/aps/token', async (_req, res) => {
  if (!yapilandirilmis()) return res.status(503).json({ hata: 'APS anahtarları tanımlı değil (.env).' });
  try {
    const tk = await token('viewables:read');
    res.json({ access_token: tk, expires_in: 3500 });
  } catch (e) {
    res.status(500).json({ hata: 'Token alınamadı', detay: e.response?.data || e.message });
  }
});

// =====================================================================
// Çizim yükle → Autodesk'e koy → format çevrimini başlat → urn döndür
// =====================================================================
app.post('/api/aps/upload', upload.single('file'), async (req, res) => {
  if (!yapilandirilmis()) return res.status(503).json({ hata: 'APS anahtarları tanımlı değil (.env).' });
  if (!req.file) return res.status(400).json({ hata: 'Dosya gönderilmedi.' });
  try {
    const tk = await token('data:read data:write data:create bucket:create bucket:read');
    await kovayiHazirla(tk);

    const objectKey = `${Date.now()}-${req.file.originalname}`.replace(/[^a-zA-Z0-9.\-_]/g, '_');

    // 1) İmzalı yükleme adresi al
    const { data: s3 } = await axios.get(
      `${APS}/oss/v2/buckets/${BUCKET}/objects/${encodeURIComponent(objectKey)}/signeds3upload?minutesExpiration=15`,
      { headers: { Authorization: `Bearer ${tk}` } },
    );
    // 2) Dosyayı imzalı adrese yükle
    await axios.put(s3.urls[0], req.file.buffer, { headers: { 'Content-Type': 'application/octet-stream' }, maxBodyLength: Infinity });
    // 3) Yüklemeyi tamamla → objectId
    const { data: tamam } = await axios.post(
      `${APS}/oss/v2/buckets/${BUCKET}/objects/${encodeURIComponent(objectKey)}/signeds3upload`,
      { uploadKey: s3.uploadKey },
      { headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' } },
    );

    const urn = urnYap(tamam.objectId);

    // 4) Format çevrimini (SVF2, 2B+3B) başlat
    await axios.post(
      `${APS}/modelderivative/v2/designdata/job`,
      { input: { urn }, output: { destination: { region: REGION === 'EMEA' ? 'EMEA' : 'US' }, formats: [{ type: 'svf2', views: ['2d', '3d'] }] } },
      { headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json', 'x-ads-force': 'true' } },
    );

    res.json({ urn, ad: req.file.originalname, dosyaAdi: objectKey });
  } catch (e) {
    res.status(500).json({ hata: 'Yükleme/çevrim başlatılamadı', detay: e.response?.data || e.message });
  }
});

// =====================================================================
// Çevrim durumu (manifest) — frontend ilerlemeyi buradan izler
// =====================================================================
app.get('/api/aps/status/:urn', async (req, res) => {
  if (!yapilandirilmis()) return res.status(503).json({ hata: 'APS anahtarları tanımlı değil (.env).' });
  try {
    const tk = await token('viewables:read');
    const { data } = await axios.get(`${APS}/modelderivative/v2/designdata/${req.params.urn}/manifest`, {
      headers: { Authorization: `Bearer ${tk}` },
    });
    res.json({ status: data.status, progress: data.progress });
  } catch (e) {
    if (e.response?.status === 404) return res.json({ status: 'pending', progress: '0% complete' });
    res.status(500).json({ hata: 'Durum alınamadı', detay: e.response?.data || e.message });
  }
});

// Üretimde frontend'in derlenmiş halini de aynı sunucudan servis et (varsa)
app.use(express.static(join(__dirname, '..', 'app', 'dist')));

app.listen(PORT, () => {
  console.log(`APS arka uç çalışıyor → http://localhost:${PORT}`);
  console.log(`APS anahtarları: ${yapilandirilmis() ? 'TANIMLI ✓' : 'EKSİK (.env doldur) ✗'} | Kova: ${BUCKET} | Bölge: ${REGION}`);
});
