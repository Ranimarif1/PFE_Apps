#!/usr/bin/env bash
# =============================================================================
#  Radiology Platform — Update Script
#  Pull latest code, rebuild, and restart services.
#
#  Usage:
#    sudo bash update.sh <SERVER_IP>
# =============================================================================
set -euo pipefail

SERVER_IP="${1:?Usage: sudo bash update.sh <SERVER_IP>}"
APP_DIR="/opt/radiology"
WEB_DIR="/var/www/radiology"

GREEN='\033[0;32m'; NC='\033[0m'
log() { echo -e "${GREEN}[✔] $*${NC}"; }

log "Pulling latest code..."
cd "$APP_DIR"
git pull

log "Updating Python dependencies..."
"$APP_DIR/venv/bin/pip" install -r api-server/requirements.txt -q

log "Updating Node dependencies..."
cd "$APP_DIR/api-server/server" && npm install --silent

log "Rebuilding desktop app..."
cd "$APP_DIR/desktop"
npm install --silent
VITE_API_BASE_URL="https://$SERVER_IP" \
VITE_SOCKET_URL="https://$SERVER_IP" \
npm run build
cp -r dist/. "$WEB_DIR/desktop/"

log "Rebuilding mobile app..."
cd "$APP_DIR/client"
npm install --silent
VITE_LAN_IP="$SERVER_IP" \
VITE_SOCKET_URL="" \
npm run build
cp -r dist/. "$WEB_DIR/mobile/"

log "Restarting services..."
systemctl restart radiology-django
systemctl restart radiology-node
nginx -t && systemctl reload nginx

log "Update complete."
systemctl status radiology-django --no-pager -l
systemctl status radiology-node --no-pager -l
