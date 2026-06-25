import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ListChecks, HardHat, Wallet, Receipt,
  GitCompareArrows, Images, CalendarClock, Building2, Menu, X, BookOpenText, Bot, FileBarChart, Truck, ClipboardList, Brain, MessagesSquare,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStore';

export const NAV = [
  { to: '/', ad: 'Özet', ikon: LayoutDashboard, end: true },
  { to: '/istek-listesi', ad: 'Eksik Bilgiler', ikon: ClipboardList },
  { to: '/rehber', ad: 'İnşaat Rehberi', ikon: BookOpenText },
  { to: '/asistan', ad: 'AI Asistan', ikon: Bot },
  { to: '/danisma', ad: 'Danışma (Web)', ikon: MessagesSquare },
  { to: '/ogrenme', ad: 'Öğrenme & Hafıza', ikon: Brain },
  { to: '/raporlar', ad: 'AI Raporlar', ikon: FileBarChart },
  { to: '/is-takibi', ad: 'İş Takibi', ikon: ListChecks },
  { to: '/saha-kaydi', ad: 'Saha Kaydı', ikon: Truck },
  { to: '/taseronlar', ad: 'Taşeronlar', ikon: HardHat },
  { to: '/butce', ad: 'Bütçe / Maliyet', ikon: Wallet },
  { to: '/odemeler', ad: 'Hakediş & Ödeme', ikon: Receipt },
  { to: '/teklifler', ad: 'Teklif Karşılaştırma', ikon: GitCompareArrows },
  { to: '/belgeler', ad: 'Foto & Belge', ikon: Images },
  { to: '/takvim', ad: 'Takvim / Termin', ikon: CalendarClock },
  { to: '/proje', ad: 'Proje Künyesi', ikon: Building2 },
];

function NavItems({ onClick }: { onClick?: () => void }) {
  return (
    <nav className="px-3 py-2 space-y-1">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onClick}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
              isActive ? 'bg-marka-500 text-white shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white',
            )
          }
        >
          <n.ikon size={18} />
          {n.ad}
        </NavLink>
      ))}
    </nav>
  );
}

function Marka() {
  return (
    <div className="px-5 py-5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-marka-500 flex items-center justify-center text-white font-bold shadow">AK</div>
      <div className="leading-tight">
        <p className="text-white font-semibold text-sm">Ahmet Kurt Villa</p>
        <p className="text-slate-400 text-xs">İnşaat Yönetim Paneli</p>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobilAcik, setMobilAcik] = useState(false);
  const proje = useStore((s) => s.proje);
  const loc = useLocation();
  const aktif = NAV.find((n) => (n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)));

  return (
    <div className="min-h-screen flex">
      {/* Masaüstü yan menü */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-slate-900 sticky top-0 h-screen">
        <Marka />
        <NavItems />
        <div className="mt-auto p-4 text-xs text-slate-500 border-t border-white/5">
          Ruhsat No {proje.ruhsatNo} · {proje.yapiSinifi}
        </div>
      </aside>

      {/* Mobil çekmece */}
      {mobilAcik && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobilAcik(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-slate-900 flex flex-col">
            <div className="flex items-center justify-between">
              <Marka />
              <button onClick={() => setMobilAcik(false)} className="p-2 mr-3 text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <NavItems onClick={() => setMobilAcik(false)} />
          </aside>
        </div>
      )}

      {/* İçerik */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-cizgi flex items-center gap-3 px-4 h-14">
          <button onClick={() => setMobilAcik(true)} className="p-2 -ml-2 text-metin"><Menu size={22} /></button>
          <span className="font-semibold text-metin">{aktif?.ad ?? 'Panel'}</span>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
