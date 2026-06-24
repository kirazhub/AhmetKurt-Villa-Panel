# Ahmet Kurt Villa – İnşaat Yönetim Paneli

## 1. Bu Panel Nedir?

Bu panel, **Ahmet Kurt Villa inşaatını tek bir ekrandan yönetmeniz** için yapılmıştır. İşlerin durumunu, taşeronları, parayı, ödemeleri, fotoğrafları ve termin tarihlerini hep birlikte görürsünüz.

- Telefondan, tabletten veya bilgisayardan açabilirsiniz; ekran boyutuna kendini uydurur.
- Girdiğiniz bütün veriler **kullandığınız tarayıcının içinde saklanır**. Yani internet olmasa da daha önce girdiğiniz bilgiler ekranda durur.

---

## 2. Nasıl Açılır / Çalıştırılır?

### Geliştirme (test ederek kullanmak) için

İlk seferde, paneli çalıştırmak için gereken parçaları bir defaya mahsus indiririz:

```bash
cd app
npm install
```

Sonra paneli başlatmak için:

```bash
npm run dev
```

Bu komut ekrana bir adres yazar (örneğin `http://localhost:5173`). O adresi tarayıcınıza yapıştırıp açtığınızda panel karşınıza gelir.

### Üretim (gerçek kullanıma hazır sürüm) için

Paneli tek bir paket haline getirmek için:

```bash
npm run build
```

Bu komut çalıştıktan sonra **`dist`** adında bir klasör oluşur. İçindeki dosyalar panelin yayına hazır halidir; bir internet sunucusuna konulduğunda herkes açabilir.

> Not: `npm run preview` komutu ise, üretim sürümünü yayınlamadan önce bilgisayarınızda son bir kez denemenizi sağlar.

---

## 3. Sayfalar Ne İşe Yarar?

Sol taraftaki (telefonda üstteki menü düğmesiyle açılan) menüde şu sayfalar vardır:

- **Özet** — Projenin genel durumunu tek bakışta gösterir: ne kadar ilerlendi, para nasıl gidiyor, sıradaki işler neler.
- **İş Takibi** — Yapılacak ve devam eden tüm iş kalemlerini listeler; her işin durumunu ve yüzde olarak ilerlemesini güncellersiniz.
- **Taşeronlar** — Projede çalışan usta ve firmaların (taşeronların) listesini ve iletişim bilgilerini tutar.
- **Bütçe / Maliyet** — Her iş kalemi için planlanan ve gerçekleşen masrafları gösterir; toplam maliyetin nereye gittiğini görürsünüz.
- **Hakediş & Ödeme** — Taşeronlara yaptığınız ödemeleri ve kalan borçları (hakedişleri) kaydeder.
- **Teklif Karşılaştırma** — Aynı iş için farklı taşeronlardan gelen teklifleri yan yana koyar; en uygununu seçmenizi kolaylaştırır.
- **Foto & Belge** — Şantiye fotoğraflarını, faturaları ve diğer belgeleri saklar.
- **Takvim / Termin** — İşlerin başlangıç ve bitiş tarihlerini (terminleri) takvim üzerinde gösterir.
- **Proje Künyesi** — Villanın resmi bilgilerini (ruhsat numarası, yapı sınıfı vb.) tutar; ayrıca yedek alma/yükleme işlemleri buradadır.

---

## 4. Veri Güvenliği & Yedek

Panele girdiğiniz her şey **bu tarayıcının içinde** saklanır. Bilgisayar veya tarayıcı değişirse o veriler otomatik olarak gelmez. Bu yüzden yedek almak çok önemlidir.

- **Yedek Al:** *Proje Künyesi* sayfasındaki **"Yedek Al"** düğmesine basın. Tüm verileriniz tek bir **JSON** dosyası olarak bilgisayarınıza iner. Bu dosyayı güvenli bir yere (bulut, e-posta, USB) koyun.
- **Yükle:** Aynı sayfadaki **"Yükle"** düğmesiyle daha önce indirdiğiniz JSON dosyasını seçtiğinizde tüm veriler geri gelir.
- Tarayıcı verisi silinirse (geçmiş temizleme, başka cihaz vb.) panik yapmayın; en son yedek dosyanızı **"Yükle"** ile geri yüklersiniz.

> **Tavsiye:** Önemli bir değişiklik yaptığınız her gün (ya da en azından her hafta) bir yedek alın. Yedek almak birkaç saniye sürer ama veri kaybını tamamen önler.

---

## 5. Tipik Kullanım Akışı

Paneli verimli kullanmak için önerilen sıra şudur:

1. **Taşeronları ekleyin** — Önce *Taşeronlar* sayfasından projede çalışacak usta ve firmaları girin.
2. **Teklifleri girin ve seçin** — *Teklif Karşılaştırma* sayfasında her iş kalemi için gelen teklifleri girin, kazanan teklifi seçin ve onu *Bütçe / Maliyet* sayfasına uygulayın.
3. **İlerlemeyi güncelleyin** — İşler ilerledikçe *İş Takibi* sayfasında durumu ve yüzdeyi güncelleyin.
4. **Ödemeleri işleyin** — Taşerona ödeme yaptıkça *Hakediş & Ödeme* sayfasına kaydedin.
5. **Belgeleri yükleyin** — Şantiye fotoğraflarını ve faturaları *Foto & Belge* sayfasına ekleyin.
6. **Terminleri izleyin** — *Takvim / Termin* sayfasından hangi işin ne zaman bitmesi gerektiğini takip edin.
7. **Genel duruma bakın** — Zaman zaman *Özet* sayfasından projenin geneline göz atın.

---

## 6. İleride

Şu an veriler her cihazda **ayrı ayrı** tutulur. Yani telefonda girdiğiniz bir veri, otomatik olarak bilgisayarda görünmez.

İleride **telefon ile bilgisayarın aynı anda senkron olması** (cross-device, yani cihazlar arası eşitleme) istenirse, bunun için ayrı bir **bulut sürümü** çalışması yapılacaktır. Bu, bu kılavuzun kapsamı dışında, ayrı bir adım olarak ele alınacaktır.
