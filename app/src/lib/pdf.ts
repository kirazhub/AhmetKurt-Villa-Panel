// Tarayıcıda PDF üretir (Türkçe sorunsuz), indirir ve sunucu arşivine yükler.
import html2pdf from 'html2pdf.js';

const sifre = () => localStorage.getItem('villa_sifre') || '123456';
export const raporUrl = (id: string) => `/api/rapor/${id}?s=${encodeURIComponent(sifre())}`;

export interface RaporMeta { id: string; ad: string; tur: string; tarih: string; boyut?: number; }
export async function raporListe(): Promise<RaporMeta[]> {
  try { const r = await fetch('/api/rapor/liste'); const d = await r.json(); return d.raporlar || []; } catch { return []; }
}
export async function raporSil(id: string) {
  await fetch('/api/rapor/sil', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(b); });
}

// Metni şık, Kurt GMG başlıklı A4 HTML'e sar
function sar(baslik: string, govdeHtml: string, altBaslik = ''): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1d2330;font-size:12px;line-height:1.6;padding:6px 4px">
    <div style="border-bottom:3px solid #c8862b;padding-bottom:10px;margin-bottom:16px">
      <div style="color:#c8862b;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Kurt GMG İnşaat</div>
      <div style="font-size:20px;font-weight:800;color:#0f2a43;margin-top:3px">${baslik}</div>
      ${altBaslik ? `<div style="font-size:12px;color:#7a8190;margin-top:2px">${altBaslik}</div>` : ''}
      <div style="font-size:11px;color:#9aa1ad;margin-top:3px">${new Date().toLocaleString('tr-TR')} · Ahmet Kurt Villa Projesi</div>
    </div>
    <div style="white-space:pre-wrap">${govdeHtml}</div>
    <div style="margin-top:22px;border-top:1px solid #e0ddd4;padding-top:8px;font-size:9px;color:#9aa1ad">Kurt GMG İnşaat · pokkop.com · Raif Kurt · 0532 309 13 83 · raifkurt@gmail.com</div>
  </div>`;
}

function metniHtml(metin: string): string {
  return metin
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/^### (.+)$/gm, '<div style="font-weight:700;font-size:14px;color:#0f2a43;margin:10px 0 4px">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-weight:800;font-size:15px;color:#0f2a43;margin:12px 0 5px">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-weight:800;font-size:16px;color:#0f2a43;margin:12px 0 6px">$1</div>');
}

// Markdown/düz metni PDF yap → indir + sunucu arşivine yükle
export async function pdfUret(baslik: string, metin: string, tur = 'asistan', altBaslik = ''): Promise<void> {
  const el = document.createElement('div');
  el.innerHTML = sar(baslik, metniHtml(metin), altBaslik);
  el.style.width = '186mm';
  const dosyaAd = `${baslik}`.replace(/[^\wçğıöşüÇĞİÖŞÜ \-]/g, '').slice(0, 60).trim() || 'rapor';
  const opt = {
    margin: [12, 12, 14, 12],
    filename: dosyaAd + '.pdf',
    image: { type: 'jpeg', quality: 0.96 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };
  // html2pdf tipleri eksik; çalışma zamanı API'si .set().from().outputPdf()
  const h2p = html2pdf as unknown as () => any;
  const blob: Blob = await h2p().set(opt).from(el).outputPdf('blob');
  // indir
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = dosyaAd + '.pdf'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  // sunucu arşivine yükle
  try {
    const dataUrl = await blobToDataUrl(blob);
    await fetch('/api/rapor/yukle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ad: dosyaAd + '.pdf', tur, pdf: dataUrl }) });
  } catch { /* arşivleme başarısızsa indirme yine olur */ }
}
