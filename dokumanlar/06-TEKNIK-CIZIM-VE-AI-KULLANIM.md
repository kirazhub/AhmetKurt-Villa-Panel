# TEKNİK ÇİZİM & YAPAY ZEKÂ İLE İÇE AKTARMA — Kullanım Rehberi

> Bu rehber yazılım bilmeyen kullanıcı içindir. AutoCAD/PDF/Excel gibi teknik dosyaları
> panele almanın ve yapay zekâ (OpenCode) ile metraj/iş kalemi çıkarmanın basit yolu.

Panele iki yeni bölüm eklendi:
- **Teknik Çizimler** (sol menü): tüm proje dosyalarını listeler, açıp bakarsın, faza bağlarsın.
- **İçe Aktar (AI)** (sol menü): yapay zekânın çıkardığı veriyi panele aktarır.

---

## 1) Dosyaları panele nasıl eklerim?

1. Dosyalarını (PDF, DWG, DXF, JPG/PNG, Excel/Word — fark etmez) şu klasöre at:
   `AhmetKurt-Villa-Panel/app/public/proje-dosyalari/00-gelen-kutusu/`
2. OpenCode'a şunu söyle: **"dosyaları hazırla"** (ya da bilen biri terminalde `npm run dosyalar` çalıştırır).
3. Araç dosyaları otomatik doğru klasöre yerleştirir, DWG'leri çizim olarak açılabilsin diye DXF'e çevirir ve listeyi günceller.
4. Panelde **Teknik Çizimler** sayfasını aç → hepsi orada. "Önizle" ile aç, "İndir" ile indir, "🔗" ile bir faza/iş kalemine bağla.

> **DWG notu:** DWG (AutoCAD'in asıl formatı) tarayıcıda doğrudan açılamaz. Açılabilmesi için
> ücretsiz **ODA File Converter** programı gerekir. Kurulu değilse DWG yine listede görünür ve
> indirilebilir, sadece panel içinde önizlenemez. Kurmak için OpenCode'a "ODA çeviriciyi kuralım" de.

---

## 2) Yapay zekâ ile metraj/iş kalemi çıkarma

Panelin içinde yapay zekâ yoktur; çıkarımı **OpenCode (ben)** yaparım. Akış şöyle:

1. Dosyalar `proje-dosyalari` klasöründe olsun (yukarıdaki adım).
2. OpenCode'a normal cümlelerle söyle. Örnekler:
   - *"Mimari klasöründeki zemin kat planından oda alanlarını ve duvar metrajını çıkar, ice-aktar.json üret."*
   - *"metraj klasöründeki keşif Excel'ini oku, iş kalemlerini ice-aktar.json yap."*
   - *"Şu PDF teklifini oku, taşeron ve tutarı içe-aktar paketine koy."*
3. Ben dosyaları okur, `ice-aktar.json` adında bir dosya üretirim.
4. Panelde **İçe Aktar (AI)** sayfasını aç → **"ice-aktar.json seç"** → dosyayı yükle.
5. Ekranda **"şunlar eklenecek"** önizlemesi çıkar. Kontrol et.
6. **"Onayla ve Ekle"**ye bas. Veriler İş Takibi / Teklifler / Taşeronlar sayfalarına işlenir.

> **Güvenlik:** Sen onaylamadan panele HİÇBİR ŞEY eklenmez. Yanlışsa "Vazgeç" de.

---

## 3) Hangi dosya ne kadar kolay okunur?

| Format | Panelde önizleme | AI okuma | Not |
|--------|------------------|----------|-----|
| PDF | ✅ Doğrudan | ✅ Çok iyi | En kolayı |
| Excel / Word | İndir | ✅ Çok iyi | Metraj/keşif için ideal |
| DXF | ✅ İnteraktif çizim | ⚠️ Ölçü okunabilir | AutoCAD metin formatı |
| DWG | DXF'e çevrilirse ✅ | ❌ Önce DXF gerekir | ODA çevirici ile |
| Resim (JPG/PNG) | ✅ Doğrudan | 🟡 Bakar, ölçü net değil | Saha fotoğrafı için |

---

## 4) ice-aktar.json nasıl görünür? (bilgi amaçlı)

```json
{
  "kaynak": "mimari/zemin-kat-plani.pdf",
  "uretim": "2026-06-25T10:00:00.000Z",
  "not": "Zemin kat metrajı",
  "isKalemleri": [
    { "fazId": "f5", "ad": "Zemin kat iç bölme duvarı", "birim": "m2",
      "metraj": 145, "birimFiyat": 480, "durum": "baslamadi", "ilerleme": 0 }
  ]
}
```

Bunu elle yazman gerekmez — OpenCode senin için üretir. Sen sadece yükleyip onaylarsın.
