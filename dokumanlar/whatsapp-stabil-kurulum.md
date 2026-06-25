# WhatsApp Stabil Bağlantı — Kurulum & Kullanım Planı

Amaç: bağlantı kopmasını AZALTMAK, tek temiz oturumla stabil çalışmak.
Not: Kişisel numara + panel (gayrı-resmi WhatsApp Web protokolü) ile bağlantı "minimize" edilir, %100 garanti edilemez. En güvenli uzun vadeli yol WhatsApp Business + resmi Cloud API'dir.

## 1) Hedef Mimari
- Telefon = ANA cihaz (primary). Numara burada yaşar.
- Panel (pokkop.com sunucusu) = TEK bağlı cihaz (linked device).
- Başka hiçbir yerde aynı numara açık olmayacak (kendi bilgisayarında web.whatsapp.com / WhatsApp Desktop YOK).
- Tek istemci mantığı: 1 telefon + 1 linked device (panel). Başka oturum = çakışma = kopma.

## 2) Adım Adım Kurulum
Telefon:
1. WhatsApp güncel olsun.
2. Telefonu sürekli açık + internete bağlı tut (şarjda olması ideal).
3. WhatsApp → Ayarlar → Bağlı Cihazlar → TÜM cihazların bağlantısını kes.

Kendi bilgisayarın (Ubuntu):
4. Tarayıcıda web.whatsapp.com açıksa çıkış yap. WhatsApp Desktop varsa kapat/çıkış.
5. Aynı numarayı kendi bilgisayarından AÇMA — gönderim panelden olacak.

Panel (tek temiz oturum):
6. pokkop.com → WhatsApp → "Yeniden bağlan (yeni QR)".
7. Telefon → Bağlı Cihazlar → Cihaz Bağla → paneldeki QR'ı okut.
8. "Bağlı" yazısını gör. Bitti — tek linked device = panel.

## 3) Kopma Azaltma Kontrol Listesi
- Ağ: Telefon stabil internette olsun (Wi-Fi tercih, mobil veri yedek).
- Wi-Fi/veri testi: Sık kopuyorsa Wi-Fi yerine mobil veriyi dene (veya tam tersi).
- Pil optimizasyonu: Android → Ayarlar → Uygulamalar → WhatsApp → Pil → "Kısıtlama yok / Sınırsız". (En kritik madde — agresif pil yönetimi linked device'ı düşürür.)
- Ekran kilidi/uyku: Sorun değil, ama telefon agresif uyku/pil tasarrufundaysa öldürebilir → şarjda + pil kısıtlaması kapalı tut.
- VPN/proxy/firewall: Telefonda WhatsApp'ı engelleyebilecek VPN/firewall'ı kapat.
- Cache/cookie/profil: Panel oturumu dosya tabanlı; bozulursa "Yeniden bağlan" tek oturumu temizler. Tarayıcı temizliği gerekmez.

## 4) Yanlış Kurulum Örnekleri (KAÇIN)
- ❌ Aynı anda hem panel hem kendi WhatsApp Web/Desktop açık → çakışma, kopma.
- ❌ Aynı numarayı farklı sekme/profilde açmak.
- ❌ Sürekli QR yenileyen yapı kurmak → oturumu bozar.
- ❌ Kararsız internet üstünde toplu gönderim yapmak.
- ❌ Sabit/seri (robot) mesaj pattern'i → ban riski. (Panelin motoru zaten rastgele aralık kullanır.)
- ⚠️ Kişisel numara ile kısa sürede çok sayıda YENİ kişiye mesaj = yüksek ban riski.

## 5A) En Güvenli & Stabil Yapı
- Telefon primary, şarjda, stabil internet, WhatsApp pil kısıtlaması kapalı.
- Sadece panel linked device; başka oturum yok.
- Gönderim motoru: GENİŞ + rastgele aralık (Güvenli 10-30 dk veya Saatlik), güne yayılmış.
- Günlük az sayıda mesaj; mümkünse önce tanıdık/kayıtlı kişilere.
- Toplu yerine "yavaş ve kişisel" tempo.

## 5B) Mevcut Kurulumdan Geçiş Planı
1. Kendi bilgisayarında açık WhatsApp Web/Desktop'tan çıkış yap.
2. Telefon → Bağlı Cihazlar → hepsini kes.
3. Telefon pil optimizasyonunu WhatsApp için kapat, telefonu şarja tak.
4. Panelden "Yeniden bağlan (yeni QR)" → tek temiz oturum kur.
5. İlk gün: 1 kategori, 3-5 firma, "Güvenli (10-30 dk)" ön ayar ile test.
6. Sorun yoksa kademeli artır; aralığı geniş, tempoyu yavaş tut.

## Risk İşaretleri (kaçınılmalı)
- Agresif otomasyon, sabit aralık, ani yüksek hacim.
- Aynı numarada çoklu eşzamanlı oturum.
- Kararsız internet üstünde otomasyon.
Bu davranışlar hem bağlantıyı koparır hem hesap riskini artırır.
