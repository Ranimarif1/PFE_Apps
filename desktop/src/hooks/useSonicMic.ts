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

const VENDOR_IDS = [0x15d8, 0x0911, 0x0D8C, 0x04B8, 0x046D, 0x0BDA, 0x17EF];

// ── Button mapping ────────────────────────────────────────────────────────────

export type ButtonAction = "record" | "pause" | "stop";

export interface ButtonMapping {
  reportId: number;
  bytes:    number[];
}

export type MappingStore = Partial<Record<ButtonAction, ButtonMapping>>;

export const CALIBRATION_ORDER: ButtonAction[] = ["record", "pause", "stop"];

// Physical device = one entry per unique vendorId+productId (ignoring HID interfaces)
type PhysId = string;
function _physId(d: HIDDevice): PhysId { return `${d.vendorId}_${d.productId}`; }

function _storageKey(physId: PhysId) { return `hid_mapping_v2_${physId}`; }

function _loadMapping(physId: PhysId): MappingStore {
  try {
    const raw = localStorage.getItem(_storageKey(physId));
    return raw ? JSON.parse(raw) as MappingStore : {};
  } catch { return {}; }
}

function _persistMapping(physId: PhysId, m: MappingStore) {
  try { localStorage.setItem(_storageKey(physId), JSON.stringify(m)); } catch {}
}

function _matchesMapping(data: Uint8Array, reportId: number, m: ButtonMapping): boolean {
  return (
    m.reportId === reportId &&
    m.bytes.every((v, i) => v === 0 || data[i] === v)
  );
}

const GRUNDIG_DEFAULTS: Partial<Record<ButtonAction, (d: Uint8Array) => boolean>> = {
  record: d => d[6] === 0x01,
  stop:   d => d[6] === 0x08,
  pause:  d => d[7] === 0x04,
};

// ── Multi-device singleton (grouped by physical device) ───────────────────────

// One mapping + name per physical device
const _physMappings: Map<PhysId, MappingStore>  = new Map();
const _physNames:    Map<PhysId, string>         = new Map();
// All open HID interfaces grouped by physical device
const _physIfaces:   Map<PhysId, Set<HIDDevice>> = new Map();

let _calibratingPhysId:         PhysId | null       = null;
let _calibrating:               ButtonAction | null = null;
let _calibrateLastCaptureAt     = 0;
let _calibrationCompletedAt     = 0;
const POST_CALIBRATION_COOLDOWN = 1500;

const _lastFiredAt: Partial<Record<ButtonAction, number>> = {};
const ACTION_DEBOUNCE_MS   = 350;
const CALIBRATION_COOLDOWN = 900;

const _reportHandlers       = new Set<(e: HIDInputReportEvent, mapping: MappingStore) => void>();
const _stateHandlers        = new Set<() => void>();
const _calibrationListeners = new Set<() => void>();

function _broadcast()      { _stateHandlers.forEach(fn => fn()); }
function _broadcastCalib() { _calibrationListeners.forEach(fn => fn()); }

function _dispatchReport(e: HIDInputReportEvent) {
  const physId    = _physId(e.device);
  const data      = new Uint8Array(e.data.buffer);
  const isAllZero = data.every(b => b === 0);

  // eslint-disable-next-line no-console
  console.log(
    `[HIDMic:${_physNames.get(physId) ?? physId}] rid:${e.reportId}`,
    Array.from(data).map(b => b.toString(16).padStart(2, "0")).join(" "),
  );

  // ── Calibration: accept events from ANY interface of the target physical device
  if (_calibrating && _calibratingPhysId === physId) {
    if (!isAllZero) {
      const now = Date.now();
      if (now - _calibrateLastCaptureAt < CALIBRATION_COOLDOWN) return;
      _calibrateLastCaptureAt = now;

      const mapping = _physMappings.get(physId) ?? {};
      mapping[_calibrating] = { reportId: e.reportId, bytes: Array.from(data) };
      _physMappings.set(physId, mapping);

      const idx  = CALIBRATION_ORDER.indexOf(_calibrating);
      const next = CALIBRATION_ORDER[idx + 1] ?? null;
      _calibrating = next;

      if (!next) {
        _persistMapping(physId, mapping);
        _calibratingPhysId      = null;
        _calibrationCompletedAt = Date.now();
      }
      _broadcastCalib();
    }
    return;
  }

  if (isAllZero) return;
  if (Date.now() - _calibrationCompletedAt < POST_CALIBRATION_COOLDOWN) return;

  const mapping = _physMappings.get(physId) ?? {};
  _reportHandlers.forEach(fn => fn(e, mapping));
}

