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
 * @param {(blob: Blob, mimeType: string) => void} opts.onStop - called when recording stops with the full audio blob.
 */
export function useAudioRecorder({ onStop } = {}) {
  const recorderRef  = useRef(null);
  const streamRef    = useRef(null);
  const chunksRef    = useRef([]);   // accumulated locally until Send is pressed

  const [status, setStatus]   = useState('idle'); // idle | requesting | recording | paused | stopped | error
  const [error, setError]     = useState(null);
  const [mimeType]            = useState(getSupportedMimeType);

  useEffect(() => () => stopStream(), []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // ── Start ────────────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    // If paused, just resume
    if (recorderRef.current?.state === 'paused') {
      recorderRef.current.resume();
      setStatus('recording');
      return;
    }

    setError(null);

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
      setStatus('stopped');
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      onStop?.(blob, recorder.mimeType);
    };

    recorder.onerror = (e) => {
      setError(`Recorder error: ${e.error?.message}`);
      setStatus('error');
      stopStream();
    };

    recorder.start(250);
    recorderRef.current = recorder;
    setStatus('recording');
  }, [mimeType, onStop]);

  // ── Pause ────────────────────────────────────────────────────────────────
  const pause = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.pause();
      setStatus('paused');
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
    isRecording: status === 'recording',
    isPaused:    status === 'paused',
  };
}
