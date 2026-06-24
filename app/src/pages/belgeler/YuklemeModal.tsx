import { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Modal, Field, Input, Select, Textarea, Button } from '../../components/ui';
import { blobKaydet } from '../../lib/idb';
import { uid, bugun } from '../../lib/format';
import type { Belge, Faz, IsKalemi } from '../../types';

// ============================================================================
// YuklemeModal — Dosya seçici + tür/iş kalemi/faz/not. Seçilen her dosya
// IndexedDB'ye blob olarak kaydedilir, sonra store'a meta belge eklenir.
// ============================================================================

interface Props {
  acik: boolean;
  kapat: () => void;
  fazlar: Faz[];
  isKalemleri: IsKalemi[];
  // store.belgeEkle(...) imzasına uyan callback
  belgeEkle: (b: Omit<Belge, 'id'>) => string;
}

// Form alanları
interface Form {
  pdfTuru: 'fatura' | 'sozlesme' | 'diger'; // image değil dosyalar için
  isKalemiId: string;
  fazId: string;
  notlar: string;
}

const BOS_FORM: Form = {
  pdfTuru: 'fatura',
  isKalemiId: '',
  fazId: '',
  notlar: '',
};

// Dosyanın türünü tahmin et — image ise 'foto', pdf ise kullanıcının seçimi
function turBelirle(dosya: File, pdfTuru: Form['pdfTuru']): Belge['tur'] {
  if (dosya.type.startsWith('image/')) return 'foto';
  return pdfTuru;
}

export default function YuklemeModal({ acik, kapat, fazlar, isKalemleri, belgeEkle }: Props) {
  const [dosyalar, setDosyalar] = useState<File[]>([]);
  const [form, setForm] = useState<Form>(BOS_FORM);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [ilerleme, setIlerleme] = useState(0);

  // Modal her açıldığında formu sıfırla
  function sifirla() {
    setDosyalar([]);
    setForm(BOS_FORM);
    setIlerleme(0);
  }

  function kapatVeSifirla() {
    if (yukleniyor) return; // Yükleme sırasında kapama
    sifirla();
    kapat();
  }

  // Dosya yükleme — her dosya için blobKaydet sonra belgeEkle
  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    if (dosyalar.length === 0) {
      alert('En az bir dosya seçin.');
      return;
    }
    setYukleniyor(true);
    setIlerleme(0);

    try {
      for (let i = 0; i < dosyalar.length; i++) {
        const dosya = dosyalar[i];
        const blobId = uid('blob');
        // 1) Dosyayı IndexedDB'ye kaydet
        await blobKaydet(blobId, dosya);
        // 2) Meta belge kaydını store'a ekle
        belgeEkle({
          ad: dosya.name,
          tur: turBelirle(dosya, form.pdfTuru),
          blobId,
          isKalemiId: form.isKalemiId || undefined,
          fazId: form.fazId || undefined,
          tarih: bugun(),
          notlar: form.notlar || undefined,
        });
        setIlerleme(i + 1);
      }
      sifirla();
      kapat();
    } catch (err) {
      console.error(err);
      alert('Dosya kaydedilemedi: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    } finally {
      setYukleniyor(false);
    }
  }

  // Seçilen dosyaların özet bilgisi
  const fotoSayisi = dosyalar.filter((d) => d.type.startsWith('image/')).length;
  const pdfSayisi = dosyalar.length - fotoSayisi;

  return (
    <Modal acik={acik} kapat={kapatVeSifirla} baslik="Belge / Fotoğraf Yükle" genis>
      <form onSubmit={kaydet} className="space-y-4">
        <Field label="Dosyalar" hint="Birden fazla seçebilirsiniz. Görseller otomatik 'Fotoğraf' olur.">
          <Input
            type="file"
            accept="image/*,application/pdf"
            multiple
            disabled={yukleniyor}
            onChange={(e) => {
              const liste = e.target.files ? Array.from(e.target.files) : [];
              setDosyalar(liste);
            }}
          />
        </Field>

        {dosyalar.length > 0 && (
          <div className="rounded-xl bg-zemin px-3.5 py-2.5 text-sm text-metin-yum">
            <span className="font-medium text-metin">{dosyalar.length}</span> dosya seçildi
            {fotoSayisi > 0 && <span> · {fotoSayisi} görsel</span>}
            {pdfSayisi > 0 && <span> · {pdfSayisi} PDF</span>}
          </div>
        )}

        {pdfSayisi > 0 && (
          <Field label="PDF Türü" hint="Görseller bu seçenekten etkilenmez.">
            <Select
              value={form.pdfTuru}
              onChange={(e) => setForm({ ...form, pdfTuru: e.target.value as Form['pdfTuru'] })}
              disabled={yukleniyor}
            >
              <option value="fatura">Fatura</option>
              <option value="sozlesme">Sözleşme</option>
              <option value="diger">Diğer</option>
            </Select>
          </Field>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="İlişkili Faz (opsiyonel)">
            <Select
              value={form.fazId}
              onChange={(e) => setForm({ ...form, fazId: e.target.value })}
              disabled={yukleniyor}
            >
              <option value="">— Seçiniz —</option>
              {fazlar.map((f) => (
                <option key={f.id} value={f.id}>Faz {f.no} · {f.ad}</option>
              ))}
            </Select>
          </Field>

          <Field label="İlişkili İş Kalemi (opsiyonel)">
            <Select
              value={form.isKalemiId}
              onChange={(e) => setForm({ ...form, isKalemiId: e.target.value })}
              disabled={yukleniyor}
            >
              <option value="">— Seçiniz —</option>
              {isKalemleri.map((k) => (
                <option key={k.id} value={k.id}>{k.ad}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Not (opsiyonel)">
          <Textarea
            value={form.notlar}
            onChange={(e) => setForm({ ...form, notlar: e.target.value })}
            placeholder="Örn: Temel demir yerleştirme — 10 Mart"
            disabled={yukleniyor}
          />
        </Field>

        {yukleniyor && (
          <div className="rounded-xl bg-marka-50 text-marka-700 px-3.5 py-2.5 text-sm flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Yükleniyor: {ilerleme} / {dosyalar.length}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={kapatVeSifirla} disabled={yukleniyor}>
            İptal
          </Button>
          <Button type="submit" disabled={yukleniyor || dosyalar.length === 0}>
            {yukleniyor ? <><Loader2 size={16} className="animate-spin" /> Yükleniyor…</> : <><Upload size={16} /> Yükle</>}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
