# Hostinger VPS Kurulumu — Adım Adım (Acemi Dostu)

> Amaç: Ahmet Kurt Villa Paneli'ni (panel + AI + kalıcı kayıt) **7/24 açık** bir
> sunucuda çalıştırmak. Böylece her cihazdan girersin, hiçbir veri kaybolmaz,
> Opus kayıtlara doğrudan erişir.

**Neden VPS, neden Vercel değil?** Vercel "sunucusuz"dur — diske kalıcı yazamaz, her
istekte sıfırlanır. Bizim "asla unutma" şartımız kalıcı disk + sürekli açık sunucu
ister. VPS bunu sağlar. Tek VPS hem paneli hem AI'yı hem kaydı çalıştırır.

---

## ADIM 1 — Hostinger'dan VPS satın al
1. https://www.hostinger.com.tr → **VPS Hosting**.
2. En küçük **KVM 1** planı yeterli (1 vCPU, ~4 GB RAM). İstersen KVM 2 al, rahat eder.
3. Ödeme sonrası "Sunucu kur" ekranında:
   - **İşletim sistemi: Ubuntu 22.04 (64-bit)** seç. (Uygulama şablonu DEĞİL, düz Ubuntu.)
   - Bir **root şifresi** belirle (not et).
   - Sunucu konumu: **Avrupa** (örn. Almanya/Hollanda) — Türkiye'ye yakın, hızlı.
4. Kurulum bitince Hostinger panelinde sunucunun **IP adresini** göreceksin (örn. `203.0.113.45`). Bunu not et.

---

## ADIM 2 — Sunucuya bağlan (en kolay yol)
Hostinger panelinde VPS → **"Browser terminal"** (Tarayıcı terminali) butonu var. Tıkla,
sunucunun siyah komut ekranı tarayıcıda açılır. (SSH/PuTTY ile uğraşmana gerek yok.)
- Sorarsa kullanıcı: `root`, şifre: ADIM 1'de belirlediğin root şifresi.

> Alternatif: Bilgisayardan bağlanmak istersen Mac/Linux'ta Terminal'e:
> `ssh root@SUNUCU_IP` yazıp şifreyi gir.

---

## ADIM 3 — Projeyi sunucuya getir
**Yol A (önerilen) — GitHub'dan:** Proje GitHub'a yüklenmişse, terminale:
```
cd /root
git clone https://github.com/KULLANICI_ADIN/AhmetKurt-Villa-Panel.git proje
cd proje
```
(Ben istersen projeyi senin GitHub hesabına yükleyebilirim; o zaman buradaki linki sana veririm.)

**Yol B — Sıkıştırılmış dosya yükleyerek:** Hostinger Dosya Yöneticisi'nden `.zip` yükleyip
sunucuda açabilirsin. (Yol A çok daha kolay; onu öneririm.)

---

## ADIM 4 — Tek komutla kur
Proje klasöründeyken (`cd /root/proje`):
```
sudo bash server/kurulum.sh
```
Bu betik otomatik olarak: Node.js'i kurar, paneli derler, arka ucu hazırlar ve **pm2**
ile sürekli çalışır hale getirir. Bitince sana `http://SUNUCU_IP:8080` adresini yazar.

---

## ADIM 5 — OpenRouter anahtarını gir (AI çalışsın)
```
nano server/.env
```
Açılan ekranda `OPENROUTER_API_KEY=` satırının sonuna anahtarını yapıştır
(`sk-or-...`). Kaydet: **Ctrl+O → Enter**, çık: **Ctrl+X**. Sonra:
```
pm2 restart villa-panel
```
> Anahtarı openrouter.ai → Keys'ten alırsın. (Bende çalışan anahtar zaten var; istersen onu kullanırız.)

---

## ADIM 6 — Paneli aç
Tarayıcıdan: **http://SUNUCU_IP:8080**
Panel açılır. Telefon, tablet, bilgisayar — hepsinden aynı adres, aynı veri. 🎉

---

## ADIM 7 (İLERİ, opsiyonel) — Alan adı + https (kilitli yeşil adres)
IP yerine `villa.alanadin.com` gibi şık ve güvenli (https) bir adres istersen:
1. Bir alan adı al (Hostinger'dan alabilirsin) ve **A kaydını** VPS IP'sine yönlendir.
2. Sunucuda nginx + ücretsiz SSL:
```
apt-get install -y nginx
# /etc/nginx/sites-available/villa içine reverse proxy (8080 -> 80)
# (bu adımı birlikte yaparız; tek seferlik)
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d villa.alanadin.com
```
Bu adımı seninle birlikte, komutları tek tek vererek yaparız.

---

## GÜNCELLEME / YEDEK
- **Panelde değişiklik yaptığımda** güncellemek için sunucuda:
  ```
  cd /root/proje && git pull && cd app && npm run build && pm2 restart villa-panel
  ```
- **Veriler** `server/veri/` klasöründe kalıcı durur (`danisma.json`, `durum.json`).
  Bu klasörü ara sıra indirip yedeklemen iyi olur (Hostinger Dosya Yöneticisi'nden).
- Sunucu yeniden başlasa bile pm2 paneli otomatik açar (kurulumda ayarlandı).

---

## SORUN OLURSA
- Panel açılmıyor: `pm2 logs villa-panel` ile hatayı gör.
- AI cevap vermiyor: `server/.env` içinde anahtar dolu mu? `pm2 restart villa-panel`.
- Port kapalı: Hostinger panelinde **Güvenlik Duvarı (Firewall)**'da 8080 (ve 80/443) portlarını aç.

> Bu adımların hepsini seninle birlikte, takıldığın yerde komutları tek tek vererek
> yapabilirim. Sen sadece IP ve root şifreni hazır et, gerisini yönlendiririm.
