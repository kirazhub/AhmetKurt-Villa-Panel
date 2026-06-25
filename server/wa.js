// ============================================================================
// WhatsApp Web entegrasyonu (Baileys) — kendi numaranı QR ile bağla,
// firmalara mesaj gönder, gelen cevapları gör. (Resmi olmayan; ölçülü kullan.)
// ============================================================================
import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import pino from 'pino';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

let sock = null;
let qrDataUrl = null;
let baglandi = false;
let baslatildi = false;
let veriYolu = '';
const logger = pino({ level: 'silent' });

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
    sock = makeWASocket({ auth: state, version, printQRInTerminal: false, logger, browser: Browsers.appropriate('Chrome'), syncFullHistory: false });
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
      if (type !== 'notify') return;
      const gelen = gelenOku();
      for (const m of messages) {
        if (m.key?.fromMe || !m.message) continue;
        const text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || '[medya/mesaj]';
        gelen.unshift({ from: (m.key.remoteJid || '').replace('@s.whatsapp.net', ''), isim: m.pushName || '', text, tarih: new Date(Number(m.messageTimestamp) * 1000 || Date.now()).toISOString() });
      }
      gelenYaz(gelen);
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

export async function gonder(numara, mesaj) {
  if (!sock || !baglandi) throw new Error('WhatsApp bağlı değil');
  const jid = jidYap(numara);
  await sock.sendMessage(jid, { text: mesaj });
  return jid;
}

export function gelenler() { return gelenOku(); }

export async function cikis() {
  try { if (sock) await sock.logout(); } catch { /**/ }
  baglandi = false; baslatildi = false; qrDataUrl = null;
  if (existsSync(join(veriYolu, 'wa-auth'))) { try { writeFileSync(join(veriYolu, 'wa-auth', 'creds.json'), '{}'); } catch { /**/ } }
}
