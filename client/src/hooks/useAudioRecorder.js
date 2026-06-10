import { useRef, useState, useCallback, useEffect } from 'react';

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
];

function getSupportedMimeType() {
  return PREFERRED_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

/**
 * Controls a MediaRecorder with start / pause / resume / stop.
 * Chunks are accumulated internally and returned as a Blob on stop.
 *
 * @param {object} opts
 * @param {(blob: Blob, mimeType: string) => void} opts.onStop       - called when recording stops with the full audio blob.
 * @param {(blob: Blob, mimeType: string) => void} opts.onCheckpoint - called every 30s with current audio snapshot (for crash recovery).
 */
export function useAudioRecorder({ onStop, onCheckpoint } = {}) {
  const recorderRef       = useRef(null);
  const streamRef         = useRef(null);
  const chunksRef         = useRef([]);
  const wakeLockRef       = useRef(null);
  const checkpointRef     = useRef(null);

  const [status, setStatus]           = useState('idle'); // idle | requesting | recording | paused | stopped | error
  const [error, setError]             = useState(null);
  const [mimeType]                    = useState(getSupportedMimeType);
  const [interrupted, setInterrupted] = useState(false); // true when paused by phone call / app switch

  function startCheckpoint(mimeType) {
    if (checkpointRef.current) clearInterval(checkpointRef.current);
    checkpointRef.current = setInterval(() => {
      if (chunksRef.current.length === 0) return;
      const blob = new Blob(chunksRef.current, { type: mimeType });
      onCheckpoint?.(blob, mimeType);
    }, 30_000);
  }

  function stopCheckpoint() {
    if (checkpointRef.current) { clearInterval(checkpointRef.current); checkpointRef.current = null; }
  }

  useEffect(() => () => { stopStream(); releaseWakeLock(); stopCheckpoint(); }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // ── Wake Lock ─────────────────────────────────────────────────────────────
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      }
    } catch {
      // Wake Lock not supported or permission denied — non-critical
    }
  }

  function releaseWakeLock() {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }

  // ── Visibility change: phone call / app switch ────────────────────────────
  // When the page goes to background, pause the recorder to preserve audio.
  // When the page comes back, re-request wake lock if still active.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (recorderRef.current?.state === 'recording') {
          recorderRef.current.pause();
          setStatus('paused');
          setInterrupted(true);
        }
      } else {
        // Re-acquire wake lock (OS releases it when screen was off)
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          requestWakeLock();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ── Start ────────────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    // If paused, just resume
    if (recorderRef.current?.state === 'paused') {
      recorderRef.current.resume();
      setStatus('recording');
      setInterrupted(false);
      await requestWakeLock();
      return;
    }

    setError(null);
    setInterrupted(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone not available. The page must be opened over HTTPS.');
      setStatus('error');
      return;
    }

    setStatus('requesting');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });
    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Allow it in your browser settings.'
          : `Could not access microphone: ${err.message}`
      );
      setStatus('error');
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, { mimeType: mimeType || undefined });

    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stopStream();
      releaseWakeLock();
      stopCheckpoint();
      recorderRef.current = null;
      setStatus('stopped');
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      onStop?.(blob, recorder.mimeType);
    };

    recorder.onerror = (e) => {
      setError(`Recorder error: ${e.error?.message}`);
      setStatus('error');
      stopStream();
      releaseWakeLock();
    };

    recorder.start(250);
    recorderRef.current = recorder;
    setStatus('recording');
    startCheckpoint(mimeType || recorder.mimeType);
    await requestWakeLock();
  }, [mimeType, onStop, onCheckpoint]);

  // ── Pause ────────────────────────────────────────────────────────────────
  const pause = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.pause();
      setStatus('paused');
      setInterrupted(false);
    }
  }, []);

  // ── Stop ─────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop(); // triggers onstop → calls onStop callback
    }
  }, []);

  return {
    start,
    pause,
    stop,
    status,
    error,
    mimeType,
    interrupted,
    isRecording: status === 'recording',
    isPaused:    status === 'paused',
  };
}
