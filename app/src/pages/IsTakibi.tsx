import { useMemo, useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, ListChecks } from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  PageHeader, Card, CardBody, Button, Badge, DurumBadge, ProgressBar,
  EmptyState, Field, Input, Select, Textarea, Modal, TableWrap,
} from '../components/ui';
import type { IsKalemi, Durum, Birim } from '../types';
import { DURUM_ETIKET, BIRIM_ETIKET } from '../types';
import { tl } from '../lib/format';
import { kalemPlanlanan, fazOzet } from '../lib/calc';

// ============================================================================
// İŞ TAKİBİ — Panelin kalbi. İş kalemlerini faz bazında gruplar, filtreler,
// ekle/düzenle/sil modalı ile yönetir.
// ============================================================================

// Modal formunun tuttuğu taslak veri. id yok çünkü ekle/düzenle ortak.
interface Taslak {
  ad: string;
  fazId: string;
  birim: Birim;
  metraj: string;          // input string, kaydederken number'a çevir
  birimFiyat: string;
  planlananButce: string;
  durum: Durum;
  ilerleme: number;
  taseronId: string;       // "" = atanmamış
  baslangic: string;
  bitis: string;
  notlar: string;
}

// Boş taslak — "Yeni İş Kalemi" butonuna basınca bu açılır
function bosTaslak(fazId: string): Taslak {
  return {
    ad: '', fazId, birim: 'gtr', metraj: '', birimFiyat: '', planlananButce: '',
    durum: 'baslamadi', ilerleme: 0, taseronId: '',
    baslangic: '', bitis: '', notlar: '',
  };
}

// Mevcut iş kalemini taslağa çevir (düzenleme için)
function kalemdenTaslak(k: IsKalemi): Taslak {
  return {
    ad: k.ad,
    fazId: k.fazId,
    birim: k.birim,
    metraj: k.metraj?.toString() ?? '',
    birimFiyat: k.birimFiyat?.toString() ?? '',
    planlananButce: k.planlananButce?.toString() ?? '',
    durum: k.durum,
    ilerleme: k.ilerleme ?? 0,
    taseronId: k.taseronId ?? '',
    baslangic: k.baslangic ?? '',
    bitis: k.bitis ?? '',
    notlar: k.notlar ?? '',
  };
}

// Taslağı kaydedilebilir IsKalemi'ne çevir (boş string -> undefined, sayıya çevir)
function taslaktanKalem(t: Taslak): Omit<IsKalemi, 'id'> {
  const sayiyaCevir = (s: string): number | undefined => {
    if (!s.trim()) return undefined;
    const n = parseFloat(s.replace(',', '.'));
    return isNaN(n) ? undefined : n;
  };
  return {
    ad: t.ad.trim(),
    fazId: t.fazId,
    birim: t.birim,
    metraj: sayiyaCevir(t.metraj),
    birimFiyat: sayiyaCevir(t.birimFiyat),
    planlananButce: sayiyaCevir(t.planlananButce),
    durum: t.durum,
    ilerleme: Math.max(0, Math.min(100, Number(t.ilerleme) || 0)),
    taseronId: t.taseronId || undefined,
    baslangic: t.baslangic || undefined,
    bitis: t.bitis || undefined,
    notlar: t.notlar.trim() || undefined,
  };
}

