// Sunucu görsel deposu istemcisi — planlar + drone görselleri sunucuda saklanır.
// Görseller her cihazdan erişilir, yedeklenir; AI (Teknik Specler / Drone) bunları okur.

export interface SunucuDosya {
  id: string;
  ad: string;
  tur: string;            // 'foto' | 'fatura' | 'diger' | 'drone'
  etiket?: string;
  tarih: string;          // yüklenme (ISO)
  tarihCekim?: string;    // drone: çekim tarihi
  boyut?: number;
  spec?: string;          // AI analizi
  specTarih?: string;
  specDurum?: 'islendi' | 'hata' | 'atlandi';
  meta?: Record<string, unknown>;
}

const sifre = () => localStorage.getItem('villa_sifre') || '123456';
export const dosyaUrl = (id: string) => `/api/dosya/${id}?s=${encodeURIComponent(sifre())}`;
export const dosyaOnizleme = (id: string) => `/api/dosya/${id}/k?s=${encodeURIComponent(sifre())}`;

// Dosyayı canvas ile küçült → JPEG dataURL
function kucult(file: File, max: number, kalite = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > max || height > max) { const o = max / Math.max(width, height); width = Math.round(width * o); height = Math.round(height * o); }
        const c = document.createElement('canvas'); c.width = width; c.height = height;
        const ctx = c.getContext('2d'); if (!ctx) return reject(new Error('canvas'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL('image/jpeg', kalite));
      };
      img.onerror = () => reject(new Error('Görsel okunamadı (HEIC ise önce JPG\'ye çevir)'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('dosya okunamadı'));
    reader.readAsDataURL(file);
  });
}

export async function dosyaListe(tur?: string): Promise<SunucuDosya[]> {
  const r = await fetch('/api/dosya/liste' + (tur ? `?tur=${encodeURIComponent(tur)}` : ''));
  if (!r.ok) return [];
  const d = await r.json();
  return d.dosyalar || [];
}

export async function dosyaYukle(file: File, tur = 'foto', etiket = '', tarihCekim = ''): Promise<SunucuDosya> {
  let kaynak: File = file;
  // HEIC veya tarayıcının çizemediği format → sunucuda JPG'ye çevir
  try {
    await kucult(kaynak, 64, 0.5); // hızlı çizilebilirlik testi
  } catch {
    const r = await fetch('/api/heic-jpg', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file });
    if (!r.ok) throw new Error('Görsel dönüştürülemedi (HEIC?)');
    const jpg = await r.blob();
    kaynak = new File([jpg], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
  }
  const orijinal = await kucult(kaynak, 2400, 0.85);   // saklanan "orijinal" (yüksek detay)
  const onizleme = await kucult(kaynak, 420, 0.7);     // grid için küçük
  const r = await fetch('/api/dosya/yukle', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ad: file.name, tur, etiket, tarihCekim, orijinal, onizleme }),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.hata || 'Yüklenemedi'); }
  return await r.json();
}

export async function dosyaSil(id: string) {
  await fetch('/api/dosya/sil', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
}

export async function dosyaGuncelle(id: string, patch: Partial<SunucuDosya>) {
  await fetch('/api/dosya/guncelle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, patch }) });
}

// AI'ya göndermek için orijinal görseli dataURL olarak getir
export async function dosyaDataUrl(id: string): Promise<string> {
  const r = await fetch(dosyaUrl(id));
  const b = await r.blob();
  return await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(b); });
}
