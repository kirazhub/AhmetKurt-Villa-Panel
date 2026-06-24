import { useMemo, useState } from 'react';
import { HardHat, Plus, Search, Phone, Mail, Pencil, Trash2, Star, Briefcase, Wallet } from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  PageHeader, Card, CardBody, Button, Badge, EmptyState,
  Field, Input, Select, Textarea, Modal,
} from '../components/ui';
import { TASERON_KATEGORILERI } from '../types';
import type { Taseron } from '../types';
import { tl } from '../lib/format';
import { taseronOdemeToplam } from '../lib/calc';

// ============================================================================
// TAŞERON YÖNETİMİ
// Taşeronları kart görünümünde listele, ekle/düzenle/sil; iş ve ödeme özetleri.
// ============================================================================

// Form için kullanılan tip (id hariç Taşeron alanları)
type TaseronForm = Omit<Taseron, 'id'>;

// Boş form başlangıç değeri
const BOS_FORM: TaseronForm = {
  ad: '',
  firma: '',
  uzmanlik: TASERON_KATEGORILERI[0],
  telefon: '',
  email: '',
  performans: 0,
  sozlesmeNotu: '',
  notlar: '',
};

// ---- Yıldız seçici / gösterici ----
// readonly=true ise sadece gösterir; aksi halde tıklanabilir seçici
function YildizSecici({
  deger,
  onSec,
  readonly = false,
}: {
  deger: number;
  onSec?: (n: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const dolu = n <= (deger || 0);
        const Yildiz = (
          <Star
            size={readonly ? 14 : 22}
            className={dolu ? 'text-marka-500 fill-marka-500' : 'text-slate-300'}
          />
        );
        if (readonly) return <span key={n}>{Yildiz}</span>;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onSec?.(n === deger ? 0 : n)}
            className="p-0.5 rounded hover:bg-zemin cursor-pointer transition"
            aria-label={`${n} yıldız`}
          >
            {Yildiz}
          </button>
        );
      })}
    </div>
  );
}

