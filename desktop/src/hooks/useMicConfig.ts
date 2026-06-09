import { useEffect, useState, useCallback } from "react";

export type MicPreset = "sonic" | "philips" | "generic";

export interface MicConstraints {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl:  boolean;
}

interface StoredMicConfig {
  preset:      MicPreset;
  constraints: MicConstraints;
}

type ConfigStore = Record<string, StoredMicConfig>;

const CONFIGS_KEY  = "mic_configs_v1";
const SELECTED_KEY = "mic_selected_v1";

export const PRESET_DEFAULTS: Record<MicPreset, MicConstraints> = {
  sonic:   { echoCancellation: true,  noiseSuppression: true,  autoGainControl: true  },
  philips: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  generic: { echoCancellation: true,  noiseSuppression: true,  autoGainControl: true  },
};

export const PRESET_LABELS: Record<MicPreset, string> = {
  sonic:   "Grundig SonicMic",
  philips: "Philips LFH3500",
  generic: "Autre micro",
};

function _loadConfigs(): ConfigStore {
  try { return JSON.parse(localStorage.getItem(CONFIGS_KEY) ?? "{}"); } catch { return {}; }
}

function _saveConfigs(c: ConfigStore) {
  try { localStorage.setItem(CONFIGS_KEY, JSON.stringify(c)); } catch {}
}

// ── Non-hook helper: call from async code (e.g. RecordingContext) ─────────────

export function loadMicConstraints(): MediaTrackConstraints {
  const deviceId = localStorage.getItem(SELECTED_KEY);
  const configs  = _loadConfigs();
  const cfg      = deviceId ? configs[deviceId] : null;
  const c        = cfg?.constraints ?? PRESET_DEFAULTS.generic;
  return {
    echoCancellation: c.echoCancellation,
    noiseSuppression: c.noiseSuppression,
    autoGainControl:  c.autoGainControl,
    sampleRate: 16000,
    ...(deviceId && deviceId !== "default" ? { deviceId: { exact: deviceId } } : {}),
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseMicConfigReturn {
  devices:           MediaDeviceInfo[];
  selectedDeviceId:  string;
  setSelectedDevice: (id: string) => void;
  getConfig:         (deviceId: string) => StoredMicConfig;
  applyPreset:       (deviceId: string, preset: MicPreset) => void;
  updateConstraint:  (deviceId: string, key: keyof MicConstraints, value: boolean) => void;
  refreshDevices:    () => Promise<void>;
}

export function useMicConfig(): UseMicConfigReturn {
  const [devices,          setDevices]          = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => localStorage.getItem(SELECTED_KEY) ?? "default");
  const [configs,          setConfigs]          = useState<ConfigStore>(_loadConfigs);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter(d => d.kind === "audioinput"));
    } catch {}
  }, []);

  useEffect(() => { refreshDevices(); }, [refreshDevices]);

  const setSelectedDevice = useCallback((id: string) => {
    setSelectedDeviceId(id);
    try { localStorage.setItem(SELECTED_KEY, id); } catch {}
  }, []);

  const getConfig = useCallback((deviceId: string): StoredMicConfig => {
    return configs[deviceId] ?? { preset: "generic", constraints: { ...PRESET_DEFAULTS.generic } };
  }, [configs]);

  const applyPreset = useCallback((deviceId: string, preset: MicPreset) => {
    const next = { ...configs, [deviceId]: { preset, constraints: { ...PRESET_DEFAULTS[preset] } } };
    setConfigs(next);
    _saveConfigs(next);
  }, [configs]);

  const updateConstraint = useCallback((deviceId: string, key: keyof MicConstraints, value: boolean) => {
    const current = configs[deviceId] ?? { preset: "generic" as MicPreset, constraints: { ...PRESET_DEFAULTS.generic } };
    const next = {
      ...configs,
      [deviceId]: {
        preset:      "generic" as MicPreset,
        constraints: { ...current.constraints, [key]: value },
      },
    };
    setConfigs(next);
    _saveConfigs(next);
  }, [configs]);

  return { devices, selectedDeviceId, setSelectedDevice, getConfig, applyPreset, updateConstraint, refreshDevices };
}
