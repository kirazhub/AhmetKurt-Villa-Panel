// ============================================================================
// WhatsApp Web entegrasyonu (Baileys) — kendi numaranı QR ile bağla,
// firmalara mesaj gönder, gelen cevapları gör. (Resmi olmayan; ölçülü kullan.)
// ============================================================================
import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import pino from 'pino';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, rmSync } from 'fs';

let sock = null;
let qrDataUrl = null;
let baglandi = false;
let baslatildi = false;
let veriYolu = '';
const logger = pino({ level: process.env.WA_LOG || 'silent' });

// Gönderilen/gelen mesajları kısa süre saklarız; karşı taraf "tekrar gönder" (retry) isterse
// Baileys orijinal mesajı buradan alıp yeniden şifreler → mesaj karşıya GERÇEKTEN ulaşır.
const mesajDeposu = new Map(); // id -> message (proto)
function mesajSakla(id, message) {
  if (!id || !message) return;
  mesajDeposu.set(id, message);
  if (mesajDeposu.size > 1000) { const ilk = mesajDeposu.keys().next().value; mesajDeposu.delete(ilk); }
}

function gelenOku() { try { return JSON.parse(readFileSync(join(veriYolu, 'wa-gelen.json'), 'utf8')); } catch { return []; } }
function gelenYaz(arr) { try { writeFileSync(join(veriYolu, 'wa-gelen.json'), JSON.stringify(arr.slice(0, 300), null, 2)); } catch { /**/ } }

export async function baslat(veriDir) {
  veriYolu = veriDir;
  if (baslatildi) return;
  baslatildi = true;
  try {
    const { state, saveCreds } = await useMultiFileAuthState(join(veriDir, 'wa-auth'));
    let version;
    try { const r = await fetchLatestBaileysVersion(); version = r.version; } catch { /* varsayılan */ }
    sock = makeWASocket({
      auth: state, version, printQRInTerminal: false, logger,
      browser: Browsers.appropriate('Chrome'), syncFullHistory: false, markOnlineOnConnect: true,
      // KRİTİK: retry isteklerinde orijinal mesajı sağlar; olmazsa başkalarına mesaj iletilmez.
      getMessage: async (key) => { const m = mesajDeposu.get(key?.id); return m || undefined; },
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u) => {
      const { connection, lastDisconnect, qr } = u;
      if (qr) { try { qrDataUrl = await qrcode.toDataURL(qr); } catch { /**/ } }
      if (connection === 'open') { baglandi = true; qrDataUrl = null; }
      if (connection === 'close') {
        baglandi = false;
        const kod = lastDisconnect?.error?.output?.statusCode;
        baslatildi = false;
        if (kod !== DisconnectReason.loggedOut) { setTimeout(() => baslat(veriDir), 3000); }
      }
    });
    sock.ev.on('messages.upsert', ({ messages, type }) => {
      // Tüm mesajları (giden+gelen) retry için depola
      for (const m of messages) { if (m.key?.id && m.message) mesajSakla(m.key.id, m.message); }
      if (type !== 'notify') return;
      const gelen = gelenOku();
      for (const m of messages) {
        if (m.key?.fromMe || !m.message) continue;
        const text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || '[medya/mesaj]';
        gelen.unshift({ from: (m.key.remoteJid || '').replace('@s.whatsapp.net', ''), isim: m.pushName || '', text, tarih: new Date(Number(m.messageTimestamp) * 1000 || Date.now()).toISOString() });
      }
      gelenYaz(gelen);
    });
    // TEŞHİS: giden mesaj teslim durumu (1=beklemede 2=sunucuya ulaştı 3=karşıya teslim 4=okundu)
    sock.ev.on('messages.update', (updates) => {
      for (const u of updates) {
        if (u.update && u.update.status != null) console.log('WA-ACK', u.key?.remoteJid, 'status=', u.update.status);
      }
    });
    sock.ev.on('message-receipt.update', (updates) => {
      for (const u of updates) console.log('WA-RECEIPT', u.key?.remoteJid, JSON.stringify(u.receipt || {}).slice(0, 120));
    });
  } catch (e) {
    baslatildi = false;
    console.error('WA baslat hata:', e?.message || e);
  }
}

export function durum() { return { baglandi, qr: qrDataUrl }; }

function jidYap(numara) {
  let d = String(numara).replace(/\D/g, '');
  if (d.startsWith('0')) d = d.slice(1);
  if (!d.startsWith('90')) d = '90' + d;
  return d + '@s.whatsapp.net';
}

export async function gonder(numara, mesaj, gorseller) {
  if (!sock || !baglandi) throw new Error('WhatsApp bağlı değil');
  const jid = jidYap(numara);
  // Numara gerçekten WhatsApp kullanıcısı mı? (değilse Baileys sessizce yutar → sahte "gönderildi")
  try {
    const sonuc = await sock.onWhatsApp(jid);
    const kayitli = Array.isArray(sonuc) && sonuc[0] && sonuc[0].exists;
    if (!kayitli) throw new Error('Bu numara WhatsApp kullanıcısı değil (' + numara + ')');
  } catch (e) {
    if (String(e?.message || '').includes('WhatsApp kullanıcısı')) throw e;
    // onWhatsApp sorgusu başarısız olduysa engelleme; yine de göndermeyi dene
  }
  const imgs = (Array.isArray(gorseller) ? gorseller : []).map(dataUrlToBuffer).filter(Boolean);
  if (imgs.length === 0) {
    const sent = await sock.sendMessage(jid, { text: mesaj });
    if (sent?.key?.id && sent.message) mesajSakla(sent.key.id, sent.message);
    console.log('WA-GONDER', jid, 'id=', sent?.key?.id, 'status=', sent?.status);
  } else {
    for (let i = 0; i < imgs.length; i++) {
      const sent = await sock.sendMessage(jid, i === 0 ? { image: imgs[i], caption: mesaj || '' } : { image: imgs[i] });
      if (sent?.key?.id && sent.message) mesajSakla(sent.key.id, sent.message);
      if (i < imgs.length - 1) await new Promise((r) => setTimeout(r, 700));
    }
  }
  return jid;
}

function dataUrlToBuffer(d) {
  try { const b64 = String(d).split(',').pop(); return Buffer.from(b64, 'base64'); } catch { return null; }
}

export function gelenler() { return gelenOku(); }

export async function cikis() {
  try { if (sock) await sock.logout(); } catch { /**/ }
  baglandi = false; baslatildi = false; qrDataUrl = null;
  if (existsSync(join(veriYolu, 'wa-auth'))) { try { writeFileSync(join(veriYolu, 'wa-auth', 'creds.json'), '{}'); } catch { /**/ } }
}

// Oturumu tamamen sıfırla ve yeni QR üret (engel sonrası yeniden bağlanmak için)
export async function yenidenBagla(veriDir) {
  const yol = veriDir || veriYolu;
  try { if (sock) { try { await sock.logout(); } catch { /**/ } try { sock.end?.(undefined); } catch { /**/ } } } catch { /**/ }
  sock = null; baglandi = false; qrDataUrl = null; baslatildi = false;
  try { rmSync(join(yol, 'wa-auth'), { recursive: true, force: true }); } catch { /**/ }
  await baslat(yol);
}
