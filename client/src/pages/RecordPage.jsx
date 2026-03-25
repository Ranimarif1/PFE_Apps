import { useCallback, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useTimer } from '../hooks/useTimer';
import StatusBadge from '../components/StatusBadge';
import ConnectionBanner from '../components/ConnectionBanner';
import '../styles/RecordPage.css';

const sessionId = new URLSearchParams(window.location.search).get('sessionId');

export default function RecordPage() {
  const { connected, error: socketError, emit } = useSocket(sessionId);

  const [pendingBlob, setPendingBlob] = useState(null);
  const [pendingMime, setPendingMime] = useState('');
  const [sent, setSent]               = useState(false);
  const [sessionKey, setSessionKey]   = useState(0);

  // ── Audio recorder ───────────────────────────────────────────
  const handleStop = useCallback((blob, mimeType) => {
    setPendingBlob(blob);
    setPendingMime(mimeType);
    setSent(false);
    emit('recording:stop', { sessionId });
  }, [emit]);

  const {
    start, pause, stop,
    status, error: recorderError,
    isRecording, isPaused,
  } = useAudioRecorder({ onStop: handleStop });

  const handleStart = useCallback(() => {
    if (status === 'idle' || status === 'stopped') {
      setPendingBlob(null);
      setSent(false);
      setSessionKey((k) => k + 1);
    }
    start();
    emit('recording:start', { sessionId });
  }, [start, emit, status]);

  // ── Send full recording to desktop ───────────────────────────
  const handleSend = useCallback(async () => {
    if (!pendingBlob) return;
    const buffer = await pendingBlob.arrayBuffer();
    emit('audio:complete', {
      sessionId,
      audio: buffer,
      mimeType: pendingMime,
      timestamp: Date.now(),
    });
    setSent(true);
  }, [pendingBlob, pendingMime, emit]);

  // ── Timer ────────────────────────────────────────────────────
  const timer = useTimer(isRecording, sessionKey);

  // ── PTT handlers ─────────────────────────────────────────────
  const handlePttDown = useCallback((e) => {
    e.preventDefault();
    if (isPaused || status === 'idle' || status === 'stopped') handleStart();
  }, [isPaused, status, handleStart]);

  const handlePttUp = useCallback((e) => {
    e.preventDefault();
    if (isRecording) pause();
  }, [isRecording, pause]);

  // ── No session guard ──────────────────────────────────────────
  if (!sessionId) {
    return (
      <div className="rp-center">
        <div className="rp-center__icon">🩻</div>
        <p className="rp-error-big">Session manquante</p>
        <p className="rp-hint">Scannez le QR code depuis l'application bureau pour accéder à cette page.</p>
      </div>
    );
  }

  const error    = socketError || recorderError;
  const canRecord = connected;
  const hasPending = !!pendingBlob && !sent;

  return (
    <div className="rp-root">
      <ConnectionBanner connected={connected} />

      {/* ── App header ─────────────────────────────────────── */}
      <div className="rp-app-header">
        <div className="rp-logo">🩻</div>
        <h1 className="rp-app-name">RadioAI Mobile</h1>
        <p className="rp-app-subtitle">Service Radiologie</p>

        <div className="rp-session-card">
          <span className={`rp-session-dot ${connected ? '' : 'rp-session-dot--offline'}`} />
          <span>
            Session&nbsp;
            <code>{sessionId.slice(0, 8)}…</code>
          </span>
        </div>
      </div>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="rp-main">

        {sent ? (
          /* ── Sent success ── */
          <div className="rp-sent">
            <div className="rp-sent__icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="rp-sent__title">Audio envoyé ✓</p>
            <p className="rp-sent__hint">Vous pouvez fermer cette page.</p>
          </div>
        ) : (
          <>
            {/* Pulsing indicator */}
            <div className={`rp-indicator ${isRecording ? 'rp-indicator--active' : isPaused ? 'rp-indicator--paused' : ''}`}>
              <span className="rp-indicator__dot" />
            </div>

            {/* Timer */}
            <div className="rp-timer" aria-live="polite">
              {(isRecording || isPaused || status === 'stopped') ? timer : '00:00'}
            </div>

            <StatusBadge status={status} />

            {/* Controls row */}
            <div className="rp-controls">
              <button
                className="rp-btn rp-btn--start"
                disabled={!canRecord || isRecording}
                onClick={handleStart}
                aria-label="Démarrer l'enregistrement"
              >
                {isPaused ? '▶ Reprendre' : '● Démarrer'}
              </button>

              <button
                className="rp-btn rp-btn--pause"
                disabled={!isRecording}
                onClick={pause}
                aria-label="Mettre en pause"
              >
                ❙❙ Pause
              </button>

              <button
                className="rp-btn rp-btn--stop"
                disabled={status !== 'recording' && status !== 'paused'}
                onClick={stop}
                aria-label="Arrêter l'enregistrement"
              >
                ■ Arrêter
              </button>
            </div>

            {/* Send button */}
            <button
              className={`rp-btn rp-btn--send ${hasPending ? 'rp-btn--send-ready' : ''}`}
              disabled={!hasPending || !connected}
              onClick={handleSend}
              aria-label="Envoyer vers le bureau"
            >
              {hasPending ? '↑ Envoyer vers le bureau' : 'En attente d\'un enregistrement'}
            </button>

            {/* Hold-to-record (PTT) */}
            <button
              className={`rp-btn-ptt ${isRecording ? 'rp-btn-ptt--active' : ''}`}
              disabled={!canRecord}
              onTouchStart={handlePttDown}
              onTouchEnd={handlePttUp}
              onTouchCancel={handlePttUp}
              onMouseDown={handlePttDown}
              onMouseUp={handlePttUp}
              onMouseLeave={handlePttUp}
              aria-label="Maintenir pour enregistrer"
            >
              {isRecording ? 'Relâcher pour mettre en pause' : isPaused ? 'Maintenir pour reprendre' : 'Maintenir pour enregistrer'}
            </button>
          </>
        )}

        {error && <div className="rp-error" role="alert">{error}</div>}
      </main>
    </div>
  );
}
