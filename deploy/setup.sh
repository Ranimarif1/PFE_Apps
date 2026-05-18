#!/usr/bin/env bash
# =============================================================================
#  Radiology Platform — Full LAN Server Setup
#  Run once on the Ubuntu/Debian server as root or sudo user.
#
#  Usage:
#    sudo bash setup.sh <SERVER_IP>
#
#  Example:
#    sudo bash setup.sh 192.168.1.100
# =============================================================================
set -euo pipefail

SERVER_IP="${1:?Usage: sudo bash setup.sh <SERVER_IP>}"
APP_DIR="/opt/radiology"
WEB_DIR="/var/www/radiology"
SSL_DIR="/etc/ssl/radiology"
PYTHON_MIN="3.10"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔] $*${NC}"; }
warn() { echo -e "${YELLOW}[!] $*${NC}"; }
die()  { echo -e "${RED}[✘] $*${NC}"; exit 1; }

[[ $EUID -ne 0 ]] && die "Run as root: sudo bash setup.sh $SERVER_IP"

log "Starting deployment for SERVER_IP=$SERVER_IP"

# ── 1. System packages ────────────────────────────────────────────────────────
log "Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
    curl wget git gnupg ca-certificates \
    python3 python3-pip python3-venv python3-dev \
    build-essential libssl-dev \
    nginx \
    ffmpeg libavcodec-dev libavformat-dev \
    openssl

# ── 2. Node.js 20 ─────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ $(node -v | tr -d 'v' | cut -d. -f1) -lt 18 ]]; then
    log "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
fi
log "Node $(node -v) / npm $(npm -v)"

# ── 3. PM2 ────────────────────────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
    log "Installing PM2..."
    npm install -g pm2 --silent
fi

# ── 4. MongoDB ────────────────────────────────────────────────────────────────
if ! systemctl is-active --quiet mongod 2>/dev/null; then
    log "Installing MongoDB..."
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc \
        | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" \
        > /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update -qq
    apt-get install -y -qq mongodb-org
    systemctl enable --now mongod
    log "MongoDB started"
fi

# ── 5. Ollama (local AI suggestions) ─────────────────────────────────────────
if ! command -v ollama &>/dev/null; then
    log "Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    systemctl enable --now ollama
    sleep 3
    ollama pull mistral || warn "Could not pull mistral model (check internet)"
fi

# ── 6. SSL certificate (self-signed for LAN IP) ───────────────────────────────
log "Generating SSL certificate for IP $SERVER_IP..."
mkdir -p "$SSL_DIR"
openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
    -keyout "$SSL_DIR/key.pem" \
    -out    "$SSL_DIR/cert.pem" \
    -subj   "/CN=$SERVER_IP/O=Hopital/C=DZ" \
    -addext "subjectAltName=IP:$SERVER_IP,IP:127.0.0.1"
chmod 600 "$SSL_DIR/key.pem"
log "SSL cert valid for 10 years → $SSL_DIR/"

# ── 7. App directory ──────────────────────────────────────────────────────────
log "Setting up app directory at $APP_DIR..."
mkdir -p "$APP_DIR" "$WEB_DIR/desktop" "$WEB_DIR/mobile" "/var/log/radiology"
chown -R www-data:www-data "/var/log/radiology" "$WEB_DIR"

# Copy source if not already there (assumes script is run from repo root)
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [[ "$SCRIPT_DIR" != "$APP_DIR" ]]; then
    rsync -a --exclude='.git' --exclude='node_modules' --exclude='venv' \
          --exclude='__pycache__' --exclude='*.pyc' \
          "$SCRIPT_DIR/" "$APP_DIR/"
fi

chown -R www-data:www-data "$APP_DIR"

# ── 8. Python virtual environment + dependencies ──────────────────────────────
log "Installing Python dependencies..."
python3 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install --upgrade pip -q

# Install PyTorch with CUDA 12.1 (matches NVIDIA A2 / Ampere)
"$APP_DIR/venv/bin/pip" install --index-url https://download.pytorch.org/whl/cu121 \
    torch==2.3.0 torchaudio==2.3.0 -q

# Install remaining requirements
"$APP_DIR/venv/bin/pip" install \
    av \
    -r "$APP_DIR/api-server/requirements.txt" -q

log "Python deps installed"

# ── 9. Pre-download Whisper model (while internet is available) ───────────────
log "Downloading Whisper model (this may take a few minutes)..."
"$APP_DIR/venv/bin/python" - <<'PYEOF'
from transformers import WhisperProcessor, WhisperForConditionalGeneration
MODEL_ID = "amnbk/whisper-medium-medical-fr-v2"
BASE_ID  = "openai/whisper-medium"
try:
    WhisperProcessor.from_pretrained(MODEL_ID)
    print(f"  Processor loaded from {MODEL_ID}")
