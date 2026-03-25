require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { registerMobileHandlers, sessions } = require('./mobile-socket');

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

  const mobileClientUrl = process.env.MOBILE_CLIENT_URL || 'http://localhost:5173';
  const mobileUrl = `${mobileClientUrl}/record?sessionId=${sessionId}`;

  res.json({ sessionId, mobileUrl });
});

// ── Register all mobile socket handlers ───────────────────────────────────
io.on('connection', (socket) => {
  registerMobileHandlers(io, socket);
});

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend running → http://localhost:${PORT}`);
});
