import { useEffect, useRef, useState, useCallback } from "react";

// ── WebHID type declarations ──────────────────────────────────────────────────
// Inline to avoid requiring @types/w3c-web-hid in tsconfig.
declare global {
  interface HIDDevice extends EventTarget {
    readonly vendorId:    number;
    readonly productId:   number;
    readonly productName: string;
    readonly opened:      boolean;
    open():  Promise<void>;
    close(): Promise<void>;
    addEventListener(type: "inputreport", listener: (e: HIDInputReportEvent) => void): void;
    removeEventListener(type: "inputreport", listener: (e: HIDInputReportEvent) => void): void;
  }
  interface HIDInputReportEvent extends Event {
    readonly device:   HIDDevice;
    readonly reportId: number;
    readonly data:     DataView;
  }
  interface HIDConnectionEvent extends Event {
    readonly device: HIDDevice;
  }
  interface HID extends EventTarget {
    getDevices(): Promise<HIDDevice[]>;
    requestDevice(opts: { filters: Array<{ vendorId?: number; productId?: number }> }): Promise<HIDDevice[]>;
    addEventListener(type: "connect" | "disconnect", listener: (e: HIDConnectionEvent) => void): void;
    removeEventListener(type: "connect" | "disconnect", listener: (e: HIDConnectionEvent) => void): void;
  }
  interface Navigator { hid?: HID; }
}

// ⚠ UPDATE AFTER CALIBRATION: run the app, click "Connecter SonicMic", select the
// device from the picker, then read the console line:
//   [SonicMic] device found  vendorId: 0xXXXX  productId: 0xXXXX  name: "..."
// and replace the values below with the real VID/PID.
const VENDOR_IDS = [0x0911, 0x0D8C, 0x04B8, 0x046D, 0x0BDA, 0x17EF];

// ── Module-level singleton ────────────────────────────────────────────────────
// The HID device is shared across all hook instances. Components subscribe and
// unsubscribe their handlers on mount/unmount; nobody ever calls device.close()
// so the connection survives navigation (e.g. doctor leaves NouveauRapport while
// recording and the sidebar RecordingIndicator still handles Stop/Pause).

let _device: HIDDevice | null = null;
const _reportHandlers = new Set<(e: HIDInputReportEvent) => void>();
const _stateHandlers  = new Set<(connected: boolean) => void>();

function _broadcast(connected: boolean) {
  _stateHandlers.forEach(fn => fn(connected));
}

function _dispatchReport(e: HIDInputReportEvent) {
  _reportHandlers.forEach(fn => fn(e));
}

async function _attach(d: HIDDevice): Promise<void> {
  if (_device === d) return;
  if (!d.opened) await d.open();
  _device = d;
  d.addEventListener("inputreport", _dispatchReport);
  // Always log so we can read the real VID/PID and update VENDOR_IDS above
  // eslint-disable-next-line no-console
  console.log(
    `[SonicMic] device found  vendorId: 0x${d.vendorId.toString(16).padStart(4, "0")}`,
    ` productId: 0x${d.productId.toString(16).padStart(4, "0")}`,
    ` name: "${d.productName}"`,
  );
  _broadcast(true);
}

if (typeof navigator !== "undefined" && navigator.hid) {
  // Physical plug-in while page is open
  navigator.hid.addEventListener("connect", (e) => {
    if (VENDOR_IDS.includes(e.device.vendorId)) _attach(e.device).catch(() => {});
  });
  // Physical unplug
  navigator.hid.addEventListener("disconnect", (e) => {
    if (e.device === _device) {
      _device = null;
      _broadcast(false);
    }
  });
  // Auto-reconnect to a device the user already granted permission for
  navigator.hid.getDevices().then(devices => {
    const mic = devices.find(d => VENDOR_IDS.includes(d.vendorId));
    if (mic) _attach(mic).catch(() => {});
  }).catch(() => {});
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseSonicMicOptions {
  onRecord?: () => void;
  onStop?:   () => void;
  onPause?:  () => void;
}

export interface UseSonicMicReturn {
  connected: boolean;
  connect:   () => Promise<void>;
  error:     string | null;
}

export function useSonicMic(options: UseSonicMicOptions = {}): UseSonicMicReturn {
  const [connected, setConnected] = useState<boolean>(() => !!_device?.opened);
  const [error,     setError]     = useState<string | null>(null);

  // Keep callback refs stable so the report handler never needs to re-register
  const cbRef = useRef(options);
  useEffect(() => { cbRef.current = options; });

  // Subscribe to device connect/disconnect state
  useEffect(() => {
    const listener = (c: boolean) => setConnected(c);
    _stateHandlers.add(listener);
    return () => { _stateHandlers.delete(listener); };
  }, []);

  // Subscribe one stable report handler — removed on unmount only, never on re-render
  useEffect(() => {
    const handler = (e: HIDInputReportEvent) => {
      const data = new Uint8Array(e.data.buffer);

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log(
          "[SonicMic] reportId:", e.reportId,
          " bytes:", Array.from(data).map(b => `0x${b.toString(16).padStart(2, "0")}`).join(" "),
        );
      }

      // Calibrated on Grundig SonicMic 3 — byte[6] and byte[7] carry the button state.
      // Pause and Répondre share the same physical button (toggle).
      if      (data[6] === 0x01) cbRef.current.onRecord?.();
      else if (data[6] === 0x08) cbRef.current.onStop?.();
      else if (data[7] === 0x04) cbRef.current.onPause?.();
    };

    _reportHandlers.add(handler);
    return () => { _reportHandlers.delete(handler); };
  }, []);

  const connect = useCallback(async () => {
    if (!navigator.hid) {
      setError("WebHID non supporté — utilisez Chrome ou Edge.");
      return;
    }
    setError(null);
    try {
      // No vendorId filter: show ALL HID devices so the SonicMic appears even if
      // its VID is not yet in VENDOR_IDS. Once you see the VID/PID in the console
      // ([SonicMic] device found …), update VENDOR_IDS at the top of this file.
      const devices = await navigator.hid.requestDevice({ filters: [] });
      if (!devices.length) {
        setError("Aucun périphérique sélectionné.");
        return;
      }
      await _attach(devices[0]);
    } catch (err) {
      // NotAllowedError = user dismissed the picker — not an error worth showing
      if ((err as DOMException)?.name !== "NotAllowedError") {
        setError("Connexion échouée. Vérifiez que le SonicMic est branché.");
      }
    }
  }, []);

  return { connected, connect, error };
}
