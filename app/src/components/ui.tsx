import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Durum } from '../types';
import { DURUM_ETIKET } from '../types';

// ============================================================================
// TASARIM SİSTEMİ — Ortak arayüz bileşenleri. Modüller bunları kullanır.
// ============================================================================

// --- Kart ---
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx('rounded-2xl bg-kart border border-cizgi shadow-sm', className)}>
      {children}
    </div>
  );
}
export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('p-5', className)}>{children}</div>;
}

// --- Sayfa başlığı ---
export function PageHeader({ baslik, aciklama, sag }: { baslik: string; aciklama?: string; sag?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-metin tracking-tight">{baslik}</h1>
        {aciklama && <p className="text-metin-yum text-sm mt-1">{aciklama}</p>}
      </div>
      {sag && <div className="flex items-center gap-2">{sag}</div>}
    </div>
  );
}

// --- Buton ---
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'soft' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
};
export function Button({ variant = 'primary', size = 'md', className, children, ...rest }: BtnProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm',
        variant === 'primary' && 'bg-marka-500 text-white hover:bg-marka-600 shadow-sm',
        variant === 'soft' && 'bg-marka-50 text-marka-700 hover:bg-marka-100',
        variant === 'ghost' && 'text-metin-yum hover:bg-zemin',
        variant === 'danger' && 'bg-red-50 text-red-600 hover:bg-red-100',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// --- Rozet ---
export function Badge({ tone = 'gri', children }: { tone?: 'gri' | 'amber' | 'yesil' | 'mavi' | 'kirmizi'; children: ReactNode }) {
  const tones = {
    gri: 'bg-slate-100 text-slate-600',
    amber: 'bg-marka-100 text-marka-700',
    yesil: 'bg-emerald-100 text-emerald-700',
    mavi: 'bg-blue-100 text-blue-700',
    kirmizi: 'bg-red-100 text-red-700',
  };
  return <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', tones[tone])}>{children}</span>;
}

export function DurumBadge({ durum }: { durum: Durum }) {
  const tone = { baslamadi: 'gri', devam: 'mavi', tamamlandi: 'yesil', beklemede: 'amber' } as const;
  return <Badge tone={tone[durum]}>{DURUM_ETIKET[durum]}</Badge>;
}

// --- İstatistik kutusu ---
export function Stat({ baslik, deger, alt, ikon, tone }: { baslik: string; deger: ReactNode; alt?: ReactNode; ikon?: ReactNode; tone?: 'amber' | 'yesil' | 'mavi' | 'kirmizi' }) {
  const toneCls = {
    amber: 'bg-marka-50 text-marka-600',
    yesil: 'bg-emerald-50 text-emerald-600',
    mavi: 'bg-blue-50 text-blue-600',
    kirmizi: 'bg-red-50 text-red-600',
  };
  return (
    <Card>
      <CardBody className="flex items-start gap-4">
        {ikon && <div className={clsx('p-2.5 rounded-xl', tone ? toneCls[tone] : 'bg-zemin text-metin-yum')}>{ikon}</div>}
        <div className="min-w-0">
          <p className="text-metin-yum text-sm">{baslik}</p>
          <p className="text-2xl font-bold text-metin mt-0.5 truncate">{deger}</p>
          {alt && <p className="text-xs text-metin-yum mt-1">{alt}</p>}
        </div>
      </CardBody>
    </Card>
  );
}

// --- İlerleme çubuğu ---
export function ProgressBar({ value, tone = 'amber' }: { value: number; tone?: 'amber' | 'yesil' | 'mavi' }) {
  const cls = { amber: 'bg-marka-500', yesil: 'bg-emerald-500', mavi: 'bg-blue-500' };
  return (
    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className={clsx('h-full rounded-full transition-all', cls[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

// --- Boş durum ---
export function EmptyState({ baslik, aciklama, aksiyon, ikon }: { baslik: string; aciklama?: string; aksiyon?: ReactNode; ikon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {ikon && <div className="p-4 rounded-2xl bg-zemin text-metin-yum mb-4">{ikon}</div>}
      <h3 className="font-semibold text-metin">{baslik}</h3>
      {aciklama && <p className="text-sm text-metin-yum mt-1 max-w-sm">{aciklama}</p>}
      {aksiyon && <div className="mt-4">{aksiyon}</div>}
    </div>
  );
}

// --- Form alanları ---
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-metin mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-metin-yum mt-1">{hint}</span>}
    </label>
  );
}
const inputCls = 'w-full rounded-xl border border-cizgi bg-white px-3.5 py-2.5 text-sm text-metin outline-none focus:border-marka-400 focus:ring-2 focus:ring-marka-100 transition';
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(inputCls, props.className)} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(inputCls, 'cursor-pointer', props.className)} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(inputCls, 'min-h-[90px] resize-y', props.className)} />;
}

// --- Modal ---
export function Modal({ acik, kapat, baslik, children, genis }: { acik: boolean; kapat: () => void; baslik: string; children: ReactNode; genis?: boolean }) {
  useEffect(() => {
    if (!acik) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && kapat();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [acik, kapat]);
  if (!acik) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40" onClick={kapat}>
      <div
        className={clsx('bg-white w-full rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto', genis ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-cizgi sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-semibold text-metin">{baslik}</h3>
          <button onClick={kapat} className="p-1.5 rounded-lg hover:bg-zemin text-metin-yum cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// --- Tablo sarmalayıcı (mobil için yatay kaydırma) ---
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto -mx-5 sm:mx-0"><div className="min-w-full inline-block align-middle px-5 sm:px-0">{children}</div></div>;
}
