// stores/settingsStore.ts
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Settings = {
  low: number;
  high: number;
  veryHigh: number;
};
type SettingsStore = Settings & {
  loaded: boolean;
  setThresholds: (p: Partial<Settings>) => Promise<void>;
  load: () => Promise<void>;
};

const KEY = "glidermon_settings_v1";

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  low: 80,
  high: 180,
  veryHigh: 250,
  loaded: false,
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        set({ ...get(), ...s, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },
  setThresholds: async (p) => {
    const next = { low: get().low, high: get().high, veryHigh: get().veryHigh, ...p };
    set(next);
    try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  },
}));
