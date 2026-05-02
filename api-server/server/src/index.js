require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const { registerMobileHandlers, sessions } = require('./mobile-socket');

// Auto-detect local WiFi/Ethernet IP — skip virtual/VPN adapters
function getLocalIP() {
  const VIRTUAL_NAMES = /virtual|vmware|vbox|hyper.v|vethernet|loopback|docker|wsl|tap|tun/i;
  const VIRTUAL_PREFIXES = ['192.168.56.', '172.16.', '172.17.', '172.18.', '172.19.',
    '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.',
    '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '169.254.'];

  const ifaces = os.networkInterfaces();
  let fallback = null;

  for (const name of Object.keys(ifaces)) {
    if (VIRTUAL_NAMES.test(name)) continue;          // skip virtual adapters by name
    for (const iface of ifaces[name]) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      if (VIRTUAL_PREFIXES.some(p => iface.address.startsWith(p))) continue;
      return iface.address;                           // first real physical IP
    }
    // keep as fallback if only virtual prefix but good adapter name
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !fallback) fallback = iface.address;
    }
  }
  return fallback || 'localhost';
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 1e7, // 10 MB — needed for audio chunks
});

app.use(cors());
app.use(express.json());

// ── Create a new session (called by your desktop app) ──────────────────────
app.post('/api/session', (req, res) => {
  const sessionId = uuidv4();
  sessions.set(sessionId, { desktopSocketId: null, mobileSocketId: null });

  const localIP = getLocalIP();
  const mobileClientUrl = process.env.MOBILE_CLIENT_URL || `http://${localIP}:8080`;
  const mobileUrl = `${mobileClientUrl}/?sessionId=${sessionId}`;

  res.json({ sessionId, mobileUrl });
});

// ── Register all mobile socket handlers ───────────────────────────────────
io.on('connection', (socket) => {
  registerMobileHandlers(io, socket);
});

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`Socket server → http://localhost:${PORT}`);
  console.log(`Mobile URL   → ${process.env.MOBILE_CLIENT_URL || `http://${localIP}:8080`}/?sessionId=<sessionId>`);
});
