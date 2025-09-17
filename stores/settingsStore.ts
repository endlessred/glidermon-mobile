// stores/settingsStore.ts
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Settings = {
  low: number;
  high: number;
  veryHigh: number;
  useSimulator: boolean;
  simSpeed: number; // 1 = normal; higher = faster ticks
};

type SettingsStore = Settings & {
  loaded: boolean;
  // actions
  setThresholds: (p: Partial<Pick<Settings, "low" | "high" | "veryHigh">>) => Promise<void>;
  setUseSimulator: (v: boolean) => Promise<void>;
  setSimSpeed: (n: number) => Promise<void>;
  load: () => Promise<void>;
};

const KEY = "glidermon_settings_v1";

// small helper to persist just the Settings slice
async function persistSettings(get: () => Settings) {
  const s = get();
  const toSave: Settings = {
    low: s.low,
    high: s.high,
    veryHigh: s.veryHigh,
    useSimulator: s.useSimulator,
    simSpeed: s.simSpeed,
  };
  try { await AsyncStorage.setItem(KEY, JSON.stringify(toSave)); } catch {}
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  low: 80,
  high: 180,
  veryHigh: 250,
  useSimulator: false,
  simSpeed: 1,
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<Settings>;
        set({ ...s, loaded: true } as Partial<SettingsStore>);
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  setThresholds: async (p) => {
    set(p as Partial<SettingsStore>);
    await persistSettings(() => get());
  },

  setUseSimulator: async (v) => {
    set({ useSimulator: v });
    await persistSettings(() => get());
  },

  setSimSpeed: async (n) => {
    const clamped = Math.max(0.25, Math.min(20, n));
    set({ simSpeed: clamped });
    await persistSettings(() => get());
  },
}));
