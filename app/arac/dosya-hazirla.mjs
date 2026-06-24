#!/usr/bin/env node
// Dosya Hazırlayıcı + DWG Çevirici
// Kullanım: app dizininde `node arac/dosya-hazirla.mjs` veya `npm run dosyalar`
// SADECE Node.js yerleşik modüllerini kullanır — npm bağımlılığı yoktur.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// __dirname (ESM uyumlu)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Sabit yollar: arac/.. -> app/ kökü; app/public/proje-dosyalari -> dosya klasörü
const APP_KOKU = path.resolve(__dirname, '..');
const DOSYA_KOKU = path.join(APP_KOKU, 'public', 'proje-dosyalari');

// Klasör adları
const GELEN = '00-gelen-kutusu';
const ONIZLEME = '_onizleme';
const KATEGORI_KLASORLERI = [
  'mimari', 'statik', 'elektrik', 'mekanik',
  'metraj', 'ruhsat-resmi', 'saha-foto', 'diger',
];

// Klasör adından manifest kategorisine eşleme
const KLASOR_KATEGORI = {
  'mimari': 'mimari',
  'statik': 'statik',
  'elektrik': 'elektrik',
  'mekanik': 'mekanik',
  'metraj': 'metraj',
  'ruhsat-resmi': 'ruhsat',
  'saha-foto': 'foto',
  'diger': 'diger',
};

// Anahtar kelime tabanlı kategori bulma (gelen kutusundan taşırken)
const ANAHTAR_KELIMELER = {
  'mimari': ['mimari', 'plan', 'kesit', 'gorunus', 'görünüş', 'vaziyet', 'cephe'],
  'statik': ['statik', 'betonarme', 'kalip', 'kalıp', 'demir', 'temel'],
  'elektrik': ['elektrik', 'aydinlatma', 'priz', 'pano'],
  'mekanik': ['mekanik', 'tesisat', 'sihhi', 'sıhhi', 'isitma', 'ısıtma', 'dogalgaz', 'doğalgaz', 'havuz'],
  'metraj': ['metraj', 'kesif', 'keşif', 'ozet', 'özet', 'icmal', 'teklif'],
  'ruhsat-resmi': ['ruhsat', 'tapu', 'izin', 'resmi', 'yapi-denetim'],
  'saha-foto': ['foto', 'saha', 'santiye', 'şantiye', 'img'],
};

// Türkçe karakterleri normalize et (arama için)
function normalize(metin) {
  return metin
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

// Dosya adına göre uygun klasörü bul; bulamazsa 'diger'
function kategoriBul(dosyaAdi) {
  const ad = normalize(dosyaAdi);
  for (const [klasor, kelimeler] of Object.entries(ANAHTAR_KELIMELER)) {
    for (const kelime of kelimeler) {
      if (ad.includes(normalize(kelime))) {
        return klasor;
      }
    }
  }
  return 'diger';
}

// Uzantıdan tür belirleme
function turBul(uzanti) {
  const u = uzanti.toLowerCase();
  if (u === '.pdf') return 'pdf';
  if (u === '.dwg') return 'dwg';
  if (u === '.dxf') return 'dxf';
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(u)) return 'resim';
  if (['.xls', '.xlsx', '.doc', '.docx', '.csv'].includes(u)) return 'ofis';
  return 'diger';
}

// Dosya adından insanca okunabilir ad (uzantısız, kelimeler büyük harfle başlar)
function insanciAd(dosyaAdi) {
  const adUzantisiz = dosyaAdi.replace(/\.[^.]+$/, '');
  return adUzantisiz
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(k => k.length > 0 ? k.charAt(0).toUpperCase() + k.slice(1) : k)
    .join(' ');
}

// Kısa, kararlı id üret (yola göre)
function idUret(webYolu) {
  return crypto.createHash('sha1').update(webYolu).digest('hex').slice(0, 12);
}

