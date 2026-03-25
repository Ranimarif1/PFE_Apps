import { useEffect, useRef, useState } from 'react';

/**
 * Stopwatch that pauses when `running` is false and resumes when true.
 * Resets to 0 whenever `resetKey` changes.
 */
export function useTimer(running, resetKey) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);

  // Reset when a new recording session starts
  useEffect(() => {
    setSeconds(0);
  }, [resetKey]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
