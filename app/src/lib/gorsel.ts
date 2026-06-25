// Belge görselini AI'ya gönderilebilir hale getirir: blob -> küçültülmüş JPEG dataURL.
// Planlardaki yazılar okunabilsin diye max kenar geniş tutulur (1600px).
export function blobToDataUrl(blob: Blob, max = 1600, kalite = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > max || height > max) { const o = max / Math.max(width, height); width = Math.round(width * o); height = Math.round(height * o); }
        const c = document.createElement('canvas'); c.width = width; c.height = height;
        const ctx = c.getContext('2d'); if (!ctx) return reject(new Error('canvas yok'));
        ctx.drawImage(img, 0, 0, width, height);
        try { resolve(c.toDataURL('image/jpeg', kalite)); } catch (e) { reject(e as Error); }
      };
      img.onerror = () => reject(new Error('görsel okunamadı (HEIC olabilir — önce JPG\'ye çevir)'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('dosya okunamadı'));
    reader.readAsDataURL(blob);
  });
}