except Exception:
    WhisperProcessor.from_pretrained(BASE_ID)
    print(f"  Processor loaded from {BASE_ID} (fallback)")
WhisperForConditionalGeneration.from_pretrained(MODEL_ID)
print("  Model downloaded and cached ✔")
PYEOF

# ── 10. Node.js dependencies ──────────────────────────────────────────────────
log "Installing Node.js server dependencies..."
cd "$APP_DIR/api-server/server" && npm install --silent

# ── 11. Write production .env files ──────────────────────────────────────────
log "Writing production environment files..."

# Generate strong random secrets
DJANGO_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(50))")
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")

# Prompt for email credentials (used for registration verification + password reset)
echo ""
echo "─────────────────────────────────────────────────────"
echo "  Email configuration (for registration & password reset)"
echo "  Recommended: create a dedicated Gmail account and"
echo "  generate an App Password at myaccount.google.com/apppasswords"
echo "─────────────────────────────────────────────────────"
read -rp "  Gmail address      : " EMAIL_USER
read -rsp "  Gmail App Password : " EMAIL_PASS
echo ""

cat > "$APP_DIR/api-server/django/.env" <<EOF
DJANGO_SECRET_KEY=$DJANGO_SECRET
DEBUG=0
ALLOWED_HOSTS=$SERVER_IP,localhost,127.0.0.1
JWT_SECRET_KEY=$JWT_SECRET
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=radiology_platform
FRONTEND_URL=https://$SERVER_IP
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=1
EMAIL_HOST_USER=$EMAIL_USER
EMAIL_HOST_PASSWORD=$EMAIL_PASS
DEFAULT_FROM_EMAIL=$EMAIL_USER
EOF

cat > "$APP_DIR/api-server/server/.env" <<EOF
PORT=4000
EOF

# ── 12. Build React apps ──────────────────────────────────────────────────────
log "Building desktop app..."
cd "$APP_DIR/desktop"
npm install --silent
VITE_API_BASE_URL="https://$SERVER_IP" \
VITE_SOCKET_URL="https://$SERVER_IP" \
npm run build

cp -r dist/. "$WEB_DIR/desktop/"
log "Desktop app built → $WEB_DIR/desktop/"

log "Building mobile client app..."
cd "$APP_DIR/client"
npm install --silent
# VITE_SOCKET_URL left empty — falls back to window.location.origin at runtime
# Nginx will proxy /socket.io/ → Node :4000 from both origins
VITE_LAN_IP="$SERVER_IP" \
VITE_SOCKET_URL="" \
npm run build

cp -r dist/. "$WEB_DIR/mobile/"
log "Mobile app built → $WEB_DIR/mobile/"

# ── 13. Nginx configuration ───────────────────────────────────────────────────
log "Configuring Nginx..."
sed "s/SERVER_IP/$SERVER_IP/g" "$APP_DIR/deploy/nginx.conf" \
    > /etc/nginx/sites-available/radiology
ln -sf /etc/nginx/sites-available/radiology /etc/nginx/sites-enabled/radiology
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 14. Systemd services ──────────────────────────────────────────────────────
log "Installing systemd services..."
sed "s|APP_DIR|$APP_DIR|g" "$APP_DIR/deploy/radiology-django.service" \
    > /etc/systemd/system/radiology-django.service
sed "s|APP_DIR|$APP_DIR|g" "$APP_DIR/deploy/radiology-node.service" \
    > /etc/systemd/system/radiology-node.service

systemctl daemon-reload
systemctl enable --now radiology-django
systemctl enable --now radiology-node

# ── 15. Firewall ──────────────────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
    log "Configuring firewall..."
    ufw allow 443/tcp   comment "Radiology Desktop (HTTPS)"
    ufw allow 5173/tcp  comment "Radiology Mobile (HTTPS)"
    ufw allow 22/tcp    comment "SSH"
    ufw --force enable
fi

# ── 16. Create first AdminIT account ─────────────────────────────────────────
log "Creating first AdminIT account..."
"$APP_DIR/venv/bin/python" "$APP_DIR/deploy/create-admin.py"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           DEPLOYMENT COMPLETE                        ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Desktop  →  https://$SERVER_IP                      ${NC}"
echo -e "${GREEN}║  Mobile   →  https://$SERVER_IP:5173                 ${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}║  NOTE: Devices must trust the self-signed cert.      ║${NC}"
echo -e "${YELLOW}║  See deploy/TRUST-CERT.md for per-device steps.      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
