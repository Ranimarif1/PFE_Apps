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

function generateAndLoadCert(ip) {
  const certScript = path.join(certsDir, 'generate-cert.js');
  if (fs.existsSync(certScript)) {
    try {
      require('child_process').execSync(`node "${certScript}"`, { stdio: 'inherit' });
    } catch {}
  }
  const key  = path.join(certsDir, 'current-key.pem');
  const cert = path.join(certsDir, 'current.pem');
  if (fs.existsSync(key) && fs.existsSync(cert)) return { key, cert };
  // fallback to IP-specific or wildcard certs
  const candidates = [
    { key: 'local-network-key.pem', cert: 'local-network.pem' },
    ...[ `${ip}+2`, `${ip}+1`, ip ].map(p => ({ key: `${p}-key.pem`, cert: `${p}.pem` })),
  ];
  for (const { key: k, cert: c } of candidates) {
    const kp = path.join(certsDir, k), cp = path.join(certsDir, c);
    if (fs.existsSync(kp) && fs.existsSync(cp)) return { key: kp, cert: cp };
  }
  return null;
}

export default defineConfig(() => {
  const ip = getLocalIP();
  const tlsFiles = generateAndLoadCert(ip);

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
