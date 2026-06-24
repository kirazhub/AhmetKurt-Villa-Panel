import { useMemo, useState } from 'react';
import { GitCompareArrows, Plus, Trophy, CheckCircle2, Pencil, Trash2, Wallet, FileText, Calendar, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  PageHeader, Card, CardBody, EmptyState, Button, Badge, Modal,
  Field, Input, Select, Textarea,
} from '../components/ui';
import { tl, tarih, bugun } from '../lib/format';
import { enUygunTeklif } from '../lib/calc';
import type { Teklif } from '../types';

// ============================================================================
// TEKLİF KARŞILAŞTIRMA — Teklifler iş kalemine göre gruplanır, en uygun olan
// vurgulanır, kullanıcı bir teklif seçip "Bütçeye Uygula" diyebilir.
// ============================================================================

// Yeni/Düzenle formunda tutulan ara veri
interface FormVeri {
  isKalemiId: string;       // seçili iş kalemi id'si ('' ise serbest kalem)
  kalemAdi: string;         // serbest metin kalem başlığı
  taseronId: string;        // seçili taşeron id'si ('' ise serbest)
  taseronAdi: string;       // serbest taşeron adı
  tutar: string;            // input'tan geldiği için string
  birimFiyat: string;
  tarih: string;
  notlar: string;
}

const BOS_FORM: FormVeri = {
  isKalemiId: '', kalemAdi: '', taseronId: '', taseronAdi: '',
  tutar: '', birimFiyat: '', tarih: bugun(), notlar: '',
};

