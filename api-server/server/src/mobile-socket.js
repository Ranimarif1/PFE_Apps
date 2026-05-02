/**
 * mobile-socket.js
 * ─────────────────────────────────────────────────────────────────
 * Drop this into your existing Socket.io server setup.
 *
 * Usage in your server's index.js:
 *
 *   const { registerMobileHandlers } = require('./mobile-socket');
 *   io.on('connection', (socket) => {
 *     registerMobileHandlers(io, socket);
 *     // ... your other handlers
 *   });
 *
 * Your desktop client already emits `desktop:join` and listens for
 * `audio:chunk`, `recording:start`, `recording:stop` — no changes needed there.
 * ─────────────────────────────────────────────────────────────────
 */

// sessionId → { desktopSocketId, mobileSocketId }
// Reuse your existing sessions map if you already have one.
const sessions = new Map();

/**
 * Call this for every new socket connection.
 */
function registerMobileHandlers(io, socket) {
  // ── Desktop: register itself as the owner of a session ──────────
  socket.on('desktop:join', ({ sessionId }) => {
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, { desktopSocketId: null, mobileSocketId: null });
    }
    sessions.get(sessionId).desktopSocketId = socket.id;
    socket.join(sessionId);

    // Let desktop know whether mobile is already connected
    const { mobileSocketId } = sessions.get(sessionId);
    socket.emit('session:status', { mobileConnected: !!mobileSocketId });
  });

  // ── Mobile: join a session room ──────────────────────────────────
  socket.on('mobile:join', ({ sessionId }) => {
    // Auto-create the session if it doesn't exist yet.
    // This handles: server restart, direct URL access, or mobile joining before desktop.
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, { desktopSocketId: null, mobileSocketId: null });
    }

    const session = sessions.get(sessionId);
    session.mobileSocketId = socket.id;
    socket.join(sessionId);

    // Confirm to mobile so it can enable the Record button
    socket.emit('session:ready', { sessionId });

    // Notify desktop that the phone is connected
    if (session.desktopSocketId) {
      io.to(session.desktopSocketId).emit('mobile:connected', { sessionId });
    }
  });

  // ── Mobile → desktop: audio chunk (binary, sent every ~250 ms) ──
  socket.on('audio:chunk', ({ sessionId, chunk, mimeType, timestamp }) => {
    const session = sessions.get(sessionId);
    if (!session?.desktopSocketId) return;

    // Forward the raw ArrayBuffer to the desktop socket
    io.to(session.desktopSocketId).emit('audio:chunk', { chunk, mimeType, timestamp });

    // Optional: persist to disk
    // appendChunkToFile(sessionId, chunk);
  });

  // ── Mobile → desktop: full recording sent on demand ─────────────
  socket.on('audio:complete', ({ sessionId, audio, mimeType, timestamp }) => {
    const session = sessions.get(sessionId);
    const audioSize = audio ? (audio.byteLength || audio.length || 0) : 0;
    console.log(`[audio:complete] sessionId=${sessionId} size=${audioSize} mimeType=${mimeType} desktopId=${session?.desktopSocketId || 'NONE'}`);
    if (!session?.desktopSocketId) {
      console.log(`[audio:complete] DROPPED — no desktop socket for session ${sessionId}`);
      return;
    }
    io.to(session.desktopSocketId).emit('audio:complete', { audio, mimeType, timestamp });
    console.log(`[audio:complete] forwarded to desktop ${session.desktopSocketId}`);
  });

  // ── Mobile → desktop: recording lifecycle events ─────────────────
  socket.on('recording:start', ({ sessionId }) => {
    socket.to(sessionId).emit('recording:start', { sessionId });
  });

  socket.on('recording:stop', ({ sessionId }) => {
    socket.to(sessionId).emit('recording:stop', { sessionId });
  });

  // ── Cleanup on disconnect ─────────────────────────────────────────
  socket.on('disconnect', () => {
    for (const [sessionId, session] of sessions.entries()) {
      if (session.mobileSocketId === socket.id) {
        session.mobileSocketId = null;
        if (session.desktopSocketId) {
          io.to(session.desktopSocketId).emit('mobile:disconnected', { sessionId });
        }
      }
      if (session.desktopSocketId === socket.id) {
        session.desktopSocketId = null;
      }
    }
  });
}

module.exports = { registerMobileHandlers, sessions };
