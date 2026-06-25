import { useMemo, useState } from 'react';
import { Truck, Users, Package, Plus, Trash2, CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, Stat, Modal, Field, Input, Select, Textarea, TableWrap, EmptyState, Badge } from '../components/ui';
import { tl, sayi, tarih, bugun } from '../lib/format';
import { BIRIM_ETIKET, type Birim } from '../types';

const BIRIMLER: Birim[] = ['m2', 'm3', 'mtul', 'adet', 'ton', 'kg', 'set', 'gtr'];
const MALZEME_ONERI = ['İnşaat demiri', 'Hazır beton', 'Çimento', 'Tuğla', 'Kum', 'Çakıl', 'Kereste', 'Strafor (EPS)', 'Seramik', 'Mermer', 'Boya', 'Alçı', 'Doğal taş'];

export default function SahaKaydi() {
  const { sahaGunlukleri, sarfiyatlar, fazlar, sahaEkle, sahaSil, sarfiyatEkle, sarfiyatSil } = useStore();
  const [sahaModal, setSahaModal] = useState(false);
  const [malzemeModal, setMalzemeModal] = useState(false);

  const [sg, setSg] = useState({ tarih: bugun(), kamyon: '', isci: '', calismaSaati: '', hava: 'güneşli', fazId: '', notlar: '' });
  const [mz, setMz] = useState({ tarih: bugun(), malzeme: '', miktar: '', birim: 'ton' as Birim, birimFiyat: '', tedarikci: '', fazId: '', notlar: '' });

  const ozet = useMemo(() => {
    const kamyon = sahaGunlukleri.reduce((t, g) => t + (g.kamyon || 0), 0);
    const isciGun = sahaGunlukleri.reduce((t, g) => t + (g.isci || 0), 0);
    const sarfiyatTutar = sarfiyatlar.reduce((t, s) => t + (s.tutar || 0), 0);
    return { kamyon, isciGun, sarfiyatTutar, gun: sahaGunlukleri.length };
  }, [sahaGunlukleri, sarfiyatlar]);

  // Son 14 günün kamyon/işçi grafiği
  const grafik = useMemo(() => {
    return [...sahaGunlukleri]
      .sort((a, b) => a.tarih.localeCompare(b.tarih))
      .slice(-14)
      .map((g) => ({ gun: g.tarih.slice(5), Kamyon: g.kamyon || 0, İşçi: g.isci || 0 }));
  }, [sahaGunlukleri]);

  const malzemeOzet = useMemo(() => {
    const m = new Map<string, number>();
    sarfiyatlar.forEach((s) => m.set(s.malzeme, (m.get(s.malzeme) || 0) + (s.tutar || 0)));
    return [...m.entries()].map(([malzeme, tutar]) => ({ malzeme, tutar })).sort((a, b) => b.tutar - a.tutar);
  }, [sarfiyatlar]);

  const sahaKaydet = () => {
    if (!sg.tarih) return;
    sahaEkle({
      tarih: sg.tarih,
      kamyon: sg.kamyon ? Number(sg.kamyon) : undefined,
      isci: sg.isci ? Number(sg.isci) : undefined,
      calismaSaati: sg.calismaSaati ? Number(sg.calismaSaati) : undefined,
      hava: sg.hava, fazId: sg.fazId || undefined, notlar: sg.notlar || undefined,
    });
    setSg({ tarih: bugun(), kamyon: '', isci: '', calismaSaati: '', hava: 'güneşli', fazId: '', notlar: '' });
    setSahaModal(false);
  };
  const malzemeKaydet = () => {
    if (!mz.malzeme || !mz.miktar) return;
    sarfiyatEkle({
      tarih: mz.tarih, malzeme: mz.malzeme, miktar: Number(mz.miktar), birim: mz.birim,
      birimFiyat: mz.birimFiyat ? Number(mz.birimFiyat) : undefined,
      tedarikci: mz.tedarikci || undefined, fazId: mz.fazId || undefined, notlar: mz.notlar || undefined,
    });
    setMz({ tarih: bugun(), malzeme: '', miktar: '', birim: 'ton', birimFiyat: '', tedarikci: '', fazId: '', notlar: '' });
    setMalzemeModal(false);
  };

  return (
    <>
      <PageHeader
        baslik="Saha Kaydı"
        aciklama="Kaç kamyon, kaç işçi, hangi malzeme ne kadar — gir, AI maliyet raporu çıkarsın"
        sag={<>
          <Button variant="soft" size="sm" onClick={() => setSahaModal(true)}><Plus size={15} /> Günlük Kayıt</Button>
          <Button size="sm" onClick={() => setMalzemeModal(true)}><Plus size={15} /> Malzeme</Button>
        </>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat baslik="Kayıtlı Gün" deger={ozet.gun} ikon={<CalendarDays size={20} />} />
        <Stat baslik="Toplam Kamyon" deger={ozet.kamyon} ikon={<Truck size={20} />} tone="mavi" />
        <Stat baslik="Toplam İşçi-Gün" deger={ozet.isciGun} ikon={<Users size={20} />} tone="amber" />
        <Stat baslik="Malzeme Harcaması" deger={tl(ozet.sarfiyatTutar)} ikon={<Package size={20} />} tone="yesil" />
      </div>

      {grafik.length > 0 && (
        <Card className="mb-6">
          <CardBody>
            <p className="font-semibold text-metin mb-3">Günlük Kamyon / İşçi (son 14 gün)</p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grafik} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                  <XAxis dataKey="gun" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="Kamyon" fill="#3b82f6" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="İşçi" fill="#f59e0b" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Günlük kayıtlar */}
        <Card>
          <CardBody>
            <p className="font-semibold text-metin mb-3 flex items-center gap-2"><CalendarDays size={16} /> Günlük Saha Kayıtları</p>
            {sahaGunlukleri.length === 0 ? (
              <EmptyState ikon={<Truck size={24} />} baslik="Henüz kayıt yok" aciklama="Her gün sonunda kamyon/işçi sayısını gir." />
            ) : (
              <TableWrap>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-metin-yum border-b border-cizgi">
                    <th className="py-2 pr-3">Tarih</th><th className="pr-3">Kamyon</th><th className="pr-3">İşçi</th><th className="pr-3">Saat</th><th className="pr-3">Hava</th><th></th>
                  </tr></thead>
                  <tbody>
                    {[...sahaGunlukleri].sort((a, b) => b.tarih.localeCompare(a.tarih)).map((g) => (
                      <tr key={g.id} className="border-b border-cizgi/60">
                        <td className="py-2 pr-3 whitespace-nowrap">{tarih(g.tarih)}</td>
                        <td className="pr-3">{g.kamyon ?? '—'}</td>
                        <td className="pr-3">{g.isci ?? '—'}</td>
                        <td className="pr-3">{g.calismaSaati ?? '—'}</td>
                        <td className="pr-3">{g.hava ?? '—'}</td>
                        <td className="text-right"><button onClick={() => sahaSil(g.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 size={15} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </CardBody>
        </Card>

        {/* Malzeme sarfiyatı */}
        <Card>
          <CardBody>
            <p className="font-semibold text-metin mb-3 flex items-center gap-2"><Package size={16} /> Malzeme Sarfiyatı</p>
            {sarfiyatlar.length === 0 ? (
              <EmptyState ikon={<Package size={24} />} baslik="Henüz malzeme girilmedi" aciklama="Gelen/kullanılan malzemeyi miktar ve fiyatıyla gir." />
            ) : (
              <>
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-metin-yum border-b border-cizgi">
                      <th className="py-2 pr-3">Tarih</th><th className="pr-3">Malzeme</th><th className="pr-3">Miktar</th><th className="pr-3">Tutar</th><th></th>
                    </tr></thead>
                    <tbody>
                      {[...sarfiyatlar].sort((a, b) => b.tarih.localeCompare(a.tarih)).map((s) => (
                        <tr key={s.id} className="border-b border-cizgi/60">
                          <td className="py-2 pr-3 whitespace-nowrap">{tarih(s.tarih)}</td>
                          <td className="pr-3">{s.malzeme}{s.tedarikci && <span className="text-metin-yum"> · {s.tedarikci}</span>}</td>
                          <td className="pr-3 whitespace-nowrap">{sayi(s.miktar, 1)} {BIRIM_ETIKET[s.birim]}</td>
                          <td className="pr-3 whitespace-nowrap">{tl(s.tutar)}</td>
                          <td className="text-right"><button onClick={() => sarfiyatSil(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 size={15} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
                {malzemeOzet.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-cizgi">
                    <p className="text-xs font-semibold text-metin-yum mb-2">MALZEME BAZINDA TOPLAM</p>
                    <div className="flex flex-wrap gap-2">
                      {malzemeOzet.slice(0, 8).map((m) => (
                        <Badge key={m.malzeme} tone="gri">{m.malzeme}: {tl(m.tutar)}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Günlük kayıt modal */}
      <Modal acik={sahaModal} kapat={() => setSahaModal(false)} baslik="Günlük Saha Kaydı">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tarih"><Input type="date" value={sg.tarih} onChange={(e) => setSg({ ...sg, tarih: e.target.value })} /></Field>
            <Field label="Hava"><Select value={sg.hava} onChange={(e) => setSg({ ...sg, hava: e.target.value })}><option>güneşli</option><option>bulutlu</option><option>yağmurlu</option><option>karlı</option><option>rüzgarlı</option></Select></Field>
            <Field label="Kamyon sayısı"><Input type="number" min="0" value={sg.kamyon} onChange={(e) => setSg({ ...sg, kamyon: e.target.value })} /></Field>
            <Field label="İşçi sayısı"><Input type="number" min="0" value={sg.isci} onChange={(e) => setSg({ ...sg, isci: e.target.value })} /></Field>
            <Field label="Çalışma saati"><Input type="number" min="0" value={sg.calismaSaati} onChange={(e) => setSg({ ...sg, calismaSaati: e.target.value })} /></Field>
            <Field label="Faz"><Select value={sg.fazId} onChange={(e) => setSg({ ...sg, fazId: e.target.value })}><option value="">—</option>{fazlar.map((f) => <option key={f.id} value={f.id}>{f.ad}</option>)}</Select></Field>
          </div>
          <Field label="Notlar"><Textarea value={sg.notlar} onChange={(e) => setSg({ ...sg, notlar: e.target.value })} placeholder="O gün ne yapıldı, dikkat çeken bir şey…" /></Field>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setSahaModal(false)}>Vazgeç</Button><Button onClick={sahaKaydet}>Kaydet</Button></div>
        </div>
      </Modal>

      {/* Malzeme modal */}
      <Modal acik={malzemeModal} kapat={() => setMalzemeModal(false)} baslik="Malzeme Sarfiyatı / Gelen Mal">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tarih"><Input type="date" value={mz.tarih} onChange={(e) => setMz({ ...mz, tarih: e.target.value })} /></Field>
            <Field label="Malzeme"><Input list="malzemeler" value={mz.malzeme} onChange={(e) => setMz({ ...mz, malzeme: e.target.value })} placeholder="örn. İnşaat demiri" /><datalist id="malzemeler">{MALZEME_ONERI.map((m) => <option key={m} value={m} />)}</datalist></Field>
            <Field label="Miktar"><Input type="number" min="0" step="0.01" value={mz.miktar} onChange={(e) => setMz({ ...mz, miktar: e.target.value })} /></Field>
            <Field label="Birim"><Select value={mz.birim} onChange={(e) => setMz({ ...mz, birim: e.target.value as Birim })}>{BIRIMLER.map((b) => <option key={b} value={b}>{BIRIM_ETIKET[b]}</option>)}</Select></Field>
            <Field label="Birim fiyat (TL)"><Input type="number" min="0" value={mz.birimFiyat} onChange={(e) => setMz({ ...mz, birimFiyat: e.target.value })} /></Field>
            <Field label="Tedarikçi"><Input value={mz.tedarikci} onChange={(e) => setMz({ ...mz, tedarikci: e.target.value })} /></Field>
          </div>
          {mz.miktar && mz.birimFiyat && (
            <p className="text-sm text-metin-yum">Tutar: <b className="text-metin">{tl(Number(mz.miktar) * Number(mz.birimFiyat))}</b></p>
          )}
          <Field label="Notlar"><Textarea value={mz.notlar} onChange={(e) => setMz({ ...mz, notlar: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setMalzemeModal(false)}>Vazgeç</Button><Button onClick={malzemeKaydet}>Kaydet</Button></div>
        </div>
      </Modal>
    </>
  );
}
