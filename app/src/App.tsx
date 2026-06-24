import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Ozet from './pages/Ozet';
import IsTakibi from './pages/IsTakibi';
import Taseronlar from './pages/Taseronlar';
import Butce from './pages/Butce';
import Odemeler from './pages/Odemeler';
import Teklifler from './pages/Teklifler';
import Belgeler from './pages/Belgeler';
import Takvim from './pages/Takvim';
import Rehber from './pages/Rehber';
import Proje from './pages/Proje';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Ozet />} />
        <Route path="/rehber" element={<Rehber />} />
        <Route path="/is-takibi" element={<IsTakibi />} />
        <Route path="/taseronlar" element={<Taseronlar />} />
        <Route path="/butce" element={<Butce />} />
        <Route path="/odemeler" element={<Odemeler />} />
        <Route path="/teklifler" element={<Teklifler />} />
        <Route path="/belgeler" element={<Belgeler />} />
        <Route path="/takvim" element={<Takvim />} />
        <Route path="/proje" element={<Proje />} />
        <Route path="*" element={<Ozet />} />
      </Routes>
    </Layout>
  );
}
