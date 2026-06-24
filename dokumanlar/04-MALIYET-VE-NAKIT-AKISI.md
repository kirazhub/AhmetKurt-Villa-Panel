# AHMET KURT VİLLA PROJESİ — Maliyet Yöntemi ve Nakit Akışı Rehberi

> Bu belge "para tarafını" anlatır: işin gerçek maliyeti nasıl hesaplanır, hangi
> kalemler gizli ve büyüktür, parayı aylara nasıl yayarsın ve bütçeyi nasıl korursun.
> Buradaki **mantık** size kalıcıdır; **net rakam** ise toplanan taşeron tekliflerinden
> çıkar — bu belge size uydurma sayı vermez, doğru sayıyı bulma yöntemini öğretir.
> Künye ve fazlar için bkz. `01-PROJE-KUNYESI-VE-YOL-HARITASI.md`.

---

## 1. MALİYET NASIL HESAPLANIR

Maliyet hesabının kalbi tek bir formüldür. Lütfen bunu aklınızda tutun:

> **Metraj × Birim Fiyat = Planlanan Maliyet**

Kelimelerin anlamı:

- **Metraj:** O işten "ne kadar var" sorusunun cevabı. Bir miktardır.
  Örnek: kaç m² duvar, kaç m³ beton, kaç ton demir, kaç adet kapı.
  Metrajı projeden (statik, mimari, elektrik, mekanik) ölçerek çıkarırız.
- **Birim fiyat:** O işin "bir biriminin" fiyatı.
  Örnek: 1 m³ betonun fiyatı, 1 ton demirin fiyatı, 1 m² fayans döşemenin işçilik+malzeme fiyatı.
  Birim fiyatı **taşeron tekliflerinden** ve güncel piyasadan alırız.

### Adım adım nasıl yapılır

1. **Faz seç.** İşi tek seferde değil, faz faz (Hafriyat, Temel, Kaba Yapı...) hesaplarız.
   Çünkü her fazın taşeronu ve fiyatı ayrıdır.
2. **Metrajı çıkar.** O fazdaki her kalemin miktarını projeden ölç.
   Örnek (Temel fazı): radye beton kaç m³, radye demiri kaç ton, su yalıtımı kaç m².
3. **Birim fiyatı bul.** Her kalem için en az **3 taşeron teklifi** topla, ortala ya da en
   makul olanı seç.
4. **Çarp ve topla.** Her satırda `metraj × birim fiyat` yap, fazın toplamını al.
   Tüm fazları toplayınca **projenin planlanan toplam maliyeti** çıkar.
5. **Panele gir.** Bu "planlanan" rakam panelde sabit durur.
6. **Gerçekleşeni karşılaştır.** İş ilerledikçe ödenen gerçek tutarı panele işleriz.
   Panel `Planlanan` ile `Gerçekleşen`i yan yana gösterir; **sapma** (fark) burada görünür.

### Küçük bir örnek (sadece yöntem)

| Kalem | Metraj | Birim fiyat | Planlanan |
|-------|--------|-------------|-----------|
| Radye beton | 210 m³ | (teklif) TL/m³ | metraj × fiyat |
| Radye demiri | 34 ton | (teklif) TL/ton | metraj × fiyat |
| Bodrum su yalıtımı | 380 m² | (teklif) TL/m² | metraj × fiyat |

> Rakamları kasıtlı boş bıraktık. Metrajlar projeden, birim fiyatlar tekliflerden gelince
> tablo gerçek sayıya dönüşür. **Doğru maliyet = doğru metraj + güncel teklif.**

---

## 2. RESMİ MALİYET ≠ GERÇEK MALİYET

Ruhsatta bir maliyet rakamı yazıyor:

> **17.400 TL/m² → 19.870.800 TL**

Bu rakamı **gerçek inşaat bütçesi sanmayın.** Bu sadece **harç/resmi hesaptır** —
belediyenin harç ve resmi işlemleri için kullandığı standart bir tablodur. Her yapı
sınıfına devletin belirlediği ortalama bir m² fiyatı uygulanır ve toplam alanla çarpılır.
Yani bu sayı, "ortalama bir bina"nın resmi karşılığıdır.

**Bizim binamız ortalama değil.** Bu bir **lüks villa** ve maliyeti yukarı çeken çok özel
şartları var:

- **Eğimli arazi** (~10 m kot farkı) → ağır hafriyat + istinat (dayanma) duvarı.
- **Yüzme havuzu** → ayrı uzmanlık, ayrı bütçe.
- **Mermer** kaplamalar (lüks malzeme).
- İzolasyonlu **alüminyum** doğrama (PVC değil — daha pahalı).
- Köşelerde **doğal taş kaplama** (malzeme + ustalık pahalı).
- **270 ağaç + peyzaj** (zorunlu, küçük bir kalem değil).

Bütün bunlar resmi tablonun hesaba katmadığı şeylerdir. Bu yüzden:

> **Gerçek maliyet, resmi 19,87 milyon TL rakamının belirgin şekilde ÜZERİNDEDİR.**

Peki gerçek rakam kaç? **Bunu şimdiden uydurmuyoruz.** Net rakam ancak Bölüm 1'deki yöntemle
(metraj × güncel taşeron teklifi) çıkar. Teklifler toplandıkça gerçek sayı netleşir; o güne
kadar resmi rakam yalnızca "alt sınır" gibi düşünülmelidir, hedef bütçe değildir.

---

