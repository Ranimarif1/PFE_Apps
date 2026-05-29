import { useEffect, useRef, useState, useCallback } from "react";

// ── WebHID type declarations ──────────────────────────────────────────────────
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

const VENDOR_IDS = [0x0911, 0x0D8C, 0x04B8, 0x046D, 0x0BDA, 0x17EF];

// ── Button mapping ────────────────────────────────────────────────────────────

export type ButtonAction = "record" | "pause" | "stop";

export interface ButtonMapping {
  reportId: number;
  bytes: number[]; // non-zero positions act as a match mask
}

export type MappingStore = Partial<Record<ButtonAction, ButtonMapping>>;

const STORAGE_KEY = "sonicmic_mapping_v1";
export const CALIBRATION_ORDER: ButtonAction[] = ["record", "pause", "stop"];

function _loadMapping(): MappingStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MappingStore) : {};
  } catch { return {}; }
}

function _persistMapping(m: MappingStore) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); } catch {}
}

function _matchesMapping(data: Uint8Array, reportId: number, m: ButtonMapping): boolean {
  return (
    m.reportId === reportId &&
    m.bytes.every((v, i) => v === 0 || data[i] === v)
  );
}

// ── Module-level singleton ────────────────────────────────────────────────────

let _device:      HIDDevice | null    = null;
let _mapping:     MappingStore        = _loadMapping();
let _calibrating: ButtonAction | null = null;
let _calibrateLastCaptureAt           = 0; // debounce: ignore release events after a capture

// Per-action debounce: prevents rapid repeat-reports from toggling multiple times
const _lastFiredAt: Partial<Record<ButtonAction, number>> = {};
const ACTION_DEBOUNCE_MS    = 350;
const CALIBRATION_COOLDOWN  = 900; // ms to ignore after capturing one button press

const _reportHandlers       = new Set<(e: HIDInputReportEvent) => void>();
const _stateHandlers        = new Set<(connected: boolean) => void>();
const _calibrationListeners = new Set<(action: ButtonAction | null) => void>();

function _broadcastState(connected: boolean) {
  _stateHandlers.forEach(fn => fn(connected));
}

function _broadcastCalibrating(action: ButtonAction | null) {
  _calibrationListeners.forEach(fn => fn(action));
}

function _dispatchReport(e: HIDInputReportEvent) {
  const data = new Uint8Array(e.data.buffer);
  const isAllZero = data.every(b => b === 0);

  // eslint-disable-next-line no-console
  console.log(
    "[SonicMic] reportId:", e.reportId,
    " bytes:", Array.from(data).map(b => `0x${b.toString(16).padStart(2, "0")}`).join(" "),
  );

  if (_calibrating) {
    if (!isAllZero) {
      const now = Date.now();
      // Ignore the button-release (or repeat) event that immediately follows the previous capture
      if (now - _calibrateLastCaptureAt < CALIBRATION_COOLDOWN) return;
      _calibrateLastCaptureAt = now;

      _mapping[_calibrating] = { reportId: e.reportId, bytes: Array.from(data) };

      const idx  = CALIBRATION_ORDER.indexOf(_calibrating);
      const next = CALIBRATION_ORDER[idx + 1] ?? null;
      _calibrating = next;

      if (!next) _persistMapping(_mapping);
      _broadcastCalibrating(_calibrating);
    }
    return;
  }

  _reportHandlers.forEach(fn => fn(e));
}

async function _attach(d: HIDDevice): Promise<void> {
  if (_device === d) return;
  if (!d.opened) await d.open();
  _device = d;
  d.addEventListener("inputreport", _dispatchReport);
  // eslint-disable-next-line no-console
  console.log(
    `[SonicMic] device found  vendorId: 0x${d.vendorId.toString(16).padStart(4, "0")}`,
    ` productId: 0x${d.productId.toString(16).padStart(4, "0")}`,
    ` name: "${d.productName}"`,
  );
  _broadcastState(true);
}