async function _attachIface(d: HIDDevice): Promise<void> {
  const physId = _physId(d);

  if (!_physIfaces.has(physId)) _physIfaces.set(physId, new Set());
  const ifaces = _physIfaces.get(physId)!;

  if (ifaces.has(d)) return; // already attached
  if (!d.opened) await d.open();
  ifaces.add(d);
  d.addEventListener("inputreport", _dispatchReport);

  // Register physical device on first interface
  if (!_physMappings.has(physId)) {
    _physMappings.set(physId, _loadMapping(physId));
    _physNames.set(physId, d.productName || `Micro USB (${d.productId.toString(16)})`);
    _broadcast();
  }
}

function _detachIface(d: HIDDevice) {
  const physId = _physId(d);
  d.removeEventListener("inputreport", _dispatchReport);

  const ifaces = _physIfaces.get(physId);
  if (ifaces) {
    ifaces.delete(d);
    if (ifaces.size === 0) {
      _physIfaces.delete(physId);
      _physMappings.delete(physId);
      _physNames.delete(physId);
      if (_calibratingPhysId === physId) {
        _calibratingPhysId = null;
        _calibrating       = null;
        _broadcastCalib();
      }
      _broadcast();
    }
  }
}

if (typeof navigator !== "undefined" && navigator.hid) {
  navigator.hid.addEventListener("connect",    e => { if (VENDOR_IDS.includes(e.device.vendorId)) _attachIface(e.device).catch(() => {}); });
  navigator.hid.addEventListener("disconnect", e => { if (_physIfaces.get(_physId(e.device))?.has(e.device)) _detachIface(e.device); });
  navigator.hid.getDevices().then(devices => {
    devices.filter(d => VENDOR_IDS.includes(d.vendorId)).forEach(d => _attachIface(d).catch(() => {}));
  }).catch(() => {});
}

// ── Per-physical-device info exposed to UI ────────────────────────────────────

export interface HIDDeviceInfo {
  physId:          PhysId;
  name:            string;
  hasCalibration:  boolean;
  isCalibrating:   boolean;
  calibratingStep: ButtonAction | null;
}

