#!/usr/bin/env bash
# ============================================================================
# Ahmet Kurt Villa Paneli — Hostinger VPS tek-komut kurulum betiği (Ubuntu)
# Kullanım (VPS'te, proje klasörünün içinde):  sudo bash server/kurulum.sh
# ============================================================================
set -e

echo ">>> 1/5  Node.js 20 + git kuruluyor..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs git
fi
echo "Node sürümü: $(node -v)"

echo ">>> 2/5  pm2 (sürekli çalışma yöneticisi) kuruluyor..."
npm install -g pm2 >/dev/null 2>&1 || npm install -g pm2

# Betiğin bulunduğu yere göre kök klasör
KOK="$(cd "$(dirname "$0")/.." && pwd)"

echo ">>> 3/5  Panel (frontend) derleniyor..."
cd "$KOK/app"
npm install
npm run build

echo ">>> 4/5  Arka uç (backend) bağımlılıkları kuruluyor..."
cd "$KOK/server"
npm install

if [ ! -f "$KOK/server/.env" ]; then
  echo "OPENROUTER_API_KEY=" > "$KOK/server/.env"
  echo "OPENROUTER_MODEL=anthropic/claude-opus-4.8" >> "$KOK/server/.env"
  echo "PORT=8080" >> "$KOK/server/.env"
  echo "!!! UYARI: server/.env oluşturuldu ama OPENROUTER_API_KEY BOŞ. Doldurman gerek (rehber adım 6)."
fi

echo ">>> 5/5  Panel başlatılıyor (pm2)..."
pm2 delete villa-panel >/dev/null 2>&1 || true
pm2 start index.js --name villa-panel --cwd "$KOK/server"
pm2 save
pm2 startup systemd -u root --hp /root | tail -n 1 || true

IP=$(curl -s ifconfig.me || echo "SUNUCU_IP")
echo ""
echo "============================================================"
echo " KURULUM TAMAM."
echo " Panel adresi:  http://$IP:8080"
echo " Anahtar girmek için:  nano $KOK/server/.env  (sonra: pm2 restart villa-panel)"
echo "============================================================"