## 3. GİZLİ VE BÜYÜK KALEMLER

Bazı kalemler küçük görünür ama bütçeyi sessizce büyütür. Bunlara baştan dikkat etmezsek
para ortada biter. En kritik gizli kalemler:

- **Hafriyat + istinat duvarı (eğim yüzünden):** Arazi eğimli olduğu için çok toprak kazılır,
  çok kamyon taşır ve göçmesin diye **dayanma duvarı** örülür. Bu, projenin **en büyük gizli
  maliyeti ve en büyük riskidir.**
- **Su yalıtımı (bodrum + ıslak hacim + havuz):** Ucuz görünür ama yanlış yapılırsa sonradan
  tamiri **en pahalı** iştir. Doğru yapmak bütçeye konmalıdır.
- **Havuz:** Yapımı, su yalıtımı, filtre/pompa ekipmanı ve testiyle başlı başına bir bütçe kalemi.
- **270 ağaç + peyzaj:** Ağaç dikimi **iskan (oturma izni) şartı** — atlanamaz, ertelenince
  sona ağır yük biner.
- **Asansör:** Pahalı ve teslim süresi uzun. Erken sipariş gerekir, bütçede yeri ayrılmalıdır.

> ⚠️ **Uyarı:** Bu gizli kalemler tek tek küçük gibi dursa da, toplamda inşaat bütçesinin
> kabaca **%20 ile %35'i** kadar bir paya ulaşabilir. Yani projenin yaklaşık üçte birini
> bunlar belirleyebilir. Bütçeyi yaparken bu kalemleri "ekstra" değil, **ana kalem** sayın.

---

## 4. NAKİT AKIŞI PLANI

Bu villa kısa sürmez; kaba tahminle **20–30 ay** sürer. Bu kadar uzun bir işte parayı tek
seferde değil, **aylara yayarak** yönetiriz. Temel mantık:

- **Kademeli hakediş:** Her taşerona "yaptığı iş kadar" ödeme yapılır. Peşin/avans en aza
  indirilir ve kontrollü verilir. Böylece para, iş ilerledikçe ve kontrol edildikçe çıkar.
- **Aylık nakit ihtiyacı dalgalanır — her ay aynı değildir.** İki ana dönem vardır:
  - **Kaba yapı döneminde** para çoğunlukla **beton ve demire** gider (ağır, yüklü aylar).
  - **İnce iş döneminde** para çoğunlukla **malzemeye** gider (mermer, parke, doğrama,
    vitrifiye, mutfak). Bunlar da yüklü ama farklı kalemler.
  Yani "geçen ay 1 milyon harcadık, bu ay da aynısı gider" diye düşünmeyin; ay ay değişir.
- **Erken sipariş gereken kalemleri ödeme planına ayrıca yaz.** Bazı işler aylar önceden
  sipariş edilmeli: **asansör, alüminyum doğrama, mermer, havuz ekipmanı.** Bunların avans/
  sipariş ödemesi, işin yapılacağı aydan **önce** nakit gerektirir — plana bunu işlemezsek
  iş yerinde para hazır olmaz ve termin (takvim) kayar.

> Pratik kural: Her ay başında "bu ay hangi fazlar çalışıyor, hangi malzeme önceden sipariş
> edilecek" diye bakıp o ayın nakit ihtiyacını ayrı hesaplayın. Panel bu dalgalanmayı
> aylık olarak göstermek için kurgulanır.

---

## 5. BÜTÇEYİ KORUMA

Bütçe yapmak yetmez; **korumak** gerekir. Üç temel savunma hattı:

1. **Sözleşmelere "fiyat farkı (eskalasyon)" maddesi koyun.**
   İş uzun sürdüğü için malzeme fiyatları artar. Sözleşmede bunun nasıl hesaplanacağı
   baştan yazılı olursa, sonradan taşeronla tartışma ve sürpriz zam olmaz. Madde net olsun:
   neyin, ne zaman, hangi orana göre güncelleneceği yazılı olmalı.

2. **%10–15 "beklenmedik (kontenjans) payı" ayırın.**
   Toplam bütçenin üstüne, sırf sürprizler için **%10 ila %15 ek bir kasa** koyun. Eğimli
   arazi + lüks malzeme + uzun süre demek = kesin sürpriz demektir. Bu pay bittiğinde
   harcamayı durdurup gözden geçirin; bu pay "fazladan harcanacak para" değil, "güvenlik
   yastığıdır".

3. **Metraj şişirme ve hileyi kontrol edin.**
   En çok hile şu iki kalemde olur:
   - **Hafriyat (m³):** Kazılan toprak m³ ile ölçülür, kamyonla taşınır. Kamyon sayısı ve
     m³ miktarı abartılabilir. **Kamyon fişlerini ve m³ hesabını mutlaka kontrol edin.**
   - **Demir (ton):** Statik projede hangi çaptan ne kadar demir gerektiği bellidir.
     Faturadaki ton, **projedeki demir hesabıyla** karşılaştırılmalı. Fazla ton faturası
     en sık rastlanan şişirmedir.
   Genel kural: Her hakedişte ödenen miktar, **projeden çıkan metrajla** birebir tutuyor mu
   diye bakın. Tutmuyorsa ödemeyi yapmadan önce sorun.

> Özet savunma: **net sözleşme + güvenlik payı + metraj kontrolü.** Bu üçü olduğu sürece
> bütçe sürprizleri yönetilebilir kalır.