export default function IsTakibi() {
  const fazlar = useStore((s) => s.fazlar);
  const isKalemleri = useStore((s) => s.isKalemleri);
  const taseronlar = useStore((s) => s.taseronlar);
  const isKalemiEkle = useStore((s) => s.isKalemiEkle);
  const isKalemiGuncelle = useStore((s) => s.isKalemiGuncelle);
  const isKalemiSil = useStore((s) => s.isKalemiSil);

  // Filtre durumu
  const [fazFiltre, setFazFiltre] = useState<string>('');     // "" = hepsi
  const [durumFiltre, setDurumFiltre] = useState<string>(''); // "" = hepsi
  const [arama, setArama] = useState<string>('');

  // Modal durumu
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenlenenId, setDuzenlenenId] = useState<string | null>(null);
  const [taslak, setTaslak] = useState<Taslak>(() => bosTaslak(fazlar[0]?.id ?? ''));

  // Taşeron id -> ad eşleme (hızlı arama için)
  const taseronAdi = useMemo(() => {
    const m = new Map<string, string>();
    taseronlar.forEach((t) => m.set(t.id, t.ad));
    return m;
  }, [taseronlar]);


  // Filtre uygulanmış iş kalemleri
  const filtreliKalemler = useMemo(() => {
    const aramaKucuk = arama.trim().toLocaleLowerCase('tr');
    return isKalemleri.filter((k) => {
      if (fazFiltre && k.fazId !== fazFiltre) return false;
      if (durumFiltre && k.durum !== durumFiltre) return false;
      if (aramaKucuk && !k.ad.toLocaleLowerCase('tr').includes(aramaKucuk)) return false;
      return true;
    });
  }, [isKalemleri, fazFiltre, durumFiltre, arama]);

  // Faz id -> o faza ait filtreli kalemler
  const fazaGoreGruplu = useMemo(() => {
    const m = new Map<string, IsKalemi[]>();
    fazlar.forEach((f) => m.set(f.id, []));
    filtreliKalemler.forEach((k) => {
      const liste = m.get(k.fazId);
      if (liste) liste.push(k);
      else m.set(k.fazId, [k]); // fazId eşleşmiyorsa yine de göster
    });
    // sıralama: faz no'ya göre
    return fazlar
      .map((f) => ({ faz: f, kalemler: m.get(f.id) ?? [] }))
      .filter((g) => g.kalemler.length > 0);
  }, [fazlar, filtreliKalemler]);

  // ilerleme 100 olunca durumu otomatik 'tamamlandi' olarak öner
  useEffect(() => {
    if (taslak.ilerleme === 100 && taslak.durum !== 'tamamlandi') {
      setTaslak((t) => ({ ...t, durum: 'tamamlandi' }));
    }
  }, [taslak.ilerleme]); // eslint-disable-line react-hooks/exhaustive-deps

  // Modal açma fonksiyonları
  const yeniAc = () => {
    setDuzenlenenId(null);
    setTaslak(bosTaslak(fazFiltre || fazlar[0]?.id || ''));
    setModalAcik(true);
  };
  const duzenleAc = (k: IsKalemi) => {
    setDuzenlenenId(k.id);
    setTaslak(kalemdenTaslak(k));
    setModalAcik(true);
  };
  const kapat = () => setModalAcik(false);

  // Kaydet — yeni ekleme veya güncelleme
  const kaydet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taslak.ad.trim()) {
      alert('İş kalemi adı zorunludur.');
      return;
    }
    if (!taslak.fazId) {
      alert('Faz seçmelisin.');
      return;
    }
    const veri = taslaktanKalem(taslak);
    if (duzenlenenId) {
      isKalemiGuncelle(duzenlenenId, veri);
    } else {
      isKalemiEkle(veri);
    }
    setModalAcik(false);
  };

  // Sil — onayla
  const sil = (k: IsKalemi) => {
    if (confirm(`"${k.ad}" silinsin mi? Bu işlem geri alınamaz.`)) {
      isKalemiSil(k.id);
    }
  };

  const toplamKalem = isKalemleri.length;
  const filtreAktif = !!(fazFiltre || durumFiltre || arama.trim());

  return (
    <>
      <PageHeader
        baslik="İş Takibi"
        aciklama={`${toplamKalem} iş kalemi · ${filtreliKalemler.length} gösteriliyor`}
        sag={
          <Button onClick={yeniAc} size="sm">
            <Plus size={16} /> Yeni İş Kalemi
          </Button>
        }
      />

      {/* Filtre çubuğu */}
      <Card className="mb-6">
        <CardBody className="grid sm:grid-cols-3 gap-3">
          <Field label="Faz">
            <Select value={fazFiltre} onChange={(e) => setFazFiltre(e.target.value)}>
              <option value="">Tüm fazlar</option>
              {fazlar.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.no}. {f.ad}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Durum">
            <Select value={durumFiltre} onChange={(e) => setDurumFiltre(e.target.value)}>
              <option value="">Tüm durumlar</option>
              {Object.entries(DURUM_ETIKET).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="Ad ara">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-metin-yum" />
              <Input
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                placeholder="İş kalemi adında ara..."
                className="pl-9"
              />
            </div>
          </Field>
        </CardBody>
      </Card>

      {/* İçerik */}
      {isKalemleri.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              ikon={<ListChecks size={28} />}
              baslik="Henüz iş kalemi yok"
              aciklama="İlk iş kalemini ekleyerek başla. Faz, birim, planlanan bütçe ve sorumlu taşeronu kaydet."
              aksiyon={<Button onClick={yeniAc}><Plus size={16} /> Yeni İş Kalemi</Button>}
            />
          </CardBody>
        </Card>
      ) : fazaGoreGruplu.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              ikon={<Search size={28} />}
              baslik="Filtreyle eşleşen kalem yok"
              aciklama={filtreAktif ? 'Filtreleri temizleyip tekrar dene.' : ''}
              aksiyon={
                filtreAktif ? (
                  <Button variant="soft" onClick={() => { setFazFiltre(''); setDurumFiltre(''); setArama(''); }}>
                    Filtreleri Temizle
                  </Button>
                ) : undefined
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-5">
          {fazaGoreGruplu.map(({ faz, kalemler }) => {
            const ozet = fazOzet(kalemler);
            return (
              <Card key={faz.id}>
                <CardBody>
                  {/* Faz başlığı + özet */}
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-metin">
                        <span className="text-metin-yum mr-2">{faz.no}.</span>
                        {faz.ad}
                      </h2>
                      {faz.aciklama && (
                        <p className="text-xs text-metin-yum mt-0.5">{faz.aciklama}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge tone="gri">
                        {ozet.tamamlanan}/{ozet.toplam} tamam
                      </Badge>
                      <div className="w-28">
                        <ProgressBar value={ozet.ilerleme} />
                      </div>
                      <span className="text-xs font-medium text-metin-yum w-10 text-right">
                        %{Math.round(ozet.ilerleme)}
                      </span>
                    </div>
                  </div>

                  {/* Kalem tablosu */}
                  <TableWrap>
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium text-metin-yum border-b border-cizgi">
                          <th className="py-2 pr-3 font-medium">İş Kalemi</th>
                          <th className="py-2 px-3 font-medium">Durum</th>
                          <th className="py-2 px-3 font-medium w-48">İlerleme</th>
                          <th className="py-2 px-3 font-medium text-right">Planlanan</th>
                          <th className="py-2 px-3 font-medium">Taşeron</th>
                          <th className="py-2 pl-3 font-medium w-20 text-right">İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kalemler.map((k) => (
                          <tr
                            key={k.id}
                            className="border-b border-cizgi last:border-0 hover:bg-zemin/60 cursor-pointer"
                            onClick={() => duzenleAc(k)}
                          >
                            <td className="py-3 pr-3 align-top">
                              <div className="font-medium text-metin">{k.ad}</div>
                              {k.metraj !== undefined && (
                                <div className="text-xs text-metin-yum mt-0.5">
                                  {k.metraj} {BIRIM_ETIKET[k.birim]}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 align-top">
                              <DurumBadge durum={k.durum} />
                            </td>
                            <td className="py-3 px-3 align-top">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-[80px]">
                                  <ProgressBar value={k.ilerleme} />
                                </div>
                                <span className="text-xs font-medium text-metin-yum w-9 text-right">
                                  %{k.ilerleme}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 align-top text-right font-medium text-metin">
                              {tl(kalemPlanlanan(k))}
                            </td>
                            <td className="py-3 px-3 align-top text-metin-yum">
                              {k.taseronId ? (taseronAdi.get(k.taseronId) ?? '—') : '—'}
                            </td>
                            <td className="py-3 pl-3 align-top text-right">
                              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => duzenleAc(k)}
                                  aria-label="Düzenle"
                                >
                                  <Pencil size={15} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => sil(k)}
                                  aria-label="Sil"
                                  className="text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 size={15} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableWrap>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Ekle/Düzenle Modalı */}
      <Modal
        acik={modalAcik}
        kapat={kapat}
        baslik={duzenlenenId ? 'İş Kalemini Düzenle' : 'Yeni İş Kalemi'}
        genis
      >
        <form onSubmit={kaydet} className="space-y-4">
          <Field label="İş Kalemi Adı *">
            <Input
              value={taslak.ad}
              onChange={(e) => setTaslak({ ...taslak, ad: e.target.value })}
              placeholder="Örn: Radye temel betonu"
              autoFocus
              required
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Faz *">
              <Select
                value={taslak.fazId}
                onChange={(e) => setTaslak({ ...taslak, fazId: e.target.value })}
                required
              >
                {fazlar.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.no}. {f.ad}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Birim">
              <Select
                value={taslak.birim}
                onChange={(e) => setTaslak({ ...taslak, birim: e.target.value as Birim })}
              >
                {Object.entries(BIRIM_ETIKET).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Metraj">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={taslak.metraj}
                onChange={(e) => setTaslak({ ...taslak, metraj: e.target.value })}
                placeholder="0"
              />
            </Field>
            <Field label="Birim Fiyat (TL)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={taslak.birimFiyat}
                onChange={(e) => setTaslak({ ...taslak, birimFiyat: e.target.value })}
                placeholder="0"
              />
            </Field>
            <Field label="Planlanan Bütçe (TL)" hint="Boş bırakırsan metraj × birim fiyat">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={taslak.planlananButce}
                onChange={(e) => setTaslak({ ...taslak, planlananButce: e.target.value })}
                placeholder="otomatik"
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Durum">
              <Select
                value={taslak.durum}
                onChange={(e) => setTaslak({ ...taslak, durum: e.target.value as Durum })}
              >
                {Object.entries(DURUM_ETIKET).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label={`İlerleme: %${taslak.ilerleme}`}>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={taslak.ilerleme}
                onChange={(e) => setTaslak({ ...taslak, ilerleme: Number(e.target.value) })}
                className="w-full accent-marka-500 cursor-pointer"
              />
            </Field>
          </div>

          <Field label="Sorumlu Taşeron">
            <Select
              value={taslak.taseronId}
              onChange={(e) => setTaslak({ ...taslak, taseronId: e.target.value })}
            >
              <option value="">— Atanmadı —</option>
              {taseronlar.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ad}{t.firma ? ` · ${t.firma}` : ''}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Başlangıç">
              <Input
                type="date"
                value={taslak.baslangic}
                onChange={(e) => setTaslak({ ...taslak, baslangic: e.target.value })}
              />
            </Field>
            <Field label="Bitiş">
              <Input
                type="date"
                value={taslak.bitis}
                onChange={(e) => setTaslak({ ...taslak, bitis: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Notlar">
            <Textarea
              value={taslak.notlar}
              onChange={(e) => setTaslak({ ...taslak, notlar: e.target.value })}
              placeholder="Sözleşme, malzeme, uyarılar..."
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-cizgi">
            <div>
              {duzenlenenId && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    const k = isKalemleri.find((x) => x.id === duzenlenenId);
                    if (k) {
                      sil(k);
                      setModalAcik(false);
                    }
                  }}
                >
                  <Trash2 size={15} /> Sil
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={kapat}>Vazgeç</Button>
              <Button type="submit">{duzenlenenId ? 'Güncelle' : 'Ekle'}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