if (typeof navigator !== "undefined" && navigator.hid) {
  navigator.hid.addEventListener("connect", (e) => {
    if (VENDOR_IDS.includes(e.device.vendorId)) _attach(e.device).catch(() => {});
  });
  navigator.hid.addEventListener("disconnect", (e) => {
    if (e.device === _device) {
      _device = null;
      _broadcastState(false);
    }
  });
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
  connected:         boolean;
  connect:           () => Promise<void>;
  error:             string | null;
  calibrating:       ButtonAction | null;
  hasCustomMapping:  boolean;
  startCalibration:  () => void;
  cancelCalibration: () => void;
}

export function useSonicMic(options: UseSonicMicOptions = {}): UseSonicMicReturn {
  const [connected,   setConnected]   = useState<boolean>(() => !!_device?.opened);
  const [error,       setError]       = useState<string | null>(null);
  const [calibrating, setCalibrating] = useState<ButtonAction | null>(_calibrating);
  const [mappingSize, setMappingSize] = useState(() => Object.keys(_mapping).length);

  const cbRef = useRef(options);
  useEffect(() => { cbRef.current = options; });

  useEffect(() => {
    const listener = (c: boolean) => setConnected(c);
    _stateHandlers.add(listener);
    return () => { _stateHandlers.delete(listener); };
  }, []);

  useEffect(() => {
    const listener = (action: ButtonAction | null) => {
      setCalibrating(action);
      setMappingSize(Object.keys(_mapping).length);
    };
    _calibrationListeners.add(listener);
    return () => { _calibrationListeners.delete(listener); };
  }, []);

  useEffect(() => {
    const handler = (e: HIDInputReportEvent) => {
      const data = new Uint8Array(e.data.buffer);
      if (data.every(b => b === 0)) return;

      const now = Date.now();
      const canFire = (action: ButtonAction) => {
        const last = _lastFiredAt[action] ?? 0;
        if (now - last < ACTION_DEBOUNCE_MS) return false;
        _lastFiredAt[action] = now;
        return true;
      };

      const m = _mapping;
      if      (m.record && _matchesMapping(data, e.reportId, m.record)) { if (canFire("record")) cbRef.current.onRecord?.(); }
      else if (m.pause  && _matchesMapping(data, e.reportId, m.pause))  { if (canFire("pause"))  cbRef.current.onPause?.();  }
      else if (m.stop   && _matchesMapping(data, e.reportId, m.stop))   { if (canFire("stop"))   cbRef.current.onStop?.();   }
      else {
        // Fallback: Grundig SonicMic 3 default byte positions
        if      (data[6] === 0x01 && canFire("record")) cbRef.current.onRecord?.();
        else if (data[6] === 0x08 && canFire("stop"))   cbRef.current.onStop?.();
        else if (data[7] === 0x04 && canFire("pause"))  cbRef.current.onPause?.();
      }
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
      const devices = await navigator.hid.requestDevice({ filters: [] });
      if (!devices.length) {
        setError("Aucun périphérique sélectionné.");
        return;
      }
      await _attach(devices[0]);
    } catch (err) {
      if ((err as DOMException)?.name !== "NotAllowedError") {
        setError("Connexion échouée. Vérifiez que le SonicMic est branché.");
      }
    }
  }, []);

  const startCalibration = useCallback(() => {
    _mapping               = {};
    _calibrating           = "record";
    _calibrateLastCaptureAt = 0;
    _broadcastCalibrating(_calibrating);
  }, []);

  const cancelCalibration = useCallback(() => {
    _mapping     = _loadMapping(); // restore persisted mapping
    _calibrating = null;
    _broadcastCalibrating(null);
    setMappingSize(Object.keys(_mapping).length);
  }, []);

  return {
    connected,
    connect,
    error,
    calibrating,
    hasCustomMapping: mappingSize === CALIBRATION_ORDER.length,
    startCalibration,
    cancelCalibration,
  };
}
