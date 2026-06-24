import { useMemo, useState } from 'react';
import { Receipt, Plus, Pencil, Trash2, Wallet, Users } from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  PageHeader, Card, CardBody, Button, Badge, EmptyState,
  Field, Input, Select, Modal, Stat, TableWrap, ProgressBar,
} from '../components/ui';
import type { Odeme } from '../types';
import { tl, tarih, bugun } from '../lib/format';
import { taseronOdemeToplam, kalemPlanlanan } from '../lib/calc';

// ============================================================================
// HAKEDİŞ & ÖDEME
// Taşeronlara yapılan ödemelerin (avans / hakediş / kesin) listesi, CRUD ve
// taşeron bazında planlanan/ödenen karşılaştırması.
// ============================================================================

// Form için kullanılan tip (id hariç Odeme alanları)
type OdemeForm = Omit<Odeme, 'id'>;

// Boş form başlangıç değeri
const BOS_FORM: OdemeForm = {
  taseronId: '',
  taseronAdi: '',
  isKalemiId: '',
  aciklama: '',
  tutar: 0,
  tarih: bugun(),
  tur: 'hakedis',
};

// Ödeme türü → rozet rengi
const TUR_TONE: Record<Odeme['tur'], 'amber' | 'mavi' | 'yesil'> = {
  avans: 'amber',
  hakedis: 'mavi',
  kesin: 'yesil',
};

// Ödeme türü → görünen ad
const TUR_ETIKET: Record<Odeme['tur'], string> = {
  avans: 'Avans',
  hakedis: 'Hakediş',
  kesin: 'Kesin',
};

