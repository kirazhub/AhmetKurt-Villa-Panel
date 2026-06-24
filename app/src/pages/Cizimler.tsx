import { useEffect, useMemo, useState } from 'react';
import {
  FileText, Image as ImageIcon, FileSpreadsheet, PenTool, FileQuestion,
  Download, Eye, Link2, Search, FolderOpen, RefreshCw,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  PageHeader, Card, CardBody, Button, Badge, EmptyState, Field, Input, Select, Modal, TableWrap,
} from '../components/ui';
import { sayi } from '../lib/format';
import CizimGoruntuleyici from '../components/CizimGoruntuleyici';
import {
  BELGE_KATEGORI_ETIKET,
  type BelgelerManifest, type ManifestDosya, type BelgeKategori, type DosyaTur,
} from '../types';

// ============================================================================
// TEKNİK ÇİZİMLER / BELGELER — Diskteki proje-dosyalari klasörünü (belgeler.json)
// okur; PDF/DXF/DWG/resim/ofis dosyalarını listeler, önizler, faza/iş kalemine bağlar.
// ============================================================================

const MANIFEST_YOL = `${import.meta.env.BASE_URL}proje-dosyalari/belgeler.json`;

const TUR_ETIKET: Record<DosyaTur, string> = {
  pdf: 'PDF', dwg: 'DWG (AutoCAD)', dxf: 'DXF (Çizim)', resim: 'Resim', ofis: 'Excel/Word', diger: 'Diğer',
};

function turIkon(tur: DosyaTur) {
  const s = 18;
  if (tur === 'pdf') return <FileText size={s} className="text-red-500" />;
  if (tur === 'resim') return <ImageIcon size={s} className="text-blue-500" />;
  if (tur === 'ofis') return <FileSpreadsheet size={s} className="text-emerald-600" />;
  if (tur === 'dxf' || tur === 'dwg') return <PenTool size={s} className="text-marka-600" />;
  return <FileQuestion size={s} className="text-slate-400" />;
}

const KATEGORI_TON: Record<BelgeKategori, 'gri' | 'amber' | 'yesil' | 'mavi' | 'kirmizi'> = {
  mimari: 'amber', statik: 'kirmizi', elektrik: 'mavi', mekanik: 'yesil',
  metraj: 'amber', ruhsat: 'gri', foto: 'mavi', diger: 'gri',
};

