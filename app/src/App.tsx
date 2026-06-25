import { Routes, Route } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Layout } from './components/Layout';
import Giris from './components/Giris';
import { useStore } from './store/useStore';
import Ozet from './pages/Ozet';
import IsTakibi from './pages/IsTakibi';
import Taseronlar from './pages/Taseronlar';
import Butce from './pages/Butce';
import Odemeler from './pages/Odemeler';
import Teklifler from './pages/Teklifler';
import Belgeler from './pages/Belgeler';
import Specler from './pages/Specler';
import MaliyetRaporu from './pages/MaliyetRaporu';
import OtomatikSpec from './components/OtomatikSpec';
import Takvim from './pages/Takvim';
import Rehber from './pages/Rehber';
import AsistanAI from './pages/AsistanAI';
import Raporlar from './pages/Raporlar';
import Ogrenme from './pages/Ogrenme';
import SahaKaydi from './pages/SahaKaydi';
import IstekListesi from './pages/IstekListesi';
import Danisma from './pages/Danisma';
import HeicDonustur from './pages/HeicDonustur';
import TeklifToplama from './pages/TeklifToplama';
import Whatsapp from './pages/Whatsapp';
import Proje from './pages/Proje';

// Tüm panel durumunu sunucuya otomatik yedekler (hiçbir bilgi kaybı olmasın).
function OtomatikYedek() {
  const disaAktar = useStore((s) => s.disaAktar);
  const sonRef = useRef('');
  useEffect(() => {
    const yedekle = () => {
      try {
        const durum = disaAktar();
        if (durum === sonRef.current) return; // değişmediyse gönderme
        sonRef.current = durum;
        fetch('/api/yedek', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ durum }) }).catch(() => {});
      } catch { /* yoksay */ }
    };
    const t = setInterval(yedekle, 30000);
    const ilk = setTimeout(yedekle, 4000);
    return () => { clearInterval(t); clearTimeout(ilk); };
  }, [disaAktar]);
  return null;
}

export default function App() {
  // Giriş durumu: kayıtlı şifre varsa doğrula, yoksa giriş ekranı göster.
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    if (!localStorage.getItem('villa_sifre')) { setAuthed(false); return; }
    fetch('/api/ai/health')
      .then((r) => { if (r.ok) setAuthed(true); else { localStorage.removeItem('villa_sifre'); setAuthed(false); } })
      .catch(() => setAuthed(true)); // sunucuya ulaşılamazsa yerel kullanıma izin ver
  }, []);

  if (authed === null) return <div className="min-h-screen bg-slate-900" />;
  if (!authed) return <Giris onOk={() => setAuthed(true)} />;

  return (
    <Layout>
      <OtomatikYedek />
      <OtomatikSpec />
      <Routes>
        <Route path="/" element={<Ozet />} />
        <Route path="/istek-listesi" element={<IstekListesi />} />
        <Route path="/rehber" element={<Rehber />} />
        <Route path="/asistan" element={<AsistanAI />} />
        <Route path="/danisma" element={<Danisma />} />
        <Route path="/ogrenme" element={<Ogrenme />} />
        <Route path="/raporlar" element={<Raporlar />} />
        <Route path="/is-takibi" element={<IsTakibi />} />
        <Route path="/saha-kaydi" element={<SahaKaydi />} />
        <Route path="/taseronlar" element={<Taseronlar />} />
        <Route path="/butce" element={<Butce />} />
        <Route path="/odemeler" element={<Odemeler />} />
        <Route path="/teklifler" element={<Teklifler />} />
        <Route path="/teklif-toplama" element={<TeklifToplama />} />
        <Route path="/whatsapp" element={<Whatsapp />} />
        <Route path="/belgeler" element={<Belgeler />} />
        <Route path="/specler" element={<Specler />} />
        <Route path="/maliyet-raporu" element={<MaliyetRaporu />} />
        <Route path="/heic" element={<HeicDonustur />} />
        <Route path="/takvim" element={<Takvim />} />
        <Route path="/proje" element={<Proje />} />
        <Route path="*" element={<Ozet />} />
      </Routes>
    </Layout>
  );
}
