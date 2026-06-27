import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload, Trash2, Sparkles, CheckCircle2, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, Card, CardBody, Button, Field, Input, Select } from '../components/ui';
import { tl, tarih, bugun } from '../lib/format';
import { dosyaYukle, dosyaDataUrl, dosyaOnizleme } from '../lib/sunucuGorsel';

const KATEGORILER = ['Beton', 'Demir', 'Hafriyat', 'Elektrik', 'Tesisat', 'Nakliye', 'Malzeme', 'İşçilik', 'Diğer'];

export default function Fatura() {
  const { harcamalar, harcamaEkle, harcamaSil, dosyalariYenile } = useStore();
  const [okunuyor, setOkunuyor] = useState(false);
  const [form, setForm] = useState({ firma: '', tutar: '', tarih: bugun(), kategori: 'Malzeme', aciklama: '', dosyaId: '' });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { dosyalariYenile(); }, [dosyalariYenile]);

  const toplam = harcamalar.reduce((t, h) => t + (h.tutar || 0), 0);

  // Fatura görseli yükle → sunucuya kaydet → AI oku → formu doldur
  const faturaYukle = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!f.type.startsWith('image/')) { alert('Görsel seç (HEIC ise önce HEIC→JPG).'); return; }
    setOkunuyor(true);
    try {
      const d = await dosyaYukle(f, 'fatura');
      const durl = await dosyaDataUrl(d.id);
      const r = await fetch('/api/ai/fatura-oku', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gorsel: durl }) });
      const j = await r.json();
      const v = j.veri || {};
      setForm({ firma: v.firma || '', tutar: v.tutar ? String(v.tutar) : '', tarih: v.tarih || bugun(), kategori: v.kategori || 'Malzeme', aciklama: v.aciklama || '', dosyaId: d.id });
      await dosyalariYenile();
    } catch { alert('Fatura okunamadı.'); }
    setOkunuyor(false);
  };

  const kaydet = () => {
    if (!form.tutar) { alert('Tutar gerekli.'); return; }
    harcamaEkle({ firma: form.firma, tutar: Number(form.tutar), tarih: form.tarih, kategori: form.kategori, aciklama: form.aciklama, dosyaId: form.dosyaId || undefined });
    setForm({ firma: '', tutar: '', tarih: bugun(), kategori: 'Malzeme', aciklama: '', dosyaId: '' });
  };

  return (
    <>
      <PageHeader baslik="Fatura & Harcama" aciklama="Fatura fotoğrafını yükle — AI firma/tutar/tarihi okur, harcamaya işler" />
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { faturaYukle(e.target.files); e.target.value = ''; }} />

      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <Card><CardBody className="flex items-center justify-between"><div><p className="text-xs text-metin-yum">Toplam Harcama</p><p className="text-2xl font-bold text-metin mt-1">{tl(toplam)}</p><p className="text-[11px] text-metin-yum">{harcamalar.length} kayıt</p></div></CardBody></Card>
        <Card><CardBody className="flex items-center justify-center">
          <Button onClick={() => inputRef.current?.click()} disabled={okunuyor}>{okunuyor ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Fatura fotoğrafı yükle (AI okusun)</Button>
        </CardBody></Card>
      </div>

      {okunuyor && <Card className="mb-5"><CardBody className="flex items-center gap-2 text-sm text-metin-yum"><Loader2 size={15} className="animate-spin" /> Fatura AI ile okunuyor…</CardBody></Card>}

      {/* Form (AI doldurur, düzeltebilirsin) */}
      <Card className="mb-5"><CardBody className="space-y-3">
        <p className="font-semibold text-metin flex items-center gap-2"><Plus size={16} className="text-marka-500" /> Harcama Ekle {form.dosyaId && <CheckCircle2 size={14} className="text-emerald-600" />}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Firma"><Input value={form.firma} onChange={(e) => setForm({ ...form, firma: e.target.value })} /></Field>
          <Field label="Tutar (KDV dahil, TL)"><Input type="number" value={form.tutar} onChange={(e) => setForm({ ...form, tutar: e.target.value })} /></Field>
          <Field label="Tarih"><Input type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} /></Field>
          <Field label="Kategori"><Select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}>{KATEGORILER.map((k) => <option key={k}>{k}</option>)}</Select></Field>
        </div>
        <Field label="Açıklama"><Input value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} /></Field>
        <div className="flex justify-end"><Button onClick={kaydet} disabled={!form.tutar}><Plus size={15} /> Kaydet</Button></div>
      </CardBody></Card>

      <Card><CardBody>
        <p className="font-semibold text-metin mb-3">Harcama Kayıtları</p>
        {harcamalar.length === 0 ? <p className="text-sm text-metin-yum">Henüz harcama yok. Fatura yükle (AI okusun) ya da elle ekle.</p> : (
          <div className="divide-y divide-cizgi">
            {[...harcamalar].reverse().map((h) => (
              <div key={h.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {h.dosyaId && <a href={dosyaOnizleme(h.dosyaId)} target="_blank" rel="noreferrer"><img src={dosyaOnizleme(h.dosyaId)} alt="" className="w-10 h-10 rounded object-cover border border-cizgi" /></a>}
                  <div className="min-w-0"><p className="font-medium text-metin text-sm truncate">{h.firma || h.aciklama || 'Harcama'}</p><p className="text-xs text-metin-yum">{tarih(h.tarih)} · {h.kategori}{h.aciklama && h.firma ? ' · ' + h.aciklama : ''}</p></div>
                </div>
                <div className="flex items-center gap-2 shrink-0"><span className="font-semibold text-metin">{tl(h.tutar)}</span><button onClick={() => harcamaSil(h.id)} className="text-metin-yum hover:text-rose-600"><Trash2 size={14} /></button></div>
              </div>
            ))}
          </div>
        )}
      </CardBody></Card>

      <p className="mt-4 text-xs text-metin-yum"><Sparkles size={12} className="inline text-marka-500" /> Eklenen harcamalar <b>Nakit Akışı</b> ve <b>Bütçe</b> sayfalarındaki gerçek harcamaya otomatik yansır.</p>
    </>
  );
}
