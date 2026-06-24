# Dosya Hazırlayıcı + DWG Çevirici

Bu küçük araç, panele eklediğin proje belgelerini (mimari, statik, ruhsat, foto, vb.) otomatik olarak sıralar, DWG dosyalarını web'de görünür olsun diye DXF'ye çevirir ve panel için bir `belgeler.json` listesi üretir.

## Kullanım

```bash
# app dizini içinde
npm run dosyalar
```

Veya doğrudan:

```bash
node arac/dosya-hazirla.mjs
```

## Ne yapar?

1. **Gelen kutusunu boşaltır.** `public/proje-dosyalari/00-gelen-kutusu/` klasörüne attığın her dosyayı, ADINDAKİ anahtar kelimeye göre doğru klasöre TAŞIR:
   - `vaziyet-plani.pdf` → `mimari/`
   - `statik-kalip-plani.pdf` → `statik/`
   - `metraj-icmal.xlsx` → `metraj/`
   - `ruhsat-tapu.pdf` → `ruhsat-resmi/`
   - `saha-foto-01.jpg` → `saha-foto/`
   - Eşleşme yoksa → `diger/`

2. **DWG dosyalarını çevirir.** Mac'inde [ODA File Converter](https://www.opendesign.com/guestfiles/oda_file_converter) kuruluysa, tüm `.dwg` dosyaları için `_onizleme/` klasörüne `.dxf` üretilir. Panel bu DXF'leri tarayıcıda gösterebilir.

   > **Not:** ODA kurulu değilse araç çökmez, sadece uyarı verir. DWG dosyaları yine de indirilebilir, sadece tarayıcıda önizlenemez.

3. **`belgeler.json` üretir.** Tüm dosyaları gezip JSON listesi çıkarır (`public/proje-dosyalari/belgeler.json`). Panel bu listeyi okuyup belgeler ekranını çizer.

## ODA File Converter kurulumu (isteğe bağlı)

DWG önizleme istiyorsan:

1. https://www.opendesign.com/guestfiles/oda_file_converter sayfasına git
2. macOS sürümünü indir (ücretsiz, hesap istemez)
3. `.dmg` dosyasını aç, `ODAFileConverter.app`'ı `/Applications` klasörüne sürükle
4. `npm run dosyalar` komutunu tekrar çalıştır

## Klasör yapısı

```
app/public/proje-dosyalari/
├── 00-gelen-kutusu/   ← Yeni dosyaları buraya at
├── _onizleme/          ← Otomatik üretilen DXF'ler
├── mimari/             ← Plan, kesit, görünüş, vaziyet, cephe
├── statik/             ← Betonarme, kalıp, demir, temel
├── elektrik/           ← Aydınlatma, priz, pano
├── mekanik/            ← Tesisat, sıhhi, ısıtma, havuz
├── metraj/             ← Keşif, icmal, teklif, özet
├── ruhsat-resmi/       ← Ruhsat, tapu, izin, yapı denetim
├── saha-foto/          ← Şantiye fotoğrafları
├── diger/              ← Sınıflanamayan
└── belgeler.json       ← Panelin okuduğu liste
```

## Güvenlik

Araç sadece Node.js'in yerleşik modüllerini kullanır — npm bağımlılığı yoktur. Dış komut çağrıları (ODA) argüman dizisi olarak yapılır, shell'den geçirilmez (komut enjeksiyonu riski yoktur).