// Klasörler yoksa oluştur (güvence)
function klasorleriHazirla() {
  if (!fs.existsSync(DOSYA_KOKU)) {
    fs.mkdirSync(DOSYA_KOKU, { recursive: true });
  }
  const tumKlasorler = [GELEN, ONIZLEME, ...KATEGORI_KLASORLERI];
  for (const k of tumKlasorler) {
    const tamYol = path.join(DOSYA_KOKU, k);
    if (!fs.existsSync(tamYol)) {
      fs.mkdirSync(tamYol, { recursive: true });
    }
  }
}

// A) Gelen kutusundaki dosyaları kategorize edip taşı
function gelenKutusunuBosalt() {
  const gelenYolu = path.join(DOSYA_KOKU, GELEN);
  let tasinan = 0;
  if (!fs.existsSync(gelenYolu)) return tasinan;
  const girisler = fs.readdirSync(gelenYolu);
  for (const giris of girisler) {
    // Gizli dosyaları (.DS_Store vb.) ve klasörleri atla
    if (giris.startsWith('.')) continue;
    const kaynakYolu = path.join(gelenYolu, giris);
    const stat = fs.statSync(kaynakYolu);
    if (!stat.isFile()) continue;
    const hedefKlasor = kategoriBul(giris);
    const hedefYolu = path.join(DOSYA_KOKU, hedefKlasor, giris);
    try {
      fs.renameSync(kaynakYolu, hedefYolu);
      tasinan++;
      console.log(`  Taşındı: ${giris} -> ${hedefKlasor}/`);
    } catch (hata) {
      console.warn(`  Taşınamadı: ${giris} (${hata.message})`);
    }
  }
  return tasinan;
}

// ODA File Converter binary'sini bul
function odaBinaryBul() {
  // 1) macOS standart kurulum yolu
  const macYol = '/Applications/ODAFileConverter.app/Contents/MacOS/ODAFileConverter';
  if (fs.existsSync(macYol)) return macYol;
  // 2) PATH'te 'ODAFileConverter' var mı? (which komutuyla kontrol — argümanları dizi ile)
  const sonuc = spawnSync('which', ['ODAFileConverter'], { encoding: 'utf8' });
  if (sonuc.status === 0 && sonuc.stdout && sonuc.stdout.trim()) {
    return sonuc.stdout.trim();
  }
  return null;
}

// B) DWG -> DXF çevirme (ODA File Converter ile)
function dwgleriCevir() {
  const binary = odaBinaryBul();
  const onizlemeYolu = path.join(DOSYA_KOKU, ONIZLEME);

  if (!binary) {
    console.warn('\n⚠  ODA File Converter kurulu değil — DWG dosyaları indirilebilir ama önizlenemez.');
    console.warn('   Ücretsiz indir: https://www.opendesign.com/guestfiles/oda_file_converter\n');
    return { cevrildi: 0, cevrilemedi: 0, atlandi: true };
  }

  let cevrildi = 0;
  let cevrilemedi = 0;

  // Her kategori klasörü için DWG var mı bak
  for (const klasor of KATEGORI_KLASORLERI) {
    const klasorYolu = path.join(DOSYA_KOKU, klasor);
    if (!fs.existsSync(klasorYolu)) continue;
    const dosyalar = fs.readdirSync(klasorYolu);
    const dwgVar = dosyalar.some(d => d.toLowerCase().endsWith('.dwg'));
    if (!dwgVar) continue;

    console.log(`  ODA çağrılıyor: ${klasor}/ -> _onizleme/`);
    // ÖNEMLİ: argümanlar dizi olarak verilir, shell:true YOK (komut enjeksiyonu önlenir)
    const sonuc = spawnSync(
      binary,
      [klasorYolu, onizlemeYolu, 'ACAD2018', 'DXF', '0', '1', '*.DWG'],
      { stdio: 'inherit' }
    );
    if (sonuc.error) {
      console.warn(`  ODA çalıştırılamadı: ${sonuc.error.message}`);
    }

    // DWG başına DXF üretildi mi kontrol et
    for (const d of dosyalar) {
      if (!d.toLowerCase().endsWith('.dwg')) continue;
      const dxfAdi = d.replace(/\.dwg$/i, '.dxf');
      const dxfTamYolu = path.join(onizlemeYolu, dxfAdi);
      if (fs.existsSync(dxfTamYolu)) {
        cevrildi++;
      } else {
        cevrilemedi++;
      }
    }
  }
  return { cevrildi, cevrilemedi, atlandi: false };
}

