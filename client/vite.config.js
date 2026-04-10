import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const certsDir = path.resolve(__dirname, '../api-server');

// Pick whichever cert exists for the current LAN IP
function loadCert(ip) {
  const patterns = [`${ip}+2`, `${ip}+1`, ip];
  for (const p of patterns) {
    const key  = path.join(certsDir, `${p}-key.pem`);
    const cert = path.join(certsDir, `${p}.pem`);
    if (fs.existsSync(key) && fs.existsSync(cert)) return { key, cert };
  }
  return null;
}

const LAN_IP = process.env.VITE_LAN_IP || '172.16.40.21';
const tlsFiles = loadCert(LAN_IP);

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    ...(tlsFiles ? { https: { key: fs.readFileSync(tlsFiles.key), cert: fs.readFileSync(tlsFiles.cert) } } : {}),
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