export default function Odemeler() {
  const odemeler = useStore((s) => s.odemeler);
  const taseronlar = useStore((s) => s.taseronlar);
  const isKalemleri = useStore((s) => s.isKalemleri);
  const odemeEkle = useStore((s) => s.odemeEkle);
  const odemeGuncelle = useStore((s) => s.odemeGuncelle);
  const odemeSil = useStore((s) => s.odemeSil);

  // Modal durumu — düzenleme modunda id var, ekleme modunda null
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenlenenId, setDuzenlenenId] = useState<string | null>(null);
  const [form, setForm] = useState<OdemeForm>(BOS_FORM);

  // Tarihe göre tersten sıralanmış liste (en yeni üstte)
  const siraliOdemeler = useMemo(() => {
    return [...odemeler].sort((a, b) => (a.tarih < b.tarih ? 1 : -1));
  }, [odemeler]);

  // Toplam ödenen ve tür kırılımları
  const toplamlar = useMemo(() => {
    const toplam = odemeler.reduce((t, o) => t + o.tutar, 0);
    const avans = odemeler.filter((o) => o.tur === 'avans').reduce((t, o) => t + o.tutar, 0);
    const hakedis = odemeler.filter((o) => o.tur === 'hakedis').reduce((t, o) => t + o.tutar, 0);
    const kesin = odemeler.filter((o) => o.tur === 'kesin').reduce((t, o) => t + o.tutar, 0);
    return { toplam, avans, hakedis, kesin };
  }, [odemeler]);

  // Taşeron id → ad eşlemesi (hızlı arama için)
  const taseronAdById = useMemo(() => {
    const m = new Map<string, string>();
    taseronlar.forEach((t) => m.set(t.id, t.ad));
    return m;
  }, [taseronlar]);

  // Bir ödemenin gösterilecek taşeron adını döner (önce id eşle, yoksa taseronAdi)
  function taseronAdGoster(o: Odeme): string {
    if (o.taseronId) {
      const ad = taseronAdById.get(o.taseronId);
      if (ad) return ad;
    }
    return o.taseronAdi || '—';
  }

  // İş kalemi id → ad eşlemesi
  const isKalemiAdById = useMemo(() => {
    const m = new Map<string, string>();
    isKalemleri.forEach((k) => m.set(k.id, k.ad));
    return m;
  }, [isKalemleri]);

  // Modal'ı yeni kayıt için aç
  function yeniAc() {
    setDuzenlenenId(null);
    setForm({ ...BOS_FORM, tarih: bugun() });
    setModalAcik(true);
  }

  // Modal'ı düzenleme için aç — form'u mevcut veriyle doldur
  function duzenleAc(o: Odeme) {
    setDuzenlenenId(o.id);
    setForm({
      taseronId: o.taseronId ?? '',
      taseronAdi: o.taseronAdi ?? '',
      isKalemiId: o.isKalemiId ?? '',
      aciklama: o.aciklama,
      tutar: o.tutar,
      tarih: o.tarih,
      tur: o.tur,
    });
    setModalAcik(true);
  }

  // Form gönderildiğinde — ekle veya güncelle
  function kaydet(e: React.FormEvent) {
    e.preventDefault();
    // Taşeron seçildiyse adını da kaydet (sonradan taşeron silinse bile görünür kalsın)
    const secilenTaseron = form.taseronId ? taseronlar.find((t) => t.id === form.taseronId) : undefined;
    const veri: OdemeForm = {
      ...form,
      // Boş id'leri undefined'a çevir (depo temiz kalsın)
      taseronId: form.taseronId || undefined,
      isKalemiId: form.isKalemiId || undefined,
      taseronAdi: secilenTaseron ? secilenTaseron.ad : (form.taseronAdi || undefined),
      tutar: Number(form.tutar) || 0,
    };
    if (duzenlenenId) {
      odemeGuncelle(duzenlenenId, veri);
    } else {
      odemeEkle(veri);
    }
    setModalAcik(false);
  }

  // Silme onayı
  function silOnay(o: Odeme) {
    if (confirm(`"${o.aciklama || 'Ödeme'}" silinsin mi?`)) {
      odemeSil(o.id);
    }
  }

  // Taşeron bazında özet kartları için veri hazırla
  const taseronOzetler = useMemo(() => {
    return taseronlar.map((t) => {
      const odenen = taseronOdemeToplam(odemeler, t.id);
      // O taşerona atanmış iş kalemlerinin toplam planlanan bütçesi
      const planlanan = isKalemleri
        .filter((k) => k.taseronId === t.id)
        .reduce((toplam, k) => toplam + kalemPlanlanan(k), 0);
      const oran = planlanan > 0 ? (odenen / planlanan) * 100 : 0;
      return { taseron: t, odenen, planlanan, oran };
    });
  }, [taseronlar, odemeler, isKalemleri]);

  return (
    <>
      <PageHeader
        baslik="Hakediş & Ödeme"
        aciklama="Taşerona ödenen, kalan ve ödeme planı"
        sag={
          <Button size="sm" onClick={yeniAc}><Plus size={16} /> Yeni Ödeme</Button>
        }
      />

      {/* Üstte toplam ödenen + tür kırılımları */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat
          baslik="Toplam Ödenen"
          deger={tl(toplamlar.toplam)}
          alt={`${odemeler.length} ödeme kaydı`}
          ikon={<Wallet size={20} />}
          tone="mavi"
        />
        <Stat baslik="Avans" deger={tl(toplamlar.avans)} tone="amber" />
        <Stat baslik="Hakediş" deger={tl(toplamlar.hakedis)} tone="mavi" />
        <Stat baslik="Kesin Ödeme" deger={tl(toplamlar.kesin)} tone="yesil" />
      </div>

      {/* Ödeme listesi */}
      <Card className="mb-6">
        <CardBody>
          <h2 className="font-semibold text-metin mb-4">Ödeme Kayıtları</h2>
          {siraliOdemeler.length === 0 ? (
            <EmptyState
              ikon={<Receipt size={28} />}
              baslik="Henüz ödeme kaydı yok"
              aciklama="Taşeronlara yapılan avans, hakediş veya kesin ödemeleri buradan kaydedin."
              aksiyon={<Button size="sm" onClick={yeniAc}><Plus size={16} /> İlk Ödemeyi Ekle</Button>}
            />
          ) : (
            <TableWrap>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-metin-yum border-b border-cizgi">
                    <th className="py-2.5 pr-4 font-medium whitespace-nowrap">Tarih</th>
                    <th className="py-2.5 pr-4 font-medium whitespace-nowrap">Taşeron</th>
                    <th className="py-2.5 pr-4 font-medium">Açıklama</th>
                    <th className="py-2.5 pr-4 font-medium whitespace-nowrap">Tür</th>
                    <th className="py-2.5 pr-4 font-medium text-right whitespace-nowrap">Tutar</th>
                    <th className="py-2.5 pr-0 font-medium text-right whitespace-nowrap">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {siraliOdemeler.map((o) => (
                    <tr key={o.id} className="border-b border-cizgi last:border-0 hover:bg-zemin/50">
                      <td className="py-3 pr-4 whitespace-nowrap text-metin-yum">{tarih(o.tarih)}</td>
                      <td className="py-3 pr-4 whitespace-nowrap font-medium text-metin">{taseronAdGoster(o)}</td>
                      <td className="py-3 pr-4 text-metin">
                        {o.aciklama || <span className="text-metin-yum">—</span>}
                        {o.isKalemiId && isKalemiAdById.get(o.isKalemiId) && (
                          <span className="block text-xs text-metin-yum mt-0.5">
                            {isKalemiAdById.get(o.isKalemiId)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <Badge tone={TUR_TONE[o.tur]}>{TUR_ETIKET[o.tur]}</Badge>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap text-right font-semibold text-metin">{tl(o.tutar)}</td>
                      <td className="py-3 pr-0 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => duzenleAc(o)} aria-label="Düzenle">
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => silOnay(o)} aria-label="Sil">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </CardBody>
      </Card>

      {/* Taşeron bazında özet */}
      {taseronOzetler.length > 0 && (
        <Card>
          <CardBody>
            <h2 className="font-semibold text-metin mb-1 flex items-center gap-2">
              <Users size={18} className="text-metin-yum" />
              Taşeron Bazında Özet
            </h2>
            <p className="text-sm text-metin-yum mb-4">Her taşerona ödenen tutar ve atanmış iş kalemlerinin planlanan bütçesi ile kıyas.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {taseronOzetler.map(({ taseron, odenen, planlanan, oran }) => (
                <div key={taseron.id} className="rounded-xl border border-cizgi p-4 bg-white">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-metin truncate">{taseron.ad}</p>
                      <p className="text-xs text-metin-yum truncate">{taseron.uzmanlik}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-metin-yum">Ödenen</span>
                      <span className="font-semibold text-metin">{tl(odenen)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-metin-yum">Planlanan</span>
                      <span className="text-metin">{planlanan > 0 ? tl(planlanan) : '—'}</span>
                    </div>
                    {planlanan > 0 && (
                      <div className="pt-1.5">
                        <ProgressBar
                          value={oran}
                          tone={oran > 100 ? 'amber' : oran >= 80 ? 'yesil' : 'mavi'}
                        />
                        <p className="text-xs text-metin-yum mt-1 text-right">
                          %{Math.round(oran)} ödendi
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Yeni / Düzenle Modal */}
      <Modal
        acik={modalAcik}
        kapat={() => setModalAcik(false)}
        baslik={duzenlenenId ? 'Ödemeyi Düzenle' : 'Yeni Ödeme'}
      >
        <form onSubmit={kaydet} className="space-y-4">
          <Field label="Taşeron">
            <Select
              value={form.taseronId ?? ''}
              onChange={(e) => setForm({ ...form, taseronId: e.target.value })}
            >
              <option value="">— Seçiniz —</option>
              {taseronlar.map((t) => (
                <option key={t.id} value={t.id}>{t.ad}{t.firma ? ` · ${t.firma}` : ''}</option>
              ))}
            </Select>
          </Field>

          <Field label="İş Kalemi (opsiyonel)">
            <Select
              value={form.isKalemiId ?? ''}
              onChange={(e) => setForm({ ...form, isKalemiId: e.target.value })}
            >
              <option value="">— Seçiniz —</option>
              {isKalemleri.map((k) => (
                <option key={k.id} value={k.id}>{k.ad}</option>
              ))}
            </Select>
          </Field>

          <Field label="Açıklama">
            <Input
              type="text"
              value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              placeholder="Örn: Temel betonu 1. hakediş"
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Tür">
              <Select
                value={form.tur}
                onChange={(e) => setForm({ ...form, tur: e.target.value as Odeme['tur'] })}
              >
                <option value="avans">Avans</option>
                <option value="hakedis">Hakediş</option>
                <option value="kesin">Kesin</option>
              </Select>
            </Field>

            <Field label="Tarih">
              <Input
                type="date"
                value={form.tarih}
                onChange={(e) => setForm({ ...form, tarih: e.target.value })}
                required
              />
            </Field>
          </div>

          <Field label="Tutar (TL)">
            <Input
              type="number"
              min="0"
              step="1"
              value={form.tutar}
              onChange={(e) => setForm({ ...form, tutar: Number(e.target.value) })}
              required
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalAcik(false)}>İptal</Button>
            <Button type="submit">{duzenlenenId ? 'Güncelle' : 'Kaydet'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
