import { useState } from 'react';
import { Lock, Loader2, Building2 } from 'lucide-react';

export default function Giris({ onOk }: { onOk: () => void }) {
  const [sifre, setSifre] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  const girisYap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sifre) return;
    setYukleniyor(true); setHata('');
    localStorage.setItem('villa_sifre', sifre);
    try {
      const r = await fetch('/api/ai/health');
      if (r.ok) { onOk(); return; }
      localStorage.removeItem('villa_sifre');
      setHata('Şifre yanlış. Tekrar dene.');
    } catch {
      // Sunucuya ulaşılamadıysa yine de gir (yerel kullanım); API çağrıları sonra denenir
      onOk(); return;
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <form onSubmit={girisYap} className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-7">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-marka-500 flex items-center justify-center text-white shadow mb-3"><Building2 size={26} /></div>
          <h1 className="text-lg font-bold text-metin">Ahmet Kurt Villa</h1>
          <p className="text-sm text-metin-yum">İnşaat Yönetim Paneli</p>
        </div>
        <label className="block text-sm font-medium text-metin mb-1.5">Şifre</label>
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-metin-yum" />
          <input
            type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} autoFocus
            placeholder="Şifreni gir"
            className="w-full rounded-xl border border-cizgi bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-marka-400 focus:ring-2 focus:ring-marka-100"
          />
        </div>
        {hata && <p className="text-sm text-red-600 mt-2">{hata}</p>}
        <button type="submit" disabled={yukleniyor || !sifre}
          className="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-marka-500 text-white font-medium py-2.5 hover:bg-marka-600 transition disabled:opacity-50 cursor-pointer">
          {yukleniyor ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />} Giriş
        </button>
      </form>
    </div>
  );
}