// C) Manifest üret
function manifestUret() {
  const dosyalar = [];
  const onizlemeYolu = path.join(DOSYA_KOKU, ONIZLEME);

  for (const klasor of KATEGORI_KLASORLERI) {
    const klasorYolu = path.join(DOSYA_KOKU, klasor);
    if (!fs.existsSync(klasorYolu)) continue;
    const girisler = fs.readdirSync(klasorYolu);
    for (const giris of girisler) {
      if (giris.startsWith('.')) continue;
      const tamYol = path.join(klasorYolu, giris);
      const stat = fs.statSync(tamYol);
      if (!stat.isFile()) continue;

      const uzanti = path.extname(giris);
      const tur = turBul(uzanti);
      // Web yolu — daima düz slash
      const webYolu = `/proje-dosyalari/${klasor}/${giris}`;

      const kayit = {
        id: idUret(webYolu),
        ad: insanciAd(giris),
        dosyaAdi: giris,
        yol: webYolu,
        kategori: KLASOR_KATEGORI[klasor] || 'diger',
        tur,
        boyut: stat.size,
        tarih: stat.mtime.toISOString(),
      };

      // DWG ise DXF eşleniği var mı bak
      if (tur === 'dwg') {
        const dxfAdi = giris.replace(/\.dwg$/i, '.dxf');
        const dxfTamYolu = path.join(onizlemeYolu, dxfAdi);
        if (fs.existsSync(dxfTamYolu)) {
          kayit.dxfYol = `/proje-dosyalari/${ONIZLEME}/${dxfAdi}`;
          kayit.durum = 'cevrildi';
        } else {
          kayit.durum = 'cevrilemedi';
        }
      } else {
        kayit.durum = 'ham';
      }

      dosyalar.push(kayit);
    }
  }

  // belgeler.json'a yaz
  const manifest = {
    uretim: new Date().toISOString(),
    surum: 1,
    dosyalar,
  };
  const cikti = path.join(DOSYA_KOKU, 'belgeler.json');
  fs.writeFileSync(cikti, JSON.stringify(manifest, null, 2), 'utf8');
  return { sayi: dosyalar.length, cikti };
}

// Ana akış
function main() {
  console.log('📁 Dosya Hazırlayıcı çalışıyor...\n');
  console.log(`Kök: ${DOSYA_KOKU}\n`);

  klasorleriHazirla();

  console.log('A) Gelen kutusu taranıyor...');
  const tasinan = gelenKutusunuBosalt();
  if (tasinan === 0) {
    console.log('  (Gelen kutusu boş)');
  }

  console.log('\nB) DWG çevrimi...');
  const dwgSonuc = dwgleriCevir();

  console.log('\nC) Manifest üretiliyor...');
  const manSonuc = manifestUret();

  // D) Özet
  console.log('\n──────────── ÖZET ────────────');
  console.log(`📦 Taşınan dosya:        ${tasinan}`);
  if (dwgSonuc.atlandi) {
    console.log(`🔄 DWG çevrimi:          atlandı (ODA kurulu değil)`);
  } else {
    console.log(`🔄 DWG çevrildi:         ${dwgSonuc.cevrildi}`);
    console.log(`⚠  DWG çevrilemedi:      ${dwgSonuc.cevrilemedi}`);
  }
  console.log(`📋 Manifest'teki kayıt:  ${manSonuc.sayi}`);
  console.log(`💾 Yazıldı:              ${path.relative(APP_KOKU, manSonuc.cikti)}`);
  console.log('──────────────────────────────\n');
}

main();
