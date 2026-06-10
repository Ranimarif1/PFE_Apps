import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import os from 'os';

const certsDir = path.resolve(__dirname, '../api-server');

function getLocalIP() {
  const VIRTUAL = /virtual|vmware|vbox|hyper.v|vethernet|loopback|docker|wsl|tap|tun/i;
  const VIRTUAL_PREFIXES = ['192.168.56.', '172.16.', '172.17.', '172.18.', '172.19.',
    '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.',
    '172.27.', '172.28.', '172.29.', '172.30.', '172.31.'];

  for (const [name, ifaces] of Object.entries(os.networkInterfaces())) {
    if (VIRTUAL.test(name)) continue;
    for (const iface of (ifaces ?? [])) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      if (VIRTUAL_PREFIXES.some(p => iface.address.startsWith(p))) continue;
      return iface.address;
    }
  }
  return '127.0.0.1';
}

function loadCert(ip) {
  // Try wildcard cert first, then IP-specific certs
  const candidates = [
    { key: 'local-network-key.pem', cert: 'local-network.pem' },
    ...[ `${ip}+2`, `${ip}+1`, ip ].map(p => ({ key: `${p}-key.pem`, cert: `${p}.pem` })),
  ];
  for (const { key, cert } of candidates) {
    const k = path.join(certsDir, key);
    const c = path.join(certsDir, cert);
    if (fs.existsSync(k) && fs.existsSync(c)) return { key: k, cert: c };
  }
  return null;
}

export default defineConfig(() => {
  const ip = getLocalIP();
  const tlsFiles = loadCert(ip);

  console.log(`[mobile client] LAN IP: ${ip}`);
  if (!tlsFiles) console.warn(`[mobile client] No cert found for ${ip} — running HTTP (mic may be blocked on mobile)`);

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_LAN_IP':     JSON.stringify(ip),
      'import.meta.env.VITE_SOCKET_URL': JSON.stringify(`https://${ip}:5173`),
    },
    server: {
      host: true,
      port: 5173,
      ...(tlsFiles ? { https: { key: fs.readFileSync(tlsFiles.key), cert: fs.readFileSync(tlsFiles.cert) } } : {}),
      proxy: {
        '/api':      { target: 'http://localhost:4000', changeOrigin: true },
        '/socket.io': { target: 'http://localhost:4000', ws: true, changeOrigin: true },
      },
    },
  };
});
