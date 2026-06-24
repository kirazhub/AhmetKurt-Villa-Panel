import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { Loader2 } from 'lucide-react';
import Ozet from './pages/Ozet';
import IsTakibi from './pages/IsTakibi';
import Taseronlar from './pages/Taseronlar';
import Butce from './pages/Butce';
import Odemeler from './pages/Odemeler';
import Teklifler from './pages/Teklifler';
import Belgeler from './pages/Belgeler';
import IceAktar from './pages/IceAktar';
import Takvim from './pages/Takvim';
import Proje from './pages/Proje';

// Teknik Çizimler ağır DXF/3B motoru kullanır → tembel yükle (panel hızlı açılsın).
const Cizimler = lazy(() => import('./pages/Cizimler'));

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Ozet />} />
        <Route path="/is-takibi" element={<IsTakibi />} />
        <Route path="/taseronlar" element={<Taseronlar />} />
        <Route path="/butce" element={<Butce />} />
        <Route path="/odemeler" element={<Odemeler />} />
        <Route path="/teklifler" element={<Teklifler />} />
        <Route path="/belgeler" element={<Belgeler />} />
        <Route path="/cizimler" element={<Suspense fallback={<div className="flex items-center justify-center py-20 text-metin-yum"><Loader2 className="animate-spin" /></div>}><Cizimler /></Suspense>} />
        <Route path="/ice-aktar" element={<IceAktar />} />
        <Route path="/takvim" element={<Takvim />} />
        <Route path="/proje" element={<Proje />} />
        <Route path="*" element={<Ozet />} />
      </Routes>
    </Layout>
  );
}
