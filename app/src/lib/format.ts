// Biçimleme yardımcıları — tüm modüller bunları kullanır

export function tl(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency: 'TRY', maximumFractionDigits: 0,
  }).format(n);
}

export function sayi(n: number | undefined | null, ondalik = 0): string {
  if (n === undefined || n === null || isNaN(n)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: ondalik, maximumFractionDigits: ondalik,
  }).format(n);
}

export function yuzde(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return '—';
  return `%${Math.round(n)}`;
}

export function tarih(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

export function bugun(): string {
  return new Date().toISOString().slice(0, 10);
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