export default function Cizimler() {
  const fazlar = useStore((s) => s.fazlar);
  const isKalemleri = useStore((s) => s.isKalemleri);
  const belgeBaglari = useStore((s) => s.belgeBaglari);
  const belgeBagla = useStore((s) => s.belgeBagla);

  const [durum, setDurum] = useState<'yukleniyor' | 'bos' | 'dolu'>('yukleniyor');
  const [dosyalar, setDosyalar] = useState<ManifestDosya[]>([]);
  const [arama, setArama] = useState('');
  const [fKategori, setFKategori] = useState<string>('hepsi');
  const [fTur, setFTur] = useState<string>('hepsi');
  const [fFaz, setFFaz] = useState<string>('hepsi');

  const [onizle, setOnizle] = useState<ManifestDosya | null>(null);
  const [bagla, setBagla] = useState<ManifestDosya | null>(null);

  const manifestiYukle = () => {
    setDurum('yukleniyor');
    fetch(MANIFEST_YOL, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((m: BelgelerManifest) => {
        const liste = Array.isArray(m?.dosyalar) ? m.dosyalar : [];
        setDosyalar(liste);
        setDurum(liste.length ? 'dolu' : 'bos');
      })
      .catch(() => { setDosyalar([]); setDurum('bos'); });
  };

  useEffect(manifestiYukle, []);

  const suzulmus = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr');
    return dosyalar.filter((d) => {
      if (fKategori !== 'hepsi' && d.kategori !== fKategori) return false;
      if (fTur !== 'hepsi' && d.tur !== fTur) return false;
      if (fFaz !== 'hepsi' && (belgeBaglari[d.id]?.fazId ?? d.fazId) !== fFaz) return false;
      if (q && !d.ad.toLocaleLowerCase('tr').includes(q) && !d.dosyaAdi.toLocaleLowerCase('tr').includes(q)) return false;
      return true;
    });
  }, [dosyalar, arama, fKategori, fTur, fFaz, belgeBaglari]);

  const fazAdi = (id?: string) => fazlar.find((f) => f.id === id)?.ad;

  if (durum === 'yukleniyor') {
    return <><PageHeader baslik="Teknik Çizimler" aciklama="Yükleniyor…" /></>;
  }

  if (durum === 'bos') {
    return (
      <>
        <PageHeader baslik="Teknik Çizimler" aciklama="Mimari, statik, elektrik, mekanik projeler ve metraj dosyaları" />
        <Card>
          <CardBody>
            <EmptyState
              ikon={<FolderOpen size={28} />}
              baslik="Henüz çizim/dosya yok"
              aciklama="Dosyaları app/public/proje-dosyalari/00-gelen-kutusu klasörüne atın, sonra terminalde `npm run dosyalar` çalıştırın (veya OpenCode'a 'dosyaları hazırla' deyin). Liste otomatik dolar."
              aksiyon={<Button variant="soft" size="sm" onClick={manifestiYukle}><RefreshCw size={16} /> Yenile</Button>}
            />
          </CardBody>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        baslik="Teknik Çizimler"
        aciklama={`${dosyalar.length} dosya · ${suzulmus.length} gösteriliyor`}
        sag={<Button variant="soft" size="sm" onClick={manifestiYukle}><RefreshCw size={16} /> Yenile</Button>}
      />

      {/* Filtreler */}
      <Card className="mb-5">
        <CardBody className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Ara">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-metin-yum" />
              <Input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Dosya adı…" className="pl-9" />
            </div>
          </Field>
          <Field label="Kategori">
            <Select value={fKategori} onChange={(e) => setFKategori(e.target.value)}>
              <option value="hepsi">Hepsi</option>
              {(Object.keys(BELGE_KATEGORI_ETIKET) as BelgeKategori[]).map((k) => (
                <option key={k} value={k}>{BELGE_KATEGORI_ETIKET[k]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tür">
            <Select value={fTur} onChange={(e) => setFTur(e.target.value)}>
              <option value="hepsi">Hepsi</option>
              {(Object.keys(TUR_ETIKET) as DosyaTur[]).map((t) => (
                <option key={t} value={t}>{TUR_ETIKET[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Faz">
            <Select value={fFaz} onChange={(e) => setFFaz(e.target.value)}>
              <option value="hepsi">Hepsi</option>
              {fazlar.map((f) => <option key={f.id} value={f.id}>{f.no}. {f.ad}</option>)}
            </Select>
          </Field>
        </CardBody>
      </Card>

      {/* Liste */}
      <Card>
        <CardBody className="p-0 sm:p-0">
          <TableWrap>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-metin-yum border-b border-cizgi">
                  <th className="py-3 px-4 font-medium">Dosya</th>
                  <th className="py-3 px-4 font-medium">Kategori</th>
                  <th className="py-3 px-4 font-medium">Tür</th>
                  <th className="py-3 px-4 font-medium">Boyut</th>
                  <th className="py-3 px-4 font-medium">Bağlı Faz</th>
                  <th className="py-3 px-4 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {suzulmus.map((d) => {
                  const baglFaz = belgeBaglari[d.id]?.fazId ?? d.fazId;
                  return (
                    <tr key={d.id} className="border-b border-cizgi/60 hover:bg-zemin/60">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {turIkon(d.tur)}
                          <div className="min-w-0">
                            <p className="font-medium text-metin truncate max-w-[260px]">{d.ad}</p>
                            <p className="text-xs text-metin-yum truncate max-w-[260px]">{d.dosyaAdi}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4"><Badge tone={KATEGORI_TON[d.kategori]}>{BELGE_KATEGORI_ETIKET[d.kategori]}</Badge></td>
                      <td className="py-3 px-4 text-metin-yum">{TUR_ETIKET[d.tur]}</td>
                      <td className="py-3 px-4 text-metin-yum">{d.boyut ? `${sayi(d.boyut / 1024)} KB` : '—'}</td>
                      <td className="py-3 px-4 text-metin-yum">{fazAdi(baglFaz) ?? '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setOnizle(d)}><Eye size={15} /> Önizle</Button>
                          <a href={d.yol} download><Button variant="ghost" size="sm"><Download size={15} /></Button></a>
                          <Button variant="ghost" size="sm" onClick={() => setBagla(d)}><Link2 size={15} /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {suzulmus.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-metin-yum">Filtreye uyan dosya yok.</td></tr>
                )}
              </tbody>
            </table>
          </TableWrap>
        </CardBody>
      </Card>

      {/* Önizleme */}
      <Modal acik={!!onizle} kapat={() => setOnizle(null)} baslik={onizle?.ad ?? 'Önizleme'} genis>
        {onizle && <OnizlemeIcerik d={onizle} />}
      </Modal>

      {/* Bağlama */}
      <Modal acik={!!bagla} kapat={() => setBagla(null)} baslik="Faz / İş kalemine bağla">
        {bagla && (
          <BaglaForm
            d={bagla}
            fazlar={fazlar}
            isKalemleri={isKalemleri}
            mevcut={belgeBaglari[bagla.id]}
            kaydet={(patch) => { belgeBagla(bagla.id, patch); setBagla(null); }}
          />
        )}
      </Modal>
    </>
  );
}

// --- Önizleme içeriği (türe göre) ---
function OnizlemeIcerik({ d }: { d: ManifestDosya }) {
  if (d.tur === 'pdf') {
    return <iframe src={d.yol} title={d.ad} className="w-full h-[70vh] rounded-xl border border-cizgi" />;
  }
  if (d.tur === 'resim') {
    return <img src={d.yol} alt={d.ad} className="max-h-[70vh] mx-auto rounded-xl" />;
  }
  if (d.tur === 'dxf') {
    return <CizimGoruntuleyici yol={d.yol} />;
  }
  if (d.tur === 'dwg') {
    if (d.dxfYol) return <CizimGoruntuleyici yol={d.dxfYol} />;
    return (
      <div className="text-center py-10">
        <p className="text-metin">Bu DWG henüz DXF'e çevrilmedi, bu yüzden önizlenemiyor.</p>
        <p className="text-sm text-metin-yum mt-1">ODA çeviriciyi kurup `npm run dosyalar` çalıştırın; ya da dosyayı indirip AutoCAD'de açın.</p>
        <a href={d.yol} download className="inline-block mt-4"><Button variant="soft" size="sm"><Download size={16} /> DWG'yi indir</Button></a>
      </div>
    );
  }
  return (
    <div className="text-center py-10">
      <p className="text-metin">Bu dosya türü panelde önizlenemiyor.</p>
      <a href={d.yol} download className="inline-block mt-4"><Button variant="soft" size="sm"><Download size={16} /> İndir</Button></a>
    </div>
  );
}

// --- Bağlama formu ---
function BaglaForm({
  d, fazlar, isKalemleri, mevcut, kaydet,
}: {
  d: ManifestDosya;
  fazlar: ReturnType<typeof useStore.getState>['fazlar'];
  isKalemleri: ReturnType<typeof useStore.getState>['isKalemleri'];
  mevcut?: { fazId?: string; isKalemiId?: string };
  kaydet: (patch: { fazId?: string; isKalemiId?: string }) => void;
}) {
  const [fazId, setFazId] = useState(mevcut?.fazId ?? d.fazId ?? '');
  const [isKalemiId, setIsKalemiId] = useState(mevcut?.isKalemiId ?? d.isKalemiId ?? '');
  const kalemler = isKalemleri.filter((k) => !fazId || k.fazId === fazId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-metin-yum"><span className="font-medium text-metin">{d.ad}</span> dosyasını bir faza ve iş kalemine bağla.</p>
      <Field label="Faz">
        <Select value={fazId} onChange={(e) => { setFazId(e.target.value); setIsKalemiId(''); }}>
          <option value="">— Seçilmedi —</option>
          {fazlar.map((f) => <option key={f.id} value={f.id}>{f.no}. {f.ad}</option>)}
        </Select>
      </Field>
      <Field label="İş Kalemi (opsiyonel)">
        <Select value={isKalemiId} onChange={(e) => setIsKalemiId(e.target.value)} disabled={!fazId}>
          <option value="">— Seçilmedi —</option>
          {kalemler.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
        </Select>
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="primary" onClick={() => kaydet({ fazId: fazId || undefined, isKalemiId: isKalemiId || undefined })}>Kaydet</Button>
      </div>
    </div>
  );
}
