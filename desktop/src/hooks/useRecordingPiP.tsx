import { useEffect, useRef, useCallback } from "react";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useRecording } from "@/contexts/RecordingContext";
import { PiPFloatingUI } from "@/components/PiPFloatingUI";

// ── Document Picture-in-Picture type declarations ─────────────────────────────
declare global {
  interface DocumentPictureInPicture extends EventTarget {
    requestWindow(options?: {
      width?: number;
      height?: number;
      disallowReturnToOpener?: boolean;
    }): Promise<Window>;
    readonly window: Window | null;
  }
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

const BROADCAST_CHANNEL = "reportease-pip-sync";

// ── Module-level functions ────────────────────────────────────────────────────
// requestWindow() requires a user gesture — it must be called INSIDE an onClick
// handler, not from a useEffect. NouveauRapport imports and calls these directly
// from its button handlers so the browser accepts the activation context.

let _openFn:  (() => Promise<void>) | null = null;
let _closeFn: (() => void) | null = null;

export async function triggerPiP():  Promise<void> { await _openFn?.();  }
export function  closePiP():         void           {       _closeFn?.(); }

// ── Style injection ───────────────────────────────────────────────────────────

function injectBaseStyles(doc: Document): void {
  const el = doc.createElement("style");
  el.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { overflow: hidden; }
    @keyframes pip-pulse {
      0%, 100% { opacity: 1;    transform: scale(1);   }
      50%       { opacity: 0.35; transform: scale(0.8); }
    }
  `;
  doc.head.appendChild(el);
}

// ── Fallback popup (non-Chrome / popup not blocked) ───────────────────────────

function buildFallbackHTML(channel: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>ReportEase – Enregistrement</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#f8fafc;
  height:100vh;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:10px;user-select:none;overflow:hidden;padding:14px}
#dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;transition:background .3s}
#lbl{font-size:11px;font-weight:600;letter-spacing:.02em}
#tmr{font-family:ui-monospace,monospace;font-size:28px;font-weight:700;letter-spacing:.06em;color:#f1f5f9}
#ctrl{display:flex;gap:8px;margin-top:2px}
button{font-size:11px;font-weight:600;padding:5px 14px;border-radius:8px;border:none;cursor:pointer}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
</style></head>
<body>
<div style="display:flex;align-items:center;gap:8px"><span id="dot"></span><span id="lbl">Prêt à enregistrer</span></div>
<div id="tmr">00:00</div>
<div id="ctrl">
  <button id="bp" onclick="ch.postMessage('pause')" style="display:none"></button>
  <button id="bs" onclick="ch.postMessage('stop')"  style="display:none;background:rgba(239,68,68,.15);color:#f87171">⏹ Arrêter</button>
</div>
<script>
var ch=new BroadcastChannel("${channel}");
var dot=document.getElementById("dot"),lbl=document.getElementById("lbl");
var tmr=document.getElementById("tmr"),bp=document.getElementById("bp"),bs=document.getElementById("bs");
dot.style.background="#64748b";
ch.onmessage=function(e){
  var d=e.data;if(typeof d!=="object")return;
  if(!d.isRecording&&!d.isPaused){
    dot.style.background="#64748b";dot.style.animation="none";
    lbl.style.color="#94a3b8";lbl.textContent="Prêt à enregistrer";
    bp.style.display="none";bs.style.display="none";return;
  }
  var c=d.isPaused?"#fbbf24":"#f87171";
  dot.style.background=c;dot.style.animation=d.isPaused?"none":"pulse 1.2s ease-in-out infinite";
  lbl.style.color=c;lbl.textContent=d.isPaused?"En pause":"Enregistrement en cours…";
  var m=String(Math.floor(d.seconds/60)).padStart(2,"0"),s=String(d.seconds%60).padStart(2,"0");
  tmr.textContent=m+":"+s;
  bp.style.display="";bs.style.display="";
  if(d.isPaused){bp.style.background="rgba(5,150,105,.25)";bp.style.color="#34d399";bp.textContent="▶ Reprendre";}
  else{bp.style.background="rgba(245,158,11,.15)";bp.style.color="#fbbf24";bp.textContent="⏸ Pause";}
};
window.addEventListener("beforeunload",function(){ch.postMessage("closed");});
</script></body></html>`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRecordingPiP(): void {
  const { isRecording, isPaused, seconds, stopRecording, togglePause } = useRecording();

  const pipWinRef  = useRef<Window | null>(null);
  const pipRootRef = useRef<Root | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Track whether recording was ever active in this PiP session.
  // This prevents the auto-close effect from firing on mount (when both
  // isRecording and isPaused are false) or in the brief gap between
  // requestWindow() resolving and setIsRecording(true) being processed.
  const everRecordedRef = useRef(false);

  // Stable action refs — always current, safe to call from PiP callbacks
  const stopRef  = useRef(stopRecording);
  const pauseRef = useRef(togglePause);
  useEffect(() => { stopRef.current  = stopRecording; }, [stopRecording]);
  useEffect(() => { pauseRef.current = togglePause;   }, [togglePause]);

  // ── Internal close ────────────────────────────────────────────────────────────
  const _close = useCallback((): void => {
    try { pipRootRef.current?.unmount(); } catch { /* ignore */ }
    pipRootRef.current = null;
    try { pipWinRef.current?.close(); } catch { /* cross-origin */ }
    pipWinRef.current = null;
    channelRef.current?.close();
    channelRef.current = null;
    everRecordedRef.current = false;
  }, []);

  // ── Render into Document PiP ──────────────────────────────────────────────────
  const renderDocPiP = useCallback((rec: boolean, paused: boolean, secs: number): void => {
    if (!pipRootRef.current) return;
    pipRootRef.current.render(
      createElement(PiPFloatingUI, {
        isRecording: rec,
        isPaused:    paused,
        seconds:     secs,
        onStop:  () => stopRef.current(),
        onPause: () => pauseRef.current(),
      }),
    );
  }, []);

  // ── Open Document PiP window ──────────────────────────────────────────────────
  const openDocumentPiP = useCallback(async (): Promise<boolean> => {
    if (!window.documentPictureInPicture) return false;
    try {
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 300, height: 140,
      });
      pipWinRef.current = pip;
      injectBaseStyles(pip.document);

      const container = pip.document.createElement("div");
      pip.document.body.appendChild(container);
      pipRootRef.current = createRoot(container);

      // Render "prêt" state immediately — recording may not have started yet
      renderDocPiP(false, false, 0);

      // Doctor closed the PiP manually → clean up refs but keep recording
      pip.addEventListener("pagehide", () => {
        try { pipRootRef.current?.unmount(); } catch { /* */ }
        pipRootRef.current = null;
        pipWinRef.current  = null;
        everRecordedRef.current = false;
      });

      return true;
    } catch {
      return false;
    }
  }, [renderDocPiP]);

  // ── Open fallback popup ───────────────────────────────────────────────────────
  const openFallbackPopup = useCallback((): boolean => {
    const popup = window.open(
      "",
      "reportease-pip",
      "width=300,height=140,top=20,right=20,toolbar=no,menubar=no,location=no,status=no,scrollbars=no,resizable=no",
    );
    if (!popup) return false;
    pipWinRef.current = popup;

    popup.document.write(buildFallbackHTML(BROADCAST_CHANNEL));
    popup.document.close();

    channelRef.current = new BroadcastChannel(BROADCAST_CHANNEL);
    channelRef.current.onmessage = ({ data }) => {
      if      (data === "stop")   stopRef.current();
      else if (data === "pause")  pauseRef.current();
      else if (data === "closed") { pipWinRef.current = null; everRecordedRef.current = false; }
    };

    return true;
  }, []);

  // ── openPiP — MUST be called inside a click handler (user gesture) ────────────
  const openPiP = useCallback(async (): Promise<void> => {
    if (pipWinRef.current) return;
    const opened = await openDocumentPiP();
    if (!opened) openFallbackPopup();
  }, [openDocumentPiP, openFallbackPopup]);

  // ── Register module-level functions ──────────────────────────────────────────
  useEffect(() => {
    _openFn  = openPiP;
    _closeFn = _close;
    return () => {
      if (_openFn  === openPiP) _openFn  = null;
      if (_closeFn === _close)  _closeFn = null;
    };
  }, [openPiP, _close]);

  // ── Sync recording state → PiP window ────────────────────────────────────────
  useEffect(() => {
    if (!pipWinRef.current) return;

    if (isRecording) everRecordedRef.current = true;

    if (pipRootRef.current) {
      renderDocPiP(isRecording, isPaused, seconds);
    } else if (channelRef.current) {
      channelRef.current.postMessage({ isRecording, isPaused, seconds });
    }
  }, [isRecording, isPaused, seconds, renderDocPiP]);

  // ── Auto-close only after recording was active then fully stopped ─────────────
  // Guards against firing on mount or in the requestWindow→setIsRecording gap.
  useEffect(() => {
    if (everRecordedRef.current && !isRecording && !isPaused && pipWinRef.current) {
      _close();
    }
  }, [isRecording, isPaused, _close]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => () => { _close(); }, [_close]);
}
