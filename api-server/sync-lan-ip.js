#!/usr/bin/env node
// Detect this machine's LAN IP, generate a TLS cert for it if missing,
// then sync VITE_LAN_IP / VITE_SOCKET_URL / MOBILE_CLIENT_URL across the
// client and server .env files. Run when your network or DHCP lease changes.
//
//   node api-server/sync-lan-ip.js
//   (or from api-server/server/) npm run sync-ip

const os = require('os');
const fs = require('fs');
const path = require('path');
const dgram = require('dgram');
const { execSync } = require('child_process');

const CERTS_DIR  = __dirname;
const CLIENT_ENV = path.join(__dirname, '..', 'client', '.env');
const SERVER_ENV = path.join(__dirname, 'server', '.env');
const MOBILE_PORT = 5173;

// Ask the OS which local IP it would use to reach a public host.
// UDP "connect" sets the route without sending a packet — works offline if
// the host is in the routing table, fails cleanly if no route exists.
function detectOutboundIP() {
  return new Promise((resolve) => {
    const sock = dgram.createSocket('udp4');
    const done = (ip) => { try { sock.close(); } catch {} resolve(ip); };
    sock.once('error', () => done(null));
    try {
      sock.connect(80, '8.8.8.8', (err) => {
        if (err) return done(null);
        done(sock.address().address);
      });
    } catch { done(null); }
  });
}

// Fallback: walk interfaces, skip obvious virtual ones by name + prefix.
function fallbackLocalIP() {
  const VIRTUAL_NAMES = /virtual|vmware|vbox|hyper.v|vethernet|loopback|docker|wsl|tap|tun/i;
  const VIRTUAL_PREFIXES = ['192.168.56.', '172.16.', '172.17.', '172.18.', '172.19.',
    '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.',
    '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '169.254.'];

  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    if (VIRTUAL_NAMES.test(name)) continue;
    for (const iface of ifaces[name]) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      if (VIRTUAL_PREFIXES.some(p => iface.address.startsWith(p))) continue;
      return iface.address;
    }
  }
  return null;
}

function findExistingCert(ip) {
  for (const suffix of ['+2', '+1', '']) {
    const cert = path.join(CERTS_DIR, `${ip}${suffix}.pem`);
    const key  = path.join(CERTS_DIR, `${ip}${suffix}-key.pem`);
    if (fs.existsSync(cert) && fs.existsSync(key)) return { cert, key };
  }
  return null;
}

function generateCert(ip) {
  const cert = path.join(CERTS_DIR, `${ip}+1.pem`);
  const key  = path.join(CERTS_DIR, `${ip}+1-key.pem`);
  try {
    execSync(`mkcert -cert-file "${cert}" -key-file "${key}" ${ip} localhost`, { stdio: 'inherit' });
  } catch {
    console.error('\nmkcert failed. Install it from https://github.com/FiloSottile/mkcert and run "mkcert -install" once.');
    process.exit(1);
  }
  return { cert, key };
}

function upsertEnvLine(envPath, key, value) {
  fs.mkdirSync(path.dirname(envPath), { recursive: true });
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const lineRegex = new RegExp(`^${key}=.*$`, 'm');
  if (lineRegex.test(content)) {
    content = content.replace(lineRegex, `${key}=${value}`);
  } else {
    if (content && !content.endsWith('\n')) content += '\n';
    content += `${key}=${value}\n`;
  }
  fs.writeFileSync(envPath, content);
}

(async () => {
  const ip = (await detectOutboundIP()) || fallbackLocalIP();
  if (!ip) {
    console.error('No usable LAN IP found. Connect to a network and try again.');
    process.exit(1);
  }
  console.log(`LAN IP: ${ip}`);

  let cert = findExistingCert(ip);
  if (cert) {
    console.log(`Cert: ${path.basename(cert.cert)} (existing)`);
  } else {
    console.log(`Cert: generating for ${ip}...`);
    cert = generateCert(ip);
    console.log(`Cert: ${path.basename(cert.cert)} (new)`);
  }

  const mobileUrl = `https://${ip}:${MOBILE_PORT}`;
  upsertEnvLine(CLIENT_ENV, 'VITE_LAN_IP', ip);
  upsertEnvLine(CLIENT_ENV, 'VITE_SOCKET_URL', mobileUrl);
  upsertEnvLine(SERVER_ENV, 'MOBILE_CLIENT_URL', mobileUrl);
  console.log(`client/.env:            VITE_LAN_IP=${ip}, VITE_SOCKET_URL=${mobileUrl}`);
  console.log(`api-server/server/.env: MOBILE_CLIENT_URL=${mobileUrl}`);
  console.log(`\nDone. Restart Express (port 4000) and Vite client (port 5173) to pick up the changes.`);
})();