export default function Teklifler() {
  const teklifler = useStore((s) => s.teklifler);
  const isKalemleri = useStore((s) => s.isKalemleri);
  const taseronlar = useStore((s) => s.taseronlar);
  const fazlar = useStore((s) => s.fazlar);
  const teklifEkle = useStore((s) => s.teklifEkle);
  const teklifGuncelle = useStore((s) => s.teklifGuncelle);
  const teklifSil = useStore((s) => s.teklifSil);
  const teklifSec = useStore((s) => s.teklifSec);
  const isKalemiGuncelle = useStore((s) => s.isKalemiGuncelle);

  // Modal durumları
  const [acik, setAcik] = useState(false);
  const [duzenleId, setDuzenleId] = useState<string | null>(null);
  const [form, setForm] = useState<FormVeri>(BOS_FORM);

  // İş kalemi id → isim eşleştirme tablosu (hızlı erişim için)
  const isKalemiMap = useMemo(() => {
    const m = new Map<string, { ad: string; fazId: string }>();
    isKalemleri.forEach((k) => m.set(k.id, { ad: k.ad, fazId: k.fazId }));
    return m;
  }, [isKalemleri]);

  // Taşeron id → ad eşleştirme
  const taseronMap = useMemo(() => {
    const m = new Map<string, string>();
    taseronlar.forEach((t) => m.set(t.id, t.ad));
    return m;
  }, [taseronlar]);

  // Faz id → ad eşleştirme (kalem altında gösterilecek)
  const fazMap = useMemo(() => {
    const m = new Map<string, string>();
    fazlar.forEach((f) => m.set(f.id, f.ad));
    return m;
  }, [fazlar]);

  // Teklifleri grupla — anahtar olarak isKalemiId varsa onu, yoksa "serbest:kalemAdi" kullan
  const gruplar = useMemo(() => {
    const map = new Map<string, { baslik: string; fazAdi?: string; isKalemiId?: string; teklifler: Teklif[] }>();
    teklifler.forEach((t) => {
      const anahtar = t.isKalemiId ?? `serbest:${t.kalemAdi}`;
      const mevcut = map.get(anahtar);
      if (mevcut) {
        mevcut.teklifler.push(t);
      } else {
        const isKalem = t.isKalemiId ? isKalemiMap.get(t.isKalemiId) : undefined;
        map.set(anahtar, {
          baslik: isKalem?.ad ?? t.kalemAdi ?? 'İsimsiz kalem',
          fazAdi: isKalem ? fazMap.get(isKalem.fazId) : undefined,
          isKalemiId: t.isKalemiId,
          teklifler: [t],
        });
      }
    });
    // Her grubun içinde tutara göre sırala (en ucuz üstte)
    return Array.from(map.values()).map((g) => ({
      ...g,
      teklifler: [...g.teklifler].sort((a, b) => a.tutar - b.tutar),
    }));
  }, [teklifler, isKalemiMap, fazMap]);

  // ---- Modal aksiyonları ----
  const yeniAc = () => {
    setDuzenleId(null);
    setForm(BOS_FORM);
    setAcik(true);
  };

  const duzenleAc = (t: Teklif) => {
    setDuzenleId(t.id);
    setForm({
      isKalemiId: t.isKalemiId ?? '',
      kalemAdi: t.kalemAdi ?? '',
      taseronId: t.taseronId ?? '',
      taseronAdi: t.taseronAdi ?? '',
      tutar: String(t.tutar ?? ''),
      birimFiyat: t.birimFiyat !== undefined ? String(t.birimFiyat) : '',
      tarih: t.tarih ?? bugun(),
      notlar: t.notlar ?? '',
    });
    setAcik(true);
  };

  const kaydet = () => {
    // Doğrulama: tutar zorunlu, kalem adı (seçim veya serbest) zorunlu
    const tutar = Number(form.tutar);
    if (!tutar || tutar <= 0) {
      alert('Lütfen geçerli bir tutar gir.');
      return;
    }
    // Eğer iş kalemi seçilmişse adını ondan al; değilse form.kalemAdi kullan
    const secilenKalem = form.isKalemiId ? isKalemiMap.get(form.isKalemiId) : undefined;
    const kalemAdi = secilenKalem?.ad ?? form.kalemAdi.trim();
    if (!kalemAdi) {
      alert('Lütfen iş kalemini seç veya serbest kalem adı yaz.');
      return;
    }
    // Taşeron adını çöz
    const taseronAdi = form.taseronId ? taseronMap.get(form.taseronId) : form.taseronAdi.trim() || undefined;

    const payload: Omit<Teklif, 'id'> = {
      isKalemiId: form.isKalemiId || undefined,
      kalemAdi,
      taseronId: form.taseronId || undefined,
      taseronAdi: form.taseronId ? undefined : taseronAdi, // taseronId varsa adı ondan alınır
      tutar,
      birimFiyat: form.birimFiyat ? Number(form.birimFiyat) : undefined,
      tarih: form.tarih || undefined,
      notlar: form.notlar.trim() || undefined,
      secildi: false,
    };

    if (duzenleId) {
      // Düzenlerken secildi durumunu koru (mevcut kaydı patch'le)
      teklifGuncelle(duzenleId, payload);
    } else {
      teklifEkle(payload);
    }
    setAcik(false);
  };

  const sil = (id: string) => {
    if (confirm('Bu teklif silinsin mi?')) teklifSil(id);
  };

  // Seçilen teklifi iş kalemi bütçesine işle
  const butceyeUygula = (t: Teklif) => {
    if (!t.isKalemiId) {
      alert('Bu teklif bir iş kalemine bağlı değil — önce iş kalemini seçili bir teklif olarak güncelle.');
      return;
    }
    isKalemiGuncelle(t.isKalemiId, {
      birimFiyat: t.birimFiyat,
      planlananButce: t.tutar,
    });
    alert('Teklif bütçeye uygulandı.');
  };

  // ---- Görünüm ----
  if (teklifler.length === 0) {
    return (
      <>
        <PageHeader
          baslik="Teklif Karşılaştırma"
          aciklama="Gelen teklifleri kıyasla, en uygunu seç"
          sag={<Button onClick={yeniAc}><Plus size={16} /> Yeni Teklif</Button>}
        />
        <Card>
          <EmptyState
            ikon={<GitCompareArrows size={28} />}
            baslik="Henüz teklif yok"
            aciklama="Bir iş kalemi için aldığın teklifleri buraya ekle. En düşük teklifi otomatik vurgularız."
            aksiyon={<Button onClick={yeniAc}><Plus size={16} /> İlk teklifi ekle</Button>}
          />
        </Card>
        <TeklifModal
          acik={acik} kapat={() => setAcik(false)} duzenleId={duzenleId}
          form={form} setForm={setForm} kaydet={kaydet}
          isKalemleri={isKalemleri} taseronlar={taseronlar}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        baslik="Teklif Karşılaştırma"
        aciklama={`${gruplar.length} iş kaleminde toplam ${teklifler.length} teklif`}
        sag={<Button onClick={yeniAc}><Plus size={16} /> Yeni Teklif</Button>}
      />

      <div className="space-y-5">
        {gruplar.map((grup, idx) => {
          const enUygun = enUygunTeklif(grup.teklifler);
          const secilen = grup.teklifler.find((t) => t.secildi);
          return (
            <Card key={idx}>
              <CardBody>
                {/* Grup başlığı */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4 pb-3 border-b border-cizgi">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-metin">{grup.baslik}</h3>
                    {grup.fazAdi && <p className="text-xs text-metin-yum mt-0.5">{grup.fazAdi}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone="gri">{grup.teklifler.length} teklif</Badge>
                    {secilen && <Badge tone="mavi">Seçildi: {tl(secilen.tutar)}</Badge>}
                  </div>
                </div>

                {/* Teklif listesi */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {grup.teklifler.map((t) => {
                    const isEnUygun = enUygun?.id === t.id;
                    const isSecili = t.secildi;
                    const taseronGoster = t.taseronId ? taseronMap.get(t.taseronId) : t.taseronAdi;
                    return (
                      <div
                        key={t.id}
                        className={
                          'rounded-xl border p-4 flex flex-col gap-2 transition ' +
                          (isSecili
                            ? 'border-blue-400 bg-blue-50/40 ring-2 ring-blue-100'
                            : isEnUygun
                              ? 'border-emerald-300 bg-emerald-50/40'
                              : 'border-cizgi bg-white')
                        }
                      >
                        {/* Rozetler */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isEnUygun && (
                            <Badge tone="yesil">
                              <Trophy size={11} className="inline mr-1" /> En Uygun
                            </Badge>
                          )}
                          {isSecili && (
                            <Badge tone="mavi">
                              <CheckCircle2 size={11} className="inline mr-1" /> Seçildi
                            </Badge>
                          )}
                        </div>

                        {/* Tutar (vurgulu) */}
                        <div className="text-xl font-bold text-metin">{tl(t.tutar)}</div>
                        {t.birimFiyat !== undefined && t.birimFiyat > 0 && (
                          <div className="text-xs text-metin-yum">Birim: {tl(t.birimFiyat)}</div>
                        )}

                        {/* Bilgiler */}
                        <div className="space-y-1 text-sm">
                          {taseronGoster && (
                            <p className="flex items-center gap-1.5 text-metin">
                              <User size={13} className="text-metin-yum" /> {taseronGoster}
                            </p>
                          )}
                          {t.tarih && (
                            <p className="flex items-center gap-1.5 text-metin-yum text-xs">
                              <Calendar size={12} /> {tarih(t.tarih)}
                            </p>
                          )}
                          {t.notlar && (
                            <p className="flex items-start gap-1.5 text-metin-yum text-xs">
                              <FileText size={12} className="mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{t.notlar}</span>
                            </p>
                          )}
                        </div>

                        {/* Aksiyonlar */}
                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-cizgi/60 flex-wrap">
                          {!isSecili ? (
                            <Button size="sm" variant="soft" onClick={() => teklifSec(t.id)}>
                              Seç
                            </Button>
                          ) : (
                            t.isKalemiId && (
                              <Button size="sm" variant="primary" onClick={() => butceyeUygula(t)}>
                                <Wallet size={14} /> Bütçeye Uygula
                              </Button>
                            )
                          )}
                          <Button size="sm" variant="ghost" onClick={() => duzenleAc(t)} title="Düzenle">
                            <Pencil size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => sil(t.id)} title="Sil" className="text-red-500 hover:bg-red-50">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <TeklifModal
        acik={acik} kapat={() => setAcik(false)} duzenleId={duzenleId}
        form={form} setForm={setForm} kaydet={kaydet}
        isKalemleri={isKalemleri} taseronlar={taseronlar}
      />
    </>
  );
}

// ============================================================================
// Yeni/Düzenle modal bileşeni — formu ana sayfadan ayırıp okunur tutar
// ============================================================================
interface TeklifModalProps {
  acik: boolean;
  kapat: () => void;
  duzenleId: string | null;
  form: FormVeri;
  setForm: (f: FormVeri) => void;
  kaydet: () => void;
  isKalemleri: { id: string; ad: string }[];
  taseronlar: { id: string; ad: string }[];
}

function TeklifModal({ acik, kapat, duzenleId, form, setForm, kaydet, isKalemleri, taseronlar }: TeklifModalProps) {
  const upd = (patch: Partial<FormVeri>) => setForm({ ...form, ...patch });
  return (
    <Modal acik={acik} kapat={kapat} baslik={duzenleId ? 'Teklifi Düzenle' : 'Yeni Teklif'} genis>
      <div className="grid sm:grid-cols-2 gap-4">
        {/* İş kalemi seçimi */}
        <Field label="İş Kalemi" hint="Listeden seç veya boş bırakıp aşağıya serbest yaz">
          <Select
            value={form.isKalemiId}
            onChange={(e) => upd({ isKalemiId: e.target.value })}
          >
            <option value="">— Serbest kalem (aşağıya yaz) —</option>
            {isKalemleri.map((k) => (
              <option key={k.id} value={k.id}>{k.ad}</option>
            ))}
          </Select>
        </Field>

        <Field label="Serbest Kalem Adı" hint="İş kalemi listeden seçilmediyse zorunlu">
          <Input
            type="text"
            value={form.kalemAdi}
            onChange={(e) => upd({ kalemAdi: e.target.value })}
            placeholder="Örn: Bahçe çiti yapımı"
            disabled={!!form.isKalemiId}
          />
        </Field>

        {/* Taşeron */}
        <Field label="Taşeron" hint="Kayıtlı taşeron seç ya da serbest gir">
          <Select
            value={form.taseronId}
            onChange={(e) => upd({ taseronId: e.target.value })}
          >
            <option value="">— Serbest (aşağıya yaz) —</option>
            {taseronlar.map((t) => (
              <option key={t.id} value={t.id}>{t.ad}</option>
            ))}
          </Select>
        </Field>

        <Field label="Serbest Taşeron Adı">
          <Input
            type="text"
            value={form.taseronAdi}
            onChange={(e) => upd({ taseronAdi: e.target.value })}
            placeholder="Örn: Mehmet Usta"
            disabled={!!form.taseronId}
          />
        </Field>

        {/* Tutar ve birim fiyat */}
        <Field label="Toplam Tutar (TL)">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.tutar}
            onChange={(e) => upd({ tutar: e.target.value })}
            placeholder="0"
          />
        </Field>

        <Field label="Birim Fiyat (TL)" hint="Opsiyonel">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.birimFiyat}
            onChange={(e) => upd({ birimFiyat: e.target.value })}
            placeholder="0"
          />
        </Field>

        <Field label="Teklif Tarihi">
          <Input
            type="date"
            value={form.tarih}
            onChange={(e) => upd({ tarih: e.target.value })}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Notlar">
            <Textarea
              value={form.notlar}
              onChange={(e) => upd({ notlar: e.target.value })}
              placeholder="KDV dahil/hariç, malzeme dahil mi vb."
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-cizgi">
        <Button variant="ghost" onClick={kapat}>Vazgeç</Button>
        <Button onClick={kaydet}>{duzenleId ? 'Güncelle' : 'Kaydet'}</Button>
      </div>
    </Modal>
  );
}
