require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const { registerMobileHandlers, sessions } = require('./mobile-socket');

// Auto-detect local WiFi/Ethernet IP
function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Prefer WiFi (usually 192.168.x.x or 172.x.x.x) over VirtualBox (192.168.56.x)
        if (!iface.address.startsWith('192.168.56')) return iface.address;
      }
    }
  }
  return 'localhost';
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
  const mobileUrl = `${mobileClientUrl}/mobile/record/${sessionId}`;

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
  console.log(`Mobile URL   → http://${localIP}:8080/mobile/record/<sessionId>`);
});