export default function Taseronlar() {
  const taseronlar = useStore((s) => s.taseronlar);
  const isKalemleri = useStore((s) => s.isKalemleri);
  const odemeler = useStore((s) => s.odemeler);
  const taseronEkle = useStore((s) => s.taseronEkle);
  const taseronGuncelle = useStore((s) => s.taseronGuncelle);
  const taseronSil = useStore((s) => s.taseronSil);

  // Filtre ve arama
  const [arama, setArama] = useState('');
  const [uzmanlikFiltre, setUzmanlikFiltre] = useState<string>('');

  // Modal durumu — düzenleme modunda id var, ekleme modunda null
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenlenenId, setDuzenlenenId] = useState<string | null>(null);
  const [form, setForm] = useState<TaseronForm>(BOS_FORM);

  // Filtrelenmiş taşeron listesi
  const filtrelenmis = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr');
    return taseronlar.filter((t) => {
      if (uzmanlikFiltre && t.uzmanlik !== uzmanlikFiltre) return false;
      if (!q) return true;
      const havuz = [t.ad, t.firma ?? '', t.uzmanlik, t.telefon ?? '', t.email ?? '']
        .join(' ')
        .toLocaleLowerCase('tr');
      return havuz.includes(q);
    });
  }, [taseronlar, arama, uzmanlikFiltre]);

  // Her taşeron için iş sayısı ve ödenen toplamı hesapla
  function ozetHesapla(taseronId: string) {
    const isSayisi = isKalemleri.filter((k) => k.taseronId === taseronId).length;
    const odenen = taseronOdemeToplam(odemeler, taseronId);
    return { isSayisi, odenen };
  }

  // Modal'ı yeni kayıt için aç
  function yeniAc() {
    setDuzenlenenId(null);
    setForm(BOS_FORM);
    setModalAcik(true);
  }

  // Modal'ı düzenleme için aç — form'u mevcut veriyle doldur
  function duzenleAc(t: Taseron) {
    setDuzenlenenId(t.id);
    setForm({
      ad: t.ad,
      firma: t.firma ?? '',
      uzmanlik: t.uzmanlik,
      telefon: t.telefon ?? '',
      email: t.email ?? '',
      performans: t.performans ?? 0,
      sozlesmeNotu: t.sozlesmeNotu ?? '',
      notlar: t.notlar ?? '',
    });
    setModalAcik(true);
  }

  // Form gönderildiğinde ekle veya güncelle
  function kaydet(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ad.trim()) {
      alert('Taşeron adı zorunludur.');
      return;
    }
    // Boş string alanları temizle — opsiyonel alanlar boş kalsın
    const temiz: TaseronForm = {
      ad: form.ad.trim(),
      firma: form.firma?.trim() || undefined,
      uzmanlik: form.uzmanlik,
      telefon: form.telefon?.trim() || undefined,
      email: form.email?.trim() || undefined,
      performans: form.performans || undefined,
      sozlesmeNotu: form.sozlesmeNotu?.trim() || undefined,
      notlar: form.notlar?.trim() || undefined,
    };
    if (duzenlenenId) {
      taseronGuncelle(duzenlenenId, temiz);
    } else {
      taseronEkle(temiz);
    }
    setModalAcik(false);
  }

  // Silmeden önce kullanıcıyı uyar (atanmış iş varsa belirt)
  function silOnayla(t: Taseron) {
    const isSayisi = isKalemleri.filter((k) => k.taseronId === t.id).length;
    let mesaj = `"${t.ad}" taşeronunu silmek istediğinden emin misin?`;
    if (isSayisi > 0) {
      mesaj += `\n\nUYARI: Bu taşerona atanmış ${isSayisi} iş kalemi var. ` +
        `Silersen bu iş kalemleri "taşeronsuz" duruma düşer.`;
    }
    if (confirm(mesaj)) {
      taseronSil(t.id);
    }
  }

  return (
    <>
      <PageHeader
        baslik="Taşeron Yönetimi"
        aciklama="Firmalar, iletişim bilgileri ve performans"
        sag={
          <Button onClick={yeniAc}>
            <Plus size={16} /> Yeni Taşeron
          </Button>
        }
      />

      {/* Arama ve filtre çubuğu */}
      <Card className="mb-5">
        <CardBody className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-metin-yum pointer-events-none"
            />
            <Input
              placeholder="Ad, firma, telefon veya e-posta ile ara..."
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={uzmanlikFiltre}
            onChange={(e) => setUzmanlikFiltre(e.target.value)}
            className="sm:max-w-xs"
          >
            <option value="">Tüm uzmanlıklar</option>
            {TASERON_KATEGORILERI.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {/* Liste — boşsa boş durum, doluysa kart ızgarası */}
      {taseronlar.length === 0 ? (
        <Card>
          <EmptyState
            ikon={<HardHat size={28} />}
            baslik="Henüz taşeron eklenmedi"
            aciklama="Şantiyede çalışan firmaları ve ustaları buradan yönetebilirsin."
            aksiyon={
              <Button onClick={yeniAc}>
                <Plus size={16} /> İlk Taşeronu Ekle
              </Button>
            }
          />
        </Card>
      ) : filtrelenmis.length === 0 ? (
        <Card>
          <EmptyState
            ikon={<Search size={28} />}
            baslik="Arama sonucu bulunamadı"
            aciklama="Farklı bir arama veya filtre dene."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrelenmis.map((t) => {
            const { isSayisi, odenen } = ozetHesapla(t.id);
            return (
              <Card key={t.id}>
                <CardBody className="flex flex-col gap-3">
                  {/* Başlık satırı: ad, firma ve aksiyonlar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-metin truncate">{t.ad}</h3>
                      {t.firma && (
                        <p className="text-sm text-metin-yum truncate">{t.firma}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duzenleAc(t)}
                        aria-label="Düzenle"
                      >
                        <Pencil size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => silOnayla(t)}
                        aria-label="Sil"
                        className="text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>

                  {/* Uzmanlık rozeti */}
                  <div>
                    <Badge tone="amber">{t.uzmanlik}</Badge>
                  </div>

                  {/* İletişim — tıklanabilir bağlantılar */}
                  <div className="space-y-1.5 text-sm">
                    {t.telefon && (
                      <a
                        href={`tel:${t.telefon}`}
                        className="flex items-center gap-2 text-metin hover:text-marka-600 transition"
                      >
                        <Phone size={14} className="text-metin-yum shrink-0" />
                        <span className="truncate">{t.telefon}</span>
                      </a>
                    )}
                    {t.email && (
                      <a
                        href={`mailto:${t.email}`}
                        className="flex items-center gap-2 text-metin hover:text-marka-600 transition"
                      >
                        <Mail size={14} className="text-metin-yum shrink-0" />
                        <span className="truncate">{t.email}</span>
                      </a>
                    )}
                    {!t.telefon && !t.email && (
                      <p className="text-xs text-metin-yum italic">İletişim bilgisi yok</p>
                    )}
                  </div>

                  {/* Performans yıldızları */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-metin-yum">Performans</span>
                    {t.performans ? (
                      <YildizSecici deger={t.performans} readonly />
                    ) : (
                      <span className="text-xs text-metin-yum italic">değerlendirilmedi</span>
                    )}
                  </div>

                  {/* Özet: iş sayısı ve ödenen toplam */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-cizgi">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                        <Briefcase size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-metin-yum">İş kalemi</p>
                        <p className="text-sm font-semibold text-metin">{isSayisi}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                        <Wallet size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-metin-yum">Ödenen</p>
                        <p className="text-sm font-semibold text-metin truncate">{tl(odenen)}</p>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Ekle / Düzenle Modal */}
      <Modal
        acik={modalAcik}
        kapat={() => setModalAcik(false)}
        baslik={duzenlenenId ? 'Taşeronu Düzenle' : 'Yeni Taşeron'}
        genis
      >
        <form onSubmit={kaydet} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Ad / Yetkili *">
              <Input
                value={form.ad}
                onChange={(e) => setForm({ ...form, ad: e.target.value })}
                placeholder="Örn. Ahmet Yılmaz"
                required
                autoFocus
              />
            </Field>
            <Field label="Firma">
              <Input
                value={form.firma ?? ''}
                onChange={(e) => setForm({ ...form, firma: e.target.value })}
                placeholder="Örn. Yılmaz İnşaat Ltd."
              />
            </Field>
            <Field label="Uzmanlık">
              <Select
                value={form.uzmanlik}
                onChange={(e) => setForm({ ...form, uzmanlik: e.target.value })}
              >
                {TASERON_KATEGORILERI.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </Select>
            </Field>
            <Field label="Telefon">
              <Input
                type="tel"
                value={form.telefon ?? ''}
                onChange={(e) => setForm({ ...form, telefon: e.target.value })}
                placeholder="0532 123 45 67"
              />
            </Field>
            <Field label="E-posta">
              <Input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ornek@firma.com"
              />
            </Field>
            <Field label="Performans" hint="Tıklayarak 1-5 yıldız ver, aynı yıldıza tekrar tıklayarak temizle">
              <div className="flex items-center h-[44px]">
                <YildizSecici
                  deger={form.performans ?? 0}
                  onSec={(n) => setForm({ ...form, performans: n })}
                />
              </div>
            </Field>
          </div>

          <Field label="Sözleşme Notu" hint="Sözleşme tarihi, ödeme koşulları, kapsam vb.">
            <Textarea
              value={form.sozlesmeNotu ?? ''}
              onChange={(e) => setForm({ ...form, sozlesmeNotu: e.target.value })}
              placeholder="Örn. 10.03.2025 tarihli sözleşme, %30 avans, kalan hakediş ile..."
            />
          </Field>

          <Field label="Notlar">
            <Textarea
              value={form.notlar ?? ''}
              onChange={(e) => setForm({ ...form, notlar: e.target.value })}
              placeholder="Genel notlar, referanslar, dikkat edilecek konular..."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t border-cizgi">
            <Button type="button" variant="ghost" onClick={() => setModalAcik(false)}>
              Vazgeç
            </Button>
            <Button type="submit">
              {duzenlenenId ? 'Güncelle' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