function _getDeviceInfos(): HIDDeviceInfo[] {
  return Array.from(_physMappings.keys()).map(physId => ({
    physId,
    name:            _physNames.get(physId) ?? physId,
    hasCalibration:  Object.keys(_physMappings.get(physId) ?? {}).length >= CALIBRATION_ORDER.length,
    isCalibrating:   _calibratingPhysId === physId,
    calibratingStep: _calibratingPhysId === physId ? _calibrating : null,
  }));
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseSonicMicOptions {
  onRecord?: () => void;
  onStop?:   () => void;
  onPause?:  () => void;
}

export interface UseSonicMicReturn {
  deviceInfos:       HIDDeviceInfo[];
  anyConnected:      boolean;
  lastFiredAction:   ButtonAction | null;
  error:             string | null;
  connect:           () => Promise<void>;
  startCalibration:  (physId: string) => void;
  cancelCalibration: (physId: string) => void;
  resetMapping:      (physId: string) => void;
}

export function useSonicMic(options: UseSonicMicOptions = {}): UseSonicMicReturn {
  const [deviceInfos,     setDeviceInfos]     = useState<HIDDeviceInfo[]>(() => _getDeviceInfos());
  const [lastFiredAction, setLastFiredAction] = useState<ButtonAction | null>(null);
  const [error,           setError]           = useState<string | null>(null);

  const cbRef = useRef(options);
  useEffect(() => { cbRef.current = options; });

  useEffect(() => {
    const sync = () => setDeviceInfos(_getDeviceInfos());
    _stateHandlers.add(sync);
    _calibrationListeners.add(sync);
    return () => { _stateHandlers.delete(sync); _calibrationListeners.delete(sync); };
  }, []);

  useEffect(() => {
    const handler = (e: HIDInputReportEvent, mapping: MappingStore) => {
      const data = new Uint8Array(e.data.buffer);
      const now  = Date.now();
      const canFire = (a: ButtonAction) => {
        const last = _lastFiredAt[a] ?? 0;
        if (now - last < ACTION_DEBOUNCE_MS) return false;
        _lastFiredAt[a] = now;
        return true;
      };
      const fire = (a: ButtonAction, cb?: () => void) => {
        if (canFire(a)) { cb?.(); setLastFiredAction(a); }
      };
      const hasCalib = Object.keys(mapping).length >= CALIBRATION_ORDER.length;
      if      (mapping.record && _matchesMapping(data, e.reportId, mapping.record)) fire("record", cbRef.current.onRecord);
      else if (mapping.pause  && _matchesMapping(data, e.reportId, mapping.pause))  fire("pause",  cbRef.current.onPause);
      else if (mapping.stop   && _matchesMapping(data, e.reportId, mapping.stop))   fire("stop",   cbRef.current.onStop);
      else if (!hasCalib) {
        if      (GRUNDIG_DEFAULTS.record?.(data)) fire("record", cbRef.current.onRecord);
        else if (GRUNDIG_DEFAULTS.stop?.(data))   fire("stop",   cbRef.current.onStop);
        else if (GRUNDIG_DEFAULTS.pause?.(data))  fire("pause",  cbRef.current.onPause);
      }
    };
    _reportHandlers.add(handler);
    return () => { _reportHandlers.delete(handler); };
  }, []);

  const connect = useCallback(async () => {
    if (!navigator.hid) { setError("WebHID non supporté — utilisez Chrome ou Edge."); return; }
    setError(null);
    try {
      const devices = await navigator.hid.requestDevice({ filters: [] });
      if (!devices.length) { setError("Aucun périphérique sélectionné."); return; }
      for (const d of devices) await _attachIface(d).catch(() => {});
    } catch (err) {
      if ((err as DOMException)?.name !== "NotAllowedError")
        setError("Connexion échouée. Vérifiez que le microphone est branché.");
    }
  }, []);

  const startCalibration = useCallback((physId: string) => {
    _physMappings.set(physId, {});
    _calibratingPhysId      = physId;
    _calibrating            = "record";
    _calibrateLastCaptureAt = 0;
    _broadcastCalib();
  }, []);

  const cancelCalibration = useCallback((physId: string) => {
    if (_calibratingPhysId === physId) {
      _physMappings.set(physId, _loadMapping(physId));
      _calibratingPhysId = null;
      _calibrating       = null;
      _broadcastCalib();
    }
  }, []);

  const resetMapping = useCallback((physId: string) => {
    try { localStorage.removeItem(_storageKey(physId)); } catch {}
    try { localStorage.removeItem("sonicmic_mapping_v1"); } catch {}
    _physMappings.set(physId, {});
    _calibratingPhysId      = physId;
    _calibrating            = "record";
    _calibrateLastCaptureAt = 0;
    _broadcastCalib();
  }, []);

  return { deviceInfos, anyConnected: deviceInfos.length > 0, lastFiredAction, error, connect, startCalibration, cancelCalibration, resetMapping };
}
