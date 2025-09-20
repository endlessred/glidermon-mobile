// stores/settingsStore.ts
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeVariation } from "../styles/themeVariations";

type Settings = {
  low: number;
  high: number;
  veryHigh: number;
  useSimulator: boolean;
  simSpeed: number; // 1 = normal; higher = faster ticks
  isDarkMode: boolean; // Dark mode preference
  showLevelUpTest: boolean; // Show level up test button for debugging
  themeVariation: ThemeVariation; // Unlockable color theme

  // Visual Effects
  enableAnimations: boolean; // Enable/disable animations and transitions
  enableParticleEffects: boolean; // Enable/disable particle effects (level up, etc.)
  enableBlurEffects: boolean; // Enable/disable blur effects (especially for web)

  // Accessibility
  reduceMotion: boolean; // Reduce motion for accessibility
  textScale: number; // Text scaling factor (0.8 - 1.5)
  highContrast: boolean; // High contrast mode
};

type SettingsStore = Settings & {
  loaded: boolean;
  // actions
  setThresholds: (p: Partial<Pick<Settings, "low" | "high" | "veryHigh">>) => Promise<void>;
  setUseSimulator: (v: boolean) => Promise<void>;
  setSimSpeed: (n: number) => Promise<void>;
  setDarkMode: (v: boolean) => Promise<void>;
  setShowLevelUpTest: (v: boolean) => Promise<void>;
  setThemeVariation: (theme: ThemeVariation) => Promise<void>;

  // Visual Effects actions
  setEnableAnimations: (v: boolean) => Promise<void>;
  setEnableParticleEffects: (v: boolean) => Promise<void>;
  setEnableBlurEffects: (v: boolean) => Promise<void>;

  // Accessibility actions
  setReduceMotion: (v: boolean) => Promise<void>;
  setTextScale: (scale: number) => Promise<void>;
  setHighContrast: (v: boolean) => Promise<void>;

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
    isDarkMode: s.isDarkMode,
    showLevelUpTest: s.showLevelUpTest,
    themeVariation: s.themeVariation,

    // Visual Effects
    enableAnimations: s.enableAnimations,
    enableParticleEffects: s.enableParticleEffects,
    enableBlurEffects: s.enableBlurEffects,

    // Accessibility
    reduceMotion: s.reduceMotion,
    textScale: s.textScale,
    highContrast: s.highContrast,
  };
  try { await AsyncStorage.setItem(KEY, JSON.stringify(toSave)); } catch {}
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  low: 80,
  high: 180,
  veryHigh: 250,
  useSimulator: false,
  simSpeed: 1,
  isDarkMode: false,
  showLevelUpTest: false, // Default to hidden
  themeVariation: 'default', // Default theme

  // Visual Effects defaults
  enableAnimations: true,
  enableParticleEffects: true,
  enableBlurEffects: true,

  // Accessibility defaults
  reduceMotion: false,
  textScale: 1.0,
  highContrast: false,

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

  setDarkMode: async (v) => {
    set({ isDarkMode: v });
    await persistSettings(() => get());
  },

  setShowLevelUpTest: async (v) => {
    set({ showLevelUpTest: v });
    await persistSettings(() => get());
  },

  // Visual Effects actions
  setEnableAnimations: async (v) => {
    set({ enableAnimations: v });
    await persistSettings(() => get());
  },

  setEnableParticleEffects: async (v) => {
    set({ enableParticleEffects: v });
    await persistSettings(() => get());
  },

  setEnableBlurEffects: async (v) => {
    set({ enableBlurEffects: v });
    await persistSettings(() => get());
  },

  // Accessibility actions
  setReduceMotion: async (v) => {
    set({ reduceMotion: v });
    // When reduce motion is enabled, also disable animations for accessibility
    if (v) {
      set({ enableAnimations: false, enableParticleEffects: false });
    }
    await persistSettings(() => get());
  },

  setTextScale: async (scale) => {
    const clampedScale = Math.max(0.8, Math.min(1.5, scale));
    set({ textScale: clampedScale });
    await persistSettings(() => get());
  },

  setHighContrast: async (v) => {
    set({ highContrast: v });
    await persistSettings(() => get());
  },

  setThemeVariation: async (theme) => {
    set({ themeVariation: theme });
    await persistSettings(() => get());
  },
}));
